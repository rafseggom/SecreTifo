# Deferred items — Phase 01

Out-of-scope discoveries logged during execution. Not fixed by the plan that found them.

| # | Found in | Item | Why deferred |
|---|----------|------|--------------|
| 1 | 01-03 (Task 4) | `src/session/SessionProvider.tsx` imports `doc`/`getDoc` from `firebase/firestore` directly, so the UI-SPEC structural rule ("`src/lib/` is the only directory allowed to import from `firebase/*`") is not satisfied literally. | Pre-existing from 01-01; the file is not in 01-03's `files_modified`. Fixing it (extracting the `participants/{uid}` read into a `src/lib/` function) is a wave-1 refactor, not a Task 4 delta. None of 01-03's own files import `firebase/*` (verified with a `node -e` sweep), so the plan's own verification holds for this wave's surface. Owner: a future wave that already touches `SessionProvider`. |
| 2 | 01-03 | `PREF-05` left unmarked in REQUIREMENTS.md. | It is also declared by 01-05 (shared-ID gate #2388), so only the last declaring plan may mark it. 01-03 delivers the WRITE half (preferences persisted per participant, readable by any authenticated member); 01-05 verifies the READ half (the giver reading the recipient's preferences after the draw). |
| 3 | 01-03 | `oxlint` warnings (2) in `src/components/SizeGuideTable.tsx`: `react(only-export-components)` on the exported `FAN_TABLE`/`PLAYER_TABLE` constants. | Warnings only (`npm run lint` exits 0). The constants are the data wiring that keeps the two tables declared in one place; splitting them into a separate module is a style preference, not a correctness issue. |
