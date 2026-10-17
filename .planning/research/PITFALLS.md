# Pitfalls Research

**Domain:** Single-event football-jersey Secret Santa web app (React + Vite SPA, Firestore as backend, no server, passwordless name-only identity, single group of friends)
**Researched:** 2026-10-17
**Confidence:** MEDIUM (seam: `websearch` verified → MEDIUM; findings below are corroborated against official Vite / Firebase / React documentation retrieved during research, plus community post-mortems. Per-pitfall source in the mapping table.)

> **How to read this file:** pitfalls are ordered by how badly they break the two things this project actually cares about — (1) *everyone gets exactly one valid recipient*, and (2) *the Admin cannot see the pairings*. Warning signs are written so they can be checked during execution, not after launch.
> Phases referenced as `Phase N (name)` are the suggested phase structure from this research; names are advisory until `ROADMAP.md` exists.

---

## Critical Pitfalls

### Pitfall 1: Firestore security rules left open (test mode / `if true`)

**What goes wrong:**
The Firebase console offers "start in test mode", which writes `allow read, write: if true` and expires after 30 days. The app works perfectly, the team ships it, and the database is world-readable and world-writable to anyone who learns the project ID (which is in the public bundle — see Pitfall 3). With this project's deliberately passwordless model, this is the *default* outcome unless it is actively prevented: nothing in the flow ever forces authentication, so `request.auth` stays `null` and the natural "fix" (`allow read, write: if true`) is the wrong one. Consequences to a friends-only app: anyone can delete the event, overwrite every participant's preferences, inject fake participants into the draw, and — worst — enumerate the pairing collection. It also exposes a *quota* attack (Pitfall 13): a stranger can burn the 20k daily writes and take the app offline mid-party.

**Why it happens:**
Test mode is the default onboarding path; the 30-day expiry only produces a warning, not a hard break, when the project is actively used; the "no auth" decision (correct for UX) is misread as "no rules needed"; and rules are the one part of a Firebase app that is not exercised by the local dev flow (the emulator with open rules hides everything).

