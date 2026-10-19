---
phase: 01
phase_name: 01-flujo-completo-del-amigo-invisible
reviewed: 2026-10-19T15:30:00Z
reviewed_at: 2026-10-19T15:30:00Z
depth: deep
files_reviewed: 62
files_reviewed_list:
  - src/main.tsx
  - src/App.tsx
  - src/session/SessionProvider.tsx
  - src/lib/firebase.ts
  - src/lib/session.ts
  - src/lib/joinEvent.ts
  - src/lib/lobby.ts
  - src/lib/draw.ts
  - src/lib/assignment.ts
  - src/lib/orders.ts
  - src/lib/download.ts
  - src/hooks/useMyAssignment.ts
  - src/hooks/useOrdersAdmin.ts
  - src/domain/types.ts
  - src/domain/normalizeName.ts
  - src/domain/sizeGuide.ts
  - src/domain/prices.ts
  - src/domain/derangement.ts
  - src/domain/exportOrders.ts
  - src/domain/normalizeName.test.ts
  - src/domain/sizeGuide.test.ts
  - src/domain/prices.test.ts
  - src/domain/derangement.test.ts
  - src/domain/exportOrders.test.ts
  - src/components/Screen.tsx
  - src/components/Card.tsx
  - src/components/FullScreenSpinner.tsx
  - src/components/ErrorBoundary.tsx
  - src/components/Button.tsx
  - src/components/Field.tsx
  - src/components/Input.tsx
  - src/components/Select.tsx
  - src/components/Badge.tsx
  - src/components/Notice.tsx
  - src/components/icons.tsx
  - src/components/Modal.tsx
  - src/components/SizeGuideTable.tsx
  - src/components/SizeGuideModal.tsx
  - src/components/ParticipantRow.tsx
  - src/components/DrawConfirmDialog.tsx
  - src/components/PriceTable.tsx
  - src/components/JerseyOrderForm.tsx
  - src/pages/EntryPage.tsx
  - src/pages/PreferencesPage.tsx
  - src/pages/LobbyPage.tsx
  - src/pages/RevealPage.tsx
  - src/pages/AdminPage.tsx
  - src/index.css
  - firestore.rules
  - firebase.json
  - .firebaserc
  - .env.example
  - vite.config.ts
  - index.html
  - package.json
  - tsconfig.json
  - tsconfig.app.json
  - tsconfig.node.json
  - src/vite-env.d.ts
  - .oxlintrc.json
  - .gitattributes
  - .gitignore
findings:
  critical: 2
  high: 2
  medium: 6
  low: 6
  info: 4
  total: 20
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-10-19T15:30:00Z
**Depth:** deep (per-file + cross-file call chains + static Security-Rules reasoning)
**Files Reviewed:** 62
**Status:** issues_found

## Summary

Phase 1 is a greenfield React 19 / Vite 8 / Tailwind 4 / Firebase 13 app built in 6 waves. The *domain layer* is genuinely good: the derangement is a correct single-cycle construction with real property tests, the CSV serialiser is blind by construction (its parameter type has no identity field), the security-rules file is default-deny and correctly isolates the pairing, and the literal provider data (size tables, prices) is transcribed faithfully and pinned by tests. Those invariants are recorded as SOUND below and the phase verifier can rely on them.

The **application layer as shipped is not functional end-to-end**, and no live test ever checked it: `.planning/WINDOWS.md` shows all four human checks of this phase (`join → lobby`, two-participant duplicate name, double-click draw idempotence, responsive reads) as `open`/unrun, and the only emulator check performed in wave 1 was `firebase emulators:exec … "node -e 'process.exit(0)'"`, which starts the emulator and proves nothing about a single call site. Two independent defects break the core flow:

- **CR-01** — the deployed `firestore.rules` deny the `events/main` update that `joinEvent` performs on every join, so **only the first participant can ever join**.
- **CR-02** — nothing refreshes `hasPreferences` after a join, so a participant who joins successfully is immediately redirected back to `/preferences`, where a second submit answers with a false `«Ese nombre ya está en uso»`.

Both were found by tracing code against rules, not by reading comments — every file's docblock asserts the opposite of what two of them actually do.

Severity vocabulary used here maps onto the reviewer standard as: **critical = BLOCKER**, **high/medium = WARNING**, **low/info = INFO**. IDs use the canonical `CR-` / `WR-` / `IN-` prefixes so the fixer can triage them; the severity word is repeated in every heading. No structural (fallow) pre-pass was supplied for this review, so there is no `## Structural Findings (fallow)` section.

---

## Narrative Findings (AI reviewer)

### CR-01 [critical] — The security rules block every join after the first one: `events/main` can only be updated by the Admin

**File:** `firestore.rules:32-33` (rule) + `src/lib/joinEvent.ts:88` (writer)
**Category:** security / correctness / functional blocker
**Evidence:**

```rules
// firestore.rules:32-33
      allow update: if isAdmin()
        && request.resource.data.adminUid == resource.data.adminUid;
```

```ts
// src/lib/joinEvent.ts:77-89
    const isFirstUser = !eventSnap.exists()
    const count = isFirstUser ? 0 : (eventSnap.data().participantCount ?? 0)

    if (isFirstUser) {
      tx.set(eventRef, { adminUid: uid, status: 'lobby', … })
    } else {
      tx.update(eventRef, { participantCount: count + 1 })
    }
```

For every joiner except the first, the transaction issues an `update` on `events/main`. The only `allow update` in the file requires `isAdmin()`, i.e. `get(events/main).data.adminUid == request.auth.uid`. The second participant is not the Admin, so their `update` is denied, the whole transaction aborts, and `joinEvent` throws. The participant document is never written.

