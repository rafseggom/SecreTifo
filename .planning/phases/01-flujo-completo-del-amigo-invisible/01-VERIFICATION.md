---
phase: 01-flujo-completo-del-amigo-invisible
verified: 2026-10-19T13:51:13Z
status: human_needed
score: 8/13 must-haves verified
covered_files:
  - .env.example
  - .oxlintrc.json
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-01-PLAN.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-01-SUMMARY.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-02-PLAN.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-02-SUMMARY.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-03-PLAN.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-03-SUMMARY.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-04-PLAN.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-04-SUMMARY.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-05-PLAN.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-05-SUMMARY.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-06-PLAN.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-06-SUMMARY.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-REVIEW-DISPOSITION.md
  - .planning/phases/01-flujo-completo-del-amigo-invisible/01-UI-SPEC.md
  - firebase.json
  - firestore.rules
  - index.html
  - package.json
  - src/App.tsx
  - src/components/Badge.tsx
  - src/components/Button.tsx
  - src/components/Card.tsx
  - src/components/DrawConfirmDialog.tsx
  - src/components/ErrorBoundary.tsx
  - src/components/Field.tsx
  - src/components/FullScreenSpinner.tsx
  - src/components/Input.tsx
  - src/components/JerseyOrderForm.tsx
  - src/components/Modal.tsx
  - src/components/Notice.tsx
  - src/components/ParticipantRow.tsx
  - src/components/PriceTable.tsx
  - src/components/Screen.tsx
  - src/components/Select.tsx
  - src/components/SizeGuideModal.tsx
  - src/components/SizeGuideTable.tsx
  - src/components/icons.tsx
  - src/domain/derangement.test.ts
  - src/domain/derangement.ts
  - src/domain/exportOrders.test.ts
  - src/domain/exportOrders.ts
  - src/domain/normalizeName.test.ts
  - src/domain/normalizeName.ts
  - src/domain/prices.test.ts
  - src/domain/prices.ts
  - src/domain/sizeGuide.test.ts
  - src/domain/sizeGuide.ts
  - src/domain/types.ts
  - src/hooks/useMyAssignment.ts
  - src/hooks/useOrdersAdmin.ts
  - src/index.css
  - src/lib/assignment.ts
  - src/lib/download.test.ts
  - src/lib/download.ts
  - src/lib/draw.ts
  - src/lib/firebase.ts
  - src/lib/joinEvent.test.ts
  - src/lib/joinEvent.ts
  - src/lib/lobby.test.ts
  - src/lib/lobby.ts
  - src/lib/orders.ts
  - src/lib/session.ts
  - src/main.tsx
  - src/pages/AdminPage.tsx
  - src/pages/EntryPage.tsx
  - src/pages/LobbyPage.tsx
  - src/pages/PreferencesPage.tsx
  - src/pages/RevealPage.tsx
  - src/session/SessionProvider.tsx
  - src/vite-env.d.ts
  - tsconfig.app.json
  - tsconfig.json
  - tsconfig.node.json
  - vite.config.ts
covered_digest: "v2:sha256:b6e6dad11af2d65b6758001c2f990c03d69d695655dbad3d114d9b17b702d021"
behavior_unverified: 5
overrides_applied: 0
gaps:
  - truth: "DRAW-03 — the draw runs only once (idempotent against double-click / a second runDraw on a 'drawn' event)"
    status: partial
    reason: "runDraw() reads events/main.status inside a transaction and returns early when it is already 'drawn' (src/lib/draw.ts), but NO test exercises the read-before-write idempotence, and the live no-second-write behaviour needs the Firestore emulator. Structural gates assert the shape, not the transition."
    artifacts:
      - path: "src/lib/draw.ts"
        issue: "Idempotence guard present but unexercised by any test; only a running emulator proves no second assignment write."
    missing:
      - "One emulator/rule-level or mocked-transaction test that calls runDraw twice on a 'drawn' event and asserts the second call writes nothing."
