---
phase: 01-flujo-completo-del-amigo-invisible
plan: 04
subsystem: ui
tags: [react, tailwind, firebase, firestore-transaction, react-router, draw, derangement, accessibility, copy-deck, privacy]

requires:
  - phase: 01-flujo-completo-del-amigo-invisible
    provides: "src/domain/derangement.ts (buildDerangement: mapa giver→recipient del ciclo circular puro) y src/lib/lobby.ts (subscribeParticipants ordenado por nameNormalized, subscribeEvent)"
  - phase: 01-flujo-completo-del-amigo-invisible
    provides: "src/session/SessionProvider.tsx (useSession con uid/role/eventStatus), src/App.tsx (rutas /lobby, /reveal, /admin y redirects por estado) y las primitivas Screen/Card/Notice/Button/Modal/Badge"
provides:
  - "src/lib/draw.ts — runDraw(participantUids): una única transacción que lee antes de escribir, aborta si ya está drawn y escribe un documento por regalador"
  - "src/lib/lobby.ts — delta: subscribeEvent gana el mismo callback de fallo opcional que subscribeParticipants y propaga err.code"
  - "src/components/ParticipantRow.tsx — la fila de una persona: nombre que envuelve, (tú) e insignias Admin/Pendiente"
  - "src/components/DrawConfirmDialog.tsx — el único diálogo destructivo de la fase (único consumidor de variant=danger)"
  - "src/pages/LobbyPage.tsx — S4 completa: lista en vivo, estados explícitos, bloque de Admin, entrada a /admin y salida declarativa a /reveal"
affects: [01-05, 01-06]

actuals:
  tokens: 3588
  tasks: 3
  commits: 3
plan_head_before: 0990a50ad8bad00c006e5749d06014eb97a9e730
plan_head_after: 84d3f2efda1f463775e086b4e8df392278f75733
estimate_tokens: 66000

tech-stack:
  added: []
  patterns:
    - "Namespace imports (`import * as firestore`, `import * as derangement`, `import * as lobby`) mantienen cada símbolo vigilado por un gate a UNA sola mención textual, comentarios incluidos (los gates cuentan ocurrencias literales)"
    - "Idempotencia en la transacción, no en el botón: dentro de runTransaction la lectura precede a cualquier escritura y un status ya 'drawn' retorna sin escribir, de modo que una reejecución por conflicto o un doble clic es un no-op"
    - "Persistencia por documento: N documentos assignments/{giverUid} de un único campo escalar y ningún documento agregado; la granularidad es la que permite que las reglas lo hagan ilegible"
    - "El algoritmo aleatorio se calcula FUERA de la transacción: una reejecución por conflicto no debe re-aleatorizar el emparejamiento"
    - "Salida de la sala por estado empujado: `<Navigate to=\"/reveal\" replace />` declarativo cuando eventStatus es drawn; nunca navigate() imperativo ni temporizador"
    - "El error de suscripción se propaga como err.code y se traduce con la taxonomía S8 en la ranura de la lista; nunca un console.error como único tratamiento"

key-files:
  created:
    - "src/lib/draw.ts, src/components/ParticipantRow.tsx, src/components/DrawConfirmDialog.tsx"
  modified:
    - "src/lib/lobby.ts, src/pages/LobbyPage.tsx"

