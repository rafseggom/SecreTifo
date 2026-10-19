---
phase: 01-flujo-completo-del-amigo-invisible
plan: 06
subsystem: ui
tags: [react, firebase, firestore, react-router, tailwind, csv, accessibility, privacy, copy-deck]

requires:
  - phase: 01-flujo-completo-del-amigo-invisible
    provides: "the routing shell and the /admin placeholder (01-01); buildOrdersExport with its BOM/;/CRLF/formula tests (01-02); the Screen/Card/Notice/Button/Badge/ParticipantRow primitives (01-03, 01-04); subscribeParticipants with its failure callback and unsubscribe (01-04); submitOrder/getMyOrder and the Order/ExportedOrder types (01-05); useMyAssignment's three-branch return shape (01-05)"
provides:
  - "src/lib/download.ts — downloadCsv(filename, csv) with one object URL created and revoked per download, and ordersCsvFilename(date) as the single origin of the file name"
  - "src/hooks/useOrdersAdmin.ts — the {loading, error, filled, total, pending} hook over ONE participants subscription, with the progress derived and never counted in parallel"
  - "src/lib/orders.ts delta — listOrdersAdmin, the only order enumeration in the project, projected field by field to the seven exported fields"
  - "src/pages/AdminPage.tsx — S7 complete: progress, missing list, blind download and the trust note"
affects: []

actuals:
  tokens: 3949
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A download utility that owns both halves of the object URL's life (create then revoke) and declares no imports at all"
    - "Derived progress: the Admin's advance comes from the participant aggregate (`hasOrder`), never from a read of the orders and never from a parallel count"
    - "Explicit field-by-field projection from a Firestore document into the blind export type — never a spread, which would drag the send stamp in"
    - "One calculation of the file name feeding both the anchor's download attribute and the announced success line, so the two cannot diverge"
    - "The page composes no CSV cell: the serialiser is the only thing that knows the file's shape"

key-files:
  created:
    - src/lib/download.ts
    - src/hooks/useOrdersAdmin.ts
    - src/pages/AdminPage.tsx
  modified:
    - src/lib/orders.ts

key-decisions:
  - "The Admin's progress is derived from the participant documents (`hasOrder`) via one subscription, in line with D-19: there is no submissions collection, no parallel count and no second subscription. The orders are read only as a one-shot action at download time."
  - "The order read is a single `getDocs(collection(...))` followed by an explicit field-by-field projection to the seven exported fields. A spread of the document would drag `submittedAt` into the export type and make the projection unauditable."
  - "The file name has a single origin (`ordersCsvFilename`): the handler computes it once and the same value feeds the anchor and the success line, so the announced name and the real file cannot diverge at the day boundary."
  - "A download failure maps `permission-denied` to the S8 taxonomy copy `No tienes permiso para ver esto.` (no retry) and every other code to the S7 copy `No hemos podido generar el archivo.` with `Reintentar`. That is how a non-Admin who reaches the route sees the error taxonomy and never the list, while a transient failure stays retryable."
  - "The S7 empty state is the one 01-UI-SPEC §S7 (line 393) defines for the surface: `0 de {total}` with the bar at zero, the download disabled and its helper. The Copywriting Contract's separate `Todavía no hay ningún pedido.` row was not rendered as an extra card, because at `filled === 0` the missing list already names every participant and a second empty card would contradict it."
  - "No client-side role check is implemented in the page: T-01-21 makes the server rule the authority, so the page does not pretend to be the guard."

patterns-established:
  - "A browser-facing utility module with zero imports: platform behaviour that knows nothing about the domain or the backend"
  - "Derived-then-projected reads: progress from the aggregate the write path already maintains, export from an explicit field list on the blind type"

requirements-completed: [ADMIN-01, ADMIN-02]

