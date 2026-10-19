---
phase: 01
phase_name: 01-flujo-completo-del-amigo-invisible
recorded_at: 2026-10-19T15:50:00Z
review_path: .planning/phases/01-flujo-completo-del-amigo-invisible/01-REVIEW.md
fix_path: .planning/phases/01-flujo-completo-del-amigo-invisible/01-REVIEW-FIX.md
review_status: issues_found
findings_total: 20
fixed: 17
skipped: 3
open: 0
unparsed: 0
---

# Phase 01: Code Review Disposition

One row per finding from `01-REVIEW.md`, reconciled against `01-REVIEW-FIX.md` (iteration 1).
`fixed` names the commit that resolved it; `skipped` means deliberately not applied, with the reason.

| Finding | Severity | Disposition | Evidence / Reason |
|---------|----------|-------------|-------------------|
| CR-01 | critical | fixed | `b68385b` — removed the non-Admin `events/main` counter write; emulator-probed: a second participant can join |
| CR-02 | critical | fixed | `7af6530` — `subscribeParticipant` refreshes `hasPreferences`; `/preferences` refuses the join form once joined; `isNameTaken(name, excludeUid)` excludes the caller |
| WR-01 | high | fixed | `9e140a8` — `SessionState.error` + bounded boot-error screen (`Algo ha ido mal.` / `Reintentar`); `EntryPage` never persists with `uid === null` |
| WR-02 | high | skipped | Deferred by orchestrator instruction: the Admin-as-correlator residual needs a product/schema decision (keying `orders/{giverUid}` → `crypto.randomUUID()` changes a locked schema; D-20 locks the export's seven columns). Recorded for the Phase-2 trust contract / user decision. Tracked in `ROADMAP.md` Phase 2 |
| WR-03 | medium | fixed | `862f8e8` — rules freeze the roster after the draw (`create` only while `lobby`; `update` while `lobby` or `affectedKeys().hasOnly(['hasOrder'])`); emulator-probed |
| WR-04 | medium | fixed | `c3b6568` — `drawn` is a terminal status (forward-only); `adminUid` immutable. Prevents the silent re-assign on a second draw |
| WR-05 | medium | fixed | `a1c41a6` — `recipientLoaded` sentinel replaces inferring "in flight" from `recipient === null`; missing recipient degrades to the terminal missing state |
| WR-06 | medium | fixed | `bc92153` — `"strict": true` in `tsconfig.app.json` and `tsconfig.node.json`; `tsc -b --force` clean (0 new diagnostics) |
| WR-07 | medium | fixed | `0dbadb2` — the missing-assignment action is `Reintentar` wired to `onRetry` (the old `Ir a la sala de espera` bounced straight back); copy deviation from `01-UI-SPEC.md:524` documented in-code |
| WR-08 | medium | fixed | `947f58e` — S8 body copy now names the one resolving path (ask the Admin to release the name); deviation from `01-UI-SPEC.md:553` documented in-code |
| IN-01 | low | fixed | `7af6530` — the Firestore read/subscription moved into `src/lib/lobby.ts`; `SessionProvider` no longer imports `firebase/*` |
| IN-02 | low | fixed | `b68385b` — deleting the counter write removes the drift by construction |
| IN-03 | low | fixed | `74a3c86` — `ordersCsvFilename` built from local calendar parts; pinned by a new test |
| IN-04 | low | fixed | `0ce7fad` — object URL revoked on a `setTimeout(…, 0)` task instead of synchronously after `click()` |
| IN-05 | low | fixed | `efa71cc` — `/admin` guard is now `identityPresent && hasPreferences && role === 'admin'` |
| IN-06 | low | fixed | `9f27fb4` — added the S7 empty state and the `unavailable` offline copy |
| IN-07 | info | skipped | Needs a design-system decision (two competing sources for the same colours); left for the Phase-2 design pass |
| IN-08 | info | skipped | Deleting the unused exports would delete tests that reference them and contradict the module's declared single-source design; left for a deliberate dead-code pass |
| IN-09 | info | fixed | `d4baa5b` — added `test` / `test:watch` scripts |
| IN-10 | info | fixed | `8f53fe0` — CSV formula-guard now skips leading whitespace/control chars (dorsal-input validation sub-item deferred as out of scope for `info`) |

## Outstanding items carried forward

1. **WR-02 (high)** — the Admin can approximate the pairing by correlating the enumerable `orders`
   with the publicly readable `participants` roster, because the order document id is the giver's
   uid. Requires a product decision, not a code fix. Carry into Phase 2 (trust contract) and surface
   to the user.
2. **IN-07 / IN-08 (info)** — deferred to a later design/dead-code pass.

## Notes

- Reported by `gsd-code-reviewer` with structured frontmatter (`status: issues_found`).
- Fixes applied by `gsd-code-fixer` (iteration 1) with one atomic commit per finding; the coupled
  pairs CR-01+IN-02 and CR-02+IN-01 share a commit because the fixes are inseparable.
- Post-fix gates (independently re-verified by the orchestrator): `npx tsc -b --force` 0 ·
  `npx vitest run` 8 files / 42 tests pass · `npm run lint` 0 (3 pre-existing warnings) ·
  `npm run build` 0.
