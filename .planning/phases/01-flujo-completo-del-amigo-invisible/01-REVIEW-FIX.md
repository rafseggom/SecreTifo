---
phase: 01
fixed_at: 2026-10-19T15:41:00Z
review_path: .planning/phases/01-flujo-completo-del-amigo-invisible/01-REVIEW.md
iteration: 1
findings_in_scope: 20
fixed: 17
skipped: 3
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-10-19T15:41:00Z
**Source review:** `.planning/phases/01-flujo-completo-del-amigo-invisible/01-REVIEW.md`
**Iteration:** 1

**Summary:**

- Findings in scope: 20 (all severities; `fix_scope = all`)
- Fixed: 17 (16 with a commit of their own; CR-01+IN-02 and CR-02+IN-01 share a commit because the two fixes are inseparable)
- Skipped: 3 (WR-02, IN-07, IN-08)

**Verification run in this working tree (main checkout, `workflow.use_worktrees = false`):**

| Gate | Command | Result |
|------|---------|--------|
| Types | `npx tsc -b --force` | exit 0, no diagnostics (now under `strict: true`) |
| Tests | `npx vitest run` | 8 files, 42 tests, all pass |
| Lint | `npm run lint` | exit 0, exactly 3 pre-existing `react(only-export-components)` warnings, 0 errors |
| Build | `npm run build` | exit 0, `✓ built` |
| Rules | Firestore + Auth emulator probes | all probes pass (see WR-03/WR-04/CR-01) |

`git status --porcelain --untracked-files=all` shows only the two expected untracked
`.planning` paths (`milestone.lock`, `01-REVIEW.md`). No stray emitted artifacts.

**Privacy invariants held across every fix** (unchanged): one doc per giver at
`assignments/{giverUid}`; `assignments` grants `get` to the owner only and `list` to nobody;
the Admin never reads `assignments`; the CSV export keeps its seven locked columns; no `if true`
anywhere in `firestore.rules`.

---

## Fixed Issues

### CR-01 [critical]: only the first participant could ever join

**Files modified:** `src/lib/joinEvent.ts`, `src/lib/joinEvent.test.ts` (new), `src/domain/types.ts`
**Commit:** `b68385b`
**Applied fix:** Took the review's option 1 — deleted the non-Admin `participantCount` update on
`events/main`; the counter is now written exactly once, on the bootstrap `set`. Confirmed
`participantCount` is read by nothing (writer + type only). `tsc` still clean, so the
`EventDoc.participantCount` field stays for schema fidelity.
**Verified:** emulator probe — user A joins (Admin), user B joins → B **succeeds**. Also verified
a non-Admin cannot update or forge `events/main`.

### CR-02 [critical]: a successful join was immediately undone

**Files modified:** `src/lib/lobby.ts`, `src/lib/lobby.test.ts` (new), `src/lib/joinEvent.ts`,
`src/lib/joinEvent.test.ts`, `src/session/SessionProvider.tsx`, `src/App.tsx`,
`src/pages/EntryPage.tsx`
**Commit:** `7af6530` (also fixes IN-01 — the subscription must live in `src/lib/`)
**Applied fix:** `SessionProvider` now subscribes to `participants/{uid}` via the new
`subscribeParticipant` in `src/lib/lobby.ts` and sets `hasPreferences` from each snapshot.
`/preferences` no longer renders the join form once the participant document exists, and the
shared pre-check `isNameTaken(name, excludeUid?)` uses `limit(2)` +
`docs.some(d => d.id !== excludeUid)` so a user's own document is never read as a collision.
**Verified:** deterministic from source; unit test exercises `subscribeParticipant`; the rules
probe confirms a second participant can join. The end-to-end screen transition is **not**
component-tested — **requires human verification**.

### WR-01 [high]: an unbounded identity failure persisted an empty uid

**Files modified:** `src/session/SessionProvider.tsx`, `src/App.tsx`, `src/pages/EntryPage.tsx`
**Commit:** `9e140a8`
**Applied fix:** Added `error: string | null` to `SessionState`; the catch sets it instead of only
clearing `loading`, and `retryIdentity` resets it (reset lives in the action, not the effect, so
the `react(set-state-in-effect)` lint rule is not tripped). `App` renders a bounded boot-error
screen (`Algo ha ido mal.` + `Reintentar`) before any route. `EntryPage` refuses to submit and
never persists when `uid === null` (the `uid ?? ''` write is gone).
**Verified:** `tsc`/lint clean. The boot-error surface itself is **not** component-tested —
**requires human verification**.

