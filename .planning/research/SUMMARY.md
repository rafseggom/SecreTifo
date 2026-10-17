# Project Research Summary

**Project:** SecretKit
**Domain:** Single-event, client-only web app — "amigo invisible" (Secret Santa) for a football-jersey group order. React + Vite SPA, Tailwind CSS, Firebase Firestore as the backend, React Router.
**Researched:** 2026-10-17
**Confidence:** MEDIUM overall (HIGH for stack version numbers; MEDIUM for everything derived from web sources; the security-rules design is the one genuinely unverified area)

## Executive Summary

SecretKit is a small, single-event SPA for one group of friends. The domain research converges on a clear verdict: **none of the seven required features is exotic.** Name-only entry, a preferences form, a real-time lobby, a circular draw, a post-draw reveal, an order form and an admin export are all standard "Secret Santa" table stakes — and all four researchers independently confirmed that the market splits into two halves that nobody joins: Secret Santa organisers (Elfster, Drawnames, GiftList) do the *draw* but show the organiser everything; custom-jersey sellers (Makeform, Paperform) do the *order form* but have no draw. SecretKit's product space is exactly the union of those halves, and its differentiation is not an extra feature — it is the *how*: a size guide that is specific to football shirts, an export that is ready to hand to a seller, and above all **a draw whose secrecy is structural rather than cosmetic**.

That last clause is the whole project. All four research streams, working separately, arrived at the same load-bearing constraint and the same conclusion: **Firestore security rules enforce reads at the document level, so a `recipientId` field on any document the lobby streams is readable by everybody — including the Admin — and no rule can change that.** The only defensible model is a separate `assignments/{giverUid}` subcollection, one document per giver, whose *path* encodes ownership, read with `get` by document ID only, with `list` denied outright. This in turn forces a second conclusion: **Firebase Anonymous Auth must be adopted.** Without a `uid`, `request.auth` is `null` and rules can enforce nothing at all, so the "Admin cannot see the pairing" promise would be pure rhetoric. Anonymous auth is one silent call with no password, no OAuth and no login screen — it does not violate PROJECT.md's Out of Scope (which forbids *password* and *OAuth* authentication), and it is the single decision that makes the Core Value real. It must be recorded explicitly as a Key Decision, not smuggled in as an implementation detail.

The honest third conclusion is a limitation, not a defect: **a client-only app can never hide the pairing from the person who owns the Firebase project.** The Firebase server SDKs bypass security rules, and the Console renders raw data to anyone with project IAM. The correct posture is (a) enforce real privacy *between participants*, (b) never persist the full mapping in one document so the blast radius of an accidental reveal is limited, and (c) document the social trust contract out loud. The only true fix — moving the draw into a Cloud Function — requires a billing account and contradicts the "no backend" constraint, so it belongs in the roadmap as a documented future upgrade path, never as a milestone deliverable. Given that the user wants a **small** project (target: 1–2 roadmap phases), this framing is important: the privacy work is not optional polish to be cut for scope, but the *remediation* and *verification* around it can be compressed into a single hardening phase. The recommended shape is therefore **two phases**: one that makes the whole journey work end-to-end with the correct data model, and one that proves and polishes it. If only one phase is used, the rules-denial tests must fold into that phase's acceptance criteria rather than disappearing.

## Key Findings

### Cross-Cutting Decisions (the four researchers converged on these — treat as binding)

**D1 — Adopt Firebase Anonymous Auth. Recommended: YES.** `signInAnonymously()` once at app boot, invisibly, no password and no OAuth provider. Rationale: with no auth, `request.auth` is `null` and Firestore rules cannot distinguish the Admin from any participant — every rule degenerates to `allow read, write: if true`, the documented Firebase anti-pattern. Anonymous Auth gives a server-issued, unforgeable `uid` while leaving the UX exactly as specified ("entra con tu nombre"). It is not "authentication with password/OAuth", so it stays inside PROJECT.md's Out of Scope. Confidence: MEDIUM-HIGH (all four files independently recommend it; it is the dependency that decides whether privacy is real or cosmetic). **This must be logged as an explicit Key Decision in the roadmap phase plan.**