coverage:
  - id: D1
    description: "`src/lib/download.ts` saves a string as a file through one object URL that is created and revoked around the click, and computes the orders file name `pedidos-{AAAA-MM-DD}.csv` in a single place"
    requirement: "ADMIN-02"
    verification:
      - kind: other
        ref: "node -e gates: (createObjectURL + revokeObjectURL) === 2; ordersCsvFilename === 1; zero import statements; no file-saver"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "`src/hooks/useOrdersAdmin.ts` exposes the triple {loading, error, …} plus the derived {filled, total, pending} from ONE participants subscription, returns its unsubscribe and constructs no collection reference"
    requirement: "ADMIN-01"
    verification:
      - kind: other
        ref: "node -e gates: subscribeParticipants === 1; filled+pending >= 3; no 'collection(db'; no file-saver"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "`src/lib/orders.ts` gains `listOrdersAdmin` — one collection read plus an explicit projection to the seven exported fields — while `submitOrder` and `getMyOrder` stay intact"
    requirement: "ADMIN-02"
    verification:
      - kind: other
        ref: "node -e gate: orders.ts and AdminPage.tsx both name listOrdersAdmin; the three exported functions present"
        status: pass
      - kind: other
        ref: "ExportedOrder (src/domain/types.ts) has no identity or pairing field, so the projection has nowhere to put one; npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "S7 renders the caption `Pedidos guardados`, the `{filled} de {total}` fraction with tabular-nums and aria-live, a role=progressbar with min/max/now/text, the conditional missing heading (singular/plural) with `Pendiente` rows or the all-filled success line, the disabled-aware `Descargar Pedidos` CTA, the download success/loading/error lines and the trust note"
    requirement: "ADMIN-01, ADMIN-02"
    verification:
      - kind: other
        ref: "node -e gates: 'Descargar Pedidos' === 1; 'progressbar' === 1; aria-valuenow/max/text >= 3; buildOrdersExport+downloadCsv >= 2; ordersCsvFilename === 2; trust note === 1; no 'assignments'"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0); npm run lint (oxlint exit 0, no new warnings)"
        status: pass
    human_judgment: true
    rationale: "The live realtime behaviour — the fraction rising by itself after a new order saved from another tab, without a reload — and the visual wrap of long names at 320px are held-out state that only the emulator and a browser can show. Recorded as an unrun-verify in .planning/WINDOWS.md (entry 8)."
  - id: D5
    description: "The downloaded file is composed only by the pure serialiser handed to the download utility, carries the BOM, the `;` separator and exactly seven blind columns, and two consecutive downloads (or one racing a new write) neither corrupt the file nor retain its content in memory"
    requirement: "ADMIN-02"
    verification:
      - kind: unit
        ref: "src/domain/exportOrders.test.ts#BOM, separator, seven columns, no identity/price column (npx vitest run: 28/28 pass)"
        status: pass
      - kind: other
        ref: "node -e gate: exactly one object URL created and one revoked per download in src/lib/download.ts, released right after the click"
        status: pass
    human_judgment: true
    rationale: "The concurrency edge (two downloads in a row, or a download while a new order is written) and the spreadsheet read of BOM/separator/column count need the emulator and Excel; the structural part (composition, projection, one-create-one-revoke) is gate- and test-proven."

duration: 6min
completed: 2026-10-19
status: complete
plan_head_before: d1cd7369d42caebdd25e135bd29e07c99a3be62b
plan_head_after: 58557bbe2989c1d0698694f1ae18f06bf247b508
---

# Phase 01 Plan 06: Panel del Admin y descarga ciega Summary