### WR-03 [medium]: the post-draw roster freeze was client-side only

**Files modified:** `firestore.rules`
**Commit:** `862f8e8`
**Applied fix:** Adapted the review's rule instead of applying it verbatim. A blanket
`status == 'lobby'` would break every order save, because `submitOrder` writes `hasOrder` on the
participant document in the same batch and only ever runs after the draw. `create` is now allowed
only while `lobby`; `update` is allowed while `lobby` **or** when
`affectedKeys().hasOnly(['hasOrder'])` — so name/size/teams freeze after the draw while the order
progress flag still writes.
**Verified:** emulator probes — post-draw `create` denied; post-draw `size`/name changes denied;
post-draw `hasOrder` allowed; order save works.

### WR-04 [medium]: `status` could be rewound from `drawn` to `lobby`

**Files modified:** `firestore.rules`
**Commit:** `c3b6568`
**Applied fix:** Applied the review's forward-only transition guard: when `resource.data.status ==
'drawn'`, `request.resource.data.status` must stay `'drawn'`; otherwise it may be `lobby` or
`drawn`. `adminUid` stays immutable.
**Verified:** emulator probes — `drawn → lobby` denied, `drawn → drawn` allowed, all CR-01/WR-03/
privacy probes still pass (probe exit 0).

### WR-05 [medium]: Reveal spun forever on a missing recipient document

**Files modified:** `src/pages/RevealPage.tsx`
**Commit:** `a1c41a6`
**Applied fix:** Applied the review's fix — a `recipientLoaded` flag plus a `RECIPIENT_NOT_FOUND`
sentinel so "in flight" is no longer inferred from `recipient === null`. `pendingRead` is now
`loading || (assignment !== null && !recipientLoaded && !recipientError)`, and the not-found case
degrades to `RevealMissing`.
**Verified:** `tsc`/lint clean. UI state logic with no component test — **requires human
verification**.

### WR-06 [medium]: TypeScript `strict` was disabled in every config

**Files modified:** `tsconfig.app.json`, `tsconfig.node.json`
**Commit:** `bc92153`
**Applied fix:** Added `"strict": true` to both project configs and re-ran `tsc -b --force`:
**zero new diagnostics** (the earlier CR-02/WR-01/WR-05 null-handling fixes had already removed
the code that depended on `strictNullChecks` being off). Confirmed in effect with
`tsc --showConfig`. `noUncheckedIndexedAccess` (the review's optional add-on) was deliberately
**not** enabled: it would force changes across unrelated modules (array indexing in the domain
pure functions) and is not required by the finding.
**Verified:** `tsc -b --force` exit 0; `--showConfig` shows `strict: true` in both.

### WR-07 [medium]: the missing-assignment recovery button was a guaranteed no-op

**Files modified:** `src/pages/RevealPage.tsx`
**Commit:** `0dbadb2`
**Applied fix:** Took the review's primary option — the `RevealMissing` action is now
`Reintentar` wired to the existing `onRetry` callback, replacing «Ir a la sala de espera» (which
`LobbyPage` bounced straight back to `/reveal`). Removed the now-unused `onGoLobby` prop from
`RevealPage`/`RevealBody`. Body copy made truthful: `Vuelve a intentarlo. Si el problema
continúa, avisa al Admin.` **Deviation from `01-UI-SPEC.md:524`**, documented in-code; the
notice text is kept verbatim.
**Verified:** `tsc`/lint clean. Affordance behaviour is **not** component-tested — **requires
human verification**.

### WR-08 [medium]: the lost-identity recovery promised a path the duplicate check rejects

**Files modified:** `src/App.tsx`
**Commit:** `947f58e`
**Applied fix:** Took the review's option 1 (copy) rather than option 2 (a new Admin
delete rule + decision record, out of scope). The S8 body now reads `Vuelve a entrar con tu
nombre. Si ya está en uso, avisa al Admin para que lo libere.`, which names the one path that
resolves the orphan case. **Deviation from `01-UI-SPEC.md:553`**, documented in-code. The
UI-SPEC-mandated S1 duplicate copy (`ERR_NAME_TAKEN`, §237/§480) was intentionally left
unchanged — it must also serve the legitimate two-different-people-same-name case.
**Verified:** copy only; `tsc`/lint clean.

### IN-01 [low]: `firebase/firestore` imported outside `src/lib/`

**Files modified:** `src/lib/lobby.ts`, `src/session/SessionProvider.tsx`
**Commit:** `7af6530` (coupled with CR-02 — the CR-02 subscription necessarily lives in
`src/lib/lobby.ts`, so the direct `firebase/firestore` import left `SessionProvider`)
**Applied fix:** Moved the read/subscription into `src/lib/lobby.ts`; `SessionProvider` now calls
it. `rg "from 'firebase" src/` no longer returns `SessionProvider.tsx`.
**Verified:** `tsc` clean.

### IN-02 [low]: `participantCount` drifted and was read by nobody

**Files modified:** `src/lib/joinEvent.ts`
**Commit:** `b68385b` (coupled with CR-01 — deleting the counter write removes the drift by
construction, exactly as the finding's note prescribes)
**Applied fix:** The counter is written exactly once (bootstrap). No rollback decrement needed.
**Verified:** emulator probe (CR-01).

### IN-03 [low]: `ordersCsvFilename` derived the date from the UTC instant

**Files modified:** `src/lib/download.ts`, `src/lib/download.test.ts` (new)
**Commit:** `74a3c86`
**Applied fix:** Built the name from local parts
(`getFullYear`/`getMonth`/`getDate`, zero-padded) and rewrote the docstring, which had justified
ISO for ordering reasons, not timezone. Added a test that pins the local-calendar-date
behaviour deterministically in any timezone.
**Verified:** `npx vitest run src/lib/download.test.ts` — 4/4 pass.

### IN-04 [low]: the object URL was revoked synchronously after `click()`

**Files modified:** `src/lib/download.ts`
**Commit:** `0ce7fad`
**Applied fix:** `setTimeout(() => URL.revokeObjectURL(url), 0)`, with the docblock updated to
explain that a one-task delay still bounds the leak while removing the in-flight-cancel race.
**Verified:** `tsc` clean. Behavioural, not unit-tested (no DOM environment).

### IN-05 [low]: `/admin` rendered fully for non-Admins

**Files modified:** `src/App.tsx`
**Commit:** `efa71cc`
**Applied fix:** Took the review's primary option — the guard is now
`identityPresent && hasPreferences && role === 'admin'`. Both `/admin` entry points
(`LobbyPage`, `RevealPage`) were already role-gated, so no link is affected.
**Verified:** `tsc`/lint clean. Guard condition is **not** component-tested — **requires human
verification**.

### IN-06 [low]: two mandated UI-SPEC copies were not implemented

**Files modified:** `src/pages/AdminPage.tsx`, `src/components/JerseyOrderForm.tsx`
**Commit:** `9f27fb4`
**Applied fix:** Added the S7 empty state (`Todavía no hay ningún pedido.` + `Aparecerán aquí
según los vayan guardando.`) as a `Card` mirroring the S4 empty state, entered when
`filled === 0`. Branched the order-submit catch on the Firestore code so `unavailable` renders
`Sin conexión. El pedido no se ha guardado.` and everything else the existing generic copy.
**Verified:** `tsc`/lint clean; `vitest` 42/42.

### IN-09 [info]: no `test` script in `package.json`

**Files modified:** `package.json`
**Commit:** `d4baa5b`
**Applied fix:** Added `"test": "vitest run"` and `"test:watch": "vitest"`.
**Verified:** `npm test` → 42/42 pass, exit 0.

### IN-10 [info]: small hardening nits in input/CSV handling

**Files modified:** `src/domain/exportOrders.ts`, `src/domain/exportOrders.test.ts`
**Commit:** `8f53fe0`
**Applied fix:** Fixed the CSV half: the formula guard now skips leading whitespace and control
characters before deciding, so `"  =1+1"` / `"\t=cmd"` no longer slip through. Implemented as a
small `firstSignificantChar` scan rather than the literal control-char regex the review
suggested, because that regex trips oxlint's `no-control-regex` and would have raised the lint
baseline from 3 to 4 warnings. Added a test for the whitespace/control-character cases.
**Deferred sub-item:** the dorsal-input validation (`/^\d{0,3}$/` on submit). It would introduce
a new validation string not present in the approved copy deck and extend the form's `Errors`
contract; treated as out of scope for an `info` finding.
**Verified:** `npx vitest run src/domain/exportOrders.test.ts` — 7/7 pass; `npm run lint` back to
exactly 3 baseline warnings.

---

## Skipped Issues

### WR-02 [high]: the Admin can approximate the pairing by correlating orders with the roster

**File:** `src/lib/orders.ts:30` + `:69`, `firestore.rules:69-71`,
`src/components/JerseyOrderForm.tsx:58`
**Reason:** Out of scope by instruction — the finding itself says it "needs an explicit product
decision, not a silent fix" (minimum fix: key the order document by `crypto.randomUUID()` and
keep progress on `hasOrder`; product fix: state the residual in the Phase-2 README trust
contract). Both change the data model or a deliverable owned by another phase, and D-20 locks
the export's seven columns. Left open deliberately; the fixer was told explicitly not to touch
it.
**Original issue:** an Admin with devtools can read `orders/{giverUid}` and cross it with the
publicly readable `participants` size/teams to narrow the pairing, because the order document id
*is* the giver's uid.

### IN-07 [info]: the design-token layer is declared but almost entirely unconsumed

**File:** `src/index.css:10-61`
**Reason:** Optional, and neither prescribed fix is small or safe. Routing every component
through the tokens is a broad refactor across most components (vs. the "do not reformat unrelated
code" constraint); deleting the tokens removes colour tokens the UI-SPEC declares. This needs a
design-system decision (which of the two conventions the project adopts), not a code fix. Left
for the Phase-2 design pass.
**Original issue:** `index.css` declares ~15 colour tokens while `src/` consumes one of them and
hardcodes the same palette steps elsewhere — two competing sources for the same colours.

### IN-08 [info]: dead exports and values left in place

**File:** `src/domain/sizeGuide.ts:49` + `:57-59`, `src/components/Notice.tsx:25` + `:30`,
`src/domain/types.ts:31-32`, `public/icons.svg`
**Reason:** Optional, and the two usable fixes both conflict with standing constraints. Deleting
`hasAmbiguousWeight` / `RETRO_USES_FAN_TABLE` would require deleting the tests that reference them
(forbidden: "do not fix findings by deleting tests") and would contradict the module's declared
"single source" design. The alternative — wiring the two size-guide notes to those symbols — is
not a 1:1 swap: the constants are a boolean and a predicate, not the prose the UI shows, so the
notes cannot be produced from them without inventing copy. `NoticeTone 'info'` and
`EventDoc.createdAt/participantCount` are declared contract/schema surface (IN-02 already
resolved the drift). Left for a deliberate dead-code pass.
**Original issue:** several exports/fields have no production consumer, so the "single source"
claims around them are unverifiable by usage.

---

## Deviations from the review's suggested fixes

| Finding | Deviation | Why |
|---------|-----------|-----|
| CR-01 | Took option 1 (delete the write) rather than option 2 (widen the rule) | The codebase itself already derives the count from `participants.length`; nobody reads `participantCount` |
| WR-03 | `update` allowed while `lobby` **or** `hasOnly(['hasOrder'])`, not a blanket `lobby` | `submitOrder` writes `hasOrder` on the participant doc in the same batch, post-draw — a blanket rule breaks every order save |
| WR-03/WR-04 | Rules changes verified by real emulator probes, not static reasoning | The phase's own verification never ran them |
| IN-06 | S7 empty state entered on `filled === 0` | Matches the review's prescribed condition (`total > 0 && filled === 0`; `total` is ≥ 1 in practice) |
| IN-10 | Scan helper instead of the literal `[\s\u0000-\u001f]` regex; dorsal validation deferred | The literal regex trips `no-control-regex` and would raise the lint baseline to 4; the dorsal check adds copy outside the approved deck |
| WR-07, WR-08 | Behaviour copy deviates from `01-UI-SPEC.md:524` / `:553` | The spec strings were the dead ends the review identified; documented in-code |

---

_Fixed: 2026-10-19T15:41:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
