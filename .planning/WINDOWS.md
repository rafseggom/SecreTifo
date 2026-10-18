---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-10-18T13:22:16.761Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | stub | src/pages/RevealPage.tsx |  | RevealPage renders null; S5 completa is owned by 01-05 (unreachable in 01-01 because /reveal only renders when eventStatus === 'drawn') | open |  | 2026-10-18T13:22:16.060Z |  |
| 2 | 01 | stub | src/pages/AdminPage.tsx |  | AdminPage renders null; S7 completa is owned by 01-06. /admin has no guard and is reachable by URL, so it paints an empty page until 01-06 | open |  | 2026-10-18T13:22:16.761Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "01",
    "file": "src/pages/RevealPage.tsx",
    "line": null,
    "description": "RevealPage renders null; S5 completa is owned by 01-05 (unreachable in 01-01 because /reveal only renders when eventStatus === 'drawn')",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-18T13:22:16.060Z",
    "resolved_at": null,
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
  }
]
````