**El panel del Admin deriva el avance de los documentos de participantes (nunca de una colección de envíos) y descarga el archivo unificado compuesto únicamente por la función pura de exportación, cuyo tipo no tiene dónde poner el emparejamiento.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-10-19T14:43:00+02:00
- **Completed:** 2026-10-19T14:48:49+02:00
- **Tasks:** 2/2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- **La descarga tiene un solo origen de nombre y libera su recurso.** `downloadCsv` crea un objeto URL, dispara el clic y **lo revoca inmediatamente** (uno de cada, gate asertado); `ordersCsvFilename` calcula `pedidos-{AAAA-MM-DD}.csv` en el único sitio del que dependen el atributo de descarga y la línea de éxito, de modo que el nombre anunciado y el archivo real no pueden divergir. El módulo **no declara ningún import**: no conoce el dominio ni el backend (D-21, D-25).
- **El avance del Admin es derivado.** `useOrdersAdmin` abre **una sola** suscripción —a los participantes— y devuelve el triple `{loading, error, …}` (mismo patrón que `useMyAssignment`) más `{filled, total, pending}` calculados con `hasOrder`. No lee los pedidos, no construye ninguna referencia de colección y devuelve su `unsubscribe` desde el efecto (D-19, Pitfall 8, Pitfall 11).
- **La enumeración de pedidos existe una sola vez y es ciega.** `listOrdersAdmin` hace una lectura de la colección y **proyecta campo a campo** a los siete campos exportables: una extensión arrastraría la marca de envío al tipo de exportación y una lista explícita hace la proyección auditable. `submitOrder` y `getMyOrder` quedan intactos (ADMIN-02, SEC-02).
- **S7 completa.** Cabecera `Panel del Admin`, tarjeta de progreso con `Pedidos guardados`, la fracción `{filled} de {total}` en `tabular-nums` con `aria-live="polite"`, y una `role="progressbar"` con `aria-valuemin/max/now/valuetext` rellena en indigo sobre pista slate; tarjeta de pendientes con el título condicional (singular/plural) y filas `Pendiente`, sustituida por `Todos los pedidos están guardados.` cuando no falta nadie; bloque de descarga con `Descargar Pedidos` deshabilitado a cero y su ayudante; y la nota de confianza siempre visible bajo el botón (`La lista no incluye quién regala a quién.`).
- **La página no compone el archivo.** Entrega la instantánea de pedidos a `buildOrdersExport` y la cadena resultante a `downloadCsv` con `ordersCsvFilename`: no serializa celdas, no formatea cabeceras, no añade columnas y **no menciona la colección del emparejamiento** (gate asertado).

## Task Commits

Each task was committed atomically:

1. **Task 1: La utilidad de descarga y el hook del panel** - `8404178` (feat)
2. **Task 2: El panel del Admin y la descarga del archivo unificado** - `58557bb` (feat)

**Plan metadata:** the `docs(01-06): complete admin panel plan` commit (final commit of this plan)

## Files Created/Modified

- `src/lib/download.ts` — `downloadCsv(filename, csv)` (un objeto URL creado y revocado por descarga) y `ordersCsvFilename(date)`; sin imports
- `src/hooks/useOrdersAdmin.ts` — el hook del panel: una suscripción a participantes, avance derivado y lista de pendientes
- `src/pages/AdminPage.tsx` — S7 completa (reemplaza el `return null` de 01-01)
- `src/lib/orders.ts` — delta: `listOrdersAdmin` con proyección explícita; `submitOrder`/`getMyOrder` intactos

## Decisions Made

- **El avance se deriva; los pedidos se leen sólo al descargar.** Mezclar la lectura completa de pedidos con el indicador de avance haría que el panel leyera todos los pedidos para pintar un contador (D-19).
- **Proyección explícita, nunca un spread.** El spread arrastraría `submittedAt` al tipo de exportación; la lista de campos es lo que hace la proyección auditable de un vistazo.
- **Un solo cálculo del nombre.** Se calcula en el manejador y el mismo valor alimenta el ancla y la línea de éxito.
- **El fallo de descarga mapea `permission-denied` a la taxonomía S8** (`No tienes permiso para ver esto.`, sin reintento) y cualquier otro código a `No hemos podido generar el archivo.` con `Reintentar`. Así un usuario que no es el Admin ve la copia de la taxonomía y nunca la lista, mientras un fallo transitorio sigue siendo reintentable.
- **El estado vacío de S7 es el que fija 01-UI-SPEC §S7 (línea 393):** `0 de {total}`, barra a cero, descarga deshabilitada y su ayudante. No se pintó la fila `Todavía no hay ningún pedido.` del Copywriting Contract como tarjeta adicional porque a `filled === 0` la lista de pendientes ya nombra a todos los participantes y una segunda tarjeta vacía la contradiría.
- **Ningún chequeo de rol en cliente.** T-01-21 hace de la regla del servidor la autoridad; la página no finge ser la guarda.

## Deviations from Plan

None - plan executed exactly as written. (Las dos notas de la sección de decisiones —el mapeo de `permission-denied` en la descarga y el estado vacío de S7— implementan literalmente lo que el plan y la UI-SPEC exigen, no se apartan de ellos.)

## Issues Encountered

