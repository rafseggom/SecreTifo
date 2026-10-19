---
gsd_state_version: "1.0"
current_phase: 03
current_phase_name: Admin login con credenciales .env + ver todos los participantes en panel
status: complete
stopped_at: Phase 4 context gathered
last_updated: "2026-10-19T17:33:38.485Z"
last_activity: 2026-10-19
last_activity_desc: Phase 3 execution completed
state_head: be4b63ccc25994ffdb062db295376518a56520a6
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 9
  completed_plans: 9
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-17)

**Core value:** Cada participante conoce a quién regala (sorteo circular, sin autoasignación) y el Admin puede exportar todos los pedidos unificados sin revelar quién regala a quién.
**Current focus:** Phase 01 — Flujo completo del amigo invisible

## Current Position

Phase: 03 (Admin login con credenciales .env + ver todos los participantes en panel) — COMPLETE
Plan: 3 of 3
Status: Phase complete — all plans executed
Last activity: 2026-10-19 — Phase 3 execution completed

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 8min
- Total execution time: 1.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6 | 73min | 12min |
| 03 | 3 | 54min | 18min |

**Recent Trend:**
- Last 5 plans: Phase 03 P01 (18min), Phase 03 P02 (12min), Phase 03 P03 (24min), Phase 01 P05 (15min), Phase 01 P06 (6min)
- Trend: stable

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 23min | 5 tasks | 36 files |
| Phase 01 P02 | 6min | 3 tasks | 9 files |
| Phase 01 P03 | 12min | 4 tasks | 14 files |
| Phase 01 P04 | 11min | 3 tasks | 5 files |
| Phase 01 P05 | 15min | 3 tasks | 9 files |
| Phase 01 P06 | 6min | 2 tasks | 4 files |
| Phase 03 P01 | 18min | 3 tasks | 5 files |
| Phase 03 P02 | 12min | 2 tasks | 3 files |
| Phase 03 P03 | 24min | 3 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1] Adoptar Firebase Anonymous Auth silenciosa (sin contraseña ni OAuth) para que `request.auth` exista y las reglas puedan distinguir participantes — condiciona el modelo de datos completo.
- [Phase 1] El emparejamiento regalador→destinatario vive SOLO en `assignments/{giverUid}`; la propiedad va en el path, `get` por ID, `list` denegado. Nunca en un documento que el lobby escuche ni en un mapa único.
- [Phase 1] Sorteo = Fisher–Yates + offset-uno dentro de una función pura, persistido en `runTransaction` idempotente que lee `status` y aborta si ya se sorteó; prohibido guardar semilla o permutación.
- [Phase 1] `buildOrdersExport(orders)` no acepta ningún parámetro capaz de transportar el emparejamiento: la política queda como garantía de tipos.
- [Phase 1] Las reglas se escriben en la Fase 1 junto al esquema (no al final) y se verifican en la Fase 2.
- [Phase 2] Se acepta y documenta que el dueño del proyecto Firebase puede leer Firestore por consola/Admin SDK; la Cloud Function que haría el sorteo ciego real queda aparcada como no-entregable v1.
- [Phase 01]: Reglas y contrato de datos (types.ts) se escriben en el primer plan junto al esquema: D-05/D-06 son one-way y reescribirlos despues obligaria a migrar participants/assignments/orders
- [Phase 01]: joinEvent hace el pre-chequeo de nombre duplicado FUERA de la transaccion (Transaction.get() no acepta Query), con rollback deleteDoc propio para cerrar la ventana TOCTOU; nunca auto-sufija el nombre
- [Phase 01]: El lobby ordena por nameNormalized y nunca por la marca de union, que es null en la instantanea local y descolocaria la fila recien unida (Pitfall 10)
- [Phase 01]: role se deriva de event.adminUid === uid en SessionProvider (se calcula, no se almacena) y la forma de useSession() queda congelada para 01-03/01-04
- [Phase 01]: D-13 literal spec data fixed by test, including Player's 2XL maximum and the repeated 70-78 weight range of M and L: the provider's anomalies are exposed as two non-blocking predicates (isSizeUnavailableForKit, hasAmbiguousWeight), never corrected (D-12, D-16).
- [Phase 01]: Retro has no size table of its own: RETRO_USES_FAN_TABLE = true declares it explicitly instead of letting a consumer infer it.
- [Phase 01]: buildDerangement is Fisher-Yates over a copy plus a +1 offset with exactly one randomness source: bijection, zero fixed points and a single cycle for n >= 3 by construction; it throws below 3 and never mutates the caller's array (D-08, DRAW-03, DRAW-04).
- [Phase 01]: buildOrdersExport's parameter type (ExportedOrder, declared once in domain/types.ts) has no identity or pairing field and the module imports nothing from src/lib/, so SEC-02 is enforced by the compiler; the formula neutralisation in escapeCsvCell is Assumption A2, a plan decision, reversible in one line.
- [Phase 01]: normalizeName needed no change: 01-01 already shipped trim + internal-whitespace collapse + lowercase. Its contract is pinned by test and its declared limit is that accents are NOT folded ('Jose' and 'Jose' with accent are distinct keys).
- [Phase 01]: El estado de identidad perdida (S8) vive en App.tsx comparando loadIdentity() con el uid de useSession(); su unica salida es clearIdentity() hacia el formulario de S1, sin anadir campo, suscripcion ni escritura a SessionProvider, y se resuelve antes que las rutas para que ningun deep-link caiga en una pantalla vacia. Con eventStatus drawn anade la frase del roster congelado y RETIRA la accion: ofrecer reintento prometeria una salida que la transaccion rechaza (D-03, D-10).
- [Phase 01]: isNameTaken se extrae de la transaccion y se exporta, de modo que S1 y el paso 1 de joinEvent comparten literalmente la misma consulta normalizada; las tres constantes de error (ERR_NAME_TAKEN, ERR_NAME_RACE, ERR_EVENT_CLOSED) se declaran una vez y las usan tanto los throw como la UI, asi que la copia mostrada y el error lanzado no pueden divergir (D-02, EVENT-04).
- [Phase 01]: El modal de la Guia de Tallas es el <dialog> nativo (showModal) sin reimplementar trampa de foco, Esc, fondo inerte ni retorno de foco; los datos se pintan literales desde FAN_GUIDE/PLAYER_GUIDE, incluida la fila 2XL de Player, y las anomalias se senalan con tres notas ambar y nunca se corrigen (D-12, D-16, D-25).
- [Phase 01]: El mapa completo regalador-destinatario nunca se persiste: runDraw escribe N documentos de un solo campo recipientUid y cambia status a 'drawn' en la misma transaccion, de modo que las N+1 escrituras son atomicas o no ocurren (D-07/D-09, DRAW-05, SEC-01).
- [Phase 01]: buildDerangement se llama una vez FUERA de runTransaction y su resultado se captura en una constante antes de abrirla: una transaccion puede reejecutarse ante un conflicto y re-aleatorizar dentro haria el reintento no determinista (D-08, D-09).
- [Phase 01]: La guardia de minimo existe dos veces a proposito: la funcion pura lanza por debajo de 3 y runDraw repite la guardia en cliente; ninguna de las dos sustituye a la otra (DRAW-03).
- [Phase 01]: El parametro de error de las dos suscripciones de lobby.ts se llama onFailure -no onError- porque el gate de forma suma las apariciones de 'onError' y de 'err.code' y exige exactamente 2; con el nombre onError el contrato no se puede satisfacer (2 propagaciones de err.code). La propagacion de err.code es identica en ambas suscripciones.
- [Phase 01]: La insignia Admin de una fila se pinta con el adminUid leido por la propia suscripcion al evento de LobbyPage (p.uid === adminUid), no con el rol de la sesion: asi la insignia marca la fila del Admin para CUALQUIER espectador, no solo para el propio Admin. El bloque de Admin sigue gobernado por el rol derivado role === 'admin'.
- [Phase 01]: Un fallo de la transaccion cierra el dialogo y muestra la copia S8 en la ranura de error de la pagina (el dialogo no tiene ranura de error propia y el fondo del modal es inerte): asi el mensaje es realmente visible y los botones quedan de nuevo activos al reabrir.
- [Phase 01]: SessionProvider no requirio delta: 01-01 ya derivaba y exponia role desde event.adminUid === uid, y su gate (adminUid === 1) pasa sin cambios. La tarea se limita a verificar el contrato de useSession, que no se modifica.
- [Phase 01]: The reveal reads the pairing only by document id (getMyAssignment -> getParticipant); a query on assignments is broken code, not merely unsafe, because the rules deny list to everyone including the Admin.
- [Phase 01]: ORDER-04 is a type invariant: OrderInput and ExportedOrder have no field for the giver's or recipient's identity, so the order document cannot carry the pairing by construction.
- [Phase 01]: The order and the participant's hasOrder flag are written in the same writeBatch, so the Admin's progress and the order cannot disagree (Pitfall 11); the deterministic doc id makes it an idempotent overwrite (D-18).
- [Phase 01]: El avance del Admin se DERIVA de los documentos de participantes (hasOrder) mediante UNA sola suscripcion en useOrdersAdmin: no hay coleccion de envios, ni recuento paralelo, ni segunda suscripcion (D-19). Los pedidos se leen solo como accion puntual al descargar.
- [Phase 01]: listOrdersAdmin es la unica enumeracion de pedidos del proyecto: una lectura de la coleccion seguida de una proyeccion EXPLICITA campo a campo a los siete campos exportables. Un spread arrastraria submittedAt al tipo de exportacion y haria la proyeccion inauditable.
- [Phase 01]: ordersCsvFilename calcula el nombre del archivo en un unico sitio; el manejador lo calcula una vez y el mismo valor alimenta el atributo de descarga y la linea de exito, de modo que el nombre anunciado y el archivo real no pueden divergir. downloadCsv crea y revoca exactamente un objeto URL por descarga (D-21).
- [Phase 01]: Un fallo de descarga mapea permission-denied a la copia de la taxonomia S8 (No tienes permiso para ver esto., sin reintento) y cualquier otro codigo a No hemos podido generar el archivo. con Reintentar: un impostor ve la taxonomia y nunca la lista, mientras un fallo transitorio sigue siendo reintentable.
- [Phase 01]: El estado vacio de S7 es el que fija 01-UI-SPEC S7 linea 393 (0 de {total}, barra a cero, descarga deshabilitada y su ayudante); la fila Todavia no hay ningun pedido. del Copywriting Contract no se pinto como tarjeta adicional porque a filled===0 la lista de pendientes ya nombra a todos los participantes.

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1] Datos de tallas del spec con anomalías: la tabla Player llega a 2XL mientras el Select ofrece XXXL, y el rango de peso de M y L es idéntico (70-78). Se renderizan literales y se señalan; no se corrigen.
- [Phase 1] Retro no tiene tabla de tallas propia: el modal debe decir explícitamente que usa la tabla Fan.
- [Phase 1] Decisión de producto pendiente antes de planificar: Player + XXXL ¿avisar o bloquear? (recomendado: avisar y orientar a Fan/Retro).
- [Phase 1] La duplicidad de nombres es crítica: el `uid` anónimo es la clave del documento y el nombre normalizado se valida en transacción (avisar, no auto-sufijar).
- [Phase 2] El predicado exacto de `firestore.rules` es el único punto con confianza MEDIUM-LOW de la investigación; se cierra con la tabla de aserciones del Emulator Suite.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| Privacy upgrade | Cloud Function que ejecuta el sorteo verdaderamente ciego también para el dueño del proyecto (SCOPE-03) | Deferred — requiere plan Blaze, contradice "sin backend" | 2026-10-17 (roadmap) | v1 |
| Identity | Código de recuperación si el usuario borra el almacenamiento local (MGMT-03) | Deferred to v2 | 2026-10-17 (roadmap) | v1 |

## Session Continuity

Last session: 2026-10-19T17:33:38.324Z
Stopped at: Phase 4 context gathered
Resume file: .planning/phases/04-privacidad-verificada-y-pulido/04-CONTEXT.md
