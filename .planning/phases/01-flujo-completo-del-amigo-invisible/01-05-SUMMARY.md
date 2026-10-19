---
phase: 01-flujo-completo-del-amigo-invisible
plan: 05
subsystem: ui
tags: [react, firebase, firestore, react-router, tailwind, forms, accessibility]

requires:
  - phase: 01-flujo-completo-del-amigo-invisible
    provides: routing shell + eventStatus redirect (01-01); PRICES/formatPrice and the size guide predicates (01-02); the Screen/Card/Field/Input/Select/Button/Notice/Badge primitives (01-03); the lobby subscriptions with their error callbacks and the derived admin role (01-04)
provides:
  - getMyAssignment — the only read of `assignments`, by document id
  - useMyAssignment — the project's first hook and the {loading, error, assignment, missing} shape
  - submitOrder / getMyOrder — idempotent batch write of the order + the progress flag
  - PriceTable, JerseyOrderForm — the reference prices and the S6 order form
  - RevealPage (S5) and `getParticipant` in lobby.ts
affects: [01-06]

actuals:
  tokens: 6468
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "One-shot hook returning a three-branch triple plus an explicit 'missing' branch"
    - "Document read by id for every `assignments` / cross-participant access (never a query)"
    - "Idempotent order write: deterministic doc id + order and progress flag in one batch"
    - "Controlled-form CRUD: unified validation on submit, swap to a read-only recap on success"
    - "Namespace Firebase imports so a write path's gated callsites stay countable"

key-files:
  created:
    - src/lib/assignment.ts
    - src/hooks/useMyAssignment.ts
    - src/lib/orders.ts
    - src/components/PriceTable.tsx
    - src/components/JerseyOrderForm.tsx
  modified:
    - src/lib/lobby.ts
    - src/components/Notice.tsx
    - src/components/Select.tsx
    - src/pages/RevealPage.tsx

key-decisions:
  - "The pairing is read exclusively by document id (getMyAssignment -> getParticipant); no collection reference is constructed on `assignments` anywhere in the app, because the rules deny `list` to everyone including the Admin."
  - "The order document is composed from OrderInput plus an opaque id and a send stamp. ORDER-04 is a type invariant, not a writing convention: neither OrderInput nor ExportedOrder has a field for the giver's or recipient's identity."
  - "The order and the participant's `hasOrder` flag are written in the SAME batch, so the Admin's progress and the order cannot disagree (Pitfall 11)."
  - "The dorsal is a text field with inputMode=numeric and pattern=[0-9]*, never a number field (D-15)."
  - "`getParticipant` is added to lobby.ts as a document-by-id read; the two existing subscriptions and their error callbacks are untouched."
  - "The Admin affordance is rendered in the reveal for the derived admin role, so the panel stays reachable once the event is drawn."
  - "S8 error taxonomy is rendered per surface (inline `errorCopy`), matching the wave-4 LobbyPage pattern rather than introducing a new shared module."

patterns-established:
  - "Hook triple: `{ loading, error, assignment, missing }` with the empty state as its own branch, cleaned by a cancellation flag, never a subscription for a one-shot read."
  - "Cross-participant reads are always `getDoc(doc(db, 'events', 'main', 'participants', uid))` shaped and never build an enumerating reference."
  - "Order writes go through `writeBatch` so a document and its companion progress flag commit together."

requirements-completed: [ORDER-01, ORDER-02, ORDER-03, ORDER-04, ORDER-05, PREF-05, DRAW-05]