The phase's own research file states the contradiction in plain sight and resolves it the wrong way: *"Note that this also means a non-Admin cannot update `events/main` at all — which is correct (only the draw flips `status`)"* (`01-RESEARCH.md:467`) — but `joinEvent` is a second writer of that document, and `01-01-PLAN.md:278` mandates exactly that write. Nothing reconciles the two, and no test can: the wave-1 emulator gate only proves the rules file *compiles* (`01-01-SUMMARY.md:96`), and the two-tab human check is `open` in `.planning/WINDOWS.md` (ids 3 and 4).

**Why it matters:** the product cannot serve more than one person. `.planning/ROADMAP.md:32` (success criterion 2) and `01-01-PLAN.md:59` require that "the others join and see the live lobby" — with the shipped rules they receive `«No hemos podido unirte al evento.»` (`PreferencesPage.tsx:78`) forever. This is the phase's core flow, not an edge case.

**Fix (pick one):**

1. Minimal, and consistent with the codebase's own note that the UI derives the count from `participants.length` (`01-01-PLAN.md:521`, `LobbyPage.tsx:78`): delete the counter write and its read from the transaction —
   ```ts
   // joinEvent.ts — replace the if/else with:
   if (isFirstUser) {
     tx.set(eventRef, { adminUid: uid, status: 'lobby', createdAt: firestore.serverTimestamp(), participantCount: 1 })
   }
   // (no `tx.update(eventRef, …)` for subsequent joiners)
   ```
   `participantCount` is written by nothing else and read by nothing else (`rg participantCount src/` → writer + type only), and the draw only touches `status`.
2. Or keep the counter and widen the rule while keeping `adminUid` immutable:
   ```rules
   allow update: if (isSignedIn()
       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['participantCount'])
       && request.resource.data.participantCount == resource.data.participantCount + 1)
     || (isAdmin() && request.resource.data.adminUid == resource.data.adminUid);
   ```

**Verification:** static rules reasoning only. Confirm with one emulator run: user A joins (Admin), user B joins → B must succeed. **This check has never been run in the phase.**

---

### CR-02 [critical] — After a successful join the user is bounced back to `/preferences`, where re-submitting reports a false "name already in use"

**File:** `src/session/SessionProvider.tsx:59-66`, `src/App.tsx:44-49`, `src/App.tsx:94-99`, `src/pages/PreferencesPage.tsx:73`
**Category:** correctness / functional blocker
**Evidence:**

```ts
// src/session/SessionProvider.tsx:59-66 — the ONLY place hasPreferences is set (mount-time, once)
        const participantSnap = await getDoc(doc(db, 'events', 'main', 'participants', uid))
        if (cancelled) return
        const hasPreferences = participantSnap.exists()
        …
        setSession((prev) => ({ ...prev, loading: false, uid, name, hasPreferences }))
```
```tsx
// src/App.tsx:44-49
  const joinedHome = !hasPreferences
    ? '/preferences'
    : eventStatus === 'drawn'
      ? '/reveal'
      : '/lobby'
// src/App.tsx:94-99
        <Route
          path="/lobby"
          element={identityPresent && hasPreferences ? <LobbyPage /> : <Navigate to={home} replace />}
        />
```
```tsx
// src/pages/PreferencesPage.tsx:71-73
      await joinEvent(uid, name, { size, likedTeams, forbiddenTeams })
      navigate('/lobby')
```

`useEffect(…, [])` runs once, before the participant document exists, so `hasPreferences === false` for the whole session. `session.length` never re-reads the document and no component can set the flag (`rg setSession src/` → only the provider). The sequence is deterministic:

1. user submits S2 → `joinEvent` writes `participants/{uid}` → `navigate('/lobby')`;
2. `/lobby` guard sees `hasPreferences === false` → `<Navigate to="/preferences">`;
3. S2 renders again, empty (`size` state resets on the new mount);
4. if the user submits again, `isNameTaken(name)` (`joinEvent.ts:59`) now finds **their own** participant document (there is no self-exclusion) → `«Ese nombre ya está en uso en el evento. Prueba con otro.»` — a false statement about their own name, with no way forward but a manual page reload.

Note the redirect table in the approved spec assumes the opposite: *"Re-entering with an existing participant document (refresh, back button) ⇒ the session already resolves to the lobby"* (`01-UI-SPEC.md:231`), and D-22 says *"ya unido → lobby"* (`01-CONTEXT.md:52`).

**Why it matters:** the primary happy path ends on the wrong screen with a lying error message. The only escape is F5, which no copy is allowed to suggest (`01-UI-SPEC.md:600`: "No copy may instruct the user to reload").

**Fix:** make the session observe the participant document instead of sampling it once. Cheapest correct option: in `SessionProvider`, subscribe to `participants/{uid}` (or re-read it after each successful join) and set `hasPreferences` from the snapshot, e.g.

```ts
// SessionProvider.tsx, after `uid` resolves — mirror the existing subscribeEvent pattern
unsubscribeParticipant = onSnapshot(
  doc(db, 'events', 'main', 'participants', uid),
  (snap) => setSession((prev) => ({ ...prev, hasPreferences: snap.exists() })),
)
```
Alternatively expose `refreshSession()`/`markJoined()` from the context and call it in `PreferencesPage` after `joinEvent` resolves. Either way, `/preferences` should also stop rendering the join form when `hasPreferences === true`, and `isNameTaken` should ignore the caller's own `uid` (`where('nameNormalized','==',…)` + `.filter(d => d.id !== uid)`, or a `joinEvent` self-check before the pre-check).

**Verification:** deterministic from source; confirmable in one emulator run (already listed as unrun human check id 3 in `.planning/WINDOWS.md`).

---

### WR-01 [high] — A failed identity resolution has no bounded error surface, and the entry form then persists an empty uid

**File:** `src/session/SessionProvider.tsx:76-80`, `src/App.tsx:38-49`, `src/pages/EntryPage.tsx:65`
**Category:** robustness / error handling / data integrity
**Evidence:**