behavior_unverified_items:
  - truth: "DRAW-03 — draw runs only once (idempotent against double-click)"
    test: "With the Firestore emulator and >=3 participants, run the draw and immediately trigger it again (double-click / a second runDraw on the now-'drawn' event)."
    expected: "Exactly one assignment document per giver; the second invocation writes nothing and leaves the assignment set unchanged."
    why_human: "The guard is a transaction read-before-write of events/main.status. Grep can see the guard exists but cannot see that the second commit is a no-op; no test covers it."
  - truth: "EVENT-01 / EVENT-03 — identity persists across a browser reload under silent Anonymous Auth"
    test: "Enter a name, join, then reload the browser."
    expected: "The same person is recognised (same uid, routed back into the lobby/reveal), no re-entry asked."
    why_human: "Relies on Firebase Auth persistence + loadIdentity() localStorage round-trip at runtime; static presence of both halves cannot prove the persisted session is still valid after reload."
  - truth: "EVENT-04 — a duplicate/ambiguous name yields an actionable warning instead of duplicating identity"
    test: "From a second (incognito) tab, join with a name already used in the event."
    expected: "An actionable duplicate-name notice appears with focus in the input; no second participant identity is created."
    why_human: "The pre-check + post-commit race guard are unit-tested in isolation (src/lib/joinEvent.test.ts) with mocked Firestore; the end-to-end warning/focus/no-duplicate behaviour is a runtime, two-client interaction."
  - truth: "EVENT-02 / DRAW-01 / DRAW-02 — first user is Admin and only they see 'Empezar Sorteo'; others see the live lobby list without it"
    test: "Two browser clients: the first joins, the second joins. Compare what each sees in /lobby."
    expected: "First user carries the Admin badge and the only visible 'Empezar Sorteo' button; the second sees the roster updating live (onSnapshot) and no draw button."
    why_human: "Role derivation and the live subscription exist and are wired, but the two-client gating/real-time increment is a runtime property no static check can see."
  - truth: "ORDER-01 / ORDER-05 — after the draw the giver sees 'Te ha tocado regalar a [Nombre]' with the recipient's preferences and their own pendiente/guardado order state"
    test: "After the draw, open /reveal and save an order; reload."
    expected: "Headline names the recipient; recipient talla/liked/forbidden prefs show; saving repaints the recap with 'Guardado'; a '09' dorsal round-trips as the string; no re-submit affordance."
    why_human: "The recipient read is verified (get-own assignment) but the rendered reveal + recap repaint + dorsal round-trip are UI/runtime behaviours with no component test (.test.tsx) in the repo."
human_verification:
  - test: "Reload identity — enter your name, join, then reload the browser"
    expected: "You remain the same person and land back in the lobby (or reveal, once drawn); no re-entry is requested"
    why_human: "Firebase Auth persistence + localStorage round-trip at runtime"
  - test: "Duplicate name from an incognito tab (WINDOWS #3)"
    expected: "Actionable duplicate notice with focus in the input, no duplicate participant; joining with blank team fields persists likedTeams/forbiddenTeams as empty strings (never null)"
    why_human: "Two-client runtime interaction; unit tests use mocked Firestore"
  - test: "Two-client Admin gating — first user vs second user in /lobby"
    expected: "First user gets the Admin badge and is the only one seeing 'Empezar Sorteo'; the second sees the participant list updating on its own without the button"
    why_human: "Real-time, two-client behaviour"
  - test: "Size guide at ~360px (WINDOWS #3)"
    expected: "One card per size, no horizontal scroll, three amber notes present, including the Player 2XL row and the Retro-uses-Fan note"
    why_human: "Responsive visual layout"
  - test: "Draw idempotence — double-click 'Empezar Sorteo' / a second runDraw on a 'drawn' event (WINDOWS #4)"
    expected: "No second assignment document is written; the assignment set is unchanged"
    why_human: "Transaction read-before-write; needs emulator, unexercised by any test"
  - test: "Reveal + order — headline wrap at 320px and dorsal round-trip (WINDOWS #6)"
    expected: "Headline wraps; recipient preferences shown; save → recap with 'Guardado'; dorsal '09' round-trips as a string; no re-submit affordance; prices Fan 11$ / Player 16$ / Retro 15$"
    why_human: "UI render + persistence round-trip"
  - test: "Lobby roster at 320px (WINDOWS #5)"
    expected: "Name plus (tú)/Admin/Pendiente badges wrap with no horizontal scroll"
    why_human: "Responsive visual layout"
  - test: "Admin panel behaviour (WINDOWS #8)"
    expected: "Fraction, bar and missing list match stored data; the fraction rises live without reload when another tab saves an order; 'Descargar Pedidos' opens with BOM, ';' separator, exactly seven columns and no pairing column"
    why_human: "Needs the emulator, a drawn event, saved orders and a real spreadsheet open"