coverage:
  - id: D1
    description: "The pairing is read by document id only — `src/lib/assignment.ts` has exactly one read call and constructs no enumerating reference, and the reveal constructs none either."
    requirement: "DRAW-05"
    verification:
      - kind: other
        ref: "node -e gates: assignment.ts split('getDoc')===1 and !includes('collection(db'); RevealPage !includes('collection(db')"
        status: pass
    human_judgment: false
  - id: D2
    description: "The reveal (S5) renders the locked headline with the recipient name in a wrapping <strong>, the literal privacy line, the three labelled preference rows with `Sin indicar` for an unstated value, and the `Panel del Admin` affordance for the derived admin role."
    requirement: "ORDER-01, PREF-05"
    verification:
      - kind: other
        ref: "node -e gates: headline===1, 'Sin indicar'===1, 'No encontramos tu asignación'===1, 'Panel del Admin'===1 with /admin and role==='admin', break-words>=1, !includes('truncate')"
        status: pass
    human_judgment: true
    rationale: "The headline's ≤3-line wrap at 320px is a held-out visual state (unbounded user data), and the three preference rows must show the recipient's real stored values — both need the emulator. Recorded as an unrun-verify in .planning/WINDOWS.md."
  - id: D3
    description: "The order document is composed of the form input plus the opaque id and the send stamp with no giver/recipient identity field, and the participant's progress flag is written in the same batch."
    requirement: "ORDER-04"
    verification:
      - kind: other
        ref: "node -e gates: orders.ts (writeBatch + batch.commit)>=2, identity-field mentions===0; type-level absence of identity fields in OrderInput/ExportedOrder + `npx tsc -b --force`"
        status: pass
    human_judgment: false
  - id: D4
    description: "The order form (S6) has the six contracted fields, the dorsal as text, the non-blocking Player/XXXL notice, and the read-only recap after a successful save; prices read from PRICES/formatPrice in both surfaces."
    requirement: "ORDER-02, ORDER-03, ORDER-05"
    verification:
      - kind: other
        ref: "node -e gates: inputMode===1, no type=number, role=\"status\"===1, Guardando===1, 'Ya has guardado tu pedido'===1, PRICES/formatPrice single-source check; npx tsc -b --force"
        status: pass
      - kind: unit
        ref: "npx vitest run — domain suite (buildDerangement, CSV edge cases, spec literals) 28/28 passing"
        status: pass
    human_judgment: true
    rationale: "D-15's promise — dorsal `09` round-trips as the string and survives a reload with the recap repainted without re-submitting — is a persistence behaviour that needs the emulator. Recorded as an unrun-verify in .planning/WINDOWS.md."

duration: 15min
completed: 2026-10-19
plan_head_before: 132a02fc8d66ed326a104dbc47e3aa77ffac5fbf
plan_head_after: 1ee4f6cf3c40805dde6972c35de1259cdd0dab79
status: complete
---

# Phase 01 Plan 05: Revelación y pedido Summary

**The reveal (S5) reads the assignment by document id and the recipient's real preferences, while the order form (S6) writes an idempotent order that structurally cannot carry the pairing.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-19T12:26:00Z
- **Completed:** 2026-10-19T12:40:00Z
- **Tasks:** 3
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments
- `getMyAssignment` (document read by id) plus `useMyAssignment`, the project's first hook and the `{loading, error, assignment, missing}` triple that `useOrdersAdmin` will copy in wave 6.
- `submitOrder` writes the order and the participant's `hasOrder` flag in one `writeBatch`, keyed by a deterministic document id — a double tap or a `Reintentar` is an overwrite, never a duplicate. `getMyOrder` reads the own order by id to repaint the recap.
- `JerseyOrderForm` with the six contracted fields, the dorsal as text (`inputMode="numeric"`, never `type="number"`), the non-blocking Player/XXXL notice directly above the submit, and the read-only recap (badge `Guardado`, six values, `—` for empty optionals) with no edit or re-submit affordance.
- `RevealPage` (S5) with the locked headline `Te ha tocado regalar a {Nombre}`, the privacy line, the `Sus preferencias` card (`Sin indicar` for an unstated value), the `Tu pedido` section, and the `Panel del Admin` affordance for the derived admin role.
- `getParticipant` in `lobby.ts` as a document read by id, with the two existing subscriptions and their error callbacks left intact.

## Task Commits

Each task was committed atomically:

1. **Task 1: La lectura de la asignación y el hook que la expone** - `0693618` (feat)
2. **Task 2: El pedido — precio, formulario y guardado idempotente** - `ae62998` (feat)
3. **Task 3: La pantalla de revelación y las preferencias del destinatario** - `1ee4f6c` (feat)

**Plan metadata:** `docs(01-05): complete revelación y pedido plan` (committed with this summary)

## Files Created/Modified
- `src/lib/assignment.ts` - `getMyAssignment(uid)`: the only read of `assignments`, by document id
- `src/hooks/useMyAssignment.ts` - the `{loading, error, assignment, missing}` hook with a cancellation flag
- `src/lib/orders.ts` - `submitOrder` (one batch: order + progress flag) and `getMyOrder`
- `src/components/PriceTable.tsx` - three `tabular-nums` rows read from `PRICES`
- `src/components/JerseyOrderForm.tsx` - the six-field form, the D-16 notice, and the read-only recap
- `src/lib/lobby.ts` - added `getParticipant` (document read by id)
- `src/components/Notice.tsx` - added an optional explicit `status` role prop
- `src/components/Select.tsx` - added optional `optionLabels` so the type option reads `Fan · 11$`
- `src/pages/RevealPage.tsx` - S5 complete (replaces the `return null` placeholder)