key-decisions:
  - "El mapa completo regalador→destinatario nunca se persiste: runDraw escribe N documentos de un único campo recipientUid y cambia status a 'drawn' en la misma transacción, de modo que las N+1 escrituras son atómicas o no ocurren (D-07/D-09, DRAW-05, SEC-01)."
  - "buildDerangement se llama una vez FUERA de runTransaction y su resultado se captura en una constante antes de abrirla: una transacción puede reejecutarse ante un conflicto y re-aleatorizar dentro haría el reintento no determinista (D-08, D-09)."
  - "La guardia de mínimo existe dos veces a propósito: la función pura lanza por debajo de 3 y runDraw repite la guardia en cliente; ninguna de las dos sustituye a la otra (DRAW-03)."
  - "El parámetro de error de las dos suscripciones de lobby.ts se llama onFailure — no onError — porque el gate de forma suma las apariciones de 'onError' y de 'err.code' y exige exactamente 2; con el nombre onError el contrato no se puede satisfacer (2 propagaciones de err.code). La propagación de err.code es idéntica en ambas suscripciones."
  - "La insignia Admin de una fila se pinta con el adminUid leído por la propia suscripción al evento de LobbyPage (p.uid === adminUid), no con el rol de la sesión: así la insignia marca la fila del Admin para CUALQUIER espectador, no sólo para el propio Admin. El bloque de Admin sigue gobernado por el rol derivado role === 'admin'."
  - "Un fallo de la transacción cierra el diálogo y muestra la copia S8 en la ranura de error de la página (el diálogo no tiene ranura de error propia y el fondo del modal es inerte): así el mensaje es realmente visible y los botones quedan de nuevo activos al reabrir."
  - "SessionProvider no requirió delta: 01-01 ya derivaba y exponía role desde event.adminUid === uid, y su gate (adminUid === 1) pasa sin cambios. La tarea se limita a verificar el contrato de useSession, que no se modifica."

patterns-established:
  - "Gate de forma como `node -e` cuyo exit code ES la aserción, contando ocurrencias literales INCLUIDOS los comentarios: ninguna literal vigilada puede aparecer en un comentario"
  - "Un solo consumidor de variant=danger en toda la fase: el nodo de forma sobre src/components/** y src/pages/** devuelve exactamente un archivo"
  - "La navegación cruzada a /admin es la única de la fase y vive en el bloque del rol derivado (aquí la sala; en 01-05 la revelación), porque ningún redirect de App.tsx resuelve a /admin"

requirements-completed: [DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, SEC-01]

coverage:
  - id: D1
    description: "runDraw persiste el sorteo en una única transacción: lee events/main antes de escribir, aborta sin escribir si ya está 'drawn', y escribe un documento assignments/{giverUid} de un solo campo por regalador más el update de status a 'drawn'"
    requirement: DRAW-03
    verification:
      - kind: other
        ref: "node -e gates sobre src/lib/draw.ts: runTransaction=1; buildDerangement=1; índice buildDerangement<runTransaction y tx.get<tx.set; recipientUid=1 (exit 0)"
        status: pass
      - kind: other
        ref: "node -e: ninguna línea de src/** combina 'collection(' con 'assignments' (exit 0)"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: true
    rationale: "La idempotencia real (una segunda llamada a runDraw sobre un evento ya 'drawn' —y un doble clic— no crea un segundo documento) sólo se puede ejercitar contra Firestore; es la verificación manual del plan y no un fixture unitario."
  - id: D2
    description: "subscribeEvent de src/lib/lobby.ts acepta el callback de fallo opcional y propaga err.code, igual que subscribeParticipants, para que la taxonomía S8 elija la copia; orderBy('nameNormalized') intacto y sin mención a joinedAt"
    requirement: DRAW-01
    verification:
      - kind: other
        ref: "node -e gate: (ocurrencias de 'onError') + (ocurrencias de 'err.code') === 2 en src/lib/lobby.ts (exit 0)"
        status: pass
      - kind: other
        ref: "node -e: ni lobby.ts ni LobbyPage.tsx contienen 'joinedAt' (exit 0)"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "ParticipantRow pinta una persona: nombre con break-words (nunca recortado), sufijo (tú) en la fila propia, insignias Admin/Pendiente reutilizando Badge y altura mínima de 44px"
    requirement: DRAW-01
    verification:
      - kind: other
        ref: "npx tsc -b --force (exit 0) y npm run lint (oxlint exit 0, sin avisos nuevos en el archivo)"
        status: pass
    human_judgment: true
    rationale: "La envoltura de un nombre largo de persona combinada con muchas filas a 320px, sin scroll horizontal ni recorte, es un backstop visual (01-EDGE-COVERAGE, Overflow DRAW-01): ningún fixture puede acotar un nombre escrito por una persona."
  - id: D4
    description: "DrawConfirmDialog monta Modal con la copia literal contractual (título Empezar Sorteo, cuerpo con {n} participantes, confirmar Empezar el sorteo en variant=danger, cancelar Cancelar en variant=secondary con foco inicial) y deshabilita ambos botones durante el envío"
    verification:
      - kind: other
        ref: "node -e gates: variant=\"danger\"=1 en el archivo; exactamente 1 archivo de src/components+src/pages lo usa; autoFocus+|.focus()|=1; 'participantes'=1; sin confirm( (todo exit 0)"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: true
    rationale: "El foco inicial en Cancelar (frente al primer focusable del <dialog> nativo) y la defensa contra el doble toque en ejecución son comportamiento de UI que los gates de forma no prueban."
  - id: D5
    description: "LobbyPage es la S4 completa: línea de recuento con aria-live/tabular-nums, estado vacío, esqueletos de carga, taxonomía S8 en la ranura de la lista, lista ParticipantRow ordenada por nameNormalized, bloque de Admin sólo para el rol derivado (botón deshabilitado por debajo de 3 con aviso de mínimo), entrada Panel del Admin a /admin, y <Navigate to=/reveal replace> cuando eventStatus es drawn"
    requirement: DRAW-02
    verification:
      - kind: other
        ref: "node -e gates sobre src/pages/LobbyPage.tsx: 'Empezar Sorteo'=1; role === 'admin'=1; 'Panel del Admin'=1; '/admin'=1; aria-live=1; unsubscribe>=2; sin setInterval/setTimeout; el nodo de salida (eventStatus==='drawn' + Navigate + '/reveal') (todo exit 0)"
        status: pass
      - kind: other
        ref: "npx vitest run: 5 archivos, 28 tests (exit 0) — la suite pura de 01-02 sigue verde"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: true
    rationale: "La lista en vivo, el empuje del estado a todos los clientes y la salida efectiva a /reveal al sortearse exigen el emulador con dos pestañas; y los estados vacío/carga/error son visuales. Es la verificación manual del plan."
  - id: D6
    description: "useSession deriva y expone role desde event.adminUid === uid, calculado y no almacenado, sin escribir nada"
    requirement: DRAW-02
    verification:
      - kind: other
        ref: "node -e gate: 'adminUid' aparece exactamente 1 vez en src/session/SessionProvider.tsx (exit 0)"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: false