**D2 — The giver→recipient mapping lives in `assignments/{giverUid}` and nowhere else. Recommended: the subcollection schema below, no exceptions.** The mapping must never be a field on any document the lobby streams, never an `events/main.assignments` map, never a `pairs` collection, never a `drawResult` document. Because Firestore read rules are document-level, a field on a streamed document is world-readable by construction and *no rule can mask it*. Ownership is encoded in the **path** (`request.auth.uid == giverUid`), read is `get`-by-ID only, and `list` is denied — an unfiltered `collection('assignments').get()` must fail for everyone, including the Admin. Also forbidden: a stored `seed` or `permutation` "for auditability" — anyone holding the seed recomputes the mapping. Confidence: MEDIUM-HIGH (quoted verbatim from the Firebase docs in ARCHITECTURE.md).

**D3 — Accept and document that the project owner can read Firestore directly. Recommended: document, don't engineer around it.** The Admin owns the Firebase project, holds Owner/Editor IAM, and can open the Console or call the Admin SDK — both bypass rules by design. The achievable guarantee is that **accidental** exposure (UI, export, enumeration by a participant) is impossible and that the draw's permutation exists transiently in the Admin's browser only. Shrink the blast radius (no full-mapping document, no seed, `assignments/*` write-once) so a Console read shows opaque one-row documents the Admin must deliberately assemble. Put one honest line in the README. The *true* fix — a Cloud Function that owns the draw and returns only the caller's own pair (~40 lines, Blaze plan) — is parked as a documented future upgrade path, because PROJECT.md puts "Backend propio" out of scope. Confidence: MEDIUM-HIGH (the governing facts are quoted from official docs).

**D4 — The draw is one atomic, idempotent transaction over a pure function. Recommended: Fisher–Yates shuffle + offset-by-one, computed outside the transaction, written inside a `runTransaction`.** `buildDerangement(uids, rng)` shuffles a copy and maps `order[i] → order[(i+1) % n]`. This is uniformly distributed over *cyclic* permutations, has **zero fixed points by construction**, **cannot produce an A↔B mutual pair for n ≥ 3**, and needs no retry loop (O(n)). Do **not** use the popular "shuffle then re-roll on self-assignment" rejection method: it is not uniform over derangements (for n=4 it self-assigns 5/36 of the time) and it does not guarantee the single cycle PROJECT.md mandates. Persist with `runTransaction` (not `writeBatch`) because the transaction must *read* `status` first and abort if already `drawn` — that is the double-click/idempotency guard. Inject `rng` so the properties are unit-testable. **Write the pure function and its tests first**, before the Firestore adapter exists. Confidence: MEDIUM-HIGH (mathematically standard; verified by the property tests, not by a source).

**D5 — The Admin export is a pure function whose signature cannot carry the mapping. Recommended: `buildOrdersExport(orders)` — no assignment parameter, ever.** The export reads **only** `orders` (+ `participants` for neutral labels), never `assignments`, never a join. Forbidden fields: `recipientId`, `recipientName`, `giverName` in the exported payload. The export must additionally break the **inference leak** the requirements don't mention: if the export lists orders *per person* and the lobby publicly shows everyone's declared size, the Admin can intersect size+team against preferences to reconstruct pairs. Mitigation is cheap and mandatory: **opaque `orderId`** in the export and Admin view ("pedido #7: Player · Madrid · L · dorsal 7 · 'SEBAS'"), so the giver matches their own ID at hand-off. `buildOrdersExport(orders)` having no mapping parameter turns a policy into a type-level guarantee. Confidence: MEDIUM-HIGH (design argument, but it follows directly from the document-level-read fact).

### Recommended Stack

Small, curated and deliberately boring — the research's explicit message is that everything this app needs is in the platform, and every added library is scope the user did not ask for. Stable, current versions were verified directly against the npm registry (`dist-tags`, `peerDependencies`, `engines`), which is why the version numbers are HIGH-confidence even though the ecosystem rationale is MEDIUM.

