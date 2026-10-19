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
- **✅ RESOLVED** by the post-execution code review, finding **IN-01** (commit `7af6530`):
  the read/subscription moved to `src/lib/lobby.ts` (`subscribeParticipant`); `SessionProvider`
  no longer imports `firebase/*`. `rg "from 'firebase" src/` no longer matches that file.
  Kept here only as the original record.

## Deferred to Phase 2: the Admin can approximate the pairing from the data it may read

- **Found during:** the post-execution code review, finding **WR-02 [high]** (see
  `01-REVIEW.md`, disposition in `01-REVIEW-DISPOSITION.md`).
- **Finding:** the order document id is the giver's uid
  (`orders/{giverUid}`, `src/lib/orders.ts:30`) and the Admin enumerates that collection
  (`src/lib/orders.ts:69`, `firestore.rules` `allow list: if isAdmin()`). Crossed with the
  publicly readable `participants` roster (size + teams), an Admin can narrow who gives to
  whom — even from the app's own UI.
- **Why not fixed here:** it needs a **product/schema decision**, not a code fix. The minimum
  code change is to key the order document by `crypto.randomUUID()` and keep progress on
  `hasOrder`, but that changes the schema locked by D-05 and touches a Phase-2 deliverable;
  the product-level fix is to state the residual risk in the Phase-2 trust contract.
- **Owner:** Phase 2 — "Privacidad verificada y pulido" (trust contract). Also surfaced to the
  user at phase-end. Not a Phase-1 goal blocker (it is a residual/design-level risk, not a
  functional one).