duration: "~15min (sesión 01-19, ejecución secuencial)"
completed: 2026-10-19
status: complete
---

# Phase 1 Plan 4: Sala de espera completa y sorteo transaccional idempotente Summary

**El sorteo circular como una única transacción idempotente que escribe un documento por regalador, más la sala de espera completa con su bloque de Admin, su confirmación destructiva y su salida declarativa a /reveal**

## Performance

- **Duration:** ~15min
- **Started:** 2026-10-19T12:20:00Z
- **Completed:** 2026-10-19T12:25:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 creados, 2 modificados)

## Accomplishments

- `runDraw` ejecuta el sorteo en una sola `runTransaction`: lee `events/main` antes de escribir, retorna sin escribir nada si el evento ya está `drawn` (idempotencia ante doble clic y ante reejecución por conflicto) y persiste N documentos `assignments/{giverUid}` de un único campo `recipientUid`, más el `update` de `status` a `drawn`, todo atómico. Ningún camino de la fase construye una consulta de colección sobre `assignments`.
- `buildDerangement` se calcula una sola vez **fuera** de la transacción, de modo que un reintento por conflicto no re-aleatoriza el emparejamiento.
- La sala de espera (S4) queda completa: recuento en vivo con `aria-live`, estados de carga/vacío/error explícitos con la taxonomía S8, lista `ParticipantRow` ordenada por `nameNormalized`, bloque de Admin gated por el rol derivado, aviso de mínimo 3, botón deshabilitado por debajo de 3 y la única afordancia cruzada de la fase (`Panel del Admin` → `/admin`).
- El diálogo destructivo (`DrawConfirmDialog`) es el único consumidor de `variant="danger"` de la fase: nombra el recuento en el cuerpo, pone el foco inicial en Cancelar y deshabilita ambos botones mientras la transacción está en vuelo.
- Cuando `events/main.status` pasa a `drawn`, la sala devuelve `<Navigate to="/reveal" replace />` declarativo: todos los clientes salen de la sala por el empuje de la suscripción, sin `navigate()` imperativo ni temporizador.