```ts
// src/session/SessionProvider.tsx:76-80
      } catch {
        if (cancelled) return
        // Bound the spinner: a failed identity resolution must not spin forever.
        setSession((prev) => ({ ...prev, loading: false }))
      }
```
```ts
// src/pages/EntryPage.tsx:63-66
      // The pending name is what `/preferences` reads back through loadIdentity().
      saveIdentity({ uid: uid ?? '', name: trimmed })
      navigate('/preferences')
```

On `signInAnonymously()` failure or a failed first `getDoc`, the provider swallows the error, sets `loading: false` and leaves `uid: null`. `App.tsx:38` only branches on `loading`, so the routes render: `/` shows the entry form with a working-looking CTA. Submitting writes `{ uid: '', name }` into `localStorage`, and every subsequent render sees `identityPresent === false` (`App.tsx:42` requires `stored.uid === uid`), so the user is pinned to S1 with a form that appears to work and never explains what broke. `clearIdentity()` can never be reached for that value because nothing surfaces the lost-identity branch for `uid === null`.

`01-01-PLAN.md:55` is an explicit must-have: *"Si `signInAnonymously()` falla o no hay conectividad no se renderiza ninguna ruta: se muestra FullScreenSpinner con «Preparando…» acotado por «Algo ha ido mal.» y «Reintentar»"*. The `ErrorBoundary` cannot satisfy it — it only catches render-phase errors (`ErrorBoundary.tsx:13`), and no copy `Reintentar` exists for the boot path. `01-01-SUMMARY.md:177` defers this surface to 01-03, which added the *lost-identity* surface only.

**Why it matters:** contradicts a binding must-have and D-23 ("cada ruta expone estados explícitos de carga, vacío y error"); offline/cold-start is a normal condition for a name-only web app, and the failure mode silently corrupts `localStorage` with a fake identity.

**Fix:** add `error: string | null` to `SessionState`, set it in the catch instead of only clearing `loading`, and render a bounded boot-error screen before the routes:

```tsx
// App.tsx, before the lost-identity branch
if (sessionError) {
  return (
    <ErrorBoundary>
      <Screen title="SecretKit">
        <Notice tone="error" action={<Button type="button" variant="secondary" onClick={retryIdentity}>Reintentar</Button>}>
          Algo ha ido mal.
        </Notice>
      </Screen>
    </ErrorBoundary>
  )
}
```
and in `EntryPage`, refuse to submit (and never persist) when `uid === null`:
```ts
if (!uid) { setFormError('No hemos podido unirte al evento.'); setSubmitting(false); return }
saveIdentity({ uid, name: trimmed })   // no `?? ''`
```

---

### WR-02 [high] — The Admin can approximate the pairing by correlating the orders they may enumerate with the public roster

**File:** `src/lib/orders.ts:30` + `src/lib/orders.ts:69`, `firestore.rules:69-71`, `src/components/JerseyOrderForm.tsx:58`
**Category:** privacy (residual, design-level — needs a product decision)
**Evidence:**

```ts
// src/lib/orders.ts:30 — the order document id IS the giver's uid
  batch.set(firestore.doc(db, 'events', 'main', 'orders', uid), { … size: input.size, … })
// src/lib/orders.ts:69 — the Admin enumerates that collection
  const snap = await firestore.getDocs(firestore.collection(db, 'events', 'main', 'orders'))
```
```rules
// firestore.rules:69-71
      match /orders/{giverUid} {
        allow get: if isSignedIn() && (giverUid == request.auth.uid || isAdmin());
        allow list: if isAdmin();
```
```tsx
// src/components/JerseyOrderForm.tsx:58 — D-15 pre-fills the RECIPIENT's size
  const [size, setSize] = useState<Size>(recipientSize)
```