**Core technologies:**
- **React 19.3.1 + react-dom 19.3.1** — peer floor for React Router 8 is `>=19.2.7`, so 19.3.1 is the only sane choice.
- **Vite 8.3.4** (`create-vite@9.2.1`) — Rolldown-based, one pipeline, 10–30x faster builds; requires Node `^20.19.0 || >=22.12.0`.
- **@vitejs/plugin-react 6.1.2** — Oxc-based refresh transform; peer is `vite: ^8.0.0`, so it pins Vite 8.
- **Tailwind CSS 4.3.3 via @tailwindcss/vite** — CSS-first, no `tailwind.config.js`, no `postcss.config.js`; `@import 'tailwindcss'` + optional `@theme` tokens.
- **react-router 8.4.0 (declarative `BrowserRouter`)** — **`react-router-dom` no longer exists in v8**; importing it is the #1 way to break this build. Node `>=22.22.0` is the strictest engine floor in the whole stack.
- **firebase 13.0.0** — v13's breaking changes are confined to AI Logic; Firestore is API-unchanged from v12. Use the **full** `firebase/firestore`, not `/lite` (Lite omits `onSnapshot`, which the real-time lobby requires).
- **TypeScript ~6.0.2** (scaffold default) — `tsc -b && vite build` is the type gate; do **not** jump to TS 7 (no stable programmatic API until 7.1). Plain JS with JSDoc is a defensible fallback if the group wants zero type friction.
- **firebase/auth (same package) — Anonymous Auth.** See D1.
- **oxlint 1.88.0** (ships in the scaffold — do not add ESLint), **firebase-tools 15.34.0** (emulator + deploy), **Node 24 LTS**.

**Node 24 LTS is the practical floor.** A teammate on Node 20 or Node 22.0–22.21 will see `npm install` fail or warn on React Router 8's engines.

**Explicitly do not add:** Redux / Zustand / TanStack Query / react-hook-form / axios / `uuid` (`crypto.randomUUID()` is native) / `file-saver` / `papaparse` (only if a true `.csv` is later required). Firestore offline persistence (IndexedDB) is deliberately *not* enabled for this app.

### Expected Features

**Every one of the seven PROJECT.md requirements is table stakes, not a differentiator.** The differentiation is in the execution: the blind draw, the football-specific size guide, and the seller-ready export.

**Must have (v1 — the flow breaks without any of these):**
- Name-only join, with **normalised-name uniqueness** and an actionable duplicate prompt ("ya hay un Marc — prueba Marc G.") — the name is the identity, so duplicates corrupt both the reveal and the export.
- First user = Admin, written **transactionally**, `adminUid` write-once and immutable in rules.
- Preferences at join: **size is mandatory** (closed Select S–XXXL); liked teams and forbidden teams are optional free text.
- **Size guide as a modal, always reachable** — static Fan and Player tables (the only field a giver cannot invent).
- Real-time lobby (`onSnapshot` over `participants`) + "Empezar Sorteo" for the Admin, with a confirmation that names the participant count.
- **Circular draw**, n ≥ 3 enforced, roster frozen at draw time.
- Post-draw reveal: "Te ha tocado regalar a [Nombre]" + the recipient's size and preferences.
- Order form: Tipo (Fan/Player/Retro), Equipo, Temporada, Nombre a serigrafiar, Dorsal — with **reference prices visible** (Fan 11$ / Player 16$ / Retro 15$) and the size **pre-filled from the recipient, never from the giver**.
- Admin view: progress count + "who's still missing" + **"Descargar Pedidos"** with an opaque order ID, no giver column, UTF-8 BOM.
- Empty / loading / error states on every route; edit own order and own preferences.
- **The hard constraint:** neither the Admin view nor the export exposes giver → recipient — plus the insurance of D1/D2/D5.

**Should have (cheap differentiators, high value / near-zero cost):**
- **Cross-size incompatibility warning** (`XXXL ⇒ Fan/Retro only`, because Player tops out at 2XL) — derived directly from the project's own data, so it is almost free and prevents an invalid order discovered only at the seller.
- **Size guide with Fan↔Player cross-equivalences** — the most useful buying advice the app can give, and something no competitor has.
- **Forbidden-team conflict warning** in the order form — advisory, not blocking (free text produces false positives).
- Export **grouped by SKU** with quantities (N× Player / Madrid / L / dorsal 7) — what turns an export into an order.
- Editable preferences **after** the draw (the elegant exit from the "someone never filled in their preferences" edge case).

**Defer (v2+):** Admin-role transfer, identity recovery via recovery code, controlled re-draw (only with zero orders), copy-my-order-to-chat, multi-event/history, single-order ↔ multi-order recovery flows.

**Anti-features — do NOT build (each one is asked for and each one is wrong here):** password/OAuth accounts; an **exclusion engine** ("these two must not be paired" — the star feature of Elfster/Drawnames and a *direct structural conflict* with the single-cycle requirement); a "see the full draw" button for the Admin; free re-draws; per-person re-draw; wishlists/catalogue/Santa mail; payments; push/email notifications; multi-event; embedded chat; vendor catalogue validation; configurable roles; past-draw history; homemade crypto to "prove" the Admin didn't peek. The most dangerous is the exclusion engine, because "everyone does it" makes it the likeliest scope creep.