**How to avoid:**
1. Write a real `firestore.rules` file in the repo on day one and deploy it with `firebase deploy --only firestore:rules` as part of the release step. Never edit rules only in the console (they drift and are not reviewable).
2. Structure rules as **default-deny with explicit per-collection blocks** — no catch-all. Path-by-path: `event/{doc}`, `participants/{id}`, `preferences/{id}` (or embedded), `assignments/{token}`, `orders/{id}`, `submissions/{token}`.
3. **Enable Firebase Anonymous Auth** and require `request.auth != null` on writes. This is the highest-leverage decision available here: anonymous auth requires no password, no email, no extra user-visible step, so it stays within the "entrada solo con nombre" constraint — but it gives `request.auth.uid`, which makes spoofing prevention and per-document ownership enforceable (see Pitfalls 2 and 8). Without it, `request.auth` is always `null` and *no* meaningful rule can be written.
4. Validate shape, not just auth: bounds on string lengths, enum check on `size` (`['S','M','L','XL','XXL','XXXL','2XL']`), and reject unknown fields so a client can't smuggle a `role: 'admin'` or extra mapping field into a document.
5. Keep the client SDK free of any Admin-SDK credential. The Admin SDK bypasses rules entirely; a service-account JSON in the bundle or in `.env` is a full database compromise (see Pitfall 3).
6. Add `@firebase/rules-unit-testing` tests that assert *denials* (unauthenticated write, `list` on `assignments`, writing another participant's doc). A rules file with no denial tests is an untested security boundary.

**Warning signs:**
- `firestore.rules` missing from the repo, or containing `if true` / `match /{document=**}` with a permissive condition.
- `allow read, write: if request.auth != null;` at the root — Firebase's own docs flag this as insecure: it means *any* logged-in user has access to *everything*.
- Rules edited in the console with no corresponding repo change.
- Any rule condition that reads `request.auth.uid` while the app never calls `signInAnonymously()` (the auth object is always `null`, so the rule silently denies everything and the team "solves" it by opening the rule).

**Phase to address:**
`Phase 1 (Foundation & Firebase config)` — rules file, anonymous auth wiring, emulator, and denial tests land with the initial scaffold, before any feature exists. Revisited at `Phase 6 (Admin export)`, when the read surface grows.

**Sources / confidence:** Firebase "Fix insecure rules" + "Get started with Firestore Security Rules"; community reports of production apps shipping world-open (vibeappscanner, rootcrak, penetrify). MEDIUM.

---

### Pitfall 2: The pairing is readable — and enumerable — by every client, including the Admin

**What goes wrong:**
The app's stated core value is that the Admin *cannot* see who gives to whom. The natural implementation destroys it: a collection like `assignments/{giverId} = { recipientId }`, readable by all clients so each participant can look up their own row. Because there is no auth, "readable by participants" **is** "readable by anyone who opens devtools, including the Admin". Worse, the Admin is the one who *runs* the draw, so the permutation exists in the Admin's browser as a local variable before it is written — a single `console.log` or a `getDocs` in the console and the surprise is gone. A `pairs` or `assignments/all` document (or a single `event` document holding the whole mapping) is the worst variant: one read returns the entire answer.

**Why it happens:**
"No auth" is read as "no privacy model"; the mapping is stored in the shape that is most convenient for the client that writes it; and the requirement is interpreted as "the Admin *UI* must not display the mapping" rather than "the mapping must not be enumerable".

**How to avoid:**
1. **Never persist a full-mapping document.** No `pairs`, no `assignments/all`, no `event.assignments` array. Only one document per giver.
2. **Key each assignment by an unguessable token, and deny `list`.** Firestore rules distinguish `get` (single document by ID) from `list` (query/collection scan). Write:
   ```
   function isAdmin() {
     return request.auth != null &&
            request.auth.uid == get(/databases/$(database)/documents/event/main).data.adminUid;
   }
   match /assignments/{token} {
     allow get:    if true;     // requires knowing the 128-bit token; each giver reads only their own
     allow list:   if false;    // the mapping is not enumerable, not even by the Admin
     allow create, update: if isAdmin();   // write-once in practice; update kept for idempotent retries
     allow delete: if false;    // no tearing holes in a completed draw
   }
   match /event/{doc} {
     allow read: if true;
     allow create: if request.auth != null;             // see Pitfall 4 for the transaction
     allow update: if request.auth.uid == resource.data.adminUid;
   }
   match /pairs/{doc} { allow read, write: if false; }   // explicit tombstone: this path must never exist
   ```
   The token (`crypto.randomUUID()` or 16+ random bytes) lives only in the giver's `localStorage`; each client can fetch exactly its own row and has no way to enumerate the rest. This converts "readable by everyone" into "readable by whoever holds their own token" *after* the draw completes.
   Note the deliberate choice of `create, update` for the Admin: `create`-only would make a retried write batch fail on the second attempt (see Pitfall 5's idempotency requirement and Pitfall 16), so the draw would be unrepairable after a network blip. Restricting writes to `isAdmin()` keeps the retry safe while denying tampering by ordinary participants — which also means the draw must be performed by a client signed in with the Admin's anonymous-auth uid, not by a "trust me" flag.
3. **Be honest in the design doc about what is and isn't guaranteed.** Without a server, the Admin's own client computes the permutation, so a *determined* Admin can always learn the mapping (`console.log`, or re-reading the write batch). Target the achievable guarantee: **accidental** exposure is impossible; adversarial exposure by the Admin is out of scope. Record this as an explicit Key Decision so nobody over-engineers crypto to "fix" an un-fixable property — and so nobody silently weakens the data model either.
4. If true Admin-blindness is ever required, the only correct shape is running the draw in a Cloud Function (Firestore transaction / callable), so the permutation never reaches any browser. That is a backend (currently Out of Scope) — flag it as the known escape hatch rather than pretending the client-side draw is equivalent.
5. Never render a pairs table in the Admin view, never log the mapping, and keep the draw's permutation in a local variable that is discarded after the atomic write.
6. Add an automated check (test or lint rule) asserting that no file in the Admin feature imports or queries the `assignments` collection.

**Warning signs:**
- A collection named `assignments` where the document ID is a participant name or UID and rules allow `read` (not just `get`) — that is enumerable with one `getDocs`.
- The Admin screen shares a query hook with the participant screen (same `useEffect`, different filter) — the Admin can widen the filter.
- `console.log(assignment)` or React DevTools state showing the map on any participant's machine.
- A devtools-ready one-liner that dumps the whole pairing: `getDocs(collection(db,'assignments'))`.

**Phase to address:**
`Phase 4 (Draw logic)` for the token-keyed write shape and the `get`-not-`list` rule; `Phase 6 (Admin export)` for the "Admin never queries `assignments`" invariant and its test; `Phase 1` for the tombstone rules.

**Sources / confidence:** Firestore rules `get` vs `list` semantics and insecure-rules guidance (Firebase docs); Steam/Reddit threads on "test mode" and client-trust. MEDIUM.

---

### Pitfall 3: Confusing *which* secret matters — `VITE_` leakage vs. the actual threat

**What goes wrong:**
Two opposite mistakes, both common:
- **(a) Over-protection.** The team treats `VITE_FIREBASE_API_KEY` as a secret: it goes into `.env`, `.env` is gitignored, CI injects it, and someone starts looking for a way to "not expose it". This is wasted effort and eventually leads to workarounds (a proxy, obfuscation, runtime config) that add real complexity for zero security gain. Firebase's web `apiKey` is documented as **not a secret** — it identifies the project, not the caller; it is safe in client code and is designed to be public.
- **(b) Under-protection.** The same file also accumulates genuinely sensitive values: a service-account JSON, a GitHub token, a hosting deploy key, or an admin password for a side tool. `.env` is committed (or `*.local` is not gitignored), or a variable is prefixed `VITE_` by reflex, and it is now inlined into the public JS bundle *and* in git history. Vite's own docs are blunt: `VITE_*` values are statically replaced at build time and end up in the client bundle; they must not contain sensitive information. `loadEnv('')` merges the entire `process.env`, so inlining it via `define` leaks CI/CD tokens too.
- **(c) Build-time inlining surprise.** Devs expect to change a variable in the hosting dashboard and have it take effect. It won't — a static Vite bundle cannot read new host env vars after `vite build`; the value is baked in and a rebuild is required. This shows up as "the deployed app still points at the old Firebase project" after a config change.

**Why it happens:**
`.env` is culturally synonymous with "secret"; the Vite `VITE_` prefix is documented in a way that reads as a *protection* mechanism rather than an *exposure* mechanism (the Vite repo has an open issue about exactly this wording); and most tutorials demonstrate `import.meta.env.VITE_*` without stating that the value is public.

**How to avoid:**
1. State the threat model explicitly in the README: **the Firebase web config is public by design; the security boundary is `firestore.rules`, not the config.** The "key" in `firebaseConfig` is an identifier.
2. Still keep config out of source (PROJECT.md requires it) for *portability* — dev/prod project swap — not for secrecy. Use `.env.local` (gitignored) + a committed `.env.example` with placeholder values, and add `*.local` to `.gitignore`.
3. Enforce the prefix rule: **only** values that are safe in a public JS file get the `VITE_` prefix. Never prefix anything with `VITE_` unless you would be comfortable pasting it into a public GitHub README.
4. Never put an Admin SDK service account, a deploy token, or a personal credential in any `.env*` file in the frontend repo. If a CI deploy needs one, use the CI secret store (and never `import.meta.env`).
5. Run a secret scan before the first push (`gitleaks`, or GitHub secret scanning) so `*.local` is never committed; if it was, rotate — deleting the file does not remove it from history.
6. Document in the deploy notes that env changes require a rebuild + redeploy. Verify by grepping the built asset: `grep -r "VITE_" dist/assets/` should find nothing but `import.meta.env` polyfill text, and the config values should be plainly visible — that is expected, and confirming it early prevents panic later.

**Warning signs:**
- A `.env` (not `.env.local`) tracked by git: `git ls-files | grep env`.
- Any `.env*` value containing a private key (`BEGIN PRIVATE KEY`), a service account, or a token whose scope is broader than Firestore.
- Someone proposing a proxy/Cloud Function purely to hide the Firebase config.
- Deploy succeeded, config change didn't take effect, no rebuild performed.

**Phase to address:**
`Phase 1 (Foundation & Firebase config)`.

**Sources / confidence:** Vite "Env Variables and Modes" and vitejs/vite security policy; Firebase "Learn about and manage API keys" (keys need not be treated as secrets). MEDIUM-HIGH — both are official docs retrieved directly.

---

### Pitfall 4: Two users become "the first admin" — duplicate events or two admins

**What goes wrong:**
The first person to open the link becomes Admin (Key Decision). Implemented naively as "on mount, `getDocs(eventCollection)`; if empty, `addDoc(event, { adminId: me })`", two friends opening the shared link within the same few seconds will both see an empty collection and both create an event — or one overwrites the other — leaving two event documents, two Admin identities, or an Admin whose `adminId` no longer matches its own token (so the "Empezar Sorteo" button belongs to someone who reloads and finds themselves a regular participant). React StrictMode's development double-mount makes this reproducible locally, which is how teams "fix" it by disabling StrictMode instead of making the write idempotent.

**Why it happens:**
Check-then-write is not atomic — two clients can read the same empty state at the same millisecond. This is the canonical Firestore race, and it happens most often in exactly this "initialize the singleton" path. `addDoc` also generates a random ID, so there is nothing for a second writer to collide with.

**How to avoid:**
1. **Use a fixed document ID for the singleton.** `doc(db, 'event', 'main')` (or a slug derived from the invite code, so multiple events stay possible later). A fixed ID makes a second writer a collision rather than a second document.
2. **Create it inside a transaction**, reading before writing:
   ```js
   await runTransaction(db, async (tx) => {
     const ref = doc(db, 'event', 'main');
     const snap = await tx.get(ref);
     if (snap.exists()) return { created: false, ...snap.data() };
     tx.set(ref, { adminUid: myUid, state: 'lobby', createdAt: serverTimestamp() });
     return { created: true };
   });
   ```
   The losing client reads `adminUid !== myUid` and correctly renders the participant view. Both clients converge; neither needs to "retry".
3. Pin `firebase` to a version ≥ 9.14.0. Older JS SDK releases had a bug (firebase-js-sdk issue #6659) where `transaction.set()` on a document concurrently created by another client failed with `Document already exists` **without retrying**; fixed in 9.14.0. On the current major version this is moot, but do not pin something ancient.
4. **Make the Admin role server-persisted and single-device-aware.** Store `adminUid` in the event doc. The UI gate ("is this me the admin?") must read `event.adminUid === myUid`, never a local `localStorage.isAdmin` flag (see Pitfall 8). Accept and document the consequence: **the Admin is the admin on one device**; if they clear storage or switch to their phone, the event has no reachable admin. Provide a recovery path (a recovery code shown at creation, or an allowed "claim admin while `state === 'lobby'` and `adminUid` is unreferenced"), and show it in the UI rather than hiding it.
5. Do **not** rely on `serverTimestamp()` for the ordering that decides admin; decide from `adminUid` identity, not timestamps.

**Warning signs:**
- `addDoc` in the event-creation path; or an `if (snapshot.empty)` guard with no transaction.
- Two event documents in the console after a two-tab test; a participant whose view flips to admin (or vice versa) on reload.
- Disabling `<StrictMode>` to "stop the double creation".
- `localStorage.isAdmin` anywhere in the codebase.

**Phase to address:**
`Phase 2 (Identity & Event creation)` — transaction, fixed ID, `adminUid` on the event doc. Verified by a two-tab/two-browser test written into the phase's acceptance criteria.

**Sources / confidence:** Firebase "Transactions and batched writes" + "Data contention in transactions"; firebase-js-sdk #6659; the check-then-write race writeup (varstatt.com). MEDIUM.

---

### Pitfall 5: Draw integrity — self-assignment, non-bijection, off-by-one, non-deterministic re-draws

**What goes wrong:**
Four distinct bugs, all of which produce a draw that *looks* fine on screen and is wrong:
- **Self-assignment.** "Shuffle the array and give each person the next name" — if the shuffle is applied to the *recipient* list only, or the rotation offset is `0`, or the mapping is built as `participants[i] → shuffled[i]` with the shuffle occasionally a no-op, someone draws themselves. The classic naive fix ("draw names from a hat, restart on a collision") is **statistically biased**: for 4 people the restart method reproduces the name 5/36 of the time, i.e. it is not uniform over derangements.
- **Non-bijection / duplicate recipients.** Any implementation that picks recipients with `Math.random()` inside a loop, or filters out invalid picks after the fact, can leave two givers pointing at the same person and one person unassigned. A rotation with a modular off-by-one (`(i + offset + 1) % n` instead of `(i + offset) % n`) is still a valid rotation — but `next[i] = shuffled[i]` after an in-place sort is a classic duplicate generator.
- **Off-by-one in the circular permutation.** With a rotation the pairing is `giver(i) → participants[(i + k) % n]`, `k ∈ [1, n-1]`. Writing `k ∈ [0, n]` makes `k = 0` everyone-to-self and `k = n` a duplicate of `k = 0`. Slicing/shifting a `rotate()` helper is where this hides.
- **Non-deterministic re-draws.** If the permutation is computed during render, inside a `useMemo` with unstable deps, or in an effect that re-runs on every snapshot, the pairing changes on refresh or on each Firestore update. Participant A sees "te ha tocado regalar a Marta", submits a size-L retro order for Marta, and by the next render they are pointing at Javi. Nobody notices until the jerseys arrive.

**Why it happens:**
"Random assignment" sounds like a one-liner; the correctness conditions (bijection + no fixed points + single cycle) are non-obvious; and the circular-permutation requirement in PROJECT.md is easy to satisfy "by accident" in a way that is not actually a rotation. Re-draws arise because the draw is treated as a pure function of state rather than a persisted event.

**How to avoid:**
1. Implement the circular draw explicitly and test it:
   ```js
   // participants: array of ids. Rotation by k guarantees a single n-cycle.
   const n = participants.length;
   if (n < 3) throw new Error('Se necesitan al menos 3 participantes');
   const k = 1 + Math.floor(Math.random() * (n - 1)); // k in [1, n-1]  -> never a fixed point
   const assignment = new Map(
     participants.map((giver, i) => [giver, participants[(i + k) % n]])
   );
   ```
2. Assert the properties, don't assume them. A unit test (no Firestore needed) must run for `n = 3, 4, 5, 10, 50, 500` × 1000 iterations and assert: (a) `assignment.size === n`; (b) `new Set(assignment.values()).size === n` (bijection); (c) no `giver === recipient`; (d) the permutation is a **single cycle** (walk from index 0 and confirm you visit all `n` before returning). This test is cheap and is the single highest-value test in the project.
3. **Guard the small-`n` cases explicitly.** `n = 1` has no derangement at all (a "cycle of 1" is a fixed point) — the draw must be blocked. `n = 2` has exactly one valid derangement, so both people trivially know each other's recipient — warn, or require ≥3. Disable "Empezar Sorteo" with an explicit reason rather than throwing.
4. **Compute the draw exactly once, then persist it.** The draw is an *event*, not a derivation. Write all `assignments/{token}` documents plus `event.state = 'drawn'` in one `writeBatch` (or transaction), then discard the local variable. Every screen afterwards reads the persisted state.
5. **Make the draw idempotent.** If `event.state === 'drawn'`, the button is disabled and the permutation is never recomputed. Passing the write batch twice must be harmless — use `setDoc`/batch `set` (not `addDoc`) with deterministic document IDs so a retry overwrites the same rows instead of creating new ones.
6. **Require connectivity for the draw.** Firestore transactions *fail when the client is offline*; batches do not (they queue). Since a partial draw is worse than a failed draw, use a transaction for the state flip and surface a clear "necesitas conexión para hacer el sorteo" message rather than silently queueing.
7. **Snapshot the roster at draw time** (see Pitfall 6): store `participantIds[]` (or at least `participantCount`) on the event document in the same transaction, and assert afterwards that the assignment count equals it.

**Warning signs:**
- Any use of `Math.random()` that is not the single rotation-offset draw.
- The draw function called from a component body, `useMemo`, or a `useEffect` that depends on a Firestore snapshot.
- Refresh changes who you are gifting.
- No assertion/test on bijection; no test with `n = 2` or `n = 3`.
- The permutation is not visible in Firestore after the draw (i.e. it is recomputed each time instead of stored).
- `shuffle()` imported from a utility and paired positionally with the unshuffled list.

**Phase to address:**
`Phase 4 (Draw logic)` — the pure function and its property tests, plus the atomic persistence and idempotency guard. The `< 3` guard belongs here too, and the "connectivity required" error state in `Phase 5`.

**Sources / confidence:** mathoverflow #50049 (the hat-draw is not uniform over derangements); Rose-Hulman "The Secret Santa Problem" (White, 2006); Rosetta Code derangements. MEDIUM — the mathematics is elementary and verifiable from the tests in (2).

---

### Pitfall 6: The roster mutates after the draw

**What goes wrong:**
Someone joins via the shared link after "Empezar Sorteo" was pressed (they were at work, they saw the message late). Now `assignments` has entries for the original `n` participants only: the newcomer has no assignment to read (blank "Te ha tocado regalar a…" screen) and nobody was assigned *to* them (so they will receive nothing). The reverse also happens: someone leaves or is removed, leaving a participant gifting a person who is no longer in the event, or a participant nobody gifts. If the app "handles" this by re-running the draw, it silently invalidates every order already submitted against the previous pairing — the orders then point at the wrong sizes/teams.

**Why it happens:**
The lobby and the post-draw view share the same participants collection, so "joining" has no state gate. The circular draw is a function of the roster, so roster changes invalidate it — but nothing enforces that because the roster is just a live collection.

**How to avoid:**
1. **Model an explicit state machine on the event document:** `state ∈ 'lobby' | 'drawn' | 'closed'`. Joining (`participants` create) and preference edits are only allowed while `state === 'lobby'`.
2. **Enforce it in rules, not just the UI** — the UI is a hint; the rule is the boundary:
   ```
   match /participants/{id} {
     allow create: if request.auth != null
                   && get(/databases/$(database)/documents/event/main).data.state == 'lobby';
     allow read:   if true;
     allow update: if request.auth.uid == id
                   && get(/databases/$(database)/documents/event/main).data.state == 'lobby';
     allow delete: if false;   // no leaving once you are in the draw
   }
   ```
3. **Freeze a roster snapshot at draw time.** Store `participantIds[]` and `participantCount` on `event/main` inside the draw transaction. Post-draw views render from the snapshot (joined to live participant docs for display), so a stray doc cannot silently change the pairing.
4. **Block deletion entirely after the draw**, and give the Admin an explicit, visible "Anular sorteo" action (only while no orders exist) if the roster must change — deleting assignments and resetting `state` to `'lobby'`, with a confirmation that submitted orders will be cleared.
5. **Show the latecomer a real state, not a blank screen:** if `state !== 'lobby'` and the viewer has no assignment, render "el sorteo ya se ha hecho — pide al organizador que te añada" (or the Admin's re-draw path). A blank screen here reads as a bug and generates support messages.

**Warning signs:**
- No `state` field on the event document, or `state` exists but is only used to hide a button.
- Participants can be created/deleted after the draw.
- The post-draw view computes assignments from the live participants collection.
- The Admin panel has no way to see "hay gente que entró después del sorteo".

**Phase to address:**
`Phase 4 (Draw logic)` for the state machine + roster snapshot; `Phase 3 (Lobby)` for the join gate and the "already drawn" state message; `Phase 1` for the rules.

**Sources / confidence:** Domain reasoning over the PROJECT.md flow + Firestore rules `get()` patterns. MEDIUM (design-level, not a documented incident).

---

### Pitfall 7: Names as identity keys (duplicate and ambiguous participants)

**What goes wrong:**
Because entry is name-only, the name is the obvious primary key: `participants/{name}`, or a uniqueness check "does a doc with this name exist?". Two friends called Javi — or one person typing `javi` and the other `Javi `, or "Javi G." vs "Javi" — silently collide. Effects: the second Javi's document overwrites the first's preferences; the lobby shows one Javi for a two-Javi group; the draw runs with 3 participants instead of 4; one person receives nothing; the export lists one jersey where two are needed. Case/whitespace/accent variants make this nondeterministic and hard to reproduce, and the person affected is usually the one who joined second and never mentions it.

**Why it happens:**
Names *feel* unique within a small group of friends, and a name-keyed document is the shortest path to "entrar con tu nombre". The failure is invisible until the group actually has a collision, which is exactly the group this app is for.

**How to avoid:**
1. **Document IDs are opaque.** `participants/{crypto.randomUUID()}` (or the anonymous-auth `uid`). The name is a *display field*, never an identifier, never a key, never used to look anything up.
2. **Detect duplicates at join, in a transaction.** Keep a normalised-name index: `nameIndex/{normalized}` where `normalized = name.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'')`. Creating the participant and the index entry in the same `runTransaction` makes the second Javi's transaction fail with `ALREADY_EXISTS` — this is the "unique constraint" pattern for Firestore, since rules alone cannot enforce uniqueness.
3. **Ask, don't block.** On collision, present a real choice: *"Ya hay un «Javi» en el evento. ¿Eres tú?"* → reclaim via the recovery path (Pitfall 8) — or *"Soy otro Javi"* → require a disambiguator (`Javi G.`), i.e. the display name must differ. Do not auto-append `(2)`, which produces two indistinguishable entries in the draw and the export.
4. **Show full names everywhere that matters.** The lobby and the post-draw confirmation are the places where a collision is fatal (it is how you learn whom you are gifting). Never abbreviate to first names in those views.
5. **Never use the name in the export as a join key.** The export identifies rows by order/participant ID; the name is a label. (Also prevents two "Javi" rows merging in a spreadsheet pivot.)
6. Add a phase acceptance test: two participants judged to be duplicates at the same instant → exactly one participant document exists.

**Warning signs:**
- `doc(db, 'participants', name)` or `query(where('name','==', name))` used as a lookup.
- A React `key={participant.name}` (duplicate keys → React warnings and wrong list reordering — a useful early smell).
- Two participants with the same displayed name in the lobby, or a group size that is one short of the real head-count.
- Case- or accent-variant names appearing in the roster.

**Phase to address:**
`Phase 2 (Identity & Event creation)` for the UUID/uid document ID and the `nameIndex` transaction; `Phase 3 (Lobby)` for the duplicate prompt and disambiguator UX.

**Sources / confidence:** Firestore has no native unique constraint (widely documented pattern: deterministic ID + transaction); React duplicate-key warnings. MEDIUM.

---

### Pitfall 8: `localStorage` identity — lost, or spoofed in 30 seconds

**What goes wrong:**
The participant's identity (their token, their admin flag) is kept in `localStorage`. Two failure modes:
- **Lost.** Clearing site data, private/incognito mode, Safari's storage eviction, a switch to the phone, or a "clear cookies" cleanup wipes it. The user re-enters their name, becomes a *new* participant, and — critically — **loses their assignment and any order they already submitted**. In the worst ordering, they submit a second order under the new identity and the Admin exports two jerseys for one person.
- **Spoofed.** Because there is no auth, `localStorage.setItem('isAdmin','true')` or pasting someone else's token into `localStorage` grants that person's view. The full mapping is then one script tag away. The "surprise" survives only because nobody bothers — but anyone reading the network tab can see which endpoints carry tokens, and the app has no second line of defence.

**Why it happens:**
"No password" is implemented as "no identity at all, just remember the name", which conflates *convenience persistence* with *authorisation*. `localStorage` is the obvious (and correct) tool for the former and the wrong one for the latter — but the distinction is invisible while everything works.

**How to avoid:**
1. **Separate the two concerns.** Identity for *authorisation* comes from Firebase **Anonymous Auth** (`signInAnonymously()` → `request.auth.uid`, server-assigned, not editable by the user). Identity for *convenience* (remembering which participant doc is mine) may live in `localStorage` — but it must always be validated against the server: the participant doc's `uid` field must equal `request.auth.uid`, enforced in rules (`allow update: if request.auth.uid == resource.data.uid`). Then editing `localStorage` gets you nothing.
2. **Never gate the Admin UI on a local flag.** Admin is `event.adminUid === request.auth.uid`, read from the server document. A local `isAdmin` is spoofable *and* wrong after a device switch.
3. **Make recovery first-class, because anonymous auth has the same loss problem** (the anonymous uid dies with the browser storage). At join, show a short, human-copyable **recovery code** (derived from the participant token, or the token itself) and tell the user to keep it — WhatsApp-it-to-yourself. Provide "No veo mi sorteo / me he cambiado de móvil → introducir código de recuperación", which re-binds the anonymous uid to the existing participant doc via a transaction.
4. **Store the token in a single namespaced key** (`secretifo:token`) to avoid collisions with other apps on the same origin (a real class of bug when apps share a preview/dev domain), and version it (`secretifo:v1:token`) so a schema change doesn't silently log everyone out into a duplicate participant.
5. **Detect the "same name, new identity" case** and route it to the duplicate prompt (Pitfall 7) instead of creating a second participant — this is the *most likely* real-world duplicate, and it is recoverable if the app asks rather than assumes.
6. Accept and document the residual risk: with no auth and a friend-group link, a technically capable participant can impersonate another *if* they obtain that person's token. Anonymous auth removes the trivial `localStorage` edit; nothing removes token theft. Do not claim more than that.

**Warning signs:**
- `localStorage.getItem('participantName')` used to decide *who you are* on the server side.
- The Admin view is reachable by setting a key in devtools.
- No recovery UI anywhere; no "codes" surfaced to the user.
- Duplicate participant documents appearing after a user clears storage and re-joins.
- Participants disappearing from the lobby in incognito mode.

**Phase to address:**
`Phase 2 (Identity & Event creation)` — anonymous auth, token persistence, recovery code. `Phase 5 (Post-draw view)` for the "recover my assignment/order" path.

**Sources / confidence:** Firebase anonymous auth patterns; localStorage per-origin collision reports; unknown-identity recovery UX. MEDIUM.

---

### Pitfall 9: The Admin export (or the Admin view) leaks the pairing

**What goes wrong:**
An export built by joining `participants` + `assignments` naturally carries either the giver or the recipient as a column — the recipient's name is *right there* in the join, and it is the most useful-looking field in the whole export ("Pedido de: Javi → para: Marta"). One stray `recipientName` column, one `giver` field on the order document, or one "who ordered what" table in the Admin panel, and the single requirement this project exists to satisfy is broken — and broken in the artefact that gets shared with the seller, i.e. publicly. A subtler variant: the Admin page shows "N de M pedidos completados" by listing the `orders` collection, where each order document carries the giver's identity; combined with publicly visible declared sizes in the lobby, that is often enough to *infer* the edge (if exactly one person in the group wears an XXL and an XXL order exists, you know who the giver is gifting).

**Why it happens:**
The export is written last, as a "just dump the data" task, by reading whatever collections exist. The join is the laziest way to get a complete row, and the forbidden field is the one that makes the row "complete". Nobody writes a test for the absence of a column.

**How to avoid:**
1. **The export reads one collection: `orders`.** Never `assignments`, never a join. `orders/{id}` contains only what the seller needs: `size, type (Fan/Player/Retro), team, season, serigrafia, dorsal`. No `giver`, no `recipient`, no participant name unless it is the *name to print on the shirt* (which is a shirt field, not an identity field — keep them distinct in the schema).
2. **Separate the progress counter from the payload.** Anonymous orders have no owner, so "how many have filled it in" cannot come from `orders`. Keep a second, payload-free collection `submissions/{token} = { done: true, updatedAt }` that the Admin may `list` (count only). The Admin export path and the Admin count path then touch disjoint collections and neither can reconstruct the edge.
3. **Encode the invariant in the type system.** Define `OrderExportRow` with exactly the allowed keys, and build the CSV from `Object.entries` over that type — a forbidden field then cannot be added without changing the type, which is reviewable.
4. **Automate the check.** A test that: (a) greps the Admin feature directory for `assignments` and fails if found; (b) generates the export for a fixture and asserts the header row equals the exact expected list; (c) asserts no cell value equals any participant's display name (unless it is a serigrafía value, which the fixture controls).
5. **Keep the "who gives to whom" mapping out of the Admin UI entirely.** The Admin sees: participants registered, orders completed, export button. Not a table with two name columns.
6. **Don't log the mapping.** Not to `console`, not to error reporters, not to an analytics event. React DevTools and the network tab are both trivially openable, and a screen-share during the party is a real scenario.

**Warning signs:**
- Any Admin code path reading `assignments` or `participants` joined with `assignments`.
- `recipient`, `para`, `giver`, `asignado`, or a second name column in the export header.
- The export generated by `getDocs(participants)` and then enriching rows.
- `console.log` of the draw or the assignment map anywhere in the codebase.
- The Admin panel rendering more than counts + a download button.

**Phase to address:**
`Phase 6 (Admin export & privacy)` — schema of `orders`/`submissions`, the export test, and the "no assignments in Admin" invariant. The `orders` schema itself is fixed in `Phase 5 (Order form)`, which must not put a giver or recipient field on the order document in the first place.

**Sources / confidence:** Domain-specific reading of PROJECT.md's core value; general Firestore "never expose derived secrets" guidance. MEDIUM — the inference attack is a design analysis, not a documented incident.

---

## Moderate Pitfalls

### Pitfall 10: `onSnapshot` listener leaks (and StrictMode's double invocation)

**What goes wrong:**
Two ways, both ending in the same place:
- **Leak.** `useEffect(() => { onSnapshot(collection(db,'participants'), cb) })` with no dependency array and no returned unsubscribe. The effect re-runs on every render, stacking a new listener each time. This is a *real* reported crash — apps get "React is out of memory" after a tab is left open — and it inflates quota, because a stacked listener re-reads the full result set on each attach (the canonical StackOverflow case bills 50 reads on the first pass, then 100, then 200). It also causes the "stale data on the previous page" bug when navigating between the lobby and the post-draw view: the old listener keeps pushing data into unmounted components.
- **Duplicate work / duplicate writes.** React StrictMode deliberately runs `setup → cleanup → setup` in development. If the effect *writes* something on mount (the classic "first user creates the event", see Pitfall 4), the double-invocation creates it twice locally. The instinctive fix — deleting `<StrictMode>` — is the wrong one: it hides a genuine non-idempotency that will also manifest in production on remounts, fast-refresh, and React Router navigations.

**Why it happens:**
`onSnapshot` returns an unsubscribe function that is easy to ignore — the code "works" without it, and the failure is time-delayed (memory grows, quota burns, the tab eventually dies). And StrictMode's behaviour is read as a bug rather than a stress test.

**How to avoid:**
1. **Always return the unsubscribe**, and never omit the dependency array:
   ```js
   useEffect(() => {
     const unsub = onSnapshot(
       doc(db, 'event', 'main'),
       (snap) => { setEvent(snap.data()); },
       (err) => { setError(err); }          // never skip the error callback
     );
     return unsub;
   }, []);
   ```
   `return unsub;` is literally the teardown — no wrapper function needed.
2. **Always supply the error callback.** A listen can fail on permissions or an invalid query; after an error the listener receives no further events. Without the callback the failure is silent and the UI hangs on "loading" forever — which is also Pitfall 12.
3. **Keep StrictMode on** and make the setup idempotent instead. Any write-on-mount must be a `setDoc`/transaction against a deterministic ID (Pitfall 4), never `addDoc`. Then the double-invocation is harmless, which is the actual point of the check.
4. **Centralise subscriptions in hooks** (`useEvent()`, `useParticipants()`, `useMyAssignment()`) that own their own cleanup, and forbid raw `onSnapshot` calls in components. One place to audit beats twenty.
5. **Scope listeners narrowly.** Subscribe to `event/main` + the `participants` collection + your own `orders/{token}` — not to "everything the app might need". A listener per screen, torn down on navigation, is cheap at this scale; a long-lived listener per screen on top of a leaked one is not.
6. **Guard against setState-after-unmount noise**, but note that React 18+ no longer warns about it — the real symptom to watch for now is duplicate data, duplicate writes, and a growing `about:memory` footprint, not a console warning.

**Warning signs:**
- `onSnapshot(` appears without a `return` of its result within the same effect.
- `useEffect` with no second argument.
- `<StrictMode>` removed from `main.jsx`/`main.tsx`, or a comment explaining why it was disabled.
- Clearing a listener on navigation requires clicking the page twice before new data appears.
- "React is out of memory", or the required page reload after a while in the lobby.

**Phase to address:**
`Phase 1 (Foundation)` — establish the data hooks (with cleanup) as the *only* way components read Firestore, before there are components to leak from. `Phase 3 (Lobby)` is where the leak would first appear; `Phase 4` for the write-on-mount idempotency.

**Sources / confidence:** Firebase "Get realtime updates" (#detach_a_listener, listen errors); React docs on Effect cleanup and StrictMode; SO 73342659 ("out of memory") and SO 65659438 (read amplification from stacked listeners). MEDIUM-HIGH — both official docs retrieved directly.

---

### Pitfall 11: CSV/Excel export traps (encoding, delimiter, leading zeros, squad numbers)

**What goes wrong:**
The export is the Admin's actual deliverable — it goes to a seller who opens it in Excel. Each of these breaks it, and none of them show up in a browser preview:
- **Encoding.** Spanish names and shirt personalisations contain `ñ`, `á`, `é`, `ü`. A UTF-8 CSV **without a BOM** is opened by Excel as ANSI/locale, producing mojibake (`MartÃ­n`, `Ã‘`). This is documented as affecting both Windows and Mac Excel.
- **Delimiter.** Excel's list separator is locale-dependent. On a Spanish/European locale the separator is **`;`**, so a comma-delimited CSV swallows the whole row into one cell — a 6-column export becomes a single column. Emitting a `sep=;` hint line backfires unless the BOM is written *first*, because the `sep=` line breaks BOM detection.
- **Leading zeros / numeric coercion.** Excel strips leading zeros from numeric-looking fields. Dorsal numbers like `09` become `9`; a dorsal like `007` becomes `7`. Worse, long digit strings get converted to scientific notation and are truncated to 15 significant digits on save — silently corrupting data.
- **Squad numbers as numbers.** Dorsal is a *label*, not a quantity (`09`, `10`, `100`). Storing it as a `Number` in Firestore and emitting it unquoted loses the leading zero before the file even reaches Excel.
- **Quoting / injection.** Fields containing the delimiter, quotes, or newlines (a free-text "equipos prohibidos" field, or a shirt name with a comma) split the row. A leading `=`, `+`, `-`, `@` in a text field makes Excel evaluate it as a formula (CSV injection) — relevant because preferences and personalisations are user-supplied free text.

**Why it happens:**
The export is tested by downloading the file and looking at it in a text editor or in VS Code's CSV preview, both of which handle UTF-8 and commas correctly. The bug only exists inside Excel, on a Spanish locale, which is precisely the environment used at 11pm the night before the party.

**How to avoid:**
1. **Write UTF-8 with a BOM.** `new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })`. If an explicit delimiter hint is desired, the order is: BOM, then `sep=;`, then the header.
2. **Pick the delimiter for the audience.** For a Spanish-locale seller, `;` is the safer default; but then quoting must still be correct and the BOM must come first. Alternatively emit **XLSX** (SheetJS) — it removes the encoding/delimiter class of bug entirely at the cost of one small dependency. For a 10-row export, offering both `.csv` (BOM + `;`) and `.xlsx` is cheap insurance.
3. **Quote every field, always.** Escape `"` as `""`. Never build CSV with `Array.join(',')`.
4. **Preserve leading zeros.** Store `dorsal` as a string, quote it in the CSV, and (for XLSX) write it as a text-formatted cell. Also expose `#` in the header so Excel treats it as text.
5. **Neutralise formula injection** for free-text columns: prefix any value starting with `= + - @` (or tab/CR) with `'` or wrap in quotes and strip on re-import. The export is opened by a human in Excel for real, so this is a live concern, not theoretical.
6. **Test the export on the target locale.** Keep a fixture with `Javi Gutiérrez`, `Ñoño`, a charset-breaking name, a shirt name containing a comma and a quote, and dorsals `09` / `100`. Assert the decoded bytes start with `EF BB BF` and that a real Excel open (or a `pandas.read_csv(encoding='utf-8-sig', sep=';')` round-trip) yields the expected 5 columns.
7. Use `\r\n` line endings — Excel is happier, and mixed endings cause some sellers to see one long row.

**Warning signs:**
- `Blob([csv])` with no `\uFEFF`.
- CSV assembled with `rows.map(r => r.join(',')).join('\n')`.
- `dorsal` typed as `number` in the schema, or `Number(dorsal)` anywhere.
- The export verified only by opening it in a browser or an editor.
- The seller reports "solo veo una columna" or "salen símbolos raros".

**Phase to address:**
`Phase 6 (Admin export & privacy)` — the serialiser, its fixture test, and the locale check. The `dorsal`-as-string decision is made in `Phase 5 (Order form)` (the input and its Firestore type).

**Sources / confidence:** Microsoft support "Opening CSV UTF-8 files correctly in Excel"; SO 6588068 (both Windows and Mac Excel garble UTF-8 without BOM); Watermark "Preparing Data for CSV-UTF-8 Imports" (leading zeros dropped); SO 20395699 (`sep=` vs BOM ordering). MEDIUM-HIGH — the encoding behaviour is consistently documented.

---

### Pitfall 12: Missing loading / empty / error states (and the duplicate-participant loop they cause)

**What goes wrong:**
Firestore listeners deliver an initial snapshot from the local cache and only then reach the server, so there is a real window where "no data" and "not loaded yet" look identical. The lobby renders `participants.length === 0` and shows "Aún no hay nadie" or "Sé el primero", *to a user who is already registered*. That user reasonably concludes the app lost their entry, and re-submits their name — creating a **duplicate participant** (Pitfall 7) that the Admin then has to reconcile, and potentially re-running the "first user" path (Pitfall 4). The post-draw view has the same problem in a worse place: a blank "Te ha tocado regalar a…" reads as an error, and the user reloads or re-joins, and now they cannot see whom to gift.

Related gaps: no error state for `permission-denied` (rules deployed mid-session, or anonymous auth not yet signed in), no state for quota exhaustion (`resource exhausted`, Pitfall 13), no offline state, no "0 orders yet" state for the Admin export button (which then emits an empty CSV), and no "sorteo no iniciado" state for someone who opens the post-draw route directly.

**Why it happens:**
The happy path is built first and every non-happy path is deferred — while every non-happy path here looks *exactly* like a data-loss bug to the user, and the user's recovery action (re-join) corrupts the data.

**How to avoid:**
1. **Model three states explicitly, always:** `loading | error | ready`, and only render "empty" when `ready && data.length === 0`. A `useParticipants()` hook returning `{ data, loading, error }` (never a bare array) makes the distinction impossible to forget.
2. **Render a skeleton, not a zero-state, before the first snapshot.** And make the zero-state copy unambiguous: "Todavía no hay nadie más. Comparte el enlace." — never "no estás registrado".
3. **Every route needs its own preconditions screen.** `/pedido` with `state !== 'drawn'` → "El organizador aún no ha hecho el sorteo". `/` with `state === 'drawn'` and no local token → "El sorteo ya está hecho; necesitas tu enlace/código". `/admin` as a non-admin → "Esta vista es solo para el organizador".
4. **Surface Firestore errors as copy, not silence.** Map `permission-denied` → "No tienes permiso (¿se han actualizado las reglas?)", `resource exhausted` → "Se ha alcanzado el límite diario de Firebase; inténtalo mañana", `unavailable` → "Sin conexión". Log the raw code for debugging; show the human sentence.
5. **Disable the export button at zero orders** and say why, rather than downloading a header-only file (which the seller will interpret as "no orders").
6. Make the "N de M pedidos" counter show `M` from the frozen roster count (Pitfall 6), never from the live participants length — otherwise a post-draw join makes the progress read `3 de 4` forever and looks broken.

**Warning signs:**
- `const [participants, setParticipants] = useState([])` consumed directly by the UI with no loading flag.
- A route that renders nothing (blank) while `data` is undefined.
- The phrase "no hay participantes" visible to an already-registered user.
- No `.catch`/error callback anywhere in the data layer.
- Duplicate participants appearing within seconds of someone opening the link.

**Phase to address:**
`Phase 1 (Foundation)` for the hook contract (`{data, loading, error}`) and an error boundary; `Phase 3 (Lobby)` and `Phase 5 (Post-draw)` for the per-route precondition screens; `Phase 6` for the disabled-export state.

**Sources / confidence:** Firebase listener semantics (initial cache snapshot; first query snapshot contains `added` for all existing docs; listen error callback); SO/community reports of Firestore-backed SPAs rendering premature empty states. MEDIUM.

---

### Pitfall 13: Free-tier (Spark) Firestore quota surprises

**What goes wrong:**
The daily free-tier limits are: **1 GiB stored, 50,000 document reads/day, 20,000 writes/day, 20,000 deletes/day, 10 GiB/month outbound**. On Spark, exceeding them does **not** bill — the Firestore API simply stops working and returns `resource exhausted` until the daily reset. So the failure mode is *the app is down*, mid-party, with no warning and no bill to explain it. Realistic ways this project hits the ceiling without any abuse: a leaked/stacked listener re-reading the whole collection on a loop (Pitfall 10); an effect that refetches on every render; leaving `npm run dev` open against **production** Firestore and hot-reloading for an afternoon; and — because the rules are open (Pitfall 1) — any third party who scrapes the project ID. The ceiling is generous for ten friends (a 10-person lobby snapshot ≈ 10 reads; a whole evening of traffic is hundreds, not tens of thousands), which is exactly why an unbounded loop is the thing that breaks it.

**Why it happens:**
Reads are invisible in development; "it's free" removes the cost signal; and there is no local data by default (devs forget the Firestore emulator exists), so the dev loop hammering the real project is the default.

**How to avoid:**
1. **Develop against the Firestore emulator.** `firebase emulators:start` + `connectFirestoreEmulator(db, 'localhost', 8080)` behind a `import.meta.env.DEV` check. This is the single biggest quota saver and it also gives you resettable data and a rules playground. Use a separate `demo-*` project ID for the emulator.
2. **Consider a second Firebase project for production** (`secretifo-dev` / `secretifo-prod`) so a dev mistake cannot take down the live event. At this scale one project + emulator is defensible; two is safer and free.
3. **Set a budget/usage alert** on the Google Cloud project and check the Firestore usage tab before the party. Know the daily reset boundary (Pacific time) — "wait until midnight" is the recovery, and it may be after the event.
4. **Bound every listener.** One listener per screen, torn down on navigate (Pitfall 10). Never listen to a collection inside a component that also renders per-item.
5. **Never poll.** No `setInterval(() => getDocs(...))`; `onSnapshot` exists precisely for this.
6. **Write a friendly quota error state** (Pitfall 12) so "the app is broken" reads as "límite diario de Firebase alcanzado" and the group can fall back to WhatsApp rather than debugging at the party.
7. **If it matters enough, upgrade to Blaze** with a hard budget cap. Blaze keeps the free allowance and only charges above it ($0.03/100k reads, $0.09/100k writes), so ten friends cost cents — but then a runaway loop becomes a small bill instead of an outage. Either is fine; leaving Spark *and* leaving open rules *and* having a leak is the bad combination.

**Warning signs:**
- `firebase.json` has no `emulators` block, or `connectFirestoreEmulator` is absent from the codebase.
- Dev work happening with production credentials and no emulator.
- A listener or fetch inside a render path.
- Usage graph shows a flat-to-vertical read climb with no matching user activity.
- Sudden `resource exhausted` / `Failed to get document because the client is offline`-style errors during the event.

**Phase to address:**
`Phase 1 (Foundation)` — emulator wiring and the `{data, loading, error}` hook contract that makes runaway reads visible. Re-checked in `Phase 7 (Hardening/rehearsal)` with a dry run on production before the real event.

**Sources / confidence:** Firestore "Usage and limits" official quota table (50k reads / 20k writes / 1 GiB free); community reports that Spark overage returns `resource exhausted` rather than billing; Blaze pricing ($0.03/100k reads, $0.09/100k writes). MEDIUM-HIGH — official quota figures.

---

### Pitfall 14: Size-guide table on mobile, and size-guide data drift

**What goes wrong:**
Two problems in one component, and both are user-facing on the device most people will use:
- **Layout.** The Fan table is 6 sizes × 4 metrics (Long, Altura, Peso — plus the letter equivalence) and the Player table is 5 sizes × 4 metrics. Rendered as a plain `<table>` on a 360px phone, it either overflows the viewport (forcing the whole page to scroll sideways, which breaks the modal it lives in) or squashes into unreadable 9px text. Wrapped in a fixed-height modal, a tall table gets clipped and the close button or the bottom rows become unreachable — especially with the on-screen keyboard open on the order form underneath.
- **Data drift.** PROJECT.md mandates that the size guide and prices be incorporated **literally**. If the numbers are typed into JSX in one component and repeated (or PDF-sourced) in another, a transcription error in a single cell sends someone a shirt that doesn't fit — and the sizes are inconsistent between versions (Fan: `S,M,L,XL,XXL,XXXL` mapped to `P, M, G, GG, XG, 2XG`; Player: `S,M,L,XL,2XL` — note the *different* size ladder, no `XXXL`, `2XL` instead). Players' rows also use a different metric set (includes `Ancho`). Rendering one generic table for both will silently mismatch labels. **Also flag a suspected source-data anomaly for confirmation rather than "fixing" it: the Player `L` weight range is `70-78`, identical to `M`'s `70-78`, and `2XL` jumps from XL's `78-86` to `94-104`.** Render the source values verbatim and raise a question before launch — silently "correcting" mandated reference data is its own pitfall.

**Why it happens:**
Tables are the natural representation of a size chart and are trivially written for desktop; the two versions look similar enough to be templated together; and reference data is copied by hand from the source rather than encoded once and tested.

**How to avoid:**
1. **One module, one source of truth.** `src/data/sizeGuide.ts` exporting `FAN_ROWS` and `PLAYER_ROWS` and `PRICES` exactly as specified in PROJECT.md. No size or price literal anywhere else in the codebase — a grep for `73` / `11$` / `XXL` in components should come up empty.
2. **Freeze the data with a test.** A unit test asserting the exact rows, sizes, and the three prices (`Fan = 11$`, `Player = 16$`, `Retro = 15$`). This is a 20-line test that makes a transcription error impossible to ship, and it is the authoritative interpretation of "incorporar literalmente".
3. **Responsive strategy: transpose, don't shrink.** Below `sm`, render one **card per size** (size letter as the heading, metrics as label/value rows) instead of a table; keep the real `<table>` at `sm+`. Users read *one size's* numbers, so the card layout is genuinely better, not just a workaround. If a table is kept, wrap it in `overflow-x-auto` with `-webkit-overflow-scrolling: touch` and a visible "desliza →" affordance — a bare table forces the *page* to scroll sideways.
4. **Make it a `<dialog>`/modal with `max-h-[90vh] overflow-y-auto`** and a sticky header, so long tables scroll inside the modal and the close control stays reachable. Test with the on-screen keyboard open on a real phone.
5. **Break long values intelligently.** `69-71cm` should use a non-breaking hyphen or `whitespace-nowrap` so ranges don't split across lines; `tabular-nums` keeps the columns aligned.
6. **Two tables, two components** (`FanSizeGuide`, `PlayerSizeGuide`) driven by the shared data module — never a single component with conditional columns.
7. **Type the size enum once** (`type Size = 'S'|'M'|'L'|'XL'|'XXL'|'XXXL'|'2XL'`) and derive the form's `<select>` from it, so the size guide and the order form cannot disagree about what sizes exist.

**Warning signs:**
- Size metrics or prices appearing in more than one file.
- A horizontal scrollbar on the *page* (not the table container) on a 375px viewport.
- Font sizes below 12px in the size table; tap targets below ~44px.
- The Player table showing `XXXL`, or the Fan table showing `2XL`.
- The size modal clipped, or its close button unreachable, on a phone.
- Any cell value differing from PROJECT.md.

**Phase to address:**
`Phase 3 (Preferences & size guide)` — data module, its test, and the responsive modal. The size enum is shared with `Phase 5 (Order form)`.

**Sources / confidence:** Community consensus on responsive tables (`overflow-x: auto` container, card/transpose on mobile — w3schools, muhimasri, r/webdev) plus the PROJECT.md reference-data constraints. MEDIUM for styling; HIGH for the data-fidelity requirement (it is quoted verbatim in PROJECT.md).

---

## Minor Pitfalls

### Pitfall 15: Firestore field-value traps in the order form

**What goes wrong:**
Three small, high-frequency errors:
- **`undefined` is rejected.** Firestore throws `Unsupported field value: undefined` when a document contains an `undefined` value. An order form with optional fields (no dorsal, no serigrafía name, no season for a Retro shirt) produces exactly that on the happy path — the form "just fails" with a cryptic SDK error and no submit.
- **`serverTimestamp()` reads as `null` on the first snapshot.** Local writes are reflected immediately (latency compensation) with `createdAt: null` until the server responds. Sorting a list by `createdAt` then makes the just-submitted order jump to the top and then reorder — and any "submitted at" display flashes "Invalid Date". `metadata.hasPendingWrites` is how you tell local from confirmed.
- **Numbers come back as strings.** Everything typed into an `<input>` is a string; `Number(dorsal)` where dorsal is `09` loses the leading zero (and interacts with the CSV bug in Pitfall 11); a size typed as text compared against a numeric enum silently never matches.

**Why it happens:**
The optional fields are added last; `serverTimestamp()` is copied from a tutorial; and TypeScript is not used (or typed as `any`) on the write path, so nothing complains.

**How to avoid:**
- Build the write payload from a typed object and strip/convert empty values: `Object.fromEntries(Object.entries(row).filter(([,v]) => v !== undefined && v !== ''))`, or explicitly `?? null`.
- Keep `dorsal` and any shirt-print text as **strings**, always.
- When displaying timestamps from a live listener, handle `null` (`createdAt?.toDate?.() ?? 'enviando…'`); sort by a stable field (name/order id) rather than by `createdAt`, or re-sort once `hasPendingWrites` is false.
- One Zod/valibot-style parse (or an explicit `validateOrder()`), shared between form validation and the write, so the schema is stated once.

**Warning signs:** `Unsupported field value: undefined` in the console; `Invalid Date` in the UI; a dorsal of `09` exported as `9`; orders reordering themselves a second after submit.

**Phase to address:** `Phase 5 (Order form)`.

---

### Pitfall 16: Non-idempotent writes on flaky mobile networks

**What goes wrong:**
A participant submits their order on mobile data, the write times out (or the tab is closed mid-write), the UI shows an error, and they press submit again. With `addDoc` that produces **two order documents** — one jersey ordered in duplicate in a real purchase. Firestore's offline queue makes this worse in the other direction: a write that *looked* failed may still be queued and land later, so the "retry" is genuinely a second write.

**Why it happens:**
`addDoc` is the default in every tutorial, and an error state that invites a retry is a natural (correct!) UX decision — the bug is on the write side.

**How to avoid:**
- Use `setDoc` with a **deterministic document ID** (the participant/token ID) so a retry overwrites the same document. This makes submission naturally idempotent and also gives the participant exactly one order.
- Surface `hasPendingWrites` as "guardando…" rather than an error, and only show a retry on a real `permission-denied`/`unavailable` failure.
- Enable offline persistence if you want the queue (it is on by default in modern SDKs for web via IndexedDB); the deterministic ID is what makes the queue safe.

**Warning signs:** Two orders for one participant in the Admin count (`N de M` exceeding `M`); the participant swearing they only pressed once; duplicates appearing after a reconnect.

**Phase to address:** `Phase 5 (Order form)`; the "duplicate order" reconciliation view (if needed) in `Phase 6`.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| No Firebase Auth; key participants by name | Zero login friction; fastest path to "entra con tu nombre" | Rules cannot enforce ownership; leave-the-seat, impersonation, and duplicate-name collisions all become unfixable at the rules layer | **Never.** Anonymous Auth costs nothing and requires no user-visible step. Disable it only if you also accept Pitfalls 1, 2 and 8 as permanent |
| Admin role held in `localStorage` | No schema change; instant "you're the admin" UX | Wrong after a device switch; spoofable; the event can be orphaned with no reachable admin | Only for a throwaway local prototype, never for the shared link |
| A single `event` document holding the whole draw | One read fetches everything; trivial to build | Destroys the core privacy requirement in one document (Pitfall 2) | Never |
| `assignments` readable with `allow read` (instead of `get` + `allow list: false`) | Participants read their own row with no token plumbing | Collection is enumerable by anyone, including the Admin (Pitfall 2) | Never |
| Storing the whole export as a pre-generated file in a public collection | The Admin export is "just a link" | The file is world-readable (and, if it ever contained the join, permanently leaks the mapping) | Never for anything containing a pairing edge; fine for an aggregate the Admin already sees |
| Client-side draw without a Cloud Function | No backend (matches the Out of Scope decision); simple | A determined Admin can always reconstruct the mapping | Acceptable **if** documented as a known limitation — accidental exposure is prevented, adversarial is not |
| Emitting CSV only, `;`-delimited, no BOM | No extra dependency | Mojibake and one-column exports on Spanish-locale Excel (Pitfall 11) | Never; the BOM is a two-character change |
| Skipping the Firestore emulator and developing against production | No extra setup | Burned quota, polluted production data, and a dev mistake that can take down the live event | Only for a single, disposable spike that is deleted afterwards |
| One phase late: no `loading`/`error` states | Ships the happy path sooner | Users re-join and duplicate themselves; blank screens read as data loss (Pitfall 12) | Never — the hook contract costs minutes |
| Hardcoding the pairings during early development to test the post-draw screen | Fast UI iteration without the draw | The hardcoded map ships, or leaks into a fixture the Admin panel renders | Acceptable in a fixture/branch that is deleted before merge; **never** in a committed component |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Firebase Hosting / any static host (SPA deep links) | Deploying the Vite `dist/` without a rewrite rule; `/auth/join` 404s on refresh or when the link is shared | Add `"rewrites": [{ "source": "**", "destination": "/index.html" }]` to `firebase.json` (equivalent on other hosts: `_redirects`, `vercel.json`). Test by opening a deep link in a fresh tab, not by clicking in-app |
| Vite env vars | Expecting the hosting dashboard value to take effect at runtime | Vite inlines env vars at **build time**; changing a value requires a rebuild + redeploy. `loadEnv('')` merges `process.env` — never inline it via `define` |
| Firebase web config in `import.meta.env` | Treating the `apiKey` as a secret, or bolting on a proxy to hide it | The config is public by design; the boundary is `firestore.rules`. Keep values in `.env.local` for portability, and never put a service account or CI token in a `VITE_`-prefixed file |
| Firestore transactions | Using a transaction while offline, or reading after writing inside it | Transactions fail offline and require all reads before writes; use a batch for the draw's payload + a transaction for the state flip, and surface "necesitas conexión" |
| Firestore `get()` inside security rules | `get()`-ing a document that doesn't exist yet in a `create` rule (throws / denies unexpectedly); using a rule that re-reads the doc being created; or forgetting that **every `get()`/`getAfter()` in a rule is billed as a document read** | Use `getAfter()` for "the state after this write", and read the already-existing event doc rather than the doc being created. Keep `get()` calls out of high-frequency read paths (this project's `isAdmin()` adds one billed read per rule evaluation — negligible for a 10-person batch, not for a loop) |
| Firestore `undefined` values | Passing a form object straight to `setDoc` with optional fields empty | Strip `undefined`/`''` or coerce to `null` before writing |
| Vite + Tailwind setup | Following a Tailwind v3 tutorial on a v4 install (or vice versa) — `@tailwind base/components/utilities` vs `@import "tailwindcss"`, PostCSS vs the `@tailwindcss/vite` plugin — giving an app that renders unstyled with no error | Pin the Tailwind major in `package.json`, follow the matching install guide, and verify styling on the very first component rather than at the end |
| React Router + Firestore listener | Subscribing in the layout route and never tearing down on navigation (listen keeps pushing into a stale screen) | Subscribe per screen or in a hook keyed by the route, returning the unsubscribe |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Leaked/stacked `onSnapshot` listeners | Reads climb while no one is using the app; "React is out of memory"; stale data on the previous page | Return the unsubscribe; centralise in hooks; one listener per screen | Within minutes of one tab left open — the canonical case bills 50 → 100 → 200 reads per re-attach |
| Fetch in a render path / effect with unstable deps | Read usage spikes on every keystroke or re-render; the network tab shows an endless request loop | Data access only inside the `{data, loading, error}` hooks; never call `getDocs` in a component body | Immediately, against production, while developing |
| Listening to a collection *and* each document | Reads scale with `n²`; a 10-person lobby generates ~110 reads per change | Listen once to the collection; derive document data in memory | At ~10 participants the effect is visible; at 50 it is painful |
| Hearing `assignments` with `allow read` | Anyone can `getDocs` the whole mapping (privacy, not performance) | `allow get` on the token path only; `allow list: false` | The moment someone opens devtools |
| Unbounded participant list growth | Lobby snapshot reads grow with the group; the export grows without limit | Realistically fine for a friend group; no pagination needed. Do not build pagination pre-emptively | Never at this scale — do **not** over-engineer here |
| Re-drawing / re-fetching on every snapshot | The pairing changes on refresh; orders land on the wrong person | The draw is persisted; reads derive from stored state | Immediately — a correctness bug first, a cost bug second |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Firestore left in test mode (`if true`) | Full read/write to anyone with the public project ID: delete the event, inject participants, read the pairing, burn the daily quota | Default-deny rules file in the repo, deployed in CI; denial tests; anonymous auth so a rule *can* be written |
| No authentication at all (meaning no rules are possible) | `request.auth` is always `null`; ownership is unenforceable; identity is a spoofable string | `signInAnonymously()` on first load — no password, no user-visible step, keeps the PROJECT.md constraint |
| Admin determined by a client-side flag | Anyone toggles `localStorage.isAdmin` and reaches the Admin surface; the real Admin is locked out after a device switch | Admin = `event.adminUid === request.auth.uid`, read from the server document |
| Assignments enumerable (`allow read` / name-keyed IDs) | The whole mapping in one `getDocs`; the Admin can trivially learn it | 128-bit token doc IDs; `allow get` only; `allow list: false`; an explicit denying tombstone for any `pairs` path |
| Service-account / Admin-SDK credential in the frontend | Complete database compromise; Admin SDK bypasses rules entirely; the credential is public and in git history | Never. No service account in a `VITE_`-prefixed file or anywhere in the SPA. Secret-scan before the first push; rotate if ever committed |
| A pre-generated export file in a public collection | World-readable order list (and a permanent mapping leak if it ever contains the join) | Generate the file client-side on demand from `orders`; never persist it publicly |
| CSV formula injection via user-supplied free text (team names, serigrafía) | The seller's Excel evaluates `/`formulas from a "team" string; data exfiltration or a spreadsheet that misbehaves in front of the seller | Prefix `= + - @` cells with `'`; quote all fields |
| Quota exhaustion as a denial-of-service | An open database lets a stranger take the app offline mid-event with 20k writes | Closed rules + anonymous auth; usage alerts; a graceful `resource exhausted` state |
| Trusting client validation only | A crafted write can set `state: 'drawn'` or forge an `adminUid` | Shape + auth validation in rules; never trust the client's notion of state |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Premature empty state in the lobby ("Aún no hay nadie") shown to a registered user | The user thinks their entry was lost, re-submits their name, and creates a duplicate participant | `loading \| error \| ready` hook; skeleton before the first snapshot; copy that can only mean "nobody *else* yet" |
| Blank post-draw screen for someone who joined late or lost their token | Reads as a bug; the user reloads, re-joins, and cannot see whom to gift | Explicit preconditions screen with the reason and a recovery-code entry point |
| The size guide is unreadable or clipped on a phone | The user guesses a size; the wrong shirt is ordered | Card-per-size layout below `sm`; `overflow-x-auto` fallback; scrollable modal with `max-h-[90vh]`; ≥12px text; ≥44px tap targets |
| No visible "sorteo hecho" moment for the group | People keep checking, some re-enter their name, some think the draw is broken in the last hour | Show a clear "Sorteo hecho ✅" state to everyone in real time the instant `state` flips, and mark the lobby as read-only |
| The Admin export is a wall of rows with no summary | The Admin can't tell whether anyone is missing before sending it to the seller | Show counts first ("7 de 8 pedidos completados"), list only who is *missing*, then the download button |
| Drawing with 2 participants (only one possible pairing) | Both immediately know each other's recipient; the "surprise" is fake | Require ≥3 (ideally ≥4) with an explanatory message; block the button otherwise |
| No confirmation before "Empezar Sorteo" | An accidental tap freezes the roster and invalidates any orders | Confirm dialog that states the consequence ("no podrá entrar nadie más; el sorteo no se puede deshacer") |
| Prices not visible at the moment of choosing | Users pick a Player shirt then discover the price; some want to change after submitting | Prices in the size/type selector *and* on the order form (PROJECT.md already requires them on the order screen) |
| Free-text "equipos prohibidos" with no guidance | The Admin gets unusable vendor instructions ("no el del Barça pero sí el del Barça retro") | Placeholder with a concrete example; show what the recipient wrote verbatim to the giver so they can judge |
| No way to edit a submitted order | A typo in a dorsal is permanent; the user messages the Admin, who has no fix | Allow the giver to edit their own order while `state !== 'closed'`, via the deterministic doc ID (`setDoc` overwrite) |

## "Looks Done But Isn't" Checklist

- [ ] **"First user becomes Admin":** Often missing an atomic guard — verify with **two browser profiles opening the link simultaneously**; exactly one `event/main` document and exactly one matching `adminUid`.
- [ ] **"Circular draw":** Often missing the property assertions — verify bijection (`new Set(recipients).size === n`), no fixed points, and a **single cycle** for `n = 3, 4, 5, 10, 50, 500`; verify the `n < 3` guard actually blocks.
- [ ] **"Draw is persisted":** Often recomputed instead of stored — verify by **refreshing five times** and confirming the recipient never changes, and that `assignments` documents exist in Firestore.
- [ ] **"Privacy preserved":** Often missing the enumeration check — verify `allow list: false` on `assignments` (try `getDocs` in the console and confirm it fails) and confirm no Admin file imports `assignments`.
- [ ] **"Export is safe":** Often missing the column check — verify the CSV header by **exact string comparison** against the allowed list, and that no cell contains a participant's display name unless it is a serigrafía.
- [ ] **"Export works":** Often missing the locale/encoding check — open the file in **real Excel on a Spanish locale** (not VS Code): `ñ`/`á` intact, multiple columns, `09` still `09`.
- [ ] **"Real-time lobby":** Often missing teardown — verify with the React DevTools Profiler / network tab that navigating between routes does not accumulate listeners; leave a tab open 30 minutes and confirm reads do not climb.
- [ ] **"Identity persists":** Often missing recovery — verify in **incognito**, after clearing site data, and on a second device; the user must be able to reclaim their participant, assignment and order (not create a second self).
- [ ] **"Duplicate names handled":** Often missing the uniqueness transaction — verify two simultaneous joins with the same name produce exactly one participant document plus a clear prompt.
- [ ] **"Roster frozen at draw":** Often missing the state gate — verify that creating a participant **after** the draw is rejected by the rules, with a friendly message.
- [ ] **"Security rules are real":** Often missing denial tests — verify unauthenticated write, cross-participant update, and `list` on `assignments` are all **denied** in `@firebase/rules-unit-testing`.
- [ ] **"States exist":** Often missing the error branch — verify `permission-denied`, offline, and `resource exhausted` each render a distinct, human-readable message (simulate by deploying a restrictive rule, going offline, and stubbing the error code).
- [ ] **"Deployed SPA":** Often missing the rewrite rule — verify a **hard refresh on a deep link** in a fresh tab does not 404.
- [ ] **"Tailwind is actually applied":** Often missing at first — verify on the very first component rather than at the end; a v3/v4 config mismatch renders completely unstyled with no error.
- [ ] **"Emulator in use":** Often missing — verify `firebase emulators:start` is running and the app points at `localhost:8080` during development; check that the production usage graph is flat while developing.
- [ ] **"Sizes match the spec":** Often missing a data test — verify every cell against PROJECT.md verbatim, and confirm the Player `L` weight row and the `2XL` gap are *intended* rather than silently "corrected".

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Open security rules discovered late | LOW if caught before abuse; HIGH if abused | Deploy a default-deny ruleset immediately; check the Firestore usage log for foreign writes; if data was tampered with, restore from an export or ask participants to re-enter preferences; rotate nothing (the config is not a secret) |
| Pairing leaked (enumerated or exported) | MEDIUM–HIGH | Cannot be un-leaked. Re-run the draw with a new permutation (`state → 'lobby'`, clear `assignments`, confirm the Admin has not seen it), and warn the group. If only the Admin saw it, a re-draw by the *same* mechanism does not help — the honest options are to change the draw mechanism or to accept it |
| Two admins / two events | LOW | Keep the event with the most participants, delete the other, ensure exactly one doc (`event/main`) and one `adminUid`; participants of the deleted event re-join |
| Bad draw (self-assignment / duplicates) | MEDIUM | Detected before orders: clear `assignments`, `state → 'lobby'`, re-draw. Detected after orders: the orders are still valid *for the recipient* (size/team/dorsal), so repair the mapping and re-notify each giver of the corrected recipient — do **not** ask everyone to re-order |
| Post-draw latecomer | LOW–MEDIUM | If no orders exist: reset to lobby, re-draw. If orders exist: insert the latecomer by swapping a single edge (pick a giver who has not yet ordered, re-point them) and verify bijection holds — a partial re-draw preserves existing orders |
| Duplicate participant (same name) | LOW | Merge: keep the doc with the submitted order/preferences, delete the other, fix the `nameIndex`, confirm the draw roster count is correct and no one is unassigned |
| Identity lost (no recovery code) | LOW | Re-bind manually: Admin reads the participant doc's token from the console and sends the recovery link; requires the Admin to have console access — hence having the Admin be technically comfortable, and hence the recovery code being surfaced *at join* |
| CSV opens as one garbled column | LOW | Re-export with BOM + `;`; or send `.xlsx`. No data change needed — the data in Firestore is fine |
| Leading zeros lost in dorsals | LOW if caught at export; MEDIUM if the seller ordered wrong | Re-export with quoted/text dorsals. If the order was already placed, message the seller with the corrected list |
| Quota exhausted mid-event | MEDIUM (time-based) | Nothing to fix in the moment: the API recovers at the daily reset (Pacific time). Fall back to a shared document/WhatsApp for orders and import manually later. Prevent the recurrence by killing the loop and enabling the emulator |
| Duplicate order (double submit) | LOW | The Admin export deduplicates by order ID (deterministic ID makes this automatic); verify one row per participant before sending |
| Deployed app 404s on a deep link | LOW | Add the rewrite rule to `firebase.json`, redeploy, re-verify in a fresh tab |

## Pitfall-to-Phase Mapping

| # | Pitfall | Prevention Phase | Verification |
|---|---------|------------------|--------------|
| 1 | Open/default Firestore rules | Phase 1 (Foundation & Firebase config) | `@firebase/rules-unit-testing` suite: unauthenticated write, cross-participant update, and collection `list` on `assignments` all **denied** |
| 2 | Pairing readable/enumerable (incl. by Admin) | Phase 4 (Draw) + Phase 6 (Export) | `getDocs(collection(db,'assignments'))` fails from the console; grep proves no Admin file imports `assignments`; no `pairs`/full-mapping document exists |
| 3 | `VITE_` leakage vs. real threat model | Phase 1 (Foundation) | `git ls-files \| grep env` shows no `.env`; secret scan clean; `grep -r "BEGIN PRIVATE KEY" .` empty; the deployed bundle contains only public Firebase config |
| 4 | Two "first" admins / duplicate events | Phase 2 (Identity & Event creation) | Two browser profiles join simultaneously → exactly one `event/main`, exactly one `adminUid`, the loser sees the participant view |
| 5 | Draw integrity (self-assign, bijection, off-by-one, re-draw) | Phase 4 (Draw) | Property test over `n = 3,4,5,10,50,500` × 1000 runs asserts bijection, no fixed point, single cycle; refresh × 5 does not change the pairing |
| 6 | Roster mutation after the draw | Phase 4 (Draw) + Phase 3 (Lobby) | Creating a participant after `state === 'drawn'` is **rejected by rules**; the latecomer sees an explanatory screen, not a blank one |
| 7 | Duplicate/ambiguous names as keys | Phase 2 (Identity) + Phase 3 (Lobby) | Two simultaneous same-name joins → one participant doc + a "¿eres tú?" prompt; `nameIndex` transaction tested |
| 8 | `localStorage` identity lost or spoofed | Phase 2 (Identity) | Editing `localStorage` to claim another participant grants nothing (rule denies); recovery code reclaims the original participant after clearing site data; Admin view unreachable by editing storage |
| 9 | Export/Admin view leaking the pairing | Phase 6 (Export) | Export header equals the exact allowed list; no cell equals a participant display name; the Admin panel renders only counts + download |
| 10 | `onSnapshot` leaks + StrictMode double-invoke | Phase 1 (Foundation) | No raw `onSnapshot` outside the data hooks; `<StrictMode>` present; 30 min open tab shows flat read usage; the write-on-mount path is a deterministic `setDoc`/transaction |
| 11 | CSV/Excel encoding, delimiter, leading zeros | Phase 6 (Export) | Fixture with accents, commas, quotes and dorsals `09`/`100` opens correctly in Excel on a Spanish locale (or a `utf-8-sig` + `;` round-trip test asserts 5 columns and preserved zeros) |
| 12 | Missing loading/empty/error states | Phase 1 (contract) + Phases 3, 5, 6 | Every route has `loading`/`error`/`empty` branches; the lobby never shows a zero-state before the first snapshot; `permission-denied`/offline/`resource exhausted` each show distinct copy |
| 13 | Free-tier quota surprises | Phase 1 (emulator) + Phase 7 (rehearsal) | `firebase emulators:start` is the dev default; the production usage graph is flat during development; a pre-event dry run stays far below 50k reads / 20k writes |
| 14 | Mobile size-guide layout + data drift | Phase 3 (Preferences & size guide) | The size guide is usable at 360px (no page-level horizontal scroll, ≥12px text, reachable close button); a data test asserts every cell and all three prices match PROJECT.md verbatim |
| 15 | Firestore field-value traps (undefined, `serverTimestamp`, numbers) | Phase 5 (Order form) | Submitting an order with all optional fields empty succeeds; the just-submitted row does not show `Invalid Date`; `dorsal` stays a string |
| 16 | Non-idempotent writes on flaky networks | Phase 5 (Order form) | Submitting twice for one participant yields exactly one order document (deterministic ID, `setDoc`) |
| — | SPA deep-link 404 | Phase 1 (Foundation/deploy) | A hard refresh on a deep link in a fresh tab loads the app |

## Sources

- **Vite official docs — Env Variables and Modes** (vite.dev/guide/env-and-mode): `VITE_` values are statically replaced at build time and exposed in the client bundle; "`VITE_*` variables should not contain sensitive information." Confidence: HIGH (official, retrieved directly).
- **vitejs/vite security policy** (github.com/vitejs/vite/security): secret exposure via the `VITE_` prefix or a misconfigured `define` is a project-level configuration mistake. Confidence: HIGH.
- **vitejs/vite issue #21592** — "Improve clarity around `VITE_*` exposure to client": documents that the docs read as if `VITE_` were a protection mechanism. Confidence: MEDIUM.
- **vitejs/vite issue #22561** — `loadEnv('')` merges `process.env` and can leak CI/CD tokens through `define`. Confidence: MEDIUM.
- **Firebase docs — Usage and limits (Firestore)**: free tier 1 GiB, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, 10 GiB/month outbound. Confidence: HIGH.
- **Firebase docs — Learn about and manage API keys**: keys restricted to Firebase services need not be treated as secrets. Confidence: HIGH.
- **Firebase docs — Fix insecure rules**: `auth != null` means any logged-in user has access; Admin SDK bypasses rules. Confidence: HIGH.
- **Firebase docs — Transactions and batched writes / Data contention in transactions**: optimistic concurrency, finite retries, transactions fail offline, reads before writes. Confidence: HIGH.
- **Firebase docs — Get realtime updates with Cloud Firestore**: detach listeners; initial cache snapshot; listen error callback is terminal; `hasPendingWrites`. Confidence: HIGH.
- **firebase-js-sdk issue #6659** — `transaction.set()` failing without retry on "Document already exists" (fixed in v9.14.0). Confidence: MEDIUM.
- **React docs — `useEffect` / Synchronizing with Effects / `<StrictMode>`**: cleanup mirrors setup; StrictMode runs an extra setup+cleanup cycle in development; the fix is a cleanup function, not removing StrictMode. Confidence: HIGH.
- **SO 73342659** — "React is out of memory" from an `onSnapshot` effect with no dependency array and no unsubscribe. Confidence: MEDIUM.
- **SO 65659438** — read amplification from stacked Firestore listeners (50 → 100 → 200 reads). Confidence: MEDIUM.
- **mathoverflow #50049** — the "draw names from a hat, restart on collision" method is not uniform over derangements (`P[Restart] = 5/36` for `n = 4`). Confidence: MEDIUM.
- **M. White, "The Secret Santa Problem"** (Rose-Hulman Undergraduate Mathematics Journal, 2006) — derangements with at least one two-cycle. Confidence: MEDIUM.
- **Microsoft Support — Opening CSV UTF-8 files correctly in Excel**; **SO 6588068** — Excel garbles UTF-8 CSV without a BOM on both Windows and Mac. Confidence: MEDIUM-HIGH.
- **SO 20395699** — a `sep=` line breaks UTF-8 BOM detection unless the BOM comes first; tab delimiter as an alternative. Confidence: MEDIUM.
- **Watermark support — Preparing Data for CSV-UTF-8 Imports** — Excel drops leading zeros in numeric-looking fields. Confidence: MEDIUM.
- **Community post-mortems on Firebase rules left open** (vibeappscanner.com "Missing Firestore Security Rules", rootcrak.com "Firebase Security Rules — Common Mistakes", penetrify.cloud "allow read, write: if true") — thousands of apps ship with test-mode rules. Confidence: LOW–MEDIUM (vendor blog posts, consistent with the official docs).
- **varstatt.com — Firestore Transactions: Handling Race Conditions** — the check-then-write pattern does not survive concurrency; the transaction is the gate. Confidence: MEDIUM.
- **Community consensus on responsive tables** (w3schools howto, muhimasri "How to Create a Responsive Table with React", r/webdev) — `overflow-x: auto` container, or transpose to cards on small screens. Confidence: MEDIUM.
- **localStorage per-origin collisions** (obs-browser issue #245; r/reactjs multi-user localStorage threads) — generic key names collide across apps on a shared origin. Confidence: LOW–MEDIUM.
- **PROJECT.md (this repo)** — the mandated verbatim size-guide rows, prices, circular-draw constraint, and the Admin-must-not-see-the-pairing core value. Confidence: HIGH (primary source).
- **Design analysis (this research)** — the Admin-blindness limit without a server; the `orders`/`submissions` split to avoid a progress-counter leak; the frozen-roster state machine; the size-guide drift and the suspected Player `L`/`2XL` data anomaly. Confidence: MEDIUM — reasoning from the requirements, not a documented incident. Treat the suspected data anomaly as a **question for the user**, not a value to correct.

---

*Pitfalls research for: football-jersey Secret Santa web app (React + Vite + Firestore, no server)*
*Researched: 2026-10-17*