The phase is explicit that crossing *talla + equipo* with the public lobby list reconstructs the pairing — that is the stated reason the export carries no identity (`01-02-PLAN.md:208`, `01-02-PLAN.md:302`, `exportOrders.ts:12-14`). But the only party who both renders the export and can read the roster is the **Admin**, who is the one actor the core value forbids from learning the pairing (`PROJECT.md`: "El organizador (Admin) nunca ve los emparejamientos"). Concretely, an Admin with devtools gets `orders/{giverUid}` → `{type, team, season, printedName, number, size}` for every giver (`list` is granted to them by the rule above; the app's own projection `listOrdersAdmin` discards the id, but the SDK result does not), and `participants/{uid}` is publicly readable inside the event with each person's size and preferred teams (`firestore.rules:42`). Since `size` defaults to the recipient's size, a single-sized participant is identified outright; for others the team/season/printed name narrows it further.

**Why it matters:** the phase's public claim ("the Admin cannot reconstruct the pairing") is stronger than what the data model supports. This is not a code bug in isolation — the order document must carry the shirt, and `D-20` locks the export's seven columns — so it needs an explicit product decision, not a silent "fix". Flagging it here because priority 1 of this review is exactly this invariant, and because `01-EDGE-COVERAGE.md`/`01-02-PLAN.md:302` closed SEC-02 without confronting the Admin-as-correlator case.

**Fix (in increasing cost):**

1. **Minimum, code-level:** stop keying the order document by identity. Write it at `orders/{crypto.randomUUID()}` (the `opaqueId` already exists for this) and keep progress on the participant document (`hasOrder`, already the admin's data source per D-19). The Admin's enumeration then returns no uid at all, removing the document-id leak.
2. **Product-level:** state the residual risk in the Phase-2 README trust contract (ROADMAP Phase 2 criterion 5 already asks for that document) and decide whether the Admin handing the file to the seller is acceptable, or whether the export should be produced without the Admin seeing rows (e.g. a pre-filled download link).
3. Do **not** "fix" it by removing `size`/`team` from the export — `D-20` locks those seven columns.

---

### WR-03 [medium] — The roster freeze after the draw (D-10) is client-side only

**File:** `firestore.rules:41-53`
**Category:** security / data integrity
**Evidence:**

```rules
      match /participants/{uid} {
        allow get, list: if isSignedIn();

        allow create, update: if isSignedIn()
          && uid == request.auth.uid
          && request.resource.data.name is string
          && request.resource.data.nameNormalized is string
          && request.resource.data.size in ['S','M','L','XL','XXL','XXXL'];
```

The rule never consults `events/main.status`. The freeze is enforced only by `joinEvent`'s in-transaction check (`joinEvent.ts:72-75`) and by the route guard. A participant using devtools (or a stale client that resolved `status` before the draw) can create or mutate their own participant document **after** the draw: they enter the roster, and — because the Reveal page reads the recipient's document live (`lobby.ts:53`) — they can change the `size`/`likedTeams` the giver already saw and ordered against. They would have no assignment (the draw already ran), i.e. they become a permanent occupant of the "missing assignment" dead end (see WR-07).

**Why it matters:** D-10 states "Tras el sorteo el roster queda congelado"; the rules are the phase's own declared authority for that class of invariant (`01-EXECUTION`/rules comments), and today they do not express it.

**Fix:**
```rules
        allow create, update: if isSignedIn()
          && uid == request.auth.uid
          && get(/databases/$(database)/documents/events/main).data.status == 'lobby'
          && request.resource.data.name is string
          && request.resource.data.nameNormalized is string
          && request.resource.data.size in ['S','M','L','XL','XXL','XXXL'];
```
(Costs one extra document read per write — same trade-off the file already accepts in `isAdmin()`, `firestore.rules:13`.)

---

### WR-04 [medium] — `status` can be set back from `drawn` to `lobby`, and the draw then silently re-assigns everybody

**File:** `firestore.rules:32-33`, `src/lib/draw.ts:41-47`
**Category:** security / data integrity
**Evidence:**

```rules
      allow update: if isAdmin()
        && request.resource.data.adminUid == resource.data.adminUid;
```
```ts
// src/lib/draw.ts:41-47
    if (snap.data().status === 'drawn') return
    for (const [giver, recipient] of pairs) {
      tx.set(firestore.doc(db, 'events', 'main', 'assignments', giver), { recipientUid: recipient })
    }
    tx.update(eventRef, { status: 'drawn' })
```

The rule pins `adminUid` but places no constraint on `status`, so the Admin (via devtools, or via any future bug) can write `status: 'lobby'` on a drawn event. That re-opens joining, re-enables the `/lobby` screen, and makes `runDraw` idempotent-check pass again; because `assignments` allows `create, update: if isAdmin()` (`firestore.rules:64`), the second run **overwrites** every existing assignment. Anyone who already ordered then owns an order for a person they are no longer assigned to, with no signal. Note also that the plan's own listed risk was the mirror image ("cannot forge adminUid"), so this direction was never modelled (`01-01-PLAN.md:226`).

**Why it matters:** the "one draw, immutable" property is what makes the order/assignment pair coherent; the rules — the declared authority — do not hold it.

**Fix:** constrain the transition to move forward only:
```rules
      allow update: if isAdmin()
        && request.resource.data.adminUid == resource.data.adminUid
        && (resource.data.status == 'drawn'
              ? request.resource.data.status == 'drawn'      // terminal
              : request.resource.data.status in ['lobby', 'drawn']);
```

---

### WR-05 [medium] — Reveal spins forever when the recipient's participant document is missing

**File:** `src/pages/RevealPage.tsx:80-114`
**Category:** bug / unhandled edge case
**Evidence:**

```tsx
// src/pages/RevealPage.tsx:84-97
        const person = await getParticipant(assignment)
        if (cancelled) return
        setRecipient(person)          // person may be null: no throw, no error state
        setRecipientError('')
…
// src/pages/RevealPage.tsx:109-114
  const pendingRead = loading || (assignment !== null && recipient === null && !recipientError)

  if (pendingRead) return <RevealLoading />
  if (failure) return <RevealError … />
  if (missing) return <RevealMissing … />
  if (!recipient) return <RevealMissing … />
```

`getParticipant` returns `null` (it does not throw) when the document does not exist (`lobby.ts:53-56`). With `recipient === null` and `recipientError === ''`, `pendingRead` stays `true` on every render, so `RevealLoading` ("Buscando a quién regalas…") is shown permanently — the `if (!recipient)` fallback on line 114 is unreachable in that state. A recipient document can legitimately be absent (WR-03 lets a post-draw mutation happen, an operator can delete a document, and any partial restore/re-seed produces it).

**Why it matters:** a permanent false loading state is exactly what the phase's "no spinner without a bounding error/empty state" rule exists to prevent; the page must degrade to `RevealMissing`, not hang.

**Fix:** track resolution explicitly instead of inferring it from `null`:
```ts
const [recipientLoaded, setRecipientLoaded] = useState(false)
…
  const person = await getParticipant(assignment)
  if (cancelled) return
  if (person === null) { setRecipientError('not-found') } else { setRecipient(person) }
  setRecipientLoaded(true)
…
const pendingRead = loading || (assignment !== null && !recipientLoaded && !recipientError)
```
and map `not-found` to `RevealMissing` (or to `errorCopy`'s generic branch).

---

### WR-06 [medium] — TypeScript `strict` mode is disabled in every project config

**File:** `tsconfig.app.json:1-25`, `tsconfig.node.json:1-23`
**Category:** quality / type safety (configuration defect)
**Evidence:** neither file contains `strict`, `strictNullChecks`, `noImplicitAny` or `noUncheckedIndexedAccess`; the "Linting" block of `tsconfig.app.json` is:

```json
    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
```

The standard `create-vite` `react-ts` template (which `01-01-PLAN.md:124` explicitly requires: *"NO escribir el scaffold a mano"*) enables `"strict": true`; `01-01-SUMMARY.md:185-190` records that the scaffold was generated in a temp directory and copied, which is the likely origin of the divergence. `tsc -b` passing (`verification_facts`) therefore proves much less than it appears to.

**Why it matters:** `strictNullChecks` off is precisely what let the null-handling defects above (CR-02's `uid ?? ''`, WR-05's `null` sentinel) pass the type gate without a single complaint. The whole app is typed as if every value is non-null.

**Fix:** add `"strict": true` (plus `"noUncheckedIndexedAccess": true` if the team can absorb it) to `tsconfig.app.json` and `tsconfig.node.json`, then fix the resulting errors — that error list is the highest-value bug backlog for this phase. Re-check against the upstream template so the divergence is not re-introduced on the next scaffold.

---

### WR-07 [medium] — The missing-assignment recovery button can never reach the lobby

**File:** `src/pages/RevealPage.tsx:60` + `src/pages/RevealPage.tsx:205-222`, `src/App.tsx:94-99`, `src/pages/LobbyPage.tsx:74-76`
**Category:** bug / dead affordance
**Evidence:**

```tsx
// src/pages/RevealPage.tsx:60
      onGoLobby={() => navigate('/lobby')}
…
// src/pages/LobbyPage.tsx:74-76
  if (eventStatus === 'drawn') {
    return <Navigate to="/reveal" replace />
  }
```

The `RevealMissing` state is reachable **only** when the event is already `drawn` (`App.tsx:103` gates `/reveal` on `eventStatus === 'drawn'`). Pressing «Ir a la sala de espera» navigates to `/lobby`, which renders `LobbyPage`, which immediately returns `<Navigate to="/reveal" replace />`. The user is returned to the exact screen they came from; the affordance is a guaranteed no-op by construction, while the copy deck mandates it as *the* action for that state (`01-UI-SPEC.md:524`).

**Why it matters:** an error-recovery action that provably does nothing is worse than none — it is the phase's only guidance in that state.

**Fix:** replace the action with a real one for a drawn event, e.g. reuse the existing retry callback:
```tsx
function RevealMissing({ onRetry }: { onRetry: () => void }) {
  …
  <Button type="button" variant="secondary" onClick={onRetry}>Reintentar</Button>
```
(keep `<Notice tone="error">No encontramos tu asignación.</Notice>` and the explanatory line). If the lobby route is meant to stay reachable after the draw, gate it on `eventStatus === 'lobby'` in `App.tsx` instead of letting `LobbyPage` bounce.

---

### WR-08 [medium] — The lost-identity recovery promises re-entry with your own name, which the duplicate check then rejects

**File:** `src/App.tsx:56-58`, `src/lib/joinEvent.ts:39-61`, `src/pages/EntryPage.tsx:57-62`
**Category:** correctness / copy-vs-behaviour / dead end
**Evidence:**

```tsx
// src/App.tsx:56-58
              Vuelve a entrar con tu nombre. Si ya estabas dentro, avisa al Admin.
```
```ts
// src/lib/joinEvent.ts:39-48 (shared pre-check; no self-exclusion)
export async function isNameTaken(name: string): Promise<boolean> {
  const dupe = await firestore.getDocs(
    firestore.query(
      firestore.collection(db, 'events', 'main', 'participants'),
      firestore.where('nameNormalized', '==', normalizeName(name)),
```

"Vuelve a entrar con tu nombre" is the copy for a user whose anonymous session was replaced (new uid) while their orphaned `participants/{oldUid}` document still holds their name. Following that instruction lands them on S1/S2, where the pre-check finds their own orphaned document and answers `«Ese nombre ya está en uso en el evento. Prueba con otro.»` — a message that tells them to try another name, i.e. to create a second identity in the same event (which is exactly what D-02's prohibition on silent duplication exists to prevent). `D-03` says a user who lost storage "puede re-unirse en v1", and the S8 surface points them at the one path that cannot work.

**Why it matters:** the mandated recovery surface for a state the phase deliberately built is a dead end; the actionable next step (`avisa al Admin`) is stated only for a different case.

**Fix:** either make the copy truthful and actionable for the orphan case — *"Ese nombre pertenece a una identidad que ya no nos consta. Avisa al Admin para que la libere y vuelve a entrar."* — or implement the liberation path (e.g. an Admin-only action that deletes the orphaned participant document; the rules already permit `delete` to the document's own uid, so an admin delete needs a new rule clause plus a decision record).

---

### IN-01 [low] — `SessionProvider` imports `firebase/firestore` directly, contradicting the module-boundary invariant its peers assert

**File:** `src/session/SessionProvider.tsx:19`, `src/lib/firebase.ts:2-4`
**Category:** architecture / maintainability (already logged, not fixed)
**Evidence:**

```ts
// src/session/SessionProvider.tsx:19
import { doc, getDoc } from 'firebase/firestore'
```
```ts
// src/lib/firebase.ts:2-4
 * The ONLY module in the app allowed to call initializeApp / getAuth / getFirestore,
 * and the only one that wires the Emulator Suite (T-01-07: no `firebase/*` import
 * escapes `src/lib/`, so rules and call-sites are audited as one unit).
```

T-01-07's invariant is false: `rg "from 'firebase" src/` returns `SessionProvider.tsx` alongside the `src/lib/` modules. `.planning/phases/01-flujo-completo-del-amigo-invisible/deferred-items.md` already records this honestly, so it is reported only for the ledger. The practical cost is that the "audit rules and call-sites as one unit" claim in `firebase.ts` is not true, and this read is the one that makes CR-02's staleness possible.

**Fix:** move the read into `src/lib/` (e.g. `getParticipant` in `lobby.ts` already returns exactly this shape) and have `SessionProvider` call it — which is also where the CR-02 subscription fix belongs.

---

### IN-02 [low] — `participantCount` drifts on the race-rollback path and is read by nobody

**File:** `src/lib/joinEvent.ts:88` + `src/lib/joinEvent.ts:107-116`, `src/domain/types.ts:32`
**Category:** data integrity / dead field
**Evidence:**

```ts
// joinEvent.ts:113-116 — the rollback deletes the participant document…
  if (after.size > 1) {
    await firestore.deleteDoc(meRef)
    throw new Error(ERR_NAME_RACE)
  }
```
…but `participantCount` was already incremented in step 2 (`joinEvent.ts:88`) and is never decremented. The counter is therefore wrong by +1 for every collision, and `rg participantCount src/` shows it is never read by any UI (`LobbyPage.tsx:78` counts `participants.length`); `EventDoc.createdAt` (`types.ts:31`) is likewise write-only. `01-01-PLAN.md:521` records the decision to keep the field "for schema fidelity" — retaining it is defensible, leaving it drifting is not.

**Note:** if CR-01 is fixed by deleting the counter write (option 1), this finding disappears with it; if CR-01 is fixed by widening the rule, the rollback must also decrement.

---

### IN-03 [low] — `ordersCsvFilename` derives the date from the UTC instant

**File:** `src/lib/download.ts:36-38`
**Category:** correctness / UX
**Evidence:**

```ts
export function ordersCsvFilename(date = new Date()): string {
  return `pedidos-${date.toISOString().slice(0, 10)}.csv`
}
```
`toISOString()` is UTC. An Admin downloading at 00:30 local (Madrid, UTC+2 in summer) receives `pedidos-<yesterday>.csv`. The announced name and the real name stay consistent (`AdminPage.tsx:88-90` computes it once), which is the stated requirement, but the *date* in the name is not the local date the organiser reads the calendar by.

**Fix (if it matters):** format from local parts (`const d = date; \`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}\``) and update the docstring, which currently justifies ISO for ambiguity reasons rather than for timezone.

---

### IN-04 [low] — The object URL is revoked synchronously after `click()`

**File:** `src/lib/download.ts:21-29`
**Category:** robustness (cross-browser)
**Evidence:**

```ts
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
```

Revoking in the same task as the click can cancel an in-flight download in some engines (notably Firefox/Safari) because the navigation to the blob URL has not been committed yet. The header comment presents the immediate revoke as a deliberate resource-leak fix, but a one-task delay is enough to bound the leak while removing the race.

**Fix:**
```ts
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
```
(or `requestAnimationFrame`). Also worth `anchor.remove()` after appending if you choose to append it.

---

### IN-05 [low] — `/admin` renders fully for non-Admins

**File:** `src/App.tsx:110-115`, `src/pages/AdminPage.tsx:70-71`
**Category:** authorization (UX-level) / correctness of error surface
**Evidence:**

```tsx
// App.tsx:110-115 — no `role === 'admin'` in the guard
        <Route
          path="/admin"
          element={identityPresent && hasPreferences ? <AdminPage /> : <Navigate to={home} replace />}
        />
```
A non-Admin who types `/admin` sees the whole panel: the fraction, the progress bar and the "who is missing" list (all derived from the publicly-readable `participants` collection, `AdminPage.tsx:71`) plus a «Descargar Pedidos» button that can only fail. Only the download call is stopped by the rules (`firestore.rules:71`), and the failure surfaces as `permission-denied`. No pairing is exposed, so this is a UX/consistency defect, not a privacy hole.

**Fix:** include the role in the guard (`identityPresent && hasPreferences && role === 'admin'`), or render the `permission-denied` copy as the page's whole body when `role !== 'admin'` — the UI-SPEC's `/admin` states are written for the Admin, so a stranger should not see the panel chrome.

---

### IN-06 [low] — Two mandated copies from the UI-SPEC are not implemented

**File:** `src/pages/AdminPage.tsx:145-148`, `src/components/JerseyOrderForm.tsx:111-112`
**Category:** UX contract / copywriting
**Evidence:**

```tsx
// AdminPage.tsx:145-148 — the S7 "no orders yet" state is missing
      ) : pending.length === 0 ? (
        <div className="mt-6">
          <Notice tone="success">Todos los pedidos están guardados.</Notice>
        </div>
```
```tsx
// JerseyOrderForm.tsx:111-112 — every submit failure gets the same copy
    } catch {
      setSubmitError('No hemos podido guardar tu pedido.')
```
The approved deck (`01-UI-SPEC.md:551`) defines an S7 empty state — `Todavía no hay ningún pedido.` + `Aparecerán aquí según los vayan guardando.` — which never renders, and (`01-UI-SPEC.md:555`) an offline variant for the order path, `Sin conexión. El pedido no se ha guardado.`, which is never used even though the UI-SPEC's "Offline" open-axis item requires that an offline order failure not be reported as a generic error. Neither is a crash; both are approved-contract gaps that Phase 2's "explicit loading/empty/error states" criterion will otherwise re-open.

**Fix:** add the empty branch (`total > 0 && filled === 0`) using the two deck strings, and branch the order catch on the Firestore code the way the other screens already do (`errorCopy` pattern in `LobbyPage.tsx:29-40`).

---

### IN-07 [info] — The design-token layer is declared but almost entirely unconsumed

**File:** `src/index.css:10-61`
**Category:** maintainability / dead code / doc-vs-implementation
**Evidence:** `index.css` introduces `--color-surface`, `--color-accent`, `--color-destructive`, `--color-warning*`, `--color-error*`, `--color-success*`, `--color-border*`, `--color-disabled*`, `--color-progress-*` with the header comment *"Every colour/token the UI-SPEC declares lives here as a named token so no component hardcodes a hex value"*. Measured usage in `src/`: `bg-dominant` × 2, every other colour token × 0. Meanwhile the components hardcode the same palette steps the tokens were meant to name (`border-slate-200`, `bg-indigo-600`, `text-red-800`, `bg-slate-200` for the progress track at `AdminPage.tsx:119-121` where `--color-progress-track/fill` exists).

**Fix:** either route the components through the tokens (then the "no literal colour" claim becomes true), or delete the unused tokens and keep the literal-palette convention that the `01-01-SUMMARY.md:34` pattern actually records. Leaving both is the worst option: two competing sources for the same colours.

---

### IN-08 [info] — Dead exports and values left in place

**File:** `src/domain/sizeGuide.ts:49` + `:57-59`, `src/components/Notice.tsx:25` + `:30`, `src/domain/types.ts:31-32`, `public/icons.svg`
**Category:** dead code
**Evidence / usage measured with `rg`:**

- `hasAmbiguousWeight` (`sizeGuide.ts:57`) is referenced only by `sizeGuide.test.ts`. Its docstring says it is exposed *"so the UI can raise a non-blocking notice"* — the UI raises that notice as hardcoded copy (`SizeGuideModal.tsx:38`) and never calls the predicate.
- `RETRO_USES_FAN_TABLE` (`sizeGuide.ts:49`) is referenced only by its own test; the Retro note is hardcoded (`SizeGuideModal.tsx:36`), so the constant that exists "so a consumer does not have to infer it" has no consumer.
- `NoticeTone`'s `'info'` tone (`Notice.tsx:25`, `:30`) has no call site.
- `EventDoc.createdAt` / `EventDoc.participantCount` (`types.ts:31-32`) are written but never read (see IN-02).
- `public/icons.svg` (scaffold asset, unreferenced by `index.html` or `src/`).

**Fix:** delete what is not used, or wire the two copy strings to their constants so the "single source" claim holds. Not urgent, but it is the kind of leftover that makes the next reviewer re-derive the truth from scratch.

---

### IN-09 [info] — No `test` script in `package.json`

**File:** `package.json:6-11`
**Category:** developer experience
**Evidence:**

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
```
Vitest is installed and configured (`vite.config.ts:9-13`) but the 28 passing tests can only be run with `npx vitest run`. Any CI or fresh clone that runs `npm test` gets an error rather than the suite.

**Fix:** add `"test": "vitest run"` (and optionally `"test:watch": "vitest"`).

---

### IN-10 [info] — Small hardening nits in input/CSV handling

**File:** `src/components/JerseyOrderForm.tsx:183-197`, `src/domain/exportOrders.ts:45`
**Category:** hardening (defence in depth)
**Evidence:**

```tsx
// JerseyOrderForm.tsx:185-190 — `noValidate` on the form (line 124) disables the pattern
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
```
Because the form sets `noValidate` and there is no runtime check, a desktop user can type `ABC` into «Dorsal»; it is stored and exported verbatim (the UI-SPEC mandates the field be `type="text"` so `09` survives, which is correct, but nothing enforces digits).

```ts
// exportOrders.ts:45 — the formula guard only catches a leading =, +, - or @
  const safe = /^[=+\-@]/.test(value) ? "'" + value : value
```
A cell beginning with a tab or a newline followed by `=` is still interpreted by Excel/LibreOffice after their own trimming. The RFC-4180 quoting already handles embedded separators/quotes correctly.

**Fix:** normalise/validate the dorsal on submit (`if (!/^\d{0,3}$/.test(number)) nextErrors.number = …`), and widen the guard to `/^[\s\u0000-\u001f]*[=+\-@]/` before prefixing.

---

## Verified as SOUND

These were checked by reading the code (and, for the pure modules, by reading the tests) and are **correct as implemented**. The phase verifier can rely on this section without re-deriving it:

**Privacy of the pairing (core value) — SOUND**

- The draw writes **exactly one document per giver** at `events/main/assignments/{giverUid}` holding a single scalar field `recipientUid` (`draw.ts:44-46`); no document anywhere holds a map, array, seed or permutation, and no timestamp or extra field rides along.
- `assignments` allows `get` to the giver only and **denies `list` to everyone** (`firestore.rules:57-66`); `src/` contains no collection reference, query or `getDocs` against `assignments` — the only read is `getDoc(doc(…, 'assignments', uid))` (`assignment.ts:23`). The Admin cannot enumerate or read the pairing.
- `orders` documents carry no `recipientUid` / `recipientName` and the rule forbids those fields outright (`firestore.rules:77-80`); `OrderInput` and `ExportedOrder` have no identity or pairing field (`types.ts:35-73`), so the compiler enforces the absence.
- The CSV export is exactly seven columns (`exportOrders.ts:23-31`), contains no participant identity, uid or pairing field, is built field-by-field rather than by spreading the document (`orders.ts:71-82`), and imports nothing from `src/lib/` — several tests pin the header, the column count and the absence of `giverUid`/`recipientUid`.
- No pairing value reaches a log, an error message or a URL: the single `console.error` in the codebase is the render-phase `ErrorBoundary` (`ErrorBoundary.tsx:18`), and every hook propagates only a Firestore error *code*, never the data.
- Segment note: the residual Admin-side correlation risk is filed separately as WR-02 (design-level, needs a product decision). No component, hook, export path or Admin screen enumerates the pairing collection.

**Correctness of the circular draw — SOUND**

- `buildDerangement` is a true derangement cycle for `n >= 3`: it copies the input, Fisher-Yates shuffles the copy, and maps `order[i] -> order[(i+1) % n]`, which is a bijection with no fixed point, exactly one cycle, and no mutual pairs — verified by property tests (`derangement.test.ts:20-42`) covering bijection, no self-assignment, single-cycle and non-mutation, plus the `n < 3` rejections for `[]`, `[a]`, `[a,b]`.
- `runDraw` guards `length < 3`, computes the permutation **outside** the transaction (deterministic on retry — no re-randomising inside a re-runnable closure), reads `events/main` **before** writing, returns without writing when `status === 'drawn'` (a second run or a double click writes nothing), and flips `status` in the same atomic transaction as the assignments.
- `n = 0/1/2` is rejected in both the pure function and the caller (`derangement.ts:27`, `draw.ts:31`), and the UI both disables the CTA and explains why while `count < 3` (`LobbyPage.tsx:163-171`).

**Data integrity — SOUND**

- Dorsal is a **string** end to end: `Input type="text"` (`JerseyOrderForm.tsx:185-191`), `number: string` in `OrderInput`/`Order`/`ExportedOrder`, no `parseInt`/`Number()`/arithmetic anywhere in `src/` — leading zeros survive by construction, and a test asserts `;09;` round-trips.
- Order idempotence: the document id is deterministic (`orders/{uid}`), so a retry overwrites rather than duplicating; the order document and the participant's `hasOrder` flag are written in the **same batch** (`orders.ts:28-43`), so the Admin's progress can never disagree with the stored orders.
- CSV format: UTF-8 BOM + `;` separator + CRLF line endings + closing CRLF, RFC 4180 quoting with doubled internal quotes, and a spreadsheet formula-injection guard (`exportOrders.ts`) — all directly asserted by `exportOrders.test.ts` (BOM, exact header, CRLF, quoting, accents, leading-zero dorsals, formula guard).
- No `serverTimestamp()` value is used as a sort key: the roster is ordered by `nameNormalized` (`lobby.ts:21`), and the export has no time column.
- Literal spec data is transcribed faithfully, including both provider anomalies, and is pinned by tests that would fail on any "correction": the Fan table's six rows and equivalences, Player's five rows ending at `2XL` (not `XXXL`), the duplicate `70-78` weight range for Player M/L, the six-item `SIZES` enum, and the three prices (`sizeGuide.test.ts`, `prices.test.ts`; 5 files / 28 tests pass per the verification facts).

**Security rules: default-deny and the rest of the surface — SOUND (except the two transitions filed as CR-01/WR-03/WR-04)**

- Default deny: every rule is conditional, there is no `if true`, no wildcard that admits documents that cannot exist (`match /events/main` is a literal path), and `delete` is denied on `events/main`, `assignments` and `orders`.
- `adminUid` is write-once: the `create` branch requires `request.resource.data.adminUid == request.auth.uid`, and the only `update` branch re-asserts `request.resource.data.adminUid == resource.data.adminUid`, so no later write can forge or change the Admin.
- Participants cannot touch each other's documents (`uid == request.auth.uid` on `create`/`update`/`delete`), and the `delete` grant is exactly what the post-commit race rollback needs.
- Orders: own-or-Admin read, Admin-only enumeration, own-only write, `number is string` enforced, recipient fields forbidden.
- The participant `create` requires the size enum, so a participant without a size is impossible by construction, which is what lets S1 defer any Firestore write to S2.
- Config hygiene: Firebase is initialised only from `import.meta.env.VITE_FIREBASE_*` with a **named** failure listing the missing variables (`firebase.ts:19-37`) — no literal key anywhere in the repo; `.env.example` contains placeholders only; `.env.local` is gitignored; the emulator wiring is `DEV`-only and idempotent via a module-scope flag (`firebase.ts:47-53`); `initializeApp`/`getAuth`/`getFirestore` are called exactly once.
- `firebase.json` ships the catch-all SPA rewrite and points Firestore at `firestore.rules`; `.firebaserc` uses the emulator-only `demo-` project id, so no production credentials are required or present.

**UX / accessibility against the approved contract — mostly SOUND**

- One `<main>` and one `<h1>` per screen (`Screen.tsx:32-35`), `titleRole="display"` used in exactly the two permitted places (`/` and `/reveal`).
- `aria-live="polite" aria-atomic="true"` on the lobby count (`LobbyPage.tsx:101`), `aria-live="polite"` on the Admin fraction, `role="progressbar"` with min/max/now/valuetext (`AdminPage.tsx:109-122`).
- Explicit loading / empty / error branches on S4, S5 and S7, with the S8 taxonomy (permission-denied / unavailable / resource-exhausted / generic) mapping to one copy each and to whether a retry is offered — implemented consistently in `LobbyPage`, `RevealPage` and `AdminPage`.
- Validation focus management: the name input and the size select are re-focused on reject (`EntryPage.tsx:48`, `PreferencesPage.tsx:61`), errors are wired through `aria-describedby` + `aria-invalid`, and the alert live region exists only in `Field` while every other notice uses `status`.
- Copy deck: S1–S6 strings, the three locked literals ("Te ha tocado regalar a {Nombre}", "Empezar Sorteo", "Guía de Tallas") and the three prices match `01-UI-SPEC.md` verbatim; the destructive dialog names the participant count and has its initial focus on «Cancelar» (`DrawConfirmDialog.tsx:35`), with both buttons disabled while the transaction is in flight; the native `<dialog>` supplies the focus trap, `Esc` and the inert background, with a sticky 44 px close button labelled «Cerrar».
- `motion-reduce:animate-none` accompanies every animation (`FullScreenSpinner`, `icons.tsx:40`, the skeletons, `LobbyPage`, `AdminPage`); user-supplied text always uses `break-words` and `truncate` appears nowhere in `src/`; 44 px minimum targets; `lang="es"`; the size guide collapses to one card per size below `sm` with no horizontal scroll container.
- No stubs remain: the two `null` placeholder pages recorded in `.planning/WINDOWS.md` (ids 1 and 2) are implemented and marked fixed; `/reveal` and `/admin` are only reachable through their intended conditions (subject to IN-05).

**Not verified (requires live execution — do not treat as either sound or broken):** every rule behaviour against the emulator, the two-participant join, the duplicate-name race and rollback, the double-click draw idempotence, and the 320 px/360 px responsive reads. These are precisely the four still-open rows of `.planning/WINDOWS.md` (ids 3–6, 8), which is also why CR-01 and CR-02 escaped the phase's own verification.

---

_Reviewed: 2026-10-19T15:30:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
