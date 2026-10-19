---
phase: 03-admin-login-con-credenciales-env-ver-todos-los-participantes
plan: "02"
subsystem: admin-login
tags: [admin, login, localStorage, route-guards]
dependency_graph:
  requires: ["03-01"]
  provides: ["AdminLoginPage", "/admin/login route", "localStorage adminSecretValidated flag"]
  affects: ["App.tsx", "src/lib/session.ts"]
tech_stack:
  added: []
  patterns: ["Screen/Card/Field/Input/Button/Notice form pattern", "localStorage persistence", "Route guards with localStorage flag"]
key_files:
  created: ["src/pages/AdminLoginPage.tsx"]
  modified: ["src/App.tsx", "src/lib/session.ts"]
decisions:
  - "Admin login validates VITE_ADMIN_SECRET against user input"
  - "localStorage flag `secretkit.adminSecretValidated` persists validation across reloads"
  - "Route /admin/login: accessible when event exists AND not admin-authed (no flag + role !== admin)"
  - "Route /admin: requires eventExists && role === 'admin' && isAdminSecretValidated()"
  - "No anonymous sign-in on login page — uid from setup persists in Firebase Auth (IndexedDB)"
  - "If already validated (localStorage flag), immediate redirect to /admin"
metrics:
  duration_seconds: 120
  completed_date: "2026-10-19"
  tokens: 35000
  tasks: 2
  commits: 1
status: complete
actuals:
  tokens: 38000
  tasks: 2
  commits: 1
plan_head_before: "d003ce6"
plan_head_after: "bfabfc1"
---

# Phase 03 Plan 02: Admin Login Page Summary

**One-liner:** Admin login at `/admin/login` — secret validation, localStorage persistence, redirect to `/admin` with route guards.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create AdminLoginPage with secret validation and localStorage persistence | bfabfc1 | src/pages/AdminLoginPage.tsx, src/lib/session.ts |
| 2 | Add AdminLoginPage route to App.tsx with proper guards | bfabfc1 | src/App.tsx |

## Verification

- **Build**: `npm run build` ✅ passes
- **TypeScript**: `tsc --noEmit` ✅ passes
- **Manual**: 
  - After Plan 01 setup, navigate to `/admin/login` → page renders
  - Enter wrong secret → error notice "Clave secreta inválida. Inténtalo de nuevo."
  - Enter correct secret → localStorage flag `secretkit.adminSecretValidated` set → redirect to `/admin`
  - Reload `/admin` → accessible (flag + role=admin)
  - Reload `/admin/login` → redirects to `/admin` (flag set)
  - Clear localStorage → `/admin/login` shows again

## Files Created/Modified

### Created
- `src/pages/AdminLoginPage.tsx` — Full-screen form page using Screen/Card/Field/Input/Button/Notice pattern. Validates secret against `import.meta.env.VITE_ADMIN_SECRET`, calls `setAdminSecretValidated()`, redirects to `/admin`. Immediate redirect if flag already set.

### Modified
- `src/lib/session.ts` — Added localStorage helpers:
  - `ADMIN_SECRET_KEY = 'secretkit.adminSecretValidated'`
  - `isAdminSecretValidated(): boolean`
  - `setAdminSecretValidated(): void`
  - `clearAdminSecretValidated(): void`
- `src/App.tsx` — Added `/admin/login` route with guard `eventStatus !== null && !isAdminSecretValidated() && role !== 'admin'`. Updated `/admin` route guard to `eventStatus !== null && role === 'admin' && isAdminSecretValidated()`. Added imports for AdminLoginPage and isAdminSecretValidated.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: localStorage_flag_ux_only | src/lib/session.ts | localStorage flag is UX convenience only; real auth is Firebase uid === adminUid in Firestore rules |
| threat_flag: secret_in_bundle | src/pages/AdminLoginPage.tsx | VITE_ADMIN_SECRET embedded in client bundle (accepted per D-01) |

## Known Stubs

None - all functionality implemented per plan.