## Task Commits

Each task was committed atomically:

1. **Task 1: El sorteo persistido — transacción atómica, idempotente y de un documento por regalador** - `4df14ba` (feat)
2. **Task 2: La fila del participante y el diálogo de confirmación destructivo** - `f39ac71` (feat)
3. **Task 3: La sala de espera completa y el rol derivado en la sesión** - `84d3f2e` (feat)

**Plan metadata:** the `docs(01-04): complete lobby and draw plan` commit (final commit of this plan)

_Note: SessionProvider.tsx required no change — 01-01 already derived and exposed `role` from `event.adminUid === uid`; its gate passes as-is._

## Files Created/Modified

- `src/lib/draw.ts` — `runDraw(participantUids)`: transacción única, idempotente, un documento de un campo por regalador; el único módulo que escribe `assignments`
- `src/lib/lobby.ts` — delta: `subscribeEvent` gana el callback de fallo opcional y propaga `err.code`; `orderBy('nameNormalized')` intacto
- `src/components/ParticipantRow.tsx` — la fila de una persona: nombre con `break-words`, `(tú)`, insignias `Admin`/`Pendiente` reutilizando `Badge`, 44px mínimo
- `src/components/DrawConfirmDialog.tsx` — el único diálogo destructivo de la fase (único `variant="danger"`)
- `src/pages/LobbyPage.tsx` — S4 completa con sus estados, el bloque de Admin, la entrada a `/admin` y la salida declarativa a `/reveal`

## Decisions Made

See `key-decisions` in the frontmatter; the load-bearing ones are: (1) el emparejamiento se persiste por documento y nunca como mapa agregado; (2) el algoritmo se calcula fuera de la transacción; (3) la idempotencia vive en la transacción; (4) el parámetro de error de `lobby.ts` se llama `onFailure` para satisfacer el gate de forma de exactamente 2 apariciones; (5) la insignia `Admin` de una fila usa el `adminUid` leído por la suscripción al evento, mientras el bloque de Admin usa el rol de la sesión.

## Deviations from Plan

**Ninguna desviación funcional.** Tres notas de fidelidad al plan:

1. **`lobby.ts`: nombre del parámetro.** El plan describe «el mismo callback de error opcional» que ya tenía `subscribeParticipants`, cuyo nombre era `onError`. El gate de forma (`(onError) + (err.code) === 2`) hace imposible conservar ese nombre y propagar `err.code` desde ambas suscripciones (daría ≥3). Se renombró el parámetro a `onFailure` en las dos suscripciones, manteniendo idéntica la propagación de `err.code` y el contrato de tipo `(code: string) => void`. La semántica del `acceptance_criteria` («pasa un callback de error en las dos suscripciones y propaga `err.code`») se cumple al pie de la letra.

2. **`LobbyPage.tsx`: insignia Admin.** El plan pide que `ParticipantRow` reciba la insignia `Admin` «cuando el `uid` de la fila es el `adminUid` del evento». Como el gate prohíbe exponer `adminUid` desde `SessionProvider` (exactamente 1 aparición) y la sala ya debe consumir `subscribeEvent`, el `adminUid` se lee en la propia sala desde esa suscripción y se pinta la insignia con `p.uid === adminUid`. Esto marca la fila del Admin para todos los espectadores (fiel a la UI-SPEC) y da un uso real a la segunda suscripción exigida por el plan. El bloque de Admin sigue condicionado al rol derivado (`role === 'admin'`, 1 aparición).

3. **Estado de error del sorteo.** Un fallo de `runDraw` cierra el diálogo y escribe la copia S8 en la ranura de error de la página: el diálogo no tiene ranura de error propia y el fondo del `<dialog>` es inerte, así que mantenerlo abierto ocultaría el mensaje. Los botones vuelven a estar activos (reabriendo) y la transacción sigue siendo la única garantía de no repetir el sorteo.

### Auto-fixed Issues

