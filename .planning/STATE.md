---
gsd_state_version: "1.0"
current_phase: 01
current_phase_name: Flujo completo del amigo invisible
status: executing
stopped_at: Completed 01-02-PLAN.md
last_updated: "2026-10-18T13:31:41.561Z"
last_activity: 2026-10-18
last_activity_desc: Phase 01 execution started
state_head: 65c289d599874f92749982b008f6cf2dc3688cd0
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 6
  completed_plans: 1
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-17)

**Core value:** Cada participante conoce a quién regala (sorteo circular, sin autoasignación) y el Admin puede exportar todos los pedidos unificados sin revelar quién regala a quién.
**Current focus:** Phase 01 — Flujo completo del amigo invisible

## Current Position

Phase: 01 (Flujo completo del amigo invisible) — EXECUTING
Plan: 3 of 6
Status: Ready to execute
Last activity: 2026-10-18 — Phase 01 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 23min | 5 tasks | 36 files |
| Phase 01 P02 | 6min | 3 tasks | 9 files |

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

Last session: 2026-10-18T13:31:41.518Z
Stopped at: Completed 01-02-PLAN.md
Resume file: None
