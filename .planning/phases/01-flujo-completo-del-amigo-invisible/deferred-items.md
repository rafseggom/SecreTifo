# Deferred items — Phase 01

Out-of-scope discoveries found while executing this phase. Not fixed here (they are not
caused by the task in which they were found); recorded so they are not lost.

## Out-of-scope: `src/session/SessionProvider.tsx` imports `firebase/firestore` directly

- **Found during:** 01-05 Task 2 (running the phase verification check "no file outside
  `src/lib/` imports `firebase/*`").
- **Finding:** `src/session/SessionProvider.tsx:19` imports `{ doc, getDoc }` from
  `firebase/firestore` and issues its own `events/main/participants/{uid}` read. The
  phase's structural rule (01-UI-SPEC §Component Contracts, carried from research) keeps
  every `firebase/*` import inside `src/lib/`, so this is a pre-existing violation.
- **Origin:** wave 1 (01-01/01-04) — the file predates 01-05 and was not touched by it.
- **Why not fixed here:** SCOPE BOUNDARY — only issues directly caused by the current
  task's changes are auto-fixed. Moving the read behind `src/lib/` is a refactor of a
  file owned by an earlier wave.
- **Suggested resolution:** extract the `participants/{uid}` read into `src/lib/` (e.g.
  alongside `getParticipant` in `lobby.ts`) and have `SessionProvider` call it. Owner:
  a follow-up in this phase or the 01-06 pass.
