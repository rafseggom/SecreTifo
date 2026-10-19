---
phase: "04"
plan: "03"
subsystem: "ui-error-states"
tags:
  - "error-handling"
  - "loading-states"
  - "empty-states"
  - "accessibility"
  - "s8-taxonomy"
dependency_graph:
  requires:
    - "04-01"
  provides:
    - "shared-error-copy"
    - "7-route-audit"
  affects:
    - "src/pages/"
    - "src/hooks/useMyAssignment.ts"
    - "src/lib/errorCopy.ts"
tech_stack:
  added:
    - "@testing-library/react"
    - "@testing-library/jest-dom"
    - "@testing-library/dom"
    - "@testing-library/user-event"
    - "jsdom"
  patterns:
    - "Shared S8 errorCopy utility"
    - "Per-route loading/empty/error states"
    - "Audit comments for traceability"
key_files:
  created:
    - "src/lib/errorCopy.ts"
    - "src/lib/__tests__/errorCopy.test.ts"
    - "src/hooks/__tests__/useMyAssignment.test.ts"
    - "src/hooks/__tests__/setup.ts"
  modified:
    - "src/pages/PreferencesPage.tsx"
    - "src/pages/LobbyPage.tsx"
    - "src/pages/RevealPage.tsx"
    - "src/pages/AdminPage.tsx"
    - "vite.config.ts"
decisions:
  - "Single errorCopy utility with errorCopy (reads) and downloadErrorCopy (writes)"
  - "S8 taxonomy: permission-denied/unavailable/resource-exhausted/default"
  - "PreferencesPage: loading skeleton while useSession resolves"
  - "LobbyPage: subscription error Notice with Retry re-subscribes"
  - "RevealPage: loading skeleton, assignment-missing empty state, S8 error Notice"
  - "useMyAssignment hook: already returns loading/error/assignment/missing"
  - "All 7 routes have audit comments: // AUDIT: loading=✅ empty=✅ error=✅ (S8 taxonomy)"
  - "Vitest projects: hooks/components (jsdom, globals: true) vs rules (node)"
metrics:
  duration_seconds: 300
  tasks_completed: 3
  commits: 1
  test_files: 2
  test_cases: 17
  passing_assertions: 17
actuals:
  tokens: 55000
  tasks: 3
  commits: 1
  plan_head_before: "37cfd19"
  plan_head_after: "e5b94ee"
status: complete
---

# Phase 04 Plan 03: ErrorCopy Utility + UI States for 3 Routes + 7-Route Audit Summary

## One-liner
Shared S8 errorCopy utility + loading/empty/error states for Preferences/Lobby/Reveal + 7-route audit complete

## What Was Built

### Shared ErrorCopy Utility (`src/lib/errorCopy.ts`)
Single source of truth for S8 error taxonomy across all routes:

```typescript
// Reads
errorCopy(code) → { message, canRetry }
  - permission-denied: "No tienes permiso para ver esto." / false
  - unavailable: "Sin conexión. Vuelve a intentarlo cuando recuperes la red." / true
  - resource-exhausted: "Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde." / false
  - default: "Algo ha ido mal." / true

// Writes
downloadErrorCopy(code) → { message, canRetry }
  - permission-denied: "No tienes permiso para ver esto." / false
  - unavailable: "Sin conexión. El pedido no se ha guardado." / true
  - resource-exhausted: "Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde." / false
  - default: "No hemos podido generar el archivo." / true
```

### Route Updates

#### PreferencesPage.tsx (Tracer)
- **Loading**: Skeleton card (3 field rows + size guide button) while `useSession` resolves
- **Empty**: Form with fields (default state)
- **Error**: 
  - Known errors (ERR_NAME_TAKEN, ERR_NAME_RACE, ERR_EVENT_CLOSED) → inline form errors
  - Firestore/network errors → `errorCopy(code)` Notice with Retry button

#### LobbyPage.tsx (Expand)
- **Loading**: 3 skeleton participant rows (existing)
- **Empty**: "Todavía no hay nadie en la lista." Card (existing)
- **Error**: Subscription `onFailure` → S8 Notice with Retry that re-arms listeners (`setParticipants(null); setReloadKey(k+1)`)

#### RevealPage.tsx (Expand)
- **Loading**: "Buscando a quién regalas…" title + skeleton Card while `useMyAssignment` + `getParticipant` resolve
- **Empty (assignment-missing)**: Event drawn but no assignment doc → S8 Notice "No encontramos tu asignación." + "Reintentar" button
- **Error**: Assignment/preferences fetch failure → S8 Notice with Retry

#### AdminPage.tsx
- Updated to import shared `errorCopy`/`downloadErrorCopy`
- `handleLiberar` now uses `errorCopy` for Firestore errors

### useMyAssignment Hook (`src/hooks/useMyAssignment.ts`)
Already returned required states (no changes needed):
```typescript
{ loading: boolean, error: string|null, assignment: string|null, missing: boolean }
```
- `loading`: read in flight
- `error`: Firestore error code for S8 mapping
- `assignment`: recipient UID or null
- `missing`: event drawn but no assignment doc

### 7-Route Audit (Verification Task)
All routes have audit comments and explicit states:

| Route | Loading | Empty | Error (S8) |
|-------|---------|-------|------------|
| `/` (EntryPage) | ✅ FullScreenSpinner | ✅ Form | ✅ Inline (duplicate/generic) |
| `/preferences` | ✅ Skeleton Card | ✅ Form | ✅ S8 Notice + Retry |
| `/lobby` | ✅ 3 Skeleton Rows | ✅ "Todavía no hay nadie..." | ✅ S8 Notice + Retry |
| `/reveal` | ✅ Skeleton Card | ✅ Assignment-missing Notice | ✅ S8 Notice + Retry |
| `/admin` | ✅ Skeletons (progress/list) | ✅ "Todavía no hay ningún pedido" | ✅ S8 Notice + Retry |
| `/admin/setup` | ✅ Button loading | N/A | ✅ S8 Notice + Retry |
| `/admin/login` | ✅ Button loading | N/A | ✅ S8 Notice + Retry |

Audit comments added to each page: `// AUDIT: loading=✅ empty=✅ error=✅ (S8 taxonomy)`

### Unit Tests
- `src/lib/__tests__/errorCopy.test.ts`: 9 tests (5 read + 4 write taxonomy cases) ✅
- `src/hooks/__tests__/useMyAssignment.test.ts`: 8 tests (loading/resolved/missing/error/cleanup/stale) ✅
- Vitest projects configured: hooks/components (jsdom, globals: true) vs rules (node)

## Deviations from Plan
None - plan executed exactly as written. The tracer task (PreferencesPage + errorCopy) validated the utility before expanding to Lobby/Reveal.

## Files Changed
- Created: `src/lib/errorCopy.ts`, `src/lib/__tests__/errorCopy.test.ts`, `src/hooks/__tests__/useMyAssignment.test.ts`, `src/hooks/__tests__/setup.ts`
- Modified: `src/pages/PreferencesPage.tsx`, `src/pages/LobbyPage.tsx`, `src/pages/RevealPage.tsx`, `src/pages/AdminPage.tsx`, `vite.config.ts`