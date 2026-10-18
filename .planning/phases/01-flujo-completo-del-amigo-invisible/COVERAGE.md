# Phase 1 — API Coverage Decision Matrix (Firebase / Firestore JS SDK)

> Authored by `gsd-planner` for the `api-coverage` capability (`workflow.api_coverage_gate: true`).
> Detector fired on signal: **Firebase/Firestore JS SDK** (`firebase@13.0.0`).
> Policy: **default full coverage.** Every `OPT-OUT` row carries a one-line reason.
> Validated by the `verify:pre` seal gate of `/gsd-plan-phase`; a malformed matrix blocks the seal.

**Phase:** 1 — Flujo completo del amigo invisible
**SDK:** `firebase@13.0.0` (Firestore unchanged from v12) · `firebase/auth` (Anonymous) · `firebase-tools@15.34.0` (emulators)
**Single import boundary:** only `src/lib/*` may import from `firebase/*` (`01-RESEARCH.md:345`). Every row below is therefore realised inside `src/lib/`.

## Decision Matrix

| # | Capability | API surface | Status | Where it lands / reason |
|---|-----------|-------------|--------|-------------------------|
| 1 | Document read (by id) | `getDoc(doc(db, …))` | **COVERED** | `src/lib/assignment.ts` → `getMyAssignment(uid)` reads `events/main/assignments/{uid}` **by document id only** (DRAW-05, ORDER-01). `src/lib/orders.ts` → `getMyOrder(uid)` for ORDER-05. This is the *only* legal read path over `assignments`: `list` is denied by rule. |
| 2 | Collection list — `participants` | `onSnapshot(query(collection(...), orderBy('nameNormalized')))` and `getDocs(query(…, where(…), limit(1)))` | **COVERED** | `src/lib/lobby.ts` → `subscribeParticipants` (DRAW-01, PREF-05, DRAW-01's live roster). `src/lib/joinEvent.ts` → the duplicate-name pre-check (`where('nameNormalized','==',x)`, `limit(1)`) plus the post-commit collision re-check (EVENT-04, D-02). |
| 3 | Collection list — `orders` | `getDocs(collection(db,'events','main','orders'))` | **COVERED** | `src/lib/orders.ts` → `listOrdersAdmin()` — Admin-only (`allow list: if isAdmin()`), projected to `ExportedOrder` so no identity crosses the boundary (ADMIN-01, ADMIN-02, SEC-02). |
| 4 | Document read — `events/main` (event status + adminUid) | `onSnapshot(doc(db,'events/main'))` + `getDoc` | **COVERED** | `src/lib/lobby.ts` → `subscribeEvent` pushes `status` and `adminUid` to `SessionProvider`; the `drawn` flip redirects every connected client to `/reveal` with no polling (DRAW-02, DRAW-10-via-D-22, D-23). |
| 5 | Realtime listeners | `onSnapshot` + unsubscribe teardown | **COVERED** | Two listeners only, both per-route and both returning their unsubscribe from the hook's `useEffect`: `participants` (lobby, `/admin` progress) and `events/main` (session status). Never ordered by `joinedAt` — `serverTimestamp()` is `null` in local snapshots (Pitfall 10). |
| 6 | Transactional read + write | `runTransaction(db, async tx => …)` | **COVERED** | Two transactions, the phase's atomicity backbone: `src/lib/joinEvent.ts` (bootstrap-or-join: first user becomes Admin, D-02/EVENT-02) and `src/lib/draw.ts` (N assignment writes + `status: 'drawn'`, aborting if already drawn — idempotent against a double click, D-09/DRAW-03/SEC-01). |
| 7 | Batched / individual writes | `setDoc` / `tx.set` / `writeBatch` + `batch.commit()` | **COVERED** | `writeBatch` in `src/lib/orders.ts` → `submitOrder` writes `orders/{giverUid}` **and** flips `participants/{uid}.hasOrder` in one batch, so progress can never disagree with the order document (Pitfall 11, ORDER-05, ADMIN-01). Individual `tx.set` for each assignment inside the draw transaction. |
| 8 | Deterministic document ids (idempotency without a counter) | `doc(db, path, uid)` as the write key | **COVERED** | `orders/{giverUid}` and `participants/{uid}`: re-submitting overwrites rather than duplicates (D-18). This is also why the order document needs no recipient field at all (ORDER-04). |
| 9 | Security rules (server-side authorization) | `firestore.rules`, `rules_version = '2'` | **COVERED** | Repo root, written in the same commit as the schema (D-06) — not at the end. `assignments`: `allow get` if `giverUid == request.auth.uid`, `allow list: if false` (nobody, Admin included); `events/main`: bootstrap `create` asserting `adminUid == request.auth.uid` + `update` re-asserting `adminUid` immutability; `participants`: signed-in `get`/`list`, own `create`/`update` asserting the size enum; `orders`: own-or-Admin `get`, Admin `list`, own `create`/`update` asserting `number is string` and forbidding `recipientUid`/`recipientName`. Default deny — nothing is `if true`. |
| 10 | Anonymous auth | `signInAnonymously(auth)` + `onAuthStateChanged` + `auth.currentUser` | **COVERED** | `src/lib/firebase.ts` (client) and `src/lib/session.ts` → `ensureSignedIn()`: called **once**, reuses `auth.currentUser.uid` when a session already exists so a reload never double-signs (Pitfall 7, EVENT-03). Silent — no login screen, no password, no OAuth (D-01). |
| 11 | Identity persistence | `localStorage` (`{uid, name}`) + Firestore as the authority | **COVERED** | `src/lib/session.ts` → `saveIdentity` / `loadIdentity` / `clearIdentity`. Survives a reload (EVENT-01); clearing storage is a recoverable re-join by design (MGMT-03 deferred, D-03). An identity whose `uid` no longer matches a participant document is surfaced as the S8 lost-identity state, never as a blank screen. |
| 12 | Emulator wiring | `connectFirestoreEmulator` / `connectAuthEmulator` behind `import.meta.env.DEV` | **COVERED** | `src/lib/firebase.ts`, guarded `if (import.meta.env.DEV)` and **called exactly once** per SDK instance (Pitfall 6 — a double `connect…Emulator` throws `failed-precondition` on hot reload). Project id `demo-secretkit` (emulator-only: no billing, no credentials). |
| 13 | Server timestamps | `serverTimestamp()` | **COVERED (write-only)** | `createdAt` on `events/main`, `joinedAt` on `participants/{uid}`, `submittedAt` on `orders/{giverUid}` — written, never read for ordering. `serverTimestamp()` is `null` in a local snapshot, which is exactly why the lobby sorts by `nameNormalized` and not `joinedAt` (Pitfall 10). |
| 14 | Document delete (own) | `deleteDoc` | **COVERED** | Used by exactly one path: the post-commit duplicate-name rollback in `src/lib/joinEvent.ts`, permitted by `allow delete: if isSignedIn() && uid == request.auth.uid` on `participants` (the one place the app rolls its own write back). Nothing else deletes anything. |
| 15 | Offline persistence (IndexedDB) | `initializeFirestore` + `persistentLocalCache` / `enableIndexedDbPersistence` | **OPT-OUT** | Reason: the event is live and always-connected; the default memory cache already gives fast repeat reads, and multi-tab coordination adds complexity with no benefit at ≤ ~20 participants. Documented anti-pattern in `01-RESEARCH.md` §Anti-Patterns. |
| 16 | Firestore Lite | `firebase/firestore/lite` | **OPT-OUT** | Reason: Lite omits `onSnapshot` entirely — the realtime lobby (DRAW-01) is impossible without it, and the project's own Key Decision is real-time synchronisation. The full SDK is required. |
| 17 | Cloud Functions | `firebase/functions`, `onDocumentWritten` triggers, callable functions | **OPT-OUT** | Reason: requires the Blaze billing plan and contradicts PROJECT.md's "sin backend propio / API REST". SCOPE-03 (a truly blind draw also hidden from the project owner) is documented as a future route, explicitly **not** a v1 deliverable. |
| 18 | Composite indexes | `firestore.indexes.json` | **OPT-OUT (no file authored)** | Reason: the only two queries in the phase are a single-field equality (`where('nameNormalized','==',…)`) and a single-field order (`orderBy('nameNormalized')`), both served by Firestore's automatically-created single-field indexes. If execution ever hits `FAILED_PRECONDITION`, the remedy is one `firestore.indexes.json` entry (Assumption A4) — not a Phase-1 deliverable. |
| 19 | Admin SDK / server-side credentials | `firebase-admin` | **OPT-OUT** | Reason: there is no server. The Firebase project owner's console/Admin-SDK read access is the *accepted, documented* trust limit (ROADMAP.md:9); Phase 1 must not pretend otherwise, and Phase 2's README states it out loud. |
| 20 | Firebase Hosting deploy | `firebase deploy --only hosting` | **OPT-OUT (config authored, deploy deferred)** | Reason: `firebase.json` already carries the catch-all SPA rewrite so deep-links survive a reload, but no production Firebase project exists in Phase 1 and the deployment verification belongs to Phase 2 (criterion 4). |
| 21 | Firebase Storage / Cloud Messaging / Analytics / Remote Config / Performance | `firebase/storage`, `firebase/messaging`, … | **OPT-OUT** | Reason: no product surface uses them. Notifications are v2 (NOTF-01/02) and would need push infrastructure contradictory to "herramienta puntual entre amigos". |
| 22 | App Check / reCAPTCHA | `firebase/app-check` | **OPT-OUT** | Reason: the emulator suite and a `demo-` project id cannot validate App Check, and at this scale the anonymous-uid + rules pair is the control that matters. Revisit only if a real project is deployed and abuse appears. |

## Coverage Summary

| Status | Count | Rows |
|--------|-------|------|
| **COVERED** | 14 | 1–14 |
| **OPT-OUT (with reason)** | 8 | 15–22 |
| **Total capabilities considered** | 22 | — |

Every capability the phase's code actually exercises is `COVERED`. Every `OPT-OUT` names the specific
research/decision artefact that justifies it — none is a silent omission. The four rows that carry the
product's core value are **#1** (by-id-only assignment read), **#6** (the atomic draw transaction),
**#9** (the rules that make `list` on `assignments` impossible for everyone) and **#7** (the batched
order write that keeps progress honest without a submissions collection).
