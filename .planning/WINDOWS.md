---
schema_version: 1
open_count: 6
waived_count: 0
fixed_count: 1
total_count: 7
last_updated: 2026-10-19T12:40:43.888Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | stub | src/pages/RevealPage.tsx |  | RevealPage renders null; S5 completa is owned by 01-05 (unreachable in 01-01 because /reveal only renders when eventStatus === 'drawn') | fixed |  | 2026-10-18T13:22:16.060Z | 2026-10-19T12:40:37.088Z |
| 2 | 01 | stub | src/pages/AdminPage.tsx |  | AdminPage renders null; S7 completa is owned by 01-06. /admin has no guard and is reachable by URL, so it paints an empty page until 01-06 | open |  | 2026-10-18T13:22:16.761Z |  |
| 3 | 01 | unrun-verify | src/pages/PreferencesPage.tsx |  | Task 4 <human-check> unrun: needs emulator + dev server. Verify at ~360px that each size table reads as one card per size with no horizontal scroll and the three amber notes present (incl. the 2XL row); join with blank team fields and confirm likedTeams/forbiddenTeams persist as empty strings (never null); re-enter with the same name from an incognito tab and confirm the duplicate notice with focus in the input. | open |  | 2026-10-19T12:10:35.293Z |  |
| 4 | 01 | unrun-verify | src/lib/draw.ts |  | Double-click / second runDraw on an already-'drawn' event creates no second document (DRAW-03/D-09): needs the Firestore emulator + two participants. runDraw's read-before-write idempotency and the single-doc-per-giver shape are asserted by node -e gates, but the live no-second-write behaviour is a manual check. | open |  | 2026-10-19T12:27:58.498Z |  |
| 5 | 01 | unrun-verify | src/pages/LobbyPage.tsx |  | Roster list responsive read at 320px in the lobby (S4/Task 3 <human-check>): the participant row wraps the name and the tu/admin/pendiente badges without horizontal scroll; needs emulator + dev server. | open |  | 2026-10-19T12:27:59.292Z |  |
| 6 | 01 | unrun-verify | src/pages/RevealPage.tsx |  | S5 human-check not run: needs the Firestore emulator to confirm the headline wraps at 320px and that a dorsal '09' round-trips as the string and the recap repaints without re-submitting. | open |  | 2026-10-19T12:39:51.713Z |  |
| 7 | 01 | deviation | src/components/Notice.tsx |  | 01-05 Task 2 added two additive, backwards-compatible primitive props to satisfy the plan's own gate contracts: Notice gains an optional explicit 'status' role prop (the D-16 notice must carry the literal role at the call site) and Select gains optionLabels (D-17 needs 'Fan · 11$' at the point of decision while the stored value stays the enum member). Neither file was listed in the plan's files_modified. | open |  | 2026-10-19T12:40:43.888Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "01",
    "file": "src/pages/RevealPage.tsx",
    "line": null,
    "description": "RevealPage renders null; S5 completa is owned by 01-05 (unreachable in 01-01 because /reveal only renders when eventStatus === 'drawn')",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-18T13:22:16.060Z",
    "resolved_at": "2026-10-19T12:40:37.088Z",
    "milestone": null
  },
  {
    "id": 2,
    "kind": "stub",
    "phase": "01",
    "file": "src/pages/AdminPage.tsx",
    "line": null,
    "description": "AdminPage renders null; S7 completa is owned by 01-06. /admin has no guard and is reachable by URL, so it paints an empty page until 01-06",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-18T13:22:16.761Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/pages/PreferencesPage.tsx",
    "line": null,
    "description": "Task 4 <human-check> unrun: needs emulator + dev server. Verify at ~360px that each size table reads as one card per size with no horizontal scroll and the three amber notes present (incl. the 2XL row); join with blank team fields and confirm likedTeams/forbiddenTeams persist as empty strings (never null); re-enter with the same name from an incognito tab and confirm the duplicate notice with focus in the input.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-19T12:10:35.293Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/lib/draw.ts",
    "line": null,
    "description": "Double-click / second runDraw on an already-'drawn' event creates no second document (DRAW-03/D-09): needs the Firestore emulator + two participants. runDraw's read-before-write idempotency and the single-doc-per-giver shape are asserted by node -e gates, but the live no-second-write behaviour is a manual check.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-19T12:27:58.498Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/pages/LobbyPage.tsx",
    "line": null,
    "description": "Roster list responsive read at 320px in the lobby (S4/Task 3 <human-check>): the participant row wraps the name and the tu/admin/pendiente badges without horizontal scroll; needs emulator + dev server.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-19T12:27:59.292Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 6,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/pages/RevealPage.tsx",
    "line": null,
    "description": "S5 human-check not run: needs the Firestore emulator to confirm the headline wraps at 320px and that a dorsal '09' round-trips as the string and the recap repaints without re-submitting.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-19T12:39:51.713Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 7,
    "kind": "deviation",
    "phase": "01",
    "file": "src/components/Notice.tsx",
    "line": null,
    "description": "01-05 Task 2 added two additive, backwards-compatible primitive props to satisfy the plan's own gate contracts: Notice gains an optional explicit 'status' role prop (the D-16 notice must carry the literal role at the call site) and Select gains optionLabels (D-17 needs 'Fan · 11$' at the point of decision while the stored value stays the enum member). Neither file was listed in the plan's files_modified.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-19T12:40:43.888Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