---

# Phase 1: Flujo completo del amigo invisible — Verification Report

**Phase Goal:** Entregar el recorrido completo y funcionando — entrar con el nombre, declarar preferencias con la Guía de Tallas, ver el lobby sincronizado, sortear de forma circular y privada, descubrir el destinatario, registrar el pedido y exportar los pedidos desde el Admin — con el modelo de datos privado y las reglas de Firestore escritas desde el primer commit, no al final.
**Verified:** 2026-10-19T13:51:13Z
**Status:** human_needed
**Re-verification:** No — initial verification

## MVP Mode Note

ROADMAP declares `mode: mvp`, but the Phase 1 goal is prose, not a User Story
(`user-story.validate` → `valid: false`). Per the MVP guard this phase cannot be
verified *as* an MVP slice, so verification ran goal-backward against the five
ROADMAP Success Criteria with a derived user-flow table below.

## Goal Achievement

### User Flow Coverage (derived from the goal)

| # | Flow step | Expected | Evidence in codebase | Status |
| - | --------- | -------- | -------------------- | ------ |
| 1 | Entrar con el nombre | Se pide solo el nombre; identidad anónima silenciosa | `EntryPage.tsx`, `lib/session.ts` (`ensureSignedIn`) | ⚠️ Behaviour not exercised |
| 2 | Unirse y declarar preferencias | Select de talla + equipos preferidos/prohibidos libres | `PreferencesPage.tsx`, `lib/joinEvent.ts` | ✓ Wired |
| 3 | Ver el lobby sincronizado | Lista reactiva; solo el Admin sortea | `LobbyPage.tsx`, `lib/lobby.ts` (`onSnapshot`) | ⚠️ Behaviour not exercised |
| 4 | Sortear circular y privado | Un ciclo, sin autoasignación; solo el regalador lee lo suyo | `domain/derangement.ts` (+test), `lib/draw.ts`, `firestore.rules` | ✓ Producer/tests; ⚠️ idempotence |
| 5 | Descubrir al destinatario | "Te ha tocado regalar a [Nombre]" + preferencias | `RevealPage.tsx`, `lib/assignment.ts` | ⚠️ Behaviour not exercised |
| 6 | Registrar el pedido | Tipo/Equipo/Temporada/Nombre/Dorsal; precios 11/16/15 | `JerseyOrderForm.tsx`, `lib/orders.ts`, `PriceTable.tsx` | ✓ Wired |
| 7 | Exportar desde el Admin | Progreso + CSV BOM/;/7 columnas sin emparejamiento | `AdminPage.tsx`, `hooks/useOrdersAdmin.ts`, `domain/exportOrders.ts` (+test) | ✓ Wired |

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Al unirse se elige talla (S..XXXL) en un Select y se declaran equipos preferidos/prohibidos en texto (PREF-01/02/03) | ✓ VERIFIED | `PreferencesPage.tsx:94-99` (Select talla), free-text teams; `domain/types.ts` size union; rules require `size in [...]` (firestore.rules:60,73) |
| 2 | Modal «Guía de Tallas» con las tablas Fan y Player literales y la nota de Retro (PREF-04) | ✓ VERIFIED | `SizeGuideModal.tsx:30-38` (3 amber notes incl. Retro-usa-Fan); `SizeGuideTable.tsx` FAN/PLAYER tables read `domain/sizeGuide.ts`; `sizeGuide.test.ts` |
| 3 | Las preferencias se guardan por participante y son legibles por quien le regala tras el sorteo (PREF-05) | ✓ VERIFIED | `firestore.rules:51` participants `get, list: if isSignedIn()`; `RevealPage.tsx:149-159` reads recipient prefs |
| 4 | Sorteo circular: un único ciclo, nadie se regala a sí mismo, cada uno regala/recibe una vez, mínimo 3 (DRAW-04) | ✓ VERIFIED | `domain/derangement.ts:25-38` (+1 offset over shuffle); `derangement.test.ts` (n=3,4,6,12) |
| 5 | El emparejamiento vive en un doc por regalador y solo el regalador lo lee; nunca en un doc único (DRAW-05, SEC-01) | ✓ VERIFIED | `firestore.rules:86-95` assignments `get` own / `list: if false`; `lib/draw.ts:45` one `set` per giver; `lib/assignment.ts:23` `getDoc` by id (no `getDocs`) |
| 6 | El sorteo solo puede ejecutarse una vez (idempotente ante doble clic) (DRAW-03) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Guard in `lib/draw.ts:29` (read status in tx, early return) present + wired, but no test exercises it — see behavior_unverified_items |
| 7 | Formulario de pedido con Tipo/Equipo/Temporada/Nombre/Dorsal y precios de referencia Fan 11$ / Player 16$ / Retro 15$ (ORDER-02/03) | ✓ VERIFIED | `JerseyOrderForm.tsx:193-217` (text dorsal D-15, size, fields); `PriceTable.tsx`; `domain/prices.ts` + `prices.test.ts`; literals match PROJECT.md |
| 8 | El pedido guardado no contiene ningún campo que revele el emparejamiento (ORDER-04, SEC-02 partial) | ✓ VERIFIED | `lib/orders.ts:30-39` explicit projection + opaqueId; no identity field; rules forbid `recipientUid`/`recipientName` (firestore.rules:108-109); `domain/exportOrders.ts` has no pairing column |
| 9 | El Admin ve cuántos han rellenado/faltan y descarga un CSV UTF-8 con BOM, `;`, sin emparejamiento (ADMIN-01/02, SEC-02) | ✓ VERIFIED | `hooks/useOrdersAdmin.ts:44-68` derives filled/total/pending from `hasOrder`; `lib/orders.ts:68-82` Admin-only enumeration; `domain/exportOrders.ts:69-79` BOM+`;`+CRLF+7 headers; `exportOrders.test.ts` |
| 10 | La identidad persiste entre recargas del navegador (EVENT-01/03) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `lib/session.ts` (`ensureSignedIn`/`loadIdentity`) + `SessionProvider.tsx:76-97` present and wired; persistence is runtime |
| 11 | Un nombre ya usado produce un aviso accionable en lugar de duplicar la identidad (EVENT-04) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `lib/joinEvent.ts:45-66,117-125` (pre-check `ERR_NAME_TAKEN` + race `ERR_NAME_RACE`, delete rollback); `EntryPage.tsx:67`; unit tests mock Firestore |
| 12 | El primer usuario es Admin y es el único que ve «Empezar Sorteo»; el resto ve la lista del lobby actualizándose (EVENT-02, DRAW-01/02) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `SessionProvider.tsx:119-124` role derivation; `LobbyPage.tsx:151-166` badge + admin-only button; `lib/lobby.ts` `onSnapshot`; two-client behaviour is runtime |
| 13 | Tras el sorteo cada participante ve «Te ha tocado regalar a [Nombre]» con las preferencias del destinatario y su propio estado pendiente/guardado (ORDER-01/05) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `RevealPage.tsx:137-159` headline + prefs; `JerseyOrderForm.tsx:276-297` `Guardado` recap; `ParticipantRow.tsx` `Pendiente`; no `.test.tsx` in repo |

