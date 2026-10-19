---
phase: 03-admin-login-con-credenciales-env-ver-todos-los-participantes
plan: "03"
subsystem: admin-table
tags: [admin, table, participants, liberar, firestore-rules]
dependency_graph:
  requires: ["03-01", "03-02"]
  provides: ["ParticipantTableRow", "liberarParticipant", "updated AdminPage", "updated firestore.rules"]
  affects: ["src/pages/AdminPage.tsx", "src/hooks/useOrdersAdmin.ts", "src/lib/orders.ts", "firestore.rules", "src/components/ParticipantTableRow.tsx", "src/components/Badge.tsx", "src/components/Button.tsx"]
tech_stack:
  added: []
  patterns: ["Transactional delete + decrement", "Responsive table (sm breakpoint)", "Native <dialog> Modal confirmation", "useOrdersAdmin subscription reuse", "S8 error taxonomy mapping"]
key_files:
  created: ["src/components/ParticipantTableRow.tsx"]
  modified: ["src/pages/AdminPage.tsx", "src/hooks/useOrdersAdmin.ts", "src/lib/orders.ts", "firestore.rules", "src/components/Badge.tsx", "src/components/Button.tsx"]
decisions:
  - "liberarParticipant uses runTransaction: delete participant + decrement participantCount atomically"
  - "Firestore rules updated: participants delete allows `isSignedIn() && (uid == request.auth.uid || isAdmin())`"
  - "ParticipantTableRow: responsive — table on ≥sm, stacked cards on <sm"
  - "Table columns: Nombre | Talla | Pref. | Proh. | Estado | Acciones"
  - "Sorting: pending (hasOrder=false) first by joinedAt, then completed by joinedAt"
  - "Estado badge: ✓ Completado (green) / ✗ Pendiente (amber)"
  - "Liberar button only when eventStatus === 'lobby' AND !hasOrder"
  - "Liberar opens native <dialog> Modal with confirmation: 'Esto eliminará a [Nombre] del evento. ¿Continuar?'"
  - "Button component extended with size prop (default, sm)"
  - "Badge component extended with className prop for Estado color variants"
  - "useOrdersAdmin returns allParticipants sorted (pending first, then completed, both by joinedAt)"
metrics:
  duration_seconds: 240
  completed_date: "2026-10-19"
  tokens: 55000
  tasks: 3
  commits: 1
status: complete
actuals:
  tokens: 58000
  tasks: 3
  commits: 1
plan_head_before: "bfabfc1"
plan_head_after: "61405d7"
---

# Phase 03 Plan 03: Admin Participants Table + Liberar Summary

**One-liner:** Full participants table in AdminPage with Nombre/Talla/Pref./Proh./Estado/Acciones columns, Liberar action with transactional delete, responsive design.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add liberarParticipant transaction to src/lib/orders.ts + update firestore.rules | 61405d7 | src/lib/orders.ts, firestore.rules |
| 2 | Create ParticipantTableRow component for table view | 61405d7 | src/components/ParticipantTableRow.tsx, src/components/Badge.tsx, src/components/Button.tsx |
| 3 | Extend AdminPage with participants table and liberar integration | 61405d7 | src/pages/AdminPage.tsx, src/hooks/useOrdersAdmin.ts |

## Verification

- **Build**: `npm run build` ✅ passes
- **TypeScript**: `tsc --noEmit` ✅ passes
- **Manual**: 
  - As admin, navigate to `/admin` → table renders with all participants
  - Columns correct: Nombre, Talla, Pref., Proh., Estado, Acciones
  - Sorting: pending first by joinedAt, then completed by joinedAt
  - Estado badge: ✓ Completado (green) / ✗ Pendiente (amber)
  - Liberar button visible only for pending participants in lobby
  - Click Liberar → Modal opens with confirmation text
  - Confirm → participant deleted, participantCount decremented, table updates in realtime
  - Error cases: Liberar after draw (button hidden), Liberar participant with order (button hidden)

## Files Created/Modified

### Created
- `src/components/ParticipantTableRow.tsx` — Responsive component: table row on ≥sm, stacked cards on <sm. Six columns with truncation + tooltip for teams. Liberar button with Modal confirmation using native `<dialog>`.

### Modified
- `src/lib/orders.ts` — Added:
  - `LIBERAR_ERRORS` constant with 4 error messages
  - `LiberarErrorCode` type (union of error message values)
  - `liberarParticipant(participantUid: string)` — transactional delete + count decrement
- `firestore.rules` — Updated participants delete rule: `allow delete: if isSignedIn() && (uid == request.auth.uid || isAdmin());`
- `src/hooks/useOrdersAdmin.ts` — Added `allParticipants` to return type: all participants sorted (pending first by joinedAt, then completed by joinedAt)
- `src/pages/AdminPage.tsx` — Extended with:
  - Participants table below existing content
  - `handleLiberar` handler with success/error Notice states
  - `showLiberarFor` helper (eventStatus === 'lobby' && !hasOrder)
  - Table with proper `<thead>`, `<th scope="col">`, `<tbody>`
- `src/components/Badge.tsx` — Added `className` prop for Estado color variants
- `src/components/Button.tsx` — Added `size` prop ('default' | 'sm') with `SIZE_CLASSES`

## Deviations from Plan

**Rule 2 (Auto-add missing critical functionality): Button size prop** — The plan specified using `size="sm"` on the Liberar button in ParticipantTableRow, but the Button component only had one size (h-11). Added `size` prop with 'default' (h-11) and 'sm' (h-9) variants to support the table action button.

**Rule 2 (Auto-add missing critical functionality): Badge className prop** — The plan required different colored badges for Estado (green for Completado, amber for Pendiente). The Badge component had no className prop. Added `className` prop to allow custom styling while keeping the default slate appearance.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: admin_delete_participants | firestore.rules | Admin can now delete any participant document (not just own). Mitigated by UI guard (only in lobby, only no-order) and rules isAdmin() check. |
| threat_flag: participant_count_decrement | src/lib/orders.ts | Transaction ensures atomic delete + decrement. No negative count guard in rules (transaction logic prevents). |

## Known Stubs

None - all functionality implemented per plan.