---
gsd_state_version: "1.0"
current_phase: 1
current_phase_name: Flujo completo del amigo invisible
status: planning
stopped_at: Phase 1 context gathered
last_updated: "2026-10-17T15:05:51.667Z"
last_activity: 2026-10-17
last_activity_desc: Roadmap created (2 phases, 26/26 v1 requirements mapped, 0 orphans)
state_head: 7aeda7095b030f8fe6463c51608602d63752e09c
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-17)

**Core value:** Cada participante conoce a quién regala (sorteo circular, sin autoasignación) y el Admin puede exportar todos los pedidos unificados sin revelar quién regala a quién.
**Current focus:** Phase 1 — Flujo completo del amigo invisible

## Current Position

Phase: 1 of 2 (Flujo completo del amigo invisible)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-10-17 — Roadmap created (2 phases, 26/26 v1 requirements mapped, 0 orphans)

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

Last session: 2026-10-17T15:05:51.642Z
Stopped at: Phase 1 context gathered
Resume file: E:/Proyectos Github/SecreTifo/.planning/phases/01-flujo-completo-del-amigo-invisible/01-CONTEXT.md