**Score:** 8/13 truths verified (5 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `firestore.rules` | Default-deny rules written in wave 1 | ✓ VERIFIED | Added in commit `8d592f1`; no `if true`; `assignments` get-own/`list: if false`; orders forbid pairing fields |
| `src/domain/derangement.ts` | Circular draw producer | ✓ VERIFIED | `buildDerangement`, throws under n<3, tested |
| `src/domain/exportOrders.ts` | Pure export contract, no pairing | ✓ VERIFIED | BOM/`;`/CRLF/7 headers, `escapeCsvCell`, tested |
| `src/domain/sizeGuide.ts` | Literal Fan/Player provider data | ✓ VERIFIED | Fan 6 rows, Player 5 rows ending `2XL`; matches PROJECT.md |
| `src/domain/prices.ts` | 11/16/15 reference prices | ✓ VERIFIED | Matches PROJECT.md constraints |
| `src/lib/draw.ts` | Transactional single-doc-per-giver draw | ✓ VERIFIED (behavior gap) | Guard present; idempotence unexercised |
| `src/lib/joinEvent.ts` | Bootstrap/join + name uniqueness | ✓ VERIFIED (behavior gap) | Client-side only (rules cannot query); unit-tested with mocks |
| `src/lib/orders.ts` | Order write + Admin enumeration | ✓ VERIFIED | Batch write keeps order+`hasOrder` consistent |
| `src/session/SessionProvider.tsx` | Identity resolution + role | ✓ VERIFIED | Auth + participant subscription + event subscription |
| `src/pages/*.tsx` (5) | The five user-flow surfaces | ✓ VERIFIED | Entry/Preferences/Lobby/Reveal/Admin all substantive, wired via `App.tsx` routes |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `SessionProvider.tsx` | `lib/session.ts` | `ensureSignedIn` then `loadIdentity` | ✓ WIRED | `SessionProvider.tsx:78,82`; no Firestore read before uid |
| `LobbyPage.tsx` | `lib/lobby.ts` | `onSnapshot` participants | ✓ WIRED | `lobby.ts:20,33,79`; roster rendered from snapshot |
| `LobbyPage.tsx` | `lib/draw.ts` | `runDraw(uids)` on confirm | ✓ WIRED | `LobbyPage.tsx:86`; admin-only button `:166` |
| `RevealPage.tsx` | `lib/assignment.ts` | `getDoc` own assignment by id | ✓ WIRED | `assignment.ts:23`; no collection query anywhere |
| `JerseyOrderForm.tsx` | `lib/orders.ts` | `submitOrder` batch | ✓ WIRED | Order + `hasOrder` in one batch (`orders.ts:28-43`) |
| `AdminPage.tsx` | `lib/orders.ts` | `listOrdersAdmin` → `buildOrdersExport` | ✓ WIRED | `AdminPage.tsx:86` then `:32` build + `lib/download.ts` save |
| `AdminPage.tsx` | `hooks/useOrdersAdmin.ts` | progress subscription | ✓ WIRED | `:71` filled/total/pending |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `LobbyPage` | roster | `lobby.subscribeParticipants` (`onSnapshot`) | Yes | ✓ FLOWING |
| `AdminPage` | filled/total/pending | `useOrdersAdmin` → `subscribeParticipants` | Yes | ✓ FLOWING |
| `AdminPage` | export rows | `listOrdersAdmin` → `getDocs(orders)` | Yes | ✓ FLOWING |
| `RevealPage` | recipient | `assignment.getMyAssignment` → `getDoc` | Yes | ✓ FLOWING |
| `SizeGuideModal` | table rows | `domain/sizeGuide.ts` literals | Yes (reference data) | ✓ FLOWING |
| `PriceTable` | prices | `domain/prices.ts` literals | Yes (reference data) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Test suite (8 files / 42 tests) | `npx vitest run` | 8 files passed, 42 tests passed | ✓ PASS |
| Type gate | `npx tsc -b --force` | exit 0, no output | ✓ PASS |
| Lint | `npx oxlint` | 0 errors, 3 pre-existing `react(only-refresh/only-export-components)` warnings | ✓ PASS |
| Circular draw is a single cycle | `derangement.test.ts` (n=3,4,6,12) | passes | ✓ PASS |
| Export shape | `exportOrders.test.ts` | BOM/`;`/CRLF/7 headers/`09` preserved | ✓ PASS |
| Draw idempotence | — | no test exists | ✗ FAIL (gap) |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` and no probe declared in the phase PLAN/SUMMARY files.

### Requirements Coverage

All 23 Phase-1 IDs are declared across the 6 plans; no orphaned IDs (REQUIREMENTS.md maps
exactly EVENT-01..04, PREF-01..05, DRAW-01..05, ORDER-01..05, ADMIN-01..02, SEC-01..02 to
Phase 1). ADMIN-03/SEC-03/SEC-04 are Phase 2 and out of scope.

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| EVENT-01 | 01-01, 01-03 | Nombre + identidad persistente | ? NEEDS HUMAN | `lib/session.ts`, `SessionProvider` (runtime persistence) |
| EVENT-02 | 01-01 | Primer usuario = Admin | ? NEEDS HUMAN | `SessionProvider:119-124`; two-client check pending |
| EVENT-03 | 01-01 | Anonymous Auth silenciosa | ✓ SATISFIED | `lib/session.ts ensureSignedIn`; no login screen |
| EVENT-04 | 01-02, 01-03 | Evita nombres duplicados | ? NEEDS HUMAN | `lib/joinEvent.ts` pre-check + race; unit-tested with mocks |
| PREF-01 | 01-03 | Select de talla | ✓ SATISFIED | `PreferencesPage.tsx:94-99` |
| PREF-02 | 01-03 | Equipos preferidos (texto) | ✓ SATISFIED | `PreferencesPage.tsx` free-text |
| PREF-03 | 01-03 | Equipos prohibidos (texto) | ✓ SATISFIED | `PreferencesPage.tsx` free-text |
| PREF-04 | 01-02, 01-03 | Guía de Tallas Fan/Player literal | ✓ SATISFIED | `SizeGuideModal.tsx`, `sizeGuide.ts` + test |
| PREF-05 | 01-03, 01-05 | Preferencias legibles por el regalador | ✓ SATISFIED | rules `participants get/list`; `RevealPage.tsx:149-159` |
| DRAW-01 | 01-04 | Lobby sincronizado | ? NEEDS HUMAN | `lib/lobby.ts onSnapshot`; live behaviour |
| DRAW-02 | 01-04 | Solo el Admin ve «Empezar Sorteo» | ? NEEDS HUMAN | `LobbyPage.tsx:166` gated on adminUid |
| DRAW-03 | 01-04 | ≥3 y una sola vez (idempotente) | ✗ BLOCKED (partial) | Guard present, no test; emulator needed |
| DRAW-04 | 01-04 | Ciclo circular | ✓ SATISFIED | `derangement.ts` + tests |
| DRAW-05 | 01-04, 01-05 | Asignación legible solo por el regalador | ✓ SATISFIED | `firestore.rules:86-91`; `assignment.ts` get-by-id |
| ORDER-01 | 01-05 | «Te ha tocado regalar a [Nombre]» + prefs | ? NEEDS HUMAN | `RevealPage.tsx:137-159` |
| ORDER-02 | 01-05 | Campos del pedido | ✓ SATISFIED | `JerseyOrderForm.tsx`, `orders.ts` |
| ORDER-03 | 01-02, 01-05 | Precios de referencia | ✓ SATISFIED | `prices.ts` + test; `PriceTable.tsx` |
| ORDER-04 | 01-05 | Sin campo de emparejamiento | ✓ SATISFIED | `orders.ts:30-39`; rules forbid recipient fields |
| ORDER-05 | 01-05 | Estado pendiente/guardado | ? NEEDS HUMAN | `JerseyOrderForm.tsx:276-297`; `ParticipantRow` |
| ADMIN-01 | 01-06 | Progreso y faltantes | ✓ SATISFIED | `useOrdersAdmin.ts:63-68` |
| ADMIN-02 | 01-06 | CSV UTF-8 BOM `;` sin emparejamiento | ✓ SATISFIED | `exportOrders.ts` + test; `lib/download.ts` |
| SEC-01 | 01-04 | Nunca un doc único con el mapa | ✓ SATISFIED | `firestore.rules:86-95`; one doc per giver |
| SEC-02 | 01-02, 01-06 | Export por función pura sin emparejamiento | ✓ SATISFIED | `exportOrders.ts` input type has no identity/pairing field |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`, no `console.log`, no hardcoded-empty props in phase-modified files | ℹ️ Info | "XXXL" literals are false positives only |
| `firestore.rules` | 102-109 | Order rule enforces only `number is string` and forbids recipient fields — no server-side `type`/`size` enum or length validation | ⚠️ Warning | Plan 01-05's must-have claimed out-of-range values are rejected server-side; only client validation exists. Defense-in-depth gap, not a goal blocker |
| `src/components/Notice.tsx` / `Select.tsx` | — | Two additive props added beyond the plan's `files_modified` (WINDOWS #7) | ℹ️ Info | Backwards-compatible; recorded as an open deviation |
| `src/pages/*.tsx` | — | No component tests (`*.test.tsx`) anywhere | ⚠️ Warning | Several UI state transitions verified only by shape gates; CR-01/CR-02 shipped green then needed fixes |

### Prohibitions (judgment tier — non-authoritative LLM-judge verdicts)

> **unverified-prohibition — human review recommended.** These are negative checks; the
> verdicts below are NON-AUTHORITATIVE and must not be read as a pass.

| # | Prohibition | Verdict | Note |
| - | ----------- | ------- | ---- |
| P1 | MUST NOT expose the giver→recipient pairing to anyone but the giver (Admin included) | Not violated within phase surfaces | `assignments` get-own/`list:false`; orders/export carry no pairing. **Residual:** an Admin can still *approximate* the pairing by correlating the enumerable `orders` collection (doc id = giver uid) with the public roster — see Deferred |
| P2 | MUST NOT alter the literal size-guide data | Not violated | `sizeGuide.ts` literals + `sizeGuide.test.ts` |
| P3 | MUST NOT auto-suffix or silently merge duplicate names | Not violated | `joinEvent.ts` throws `ERR_NAME_TAKEN`/`ERR_NAME_RACE`; no suffix logic |

### Deferred Items

Items not met in Phase 1 but explicitly addressed in a later milestone phase.

| # | Item | Addressed In | Evidence |
| - | ---- | ------------ | -------- |
| 1 | WR-02: Admin can approximate the pairing by correlating enumerable `orders` (doc id = giver uid) with public `participants` | Phase 2 | ROADMAP Phase 2 requirement SEC-04 ("…no se pueda inferir el emparejamiento cruzando talla+equipo con las preferencias públicas") and its Success Criterion 2; also SEC-03/ADMIN-03 (rules proved against the emulator) |
| 2 | Server-side proof that `getDocs(assignments)` is denied and only own `getDoc` succeeds | Phase 2 | Phase 2 requirement SEC-03 / ADMIN-03; Success Criterion 1 |
| 3 | IN-07/IN-08 (informational review items) | Phase 2 | `01-REVIEW-DISPOSITION.md` |

### Human Verification Required

1. **Reload identity** — enter your name, join, reload the browser. Expected: same person, back in lobby/reveal, no re-entry.
2. **Duplicate name (incognito)** (WINDOWS #3) — join with an existing name. Expected: actionable notice with focus in the input, no duplicate; blank team fields persist as `""` not `null`.
3. **Two-client Admin gating** — first vs second user in `/lobby`. Expected: first has the Admin badge and the only "Empezar Sorteo"; second sees the list updating with no button.
4. **Size guide at ~360px** (WINDOWS #3) — Expected: one card per size, no horizontal scroll, three amber notes incl. Player `2XL` row and Retro-uses-Fan note.
5. **Draw idempotence** (WINDOWS #4) — double-click / second `runDraw` on a `drawn` event. Expected: no second assignment document.
6. **Reveal + order** (WINDOWS #6) — headline wraps at 320px; recipient prefs shown; save → recap with `Guardado`; dorsal `09` round-trips as a string; no re-submit affordance; prices Fan 11$ / Player 16$ / Retro 15$.
7. **Lobby roster at 320px** (WINDOWS #5) — name + `(tú)`/`Admin`/`Pendiente` badges wrap with no horizontal scroll.
8. **Admin panel** (WINDOWS #8) — fraction/bar/missing list match stored data; live increment without reload; download opens with BOM, `;`, exactly 7 columns, no pairing column.

### Gaps Summary

The static/automated surface is strong: the pure domain (circular draw, export contract,
literal size/price data) is test-covered and green (42/42), the type gate and lint pass, the
privacy model is real (`assignments` get-own / `list:false`, no single map document, order and
export carry no pairing field), and every one of the 23 Phase-1 requirements has a concrete
implementation artifact.

Three things keep this from being `passed`:

1. **DRAW-03 idempotence is a partial gap** — the guard exists but no test exercises it and the
   live no-second-write behaviour needs the emulator. This blocks only that must-have.
2. **Five truths are behavior-dependent** and rest on symbol presence + wiring, not a passing
   behavioural test (identity persistence, duplicate-name warning, Admin gating + live list,
   draw idempotence, reveal/order round-trip). No `.test.tsx` exists in the repo, and CR-01/CR-02
   are recent proof that a green summary can hide a broken UI transition.
3. **One plan must-have is overstated** — 01-05 claimed server-side enum validation of order
   values, but `firestore.rules` only enforces `number is string` and forbids recipient fields.
   Reported as a WARNING (client-side validation exists), not a goal blocker.

The residual WR-02 privacy concern (Admin can approximate the pairing via the enumerable
`orders` collection) is deferred to Phase 2 (SEC-04), not counted as a Phase-1 gap.

---

_Verified: 2026-10-19T13:51:13Z_
_Verifier: the agent (gsd-verifier)_