## Decisions Made
- The pairing is read exclusively by document id. A query on `assignments` is not "less safe" — it is broken code, because the rules deny `list` to everyone including the Admin.
- ORDER-04 is a type invariant: `OrderInput` has nowhere to put identity and `ExportedOrder` has nowhere to project it, so the guarantee cannot be undone by a writing convention.
- The S8 taxonomy is rendered per surface with a local `errorCopy`, matching the wave-4 `LobbyPage` pattern instead of adding a new shared module mid-phase.
- The dorsal is stored as a string and treated as a textual identifier — no numeric arithmetic anywhere.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added two additive primitive props not listed in `files_modified`**
- **Found during:** Task 2 (order form and price table)
- **Issue:** The plan's own gate contracts require (a) exactly one literal `role="status"` inside `JerseyOrderForm.tsx` for the D-16 notice, and (b) the type `Select` options to carry their reference price at the point of decision (`Fan · 11$`). `Notice` hard-coded the role with no prop, and `Select` rendered `value === label` with no way to add a price without changing the stored value.
- **Fix:** `Notice` gained an optional `role?: 'status'` prop (default `'status'`, so every existing call-site is unchanged) and the D-16 notice passes `role="status"` at the call site. `Select` gained an optional `optionLabels?: Partial<Record<string,string>>`; the form derives the labels from `PRICES`/`formatPrice` so the stored value stays the enum member. Both are backwards-compatible and additive.
- **Files modified:** `src/components/Notice.tsx`, `src/components/Select.tsx`
- **Verification:** `npx tsc -b --force` passes; the gates for the `role="status"` count (===1) and the single price source pass; `npx vitest run` 28/28.
- **Committed in:** `ae62998` (Task 2 commit)

**2. [Rule 1 - Bug] Gave `Card` explicit children in the loading skeleton**
- **Found during:** Task 3 (reveal screen)
- **Issue:** `Card` requires `children`, so a self-closing skeleton `<Card className="..." />` failed `tsc` with `TS2741`.
- **Fix:** rendered the skeleton as `<Card className="...">{null}</Card>`.
- **Files modified:** `src/pages/RevealPage.tsx`
- **Verification:** `npx tsc -b --force` exits 0.
- **Committed in:** `1ee4f6c` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both are necessary for the plan's own contracts and for the project to compile. The two primitive deltas are additive and backwards-compatible, so no existing surface changed behaviour. No scope creep.

## Issues Encountered
- The plan's file list did not include the two shared primitives that its gate contracts implicitly require; resolved as deviation 1 above.
- No `npm install` was needed: the opaque id uses `crypto.randomUUID()` (T-01-SC honored — this wave installs nothing).

## Deferred (out of scope)
- `src/session/SessionProvider.tsx` imports `firebase/firestore` directly, which violates the phase rule that every `firebase/*` import lives in `src/lib/`. Pre-existing (wave 1), not caused by this plan; logged in `deferred-items.md` for a follow-up.

## Known Stubs
None — the `RevealPage` stub recorded against plan 01-01 is now resolved (WINDOWS.md entry #1 marked fixed).

## Threat Flags
None — no new security-relevant surface beyond what the plan's `<threat_model>` already covers (T-01-18/19/20). The reveal adds no network endpoint; it uses only the two document-by-id reads the threat register anticipates.

## Unrun verifications (recorded in .planning/WINDOWS.md)
- S5 human-check (needs the emulator): the headline wraps to ≤3 lines at 320px with no clipping and no horizontal scroll; the three preference rows show the recipient's real stored values including `Sin indicar`; a dorsal `09` is stored as the string `09` and the document carries no identity field; a reload repaints the recap without re-submitting.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 6 (S7, the Admin panel and the CSV export) can now read `hasOrder` from the participant documents this plan writes, and the order documents it stores — none of which carry the pairing, so the export projection has nothing to leak.
- The reveal is the second surface of the phase's only cross-route affordance (`Panel del Admin` → `/admin`); the lobby covers the `lobby` state and this screen covers `drawn`, so the panel has a path in both states.

---
*Phase: 01-flujo-completo-del-amigo-invisible*
*Completed: 2026-10-19*

## Self-Check: PASSED
- Created files: all 6 present.
- Task commits: 0693618, ae62998, 1ee4f6c all present.
- Tracked source: `git ls-files` names assignment.ts, orders.ts, useMyAssignment.ts and RevealPage.tsx.