- Ninguno. No se instaló ningún paquete (T-01-SC): la utilidad de descarga usa el objeto URL y el atributo `download` del navegador, tal como exige D-25.
- La rama actual es `main`, que el helper marca como protegida; el proyecto declara `git.branching_strategy: none` y `use_worktrees: false`, y los cinco planes anteriores commitearon igualmente en `main`, así que se mantuvo ese patrón (patrón establecido y sancionado por el orquestador).
- `gsd_run` no está en PATH en este entorno; los verbos de GSD se han invocado por `node <config>/gsd-core/bin/gsd-tools.cjs …` (mismo backend). Sin impacto en el resultado.

## Deferred (out of scope)

- `src/session/SessionProvider.tsx` sigue importando `firebase/firestore` directamente (deuda preexistente de 01-01, ya registrada en `deferred-items.md`). No lo toca este plan; se comprobó que **ninguno** de los cuatro archivos de esta wave importa `firebase/*` fuera de `src/lib/`.

## Known Stubs

None — el stub registrado contra 01-01 (`AdminPage` devuelve `null`) queda resuelto: la entrada 2 de `.planning/WINDOWS.md` se marcó `fixed`.

## Threat Flags

None — no hay superficie nueva fuera del `<threat_model>` del plan. Las mitigaciones del registro se materializan en el código commiteado: **T-01-21** (la autoridad es la regla; la página no implementa ningún chequeo de rol en cliente y un impostor recibe `permission-denied` al enumerar pedidos, viendo la copia de la taxonomía); **T-01-22** (cuatro barreras: el tipo sin columna de identidad, la proyección explícita de `listOrdersAdmin`, la regla que deniega la colección del emparejamiento a todos y el gate que prohíbe mencionarla); **T-01-23** (cada pulsación lee y compone su propia instantánea, el estado de carga bloquea el segundo clic y la utilidad revoca el objeto URL tras el clic); **T-01-SC** cubierto sin instalaciones nuevas.

## Unrun verifications (recorded in .planning/WINDOWS.md)

- S7 `<human-check>` (entrada 8, `src/pages/AdminPage.tsx`): con el emulador en marcha, un evento sorteado y uno o dos pedidos guardados — comprobar que la fracción, la barra y la lista de pendientes coinciden con lo guardado; el envoltorio de nombres a 320px; abrir `pedidos-{AAAA-MM-DD}.csv` en una hoja de cálculo y verificar el BOM, el separador `;` y exactamente siete columnas; guardar un pedido nuevo desde otra pestaña y comprobar que la fracción sube sola sin recargar; y confirmar que el archivo no trae el emparejamiento ni columnas extra.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- La fase queda completa: los seis planes entregados. `ADMIN-01` y `ADMIN-02` se cierran aquí y `SEC-02` pasa a ser el archivo que sale por el navegador, no sólo una garantía de tipos.
- Las seis verificaciones manuales acumuladas (entradas 3–6 y 8 de `WINDOWS.md`) y la desviación 7 siguen abiertas: exigen el emulador de Firestore + dev server y se cosechan con `/gsd-verify-work` al final de la fase.
- El archivo descargado y la pantalla no pueden revelar el emparejamiento por construcción: el tipo `ExportedOrder` no tiene columna para ello, `listOrdersAdmin` proyecta campo a campo y la regla deniega la colección del emparejamiento a todos.

---
*Phase: 01-flujo-completo-del-amigo-invisible*
*Completed: 2026-10-19*

## Self-Check: PASSED

- FOUND: src/lib/download.ts, src/hooks/useOrdersAdmin.ts, src/pages/AdminPage.tsx, src/lib/orders.ts
- FOUND: commits `8404178` (Task 1) and `58557bb` (Task 2)
- Tracked source: `git ls-files` names download.ts, useOrdersAdmin.ts and AdminPage.tsx (no gitignored mirror)
- Measured commit count via the #3968 ledger (`$(git rev-parse --git-dir)/gsd-plan-head-before-01-06` = `d1cd736`): `git rev-list --count d1cd736..HEAD` = **2**, coherent with the two tasks
- Task 1 gates (6): all exit 0; Task 2 gates (8): all exit 0 — re-run over the committed tree
- `npx tsc -b --force` → exit 0; `npx vitest run` → 5 files / 28 tests, exit 0; `npm run lint` → exit 0 (only the 3 pre-existing react-refresh warnings)