### Architecture Approach

Layered, dependency-strictly-downward, with the privacy boundary expressed as a **subscription you never open** rather than a filter you must remember. Four layers: **L4 pages** (routing only) → **L3 components** (pure, no Firebase imports) → **L2 hooks/session** (the *only* subscription layer) → **L1 `domain/`** (pure, no React, no Firestore, unit-testable) → **L0 `lib/firestore/`** (thin SDK adapters, the only place SDK verbs appear).

**Data model — `events/main` with three subcollections:**
```
events/main                      # fixed literal ID: single-event app, fully static rules
  ├── participants/{uid}         # the lobby; readable by all; each person's OWN prefs
  ├── assignments/{giverUid}     # THE SECRET. readable only by its own giver. write-once.
  └── orders/{giverUid}          # readable by its giver OR the admin. contains NO recipient.
```
`events/main` holds `adminUid` (write-once), `status: 'lobby'|'drawn'|'closed'`, `drawnAt`, `drawVersion` — and explicitly **no** map, seed, permutation or draw result.

**Major components:**
1. `domain/derangement.ts` — `buildDerangement(uids, rng)`, pure, single cycle, zero fixed points; property-tested with a seeded RNG.
2. `domain/ordersExport.ts` — `buildOrdersExport(orders)` → `{filename, mimeType, content}`; **no parameter could carry the mapping**.
3. `domain/sizeGuide.ts` + `domain/prices.ts` — static typed tables (Fan, Player; 11/16/15); never fetched from Firestore.
4. `lib/firestore/*` — `joinEvent` (bootstrap-or-join transaction), `runDraw` (guarded draw transaction), `submitOrder` (idempotent `setDoc` on a deterministic ID), `exportOrders` (reads `orders` only), `download` (Blob + BOM).
5. `hooks/*` — one hook per subscription, each returning `{ data, loading, error }` and owning its unsubscribe; `useMyAssignment` uses `get`-by-ID, never a collection query; `useOrdersAdmin` mounts **only** on the admin route.
6. `SessionContext` — `{ uid, name, isAdmin, ready }`; `isAdmin` is **derived** from `events/main.adminUid`, never stored, never gating the UI from a local flag.
7. `firestore.rules` — default-deny, per-collection blocks, `assignments` `get`-only with `list` denied, `adminUid` immutable.

**Key patterns:** `onSnapshot` with a returned unsubscribe and an error callback, centralised in hooks and forbidden in components; route-level guard components over session readiness (not over auth); static reference data as typed modules; export as a pure serialiser behind a 10-line download shim; `get`-by-ID for secrets, `list` only for non-secrets; three explicit states (`loading | error | ready`) — never render "empty" before the first snapshot.

**State management:** three tiers and no global store — `SessionContext` for the four app-wide non-server fields, one hook per Firestore collection, local `useState` for ephemeral UI. Explicitly rejected: Redux, Zustand, TanStack Query, and above all a `FirestoreContext` holding all collections (that anti-pattern would hand the mapping to every consumer).

### Critical Pitfalls

