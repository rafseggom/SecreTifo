# SecretKit

## What This Is

SecretKit es una aplicación web para organizar un amigo invisible centrado en regalar camisetas de fútbol. Un grupo de amigos entra con su nombre, define sus preferencias (talla, equipos favoritos, equipos prohibidos) y, tras el sorteo, cada participante descubre a quién debe regalar y registra su pedido de camiseta. El organizador (Admin) nunca ve los emparejamientos, pero obtiene una lista unificada de pedidos para enviar al vendedor.

## Core Value

Cada participante conoce a quién regala (sorteo circular, sin autoasignación) y el Admin puede exportar todos los pedidos unificados sin revelar quién regala a quién.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Un usuario entra y se registra con su nombre; el primer usuario que crea el "Evento" se convierte en Admin y el resto se une al evento
- [ ] Formulario de preferencias al unirse: talla (Select S, M, L, XL, XXL, XXXL), equipos que le gustan/preferencias (texto) y equipos prohibidos (texto), con un botón/modal visible de "Guía de Tallas"
- [ ] Sala de espera (Lobby) que muestra la lista de usuarios registrados; si el usuario es Admin, ve el botón "Empezar Sorteo"
- [ ] Lógica de sorteo: asignación aleatoria circular del destinatario a cada participante, sin que nadie se toque a sí mismo
- [ ] Vista post-sorteo: "Te ha tocado regalar a [Nombre]" + preferencias del destinatario + formulario de pedido (Tipo Fan/Player/Retro, Equipo, Temporada/Año, Nombre a serigrafiar, Dorsal) con los precios de referencia visibles
- [ ] Vista de Admin (exportación): cuántos han rellenado su pedido + botón "Descargar Pedidos" que genera un .txt/.csv con camisetas, tallas, tipo (Fan/Player/Retro) y dorsales, SIN incluir quién regala a quién

### Out of Scope

- Autenticación con contraseña / OAuth — el evento es privado entre amigos y basta con el nombre para entrar
- Pagos o checkout dentro de la app — los pedidos se envían manualmente al vendedor
- Backend propio / API REST — Firebase Firestore actúa como backend
- Notificaciones push o email — fuera del alcance de una herramienta puntual entre amigos
- Múltiples eventos o salas simultáneas — un evento activo, un grupo

## Context

- Proyecto personal/entre amigos: pequeña escala, prioridad en simplicidad y que funcione de principio a fin.
- El punto crítico del flujo es preservar la sorpresa: el Admin administra el evento y exporta los pedidos, pero el modelo de datos y la exportación no deben permitirle reconstruir el emparejamiento.
- La "Guía de Tallas" y los "Precios de referencia" son datos estáticos que deben vivir en la app (tabla/modal) para que cualquiera consulte antes de elegir talla o tipo de camiseta.
- Datos de referencia a incorporar literalmente en la app (ver Constraints → Guía de Tallas y Precios).

## Constraints

- **Tech stack**: Frontend React con Vite; estilos con Tailwind CSS; base de datos/backend con Firebase Firestore; enrutamiento con React Router.
- **Config de Firebase**: inicialización usando variables de entorno `import.meta.env.VITE_FIREBASE_...` (sin claves hardcodeadas en el código).
- **Sorteo**: debe ser un ciclo circular (derangement en ciclo) — nadie se regala a sí mismo y todos regalan y son regalados exactamente una vez.
- **Privacidad del emparejamiento**: la exportación del Admin y cualquier vista de Admin NO deben exponer la relación regalador → destinatario.
- **Guía de Tallas (dato de referencia, mostrar en tabla/modal)**:
  - **Versión Fan**: S=P (Long 69-71cm | Altura 162-170cm | Peso 50-62kg), M=M (71-73 | 170-176 | 62-78), L=G (73-75 | 176-182 | 78-83), XL=GG (75-78 | 182-190 | 83-90), XXL=XG (78-81 | 190-195 | 90-97), XXXL=2XG (81-83 | 192-197 | 97-104).
  - **Versión Player**: S (Long 67-69 | Ancho 45-48 | Altura 165-172 | Peso 60-70), M (69-71 | 48-51 | 172-178 | 70-78), L (71-73 | 51-54 | 178-184 | 70-78), XL (73-75 | 54-57 | 184-190 | 78-86), 2XL (75-77 | 57-60 | 190-198 | 94-104).
- **Precios de referencia (mostrar en la pantalla de pedido)**: Camiseta Fan = 11$; Camiseta Player = 16$; Camiseta Retro = 15$.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Primer usuario en crear el evento = Admin | Evita gestión de roles/permisos; el organizador natural abre el evento | — Pending |
| Sorteo circular en vez de aleatorio puro | Garantiza un único ciclo: nadie se autoasigna y todos regalan/reciben exactamente una vez | — Pending |
| Firestore como backend sin servidor propio | Sincronización en tiempo real del lobby y pedidos con mínima infraestructura | — Pending |
| Entrada solo con nombre (sin contraseña) | Evento privado entre amigos; reduce fricción del flujo | — Pending |
| Guía de Tallas y precios como datos estáticos en la app | Son referencias fijas; no requieren backend y quedan siempre consultables | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-17 after initialization*