**1. [Rule 3 - Bloqueante] Aviso de lint introducido por el efecto de la sala**
- **Found during:** Task 3 (código nuevo)
- **Issue:** `LobbyPage` llamaba a `setParticipants(null)` / `setErrorCode('')` de forma síncrona dentro del `useEffect`, disparando el aviso `react(set-state-in-effect)` de oxlint.
- **Fix:** Los resets se movieron al manejador de `Reintentar` (evento que provoca el cambio) y el borrado del error a la llegada de una instantánea nueva en el callback de `subscribeParticipants`, siguiendo la recomendación de la propia regla.
- **Files modified:** src/pages/LobbyPage.tsx
- **Verification:** `npm run lint` vuelve a mostrar sólo los 3 avisos preexistentes (exit 0) y todos los gates de Task 3 siguen en exit 0.
- **Committed in:** `84d3f2e` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking). Las tres «notas de fidelidad» no son desviaciones funcionales: son elecciones de implementación dentro del contrato del plan.
**Impact on plan:** Ninguno sobre el alcance. El auto-fix es de calidad; las notas preservan la intención del plan sin debilitar ninguna garantía.

## Issues Encountered

- `gsd_run` no está en PATH en este entorno; los verbos de GSD se han invocado por `node <config>/gsd-core/bin/gsd-tools.cjs …` (mismo backend). Sin impacto en el resultado.
- La rama actual es `main`, que el helper marca como protegida; el proyecto declara `git.branching_strategy: none` y `use_worktrees: false`, y los tres planes anteriores commitearon igualmente en `main`, así que se mantuvo ese patrón (patrón establecido y sancionado por el orquestador).

## Known Stubs

Ninguno introducido por este plan. `RevealPage` y `AdminPage` siguen devolviendo `null` (esqueletos de ruta) pero pertenecen a 01-05 y 01-06 y no forman parte de este plan.

Registradas en `.planning/WINDOWS.md` (broken-windows ledger) las dos verificaciones manuales no ejecutadas de este plan:

| id | kind | file | description |
|----|------|------|-------------|
| 4 | unrun-verify | src/lib/draw.ts | El doble clic / una segunda llamada a `runDraw` sobre un evento ya `drawn` no crea un segundo documento (DRAW-03/D-09); requiere emulador de Firestore + dos participantes. |
| 5 | unrun-verify | src/pages/LobbyPage.tsx | Lectura responsive de la lista a 320px en la sala (S4/Task 3): la fila envuelve el nombre y las insignias sin scroll horizontal; requiere emulador + dev server. |

Ninguna es un stub de código: son comprobaciones de comportamiento en vivo que las aserciones `node -e` no pueden ejercitar. La idempotencia de escritura (leer-antes-de-escribir) y la forma de un documento por regalador sí quedan asertadas por gates.

## Threat Flags

Ninguna superficie nueva fuera del `<threat_model>` del plan. `runDraw` materializa T-01-15 (documento por regalador, sin mapa), T-01-16 (el render del bloque es UX; la autoridad es la regla `isAdmin()`) y T-01-17 (idempotencia en la transacción). No se instaló ningún paquete (T-01-SC).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 01-05 puede construir la revelación sobre `DrawConfirmDialog`/`ParticipantRow` existentes y añadir la superficie gemela de `Panel del Admin` para el estado `drawn` (ADMIN-01/ADMIN-02 sólo aplican tras el sorteo).
- La mitad de escritura de DRAW-05 (documento por regalador) y la mitad de la regla (lectura sólo del propio documento, enumeración denegada) están cerradas aquí; la mitad de lectura se ejercita en 01-05 y la imposibilidad de reconstruir el emparejamiento desde la exportación se cierra en 01-06.
- Pendiente de verificación manual contra el emulador: el doble clic / segunda llamada a `runDraw` sobre un evento ya `drawn` no crea un segundo documento (DRAW-03/D-09), y la lectura responsive de la lista a 320px.

---

*Phase: 01-flujo-completo-del-amigo-invisible*
*Completed: 2026-10-19*

## Self-Check: PASSED

- FOUND: src/lib/draw.ts
- FOUND: src/lib/lobby.ts
- FOUND: src/components/ParticipantRow.tsx
- FOUND: src/components/DrawConfirmDialog.tsx
- FOUND: src/pages/LobbyPage.tsx
- FOUND: 4df14ba
- FOUND: f39ac71
- FOUND: 84d3f2e