1. **Firestore rules left open / no auth at all** — test mode's `if true` ships to production, and the passwordless design makes it the *default* outcome because nothing ever forces authentication and the natural "fix" is opening the rule. Avoid: a real `firestore.rules` in the repo from day one, deployed by CLI (console edits drift); default-deny with explicit per-collection blocks and no catch-all allow; **Anonymous Auth so a rule can be written at all**; shape validation (string lengths, size enum, unknown-field rejection); and `@firebase/rules-unit-testing` tests that assert *denials*.
2. **The pairing is readable — and enumerable — by every client, including the Admin** — the natural implementation (`assignments/{id}` readable by all, or one `pairs`/`event.assignments` document) destroys the product's core value; the Admin also computes the permutation in their own browser. Avoid: never persist a full-mapping document; key each assignment by the **giver's uid** in its own subcollection; `allow get` only, `allow list: false`; drop the `pairs` array immediately after the write; never `console.log` it; never render a two-name table in the Admin panel; add an automated check that no Admin file imports `assignments`.
3. **Draw integrity — self-assignment, non-bijection, off-by-one, non-deterministic re-draw** — all four bugs produce a draw that *looks* fine on screen. Avoid: the explicit shuffle+offset construction; a property test over `n = 3,4,5,10,50,500` × 1000 runs asserting bijection, no fixed point and a **single cycle**; explicit `n < 3` guards (n=2 is a trivially guessable mutual pair, n=1 has no derangement); compute the draw **once** and persist it (never in a render body, `useMemo` or snapshot-driven effect); idempotent deterministic writes so a retry overwrites the same rows; require connectivity for the draw (transactions fail offline — surface it, don't queue silently).
4. **The roster mutates after the draw** — a latecomer joins via the shared link and receives nothing while nobody gifts them; the naive "just re-draw" silently invalidates every order already placed. Avoid: an explicit state machine (`lobby | drawn | closed`) enforced **in rules**, not just in the UI; a frozen roster snapshot (`participantIds[]`/count) written inside the draw transaction; deletion blocked after the draw; and a real explanatory screen for the latecomer instead of a blank one.
5. **The Admin export (or the Admin view) leaks the pairing** — the join is the laziest way to make a row "complete", and the forbidden field is the one that makes it complete; the subtler variant is the inference leak (per-person orders + publicly visible declared sizes ⇒ intersect to reconstruct the pair). Avoid: the export reads **one** collection (`orders`); separate the progress counter from the payload; encode the allowed keys in a type and assert the export header by exact string comparison; assert no cell equals a participant's display name; use the **opaque order ID**; never log the mapping; keep the Admin panel to counts + download.

**Honourable mentions (all ship-blocking if ignored):** duplicate/ambiguous names used as keys (use the anon `uid` as doc ID + a normalised `nameIndex` in a transaction; ask, don't auto-suffix); `localStorage` identity lost *or* spoofed 30 seconds later (authorisation from Auth, convenience from storage, validated server-side; `isAdmin` never from a local flag); `onSnapshot` listener leaks and StrictMode's double-invoke (return the unsubscribe, keep StrictMode, make the write-on-mount idempotent); CSV/Excel traps (BOM, locale delimiter, leading zeros in dorsals, formula injection); missing loading/empty/error states (a premature empty state makes a registered user re-join and duplicate themselves); Spark quota exhaustion as an unannounced outage (`resource exhausted`, not a bill — develop against the emulator, bound every listener, never poll); mobile size-guide layout and hand-transcribed data drift.

### ⚠ Source-Data Anomalies to Flag (do not silently "fix")

Both were independently noticed by FEATURES.md, ARCHITECTURE.md and PITFALLS.md. **PROJECT.md mandates that this reference data be incorporated literally**, so the correct action is to render it verbatim and raise the question — not to correct it in the encoded tables.

1. **The Player size table tops out at 2XL while the size Select offers XXXL.** `PLAYER_SIZES.find(r => r.size === 'XXXL')` returns `undefined` → a crash or a blank row for an XXXL participant ordering a Player shirt. Also note Fan and Player use *different* letter systems (Fan maps `S→P`, `L→G`; Player's `S/M/L` are the shirt's own letters), so a single shared `Select` is ambiguous without the `alias` column. **Needs a one-line product decision (block vs warn): recommended = warn and steer to Fan/Retro, derived from the data.**
2. **The Player table repeats `70-78` as the weight range for both `M` and `L`.** Looks like a transcription error in the source. Render it verbatim and flag it to the user as a probable typo in the source data; do not normalise it.
3. *(Related, not an anomaly but an undefined case)* **Retro has no size table of its own** — Fan and Player are documented, Retro appears only in the price list. The modal must state explicitly that Retro uses the Fan table (or the vendor's chart), rather than leaving a silent gap that causes exactly the error the guide exists to prevent.

## Implications for Roadmap

**The user explicitly wants a small project. The research's own 7-step build order is a *dependency ordering*, not a mandate for seven roadmap phases — it compresses cleanly into two.** Recommendation: **2 phases**, with the research's steps folded in as internal sub-steps. If the user insists on a single phase, collapse Phase 2 into Phase 1's acceptance criteria — but **do not drop the rules-denial tests**, because they are the executable form of the Core Value.

### Phase 1: Flujo completo del amigo invisible (foundation → draw → order → export)

**Rationale:** Everything here is dependency-driven: the data model must exist before anything writes to it, and the two riskiest pieces (the rules and the draw) must be authored against the schema rather than retrofitted. This phase delivers a working end-to-end journey for the real group, with the privacy-correct model baked in from the first commit.
**Delivers:** Vite + React + Tailwind + `createBrowserRouter` shell; `firebase.ts` from `VITE_*` (+ committed `.env.example`); the Firestore emulator wiring; `domain/types.ts`, `sizeGuide.ts`, `prices.ts` with their data test; `components/ui/*`, `SizeGuideModal`, `PriceTable`; `firestore.rules` (default-deny, `assignments` get-only) **shipped here, not at the end**; Anonymous Auth in `SessionProvider`; `joinEvent` bootstrap transaction; `useEvent`, `useParticipants`; Join + Lobby pages; preferences form with mandatory size; `buildDerangement` **test-first** + `runDraw` transaction; `useMyAssignment` + Reveal page; `JerseyOrderForm` + `submitOrder` + `useMyOrder`; `useOrdersAdmin` + `buildOrdersExport` **test-first** + `exportOrders` + `download` with BOM; the size/type incompatibility warning; and the frozen-roster state machine.
**Addresses:** every Active requirement in PROJECT.md (F1–F7), plus the cheap differentiators (size guide with cross-equivalences, incompatibility warning, SKU grouping).
**Avoids:** Pitfalls 2, 4, 5, 6, 7, 15, 16 and the structural half of 9.
**Research:** **skip `/gsd-plan-phase --research-phase`** — the stack versions are registry-verified (HIGH) and STACK/ARCHITECTURE already contain the canonical code for every integration point (`vite.config.ts`, `firebase.ts`, `joinEvent`, `runDraw`, `buildOrdersExport`, `downloadText`). If a phase plan grows much beyond those snippets, something is wrong. **Two product decisions are needed before planning, not research:** the Player-`XXXL` warn-vs-block call and the Retro size-table statement.

### Phase 2: Privacidad verificada y pulido (the acceptance gate)

**Rationale:** This is the phase that proves the Core Value rather than asserting it, and it can only run once every read path exists — which is precisely why it is last. Merging it earlier is impossible; deleting it is how the product's central promise becomes unverified.
**Delivers:** the `@firebase/rules-unit-testing` harness in the Emulator Suite with the full assertion table (`getDoc` own assignment ALLOWED; another's DENIED; `getDocs(assignments)` DENIED **as admin and as participant** — *the single most valuable test in the project*; `getDocs(orders)` ALLOWED for admin, DENIED for a participant; cross-participant `participants` write DENIED; `adminUid` rewrite DENIED); the export fixture test (exact header list, no cell equal to a participant name, accents/commas/quotes, dorsals `09`/`100`, `utf-8-sig` round-trip); the "no Admin file imports `assignments`" check; `permission-denied` / offline / `resource exhausted` copy on every route; the responsive size-guide modal (card-per-size below `sm`, `max-h-[90vh]` scrollable dialog); the SPA rewrite + deep-link verification; the README trust-contract paragraph; and a pre-event dry run against production usage numbers.
**Addresses:** the verification of every P1 feature; the v1.x items that are cheap enough to pull forward (incompatibility warning if not already in Phase 1).
**Avoids:** Pitfalls 1, 3, 8, 9, 10, 11, 12, 13, 14.
**Research:** **this is the one phase that may justify `/gsd-plan-phase --research-phase`** — see Research Flags.

### Phase Ordering Rationale

- **The two pure modules (`buildDerangement`, `buildOrdersExport`) are separated from their Firestore adapters and written test-first.** They encode the product's only two non-negotiable rules. Testing the pure half in isolation means the Firestore transaction is a thin, boring adapter — the alternative is debugging an algorithm and a concurrency bug simultaneously.
- **Rules are authored in Phase 1 and verified in Phase 2.** Rules written at the end get written to fit whatever the code happens to do; rules written with the schema become a constraint the code is written against.
- **The schema decision (`events/main` + 4 subcollections) precedes every write.** It is the load-bearing choice; changing it later means re-writing every hook and every rule.
- **Static reference data comes first** so the Fan/Player size-vocabulary split and the Player-`XXXL` gap are resolved before any form depends on them; discovering it late means retrofitting a fallback into a shipped form.
- **The reveal screen precedes the order form** because every field of the order is determined by the reveal context (you order *for* the person you were assigned). Building the form first means building it against a mock recipient.
- **Phase 2 cannot be merged into Phase 1** because the `permission-denied` assertions need the real rule set and the real read paths; it is genuinely a verification phase and it is where the roadmap should place its security/UAT gate — consistent with `security_enforcement: true` and `security_asvs_level: 1` in the config.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (verification):** the security-rules design is the *only* area the research could not raise above MEDIUM-LOW — ARCHITECTURE.md states plainly that two of its assumptions are unverified: that `assignments` `list` is genuinely denied for the Admin, and that `isAdmin()`'s `get()` caching behaves as expected under a multi-doc transaction. Planning here should research the `@firebase/rules-unit-testing` + Auth-emulator harness setup (the documented way to test this), so the plan can state exactly how the denial is proven. Do not confuse "research the harness" with "re-research the privacy model" — the latter is settled.
- **Not a research item but a decision item:** the Player-`XXXL` warn-vs-block behaviour and the Retro size-table statement must be resolved during Phase 1 planning (or in `discuss-phase`), and the two source-data anomalies must be surfaced to the user.

**Phases with standard patterns (skip `--research-phase`):**
- **Phase 1:** Vite 8 + plugin-react 6 scaffolding, Tailwind v4 via the Vite plugin, React Router 8 declarative mode, the Firestore emulator, `onSnapshot` hook cleanup, the pure draw/serialiser functions and the CSV/Excel BOM details are all **well-documented, established patterns**, and STACK.md + ARCHITECTURE.md already contain the canonical snippets. The version matrix is registry-verified. No further research needed to plan.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** (versions) / **MEDIUM** (rationale) | All version numbers read directly from the npm registry `dist-tags` + `peerDependencies`/`engines` and cross-checked against official release notes — authoritative. The *ecosystem rationale* is capped at MEDIUM by the confidence seam: every external search provider is disabled in `.planning/config.json` and no curated-docs MCP was exposed, so claims rest on `websearch` cross-checked across ≥2 independent sources. |
| Features | **MEDIUM** | Public product documentation from Secret Santa organisers, custom-kit order-form providers, and derangement/CSV literature; no internal usage data, no user interviews, no competitor internals. Feature classifications are design judgements over a well-understood domain, and both files that touched it agree the domain is not novel. |
| Architecture | **MEDIUM** | The privacy *limits* section is MEDIUM-HIGH (the three governing facts are quoted verbatim from Firebase docs). The **security-rules sketch is MEDIUM-LOW** — syntactically patterned on official examples, but the specific predicate set is design, and two assumptions are unverified. The draw algorithm is MEDIUM-HIGH (mathematically provable, verified by tests). Component boundaries and build order are MEDIUM (design, not documentation). |
| Pitfalls | **MEDIUM** | Corroborated against official Vite / Firebase / React documentation retrieved during research (the encoding, quota, transaction and effect-cleanup facts are HIGH-confidence official docs) plus community post-mortems (LOW–MEDIUM). The inference-leak and admin-blindness analyses are design reasoning, correctly labelled as such. |

**Overall confidence:** **MEDIUM** — a solid, decision-ready research base with exactly one unverified area (the rules predicate set), and that area is already scheduled into the plan.

### Gaps to Address

- **The security rules are unverified.** ARCHITECTURE.md says so explicitly. Handle: make the Emulator Suite assertion table the Phase 2 acceptance criteria, and treat a `permission-denied` on `getDocs(assignments)` **as the intended behaviour and as the regression test** — an afternoon's work that closes the single biggest gap.
- **Player `XXXL` gap: warn or block?** Unresolved product decision, flagged by three files. Handle: a one-line decision in Phase 1 planning; recommended = warn and steer to Fan/Retro, derived from the data already present.
- **Player `M`/`L` identical weight range (`70-78`), and the `2XL` jump from `XL`'s `78-86` to `94-104`.** Suspected source-data anomaly. Handle: render verbatim, flag to the user as a question — never silently "fix" mandated reference data.
- **Retro has no size table.** Unstated in PROJECT.md. Handle: state explicitly in the modal that Retro uses the Fan table (subject to vendor confirmation).
- **Export format: `.csv` or `.txt`?** PROJECT.md says ".txt/.csv". Handle: recommend **CSV as primary** (strictly more useful; the seller can open it anywhere) with `buildOrdersExport`'s return type making a TXT sibling a 5-line addition; note that a tab-separated `.txt` removes all comma/quote ambiguity if the vendor prefers it.
- **Anonymous Auth is an unrecorded cross-cutting decision.** It is a new Firebase product in the stack and it decides the entire data model. Handle: log it as an explicit **Key Decision** in `PROJECT.md` during Phase 1, with the rationale that it is neither password nor OAuth and therefore inside the stated Out of Scope.
- **Identity recovery is unsolved** — an anonymous `uid` dies with browser storage, and a cleared storage or a device switch orphans a participant's assignment and order. Handle: accept as a documented v1 limitation with a clear "no borres este enlace; es tu identidad" notice in the lobby; a recovery code is the v1.x candidate.
- **The Admin-blindness limit has no technical fix inside the constraints.** Handle: the README trust-contract paragraph in Phase 2, and the Cloud Function parked as a documented future upgrade path — the roadmap should say out loud that this is an informed choice, not an oversight.
- **Sources are all web-derived and capped at MEDIUM.** No curated search provider is enabled in `.planning/config.json` and no running system was exercised. Handle: keep the design decisions that are cheap to verify (rules, draw, export encoding) as explicit acceptance tests rather than assertions.

## Sources

### Primary (HIGH confidence)

- **npm registry** (`registry.npmjs.org`) — `dist-tags` + per-version `peerDependencies`/`engines` for `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/vite`, `firebase`, `react-router`, `react-router-dom`, `typescript`, `oxlint`, `firebase-tools`, `papaparse`. Authoritative for every version number.
- **Firestore — Control access to specific fields** — reads are document-level; field-level control is **write-only**; the server SDKs bypass rules. (`firebase.google.com/docs/firestore/security/rules-fields`)
- **Firestore — Security Rules and Firebase Authentication** — `request.auth` is `null` when unauthenticated. (`firebase.google.com/docs/rules/rules-and-auth`)
- **Firestore — Transactions and batched writes / Data contention** — all-or-none; reads before writes; may run more than once; must not modify app state; fail offline.
- **Firestore — Get realtime updates** — `onSnapshot` unsubscribe; initial cache snapshot; the error callback is terminal; `hasPendingWrites`.
- **Firestore — Usage and limits** — free tier 1 GiB, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, 10 GiB/month; **Fix insecure rules**; **Learn about and manage API keys**.
- **Vite — Env Variables and Modes** + **vitejs/vite security policy** — `VITE_*` is inlined into the client bundle at build time and must not hold secrets.
- **React — `useEffect` cleanup and `<StrictMode>`** — the extra development-only setup+cleanup cycle; the fix is a cleanup function, not removing StrictMode.
- **Microsoft Support — Opening CSV UTF-8 files correctly in Excel** — the BOM requirement.
- **PROJECT.md (this repo)** — verbatim size-guide rows, the three reference prices, the circular-draw constraint, the Admin-privacy Core Value, and Out of Scope. The primary and controlling source.

### Secondary (MEDIUM confidence)

- Vite 8 announcement / release notes; Tailwind v4 docs; Firebase JS release notes (v13 breaking changes are AI-Logic-only); React Router v8 changelog, upgrade guide and `react-router-dom` removal.
- `create-vite@9.2.1` `react-ts` template `package.json` — exact scaffold contents.
- Firebase rules behaviour docs — rules combine as **OR**; subcollections do **not** inherit match blocks; recursive-wildcard v1 vs v2 semantics; `get()`/`exists()` limits (10 single-doc / 20 multi-doc) and their billing.
- Secret Santa organisers — Elfster, Drawnames, GiftList ("organizer-blind draw", minimum 3, cycle not pairing), SecretSantaOrganizer.
- Custom-kit order forms — Makeform, Paperform, Teamsideline, UncommonFit (roster = name, number, size, style).
- Derangement / draw mathematics — Stack Overflow "Secret Santa: generating valid permutations", Math StackExchange, Rose-Hulman "The Secret Santa Problem" (White 2006), mathoverflow #50049 (the hat-draw is **not** uniform over derangements).
- CSV/Excel traps — leading-zero loss, `sep=` vs BOM ordering, formula injection, locale delimiter.
- Firebase/React community post-mortems — rules left in test mode, listener leaks (`SO 73342659`, `SO 65659438`), responsive-table practice, per-origin `localStorage` key collisions.

### Tertiary (LOW confidence — needs validation)

- Vendor blog post-mortems on open Firestore rules (vibeappscanner, rootcrak, penetrify) — consistent with official docs, low individual authority.
- The **size-correlation inference leak** (`order.size` vs publicly declared `participant.size`) and the **admin-blindness limit** — design analysis derived from the requirements and the documented document-level-read fact; not a documented incident. Both are mitigated in the recommended design (no `recipientId` on orders; no full-mapping document; opaque order ID).

---

*Research completed: 2026-10-17*
*Ready for roadmap: yes*
