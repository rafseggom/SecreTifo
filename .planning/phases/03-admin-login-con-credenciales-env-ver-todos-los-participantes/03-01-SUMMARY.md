---
phase: 03-admin-login-con-credenciales-env-ver-todos-los-participantes
plan: "01"
subsystem: admin-setup
tags: [admin, setup, firebase, env]
dependency_graph:
  requires: []
  provides: ["AdminSetupPage", "/admin/setup route", "VITE_ADMIN_SECRET env var"]
  affects: [".env.example", "firebase.ts", "vite-env.d.ts", "App.tsx"]
tech_stack:
  added: []
  patterns: ["Screen/Card/Field/Input/Button/Notice form pattern", "Anonymous Firebase Auth", "Firestore setDoc with serverTimestamp"]
key_files:
  created: ["src/pages/AdminSetupPage.tsx"]
  modified: [".env.example", "src/lib/firebase.ts", "src/vite-env.d.ts", "src/App.tsx"]
decisions:
  - "Admin secret stored in VITE_ADMIN_SECRET env var (UI gate only, not cryptographic)"
  - "AdminSetupPage creates events/main with adminUid = anonymous uid, no participant doc for admin"
  - "Route guard: /admin/setup only accessible when eventStatus === null"
  - "VITE_ADMIN_SECRET validated at startup in firebase.ts (fail loudly)"
  - "VITE_ADMIN_SECRET type declared in vite-env.d.ts"
metrics:
  duration_seconds: 180
  completed_date: "2026-10-19"
  tokens: 45000
  tasks: 3
  commits: 1
status: complete
actuals:
  tokens: 48000
  tasks: 3
  commits: 1
plan_head_before: "bfabfc1"
plan_head_after: "d003ce6"
---

# Phase 03 Plan 01: Admin Setup Page Summary

**One-liner:** Admin setup flow at `/admin/setup` — secret validation, anonymous sign-in, event creation with adminUid, redirect to `/admin/login`.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Tracer: Admin Setup Page — secret validation, anonymous sign-in, event creation, redirect | d003ce6 | src/pages/AdminSetupPage.tsx, src/App.tsx, .env.example, src/lib/firebase.ts, src/domain/types.ts |
| 2 | Update vite-env.d.ts with VITE_ADMIN_SECRET type declaration | d003ce6 | src/vite-env.d.ts |
| 3 | Add AdminSetupPage to App.tsx route guards and verify eventStatus null check | d003ce6 | src/App.tsx |

## Verification

- **Build**: `npm run build` ✅ passes
- **TypeScript**: `tsc --noEmit` ✅ passes
- **Manual**: 
  - Navigate to `/admin/setup` with no event → page renders
  - Enter wrong secret → error notice "Clave secreta inválida. Inténtalo de nuevo."
  - Enter correct secret → redirects to `/admin/login`, `events/main` created in Firestore with `adminUid`, `status=lobby`, `participantCount=0`, no `participants/{adminUid}`

## Files Created/Modified

### Created
- `src/pages/AdminSetupPage.tsx` — Full-screen form page using Screen/Card/Field/Input/Button/Notice pattern. Validates secret against `import.meta.env.VITE_ADMIN_SECRET`, calls `ensureSignedIn()`, creates `events/main` document, redirects to `/admin/login`.

### Modified
- `.env.example` — Added `VITE_ADMIN_SECRET=tu_clave_secreta_aqui` with explanatory comment
- `src/lib/firebase.ts` — Added `VITE_ADMIN_SECRET` to required env vars validation (fail loudly if missing)
- `src/vite-env.d.ts` — Added `readonly VITE_ADMIN_SECRET: string` to `ImportMetaEnv`
- `src/App.tsx` — Added `/admin/setup` route with guard `eventStatus === null`, imports AdminSetupPage

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: secret_in_bundle | src/lib/firebase.ts | VITE_ADMIN_SECRET embedded in client bundle (accepted per D-01: UI gate only, not cryptographic) |
| threat_flag: admin_uid_exposure | src/pages/AdminSetupPage.tsx | Anonymous uid becomes adminUid in events/main; rules enforce adminUid === request.auth.uid for admin actions |

## Known Stubs

None - all functionality implemented per plan.