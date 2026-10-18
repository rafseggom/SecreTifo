# Requirements: SecretKit

**Defined:** 2026-10-17
**Core Value:** Cada participante conoce a quién regala (sorteo circular, sin autoasignación) y el Admin puede exportar todos los pedidos unificados sin revelar quién regala a quién.

## v1 Requirements

Requirements for the initial release. Each maps to a roadmap phase.

### Identidad y Evento (EVENT)

- [x] **EVENT-01**: El usuario entra indicando solo su nombre (sin contraseña) y su identidad persiste entre recargas del navegador
- [x] **EVENT-02**: El primer usuario que crea el Evento se convierte en Admin; los usuarios siguientes se unen al mismo evento
- [x] **EVENT-03**: La app usa Firebase Anonymous Auth de forma silenciosa (sin pantalla de login) para que las reglas de Firestore puedan identificar a cada participante
- [ ] **EVENT-04**: El sistema evita nombres de participante duplicados o ambiguos dentro del evento (normaliza y avisa/rechaza duplicados)

### Preferencias y Guía de Tallas (PREF)

- [ ] **PREF-01**: Al unirse, el usuario selecciona su talla en un Select (S, M, L, XL, XXL, XXXL)
- [ ] **PREF-02**: El usuario puede indicar los equipos que le gustan o sus preferencias en un campo de texto
- [ ] **PREF-03**: El usuario puede indicar equipos prohibidos en un campo de texto
- [ ] **PREF-04**: Un botón/modal visible "Guía de Tallas" muestra las tablas Fan y Player con los datos literales del spec
- [ ] **PREF-05**: Las preferencias del usuario se guardan por participante y son legibles por quien le regala tras el sorteo

### Lobby y Sorteo (DRAW)

- [ ] **DRAW-01**: El lobby muestra la lista de participantes registrados (sincronizada)
- [ ] **DRAW-02**: Solo el Admin ve el botón "Empezar Sorteo"
- [ ] **DRAW-03**: El sorteo exige al menos 3 participantes y solo puede ejecutarse una vez (idempotente ante doble clic)
- [ ] **DRAW-04**: El sorteo asigna a cada participante un destinatario formando un único ciclo circular: nadie se regala a sí mismo y cada persona regala y recibe exactamente una vez
- [ ] **DRAW-05**: La asignación (quién regala a quién) se persiste de modo que solo el propio regalador puede leerla

### Pedido (ORDER)

- [ ] **ORDER-01**: Tras el sorteo, el usuario ve "Te ha tocado regalar a [Nombre]" junto con las preferencias del destinatario
- [ ] **ORDER-02**: El usuario registra su pedido con Tipo (Fan/Player/Retro), Equipo, Temporada/Año, Nombre a serigrafiar y Dorsal
- [ ] **ORDER-03**: La pantalla de pedido muestra los precios de referencia: Camiseta Fan 11$, Player 16$, Retro 15$
- [ ] **ORDER-04**: El pedido guardado no contiene ningún campo que revele el emparejamiento regalador→destinatario
- [ ] **ORDER-05**: El usuario ve el estado de su propio pedido (pendiente / guardado)

### Admin y Exportación (ADMIN)

- [ ] **ADMIN-01**: El Admin ve cuántos participantes han rellenado su pedido y quiénes faltan
- [ ] **ADMIN-02**: El Admin descarga un archivo .csv (UTF-8 con BOM, separador `;`) con camisetas, tallas, tipo (Fan/Player/Retro) y dorsales, sin incluir quién regala a quién
- [ ] **ADMIN-03**: El Admin no puede leer la colección de asignaciones secretas (verificado por reglas)

### Privacidad y Verificación (SEC)

- [ ] **SEC-01**: El mapa completo regalador→destinatario nunca se persiste en un único documento
- [x] **SEC-02**: La exportación se construye con una función pura cuyo contrato no puede recibir el emparejamiento (garantía estructural)
- [ ] **SEC-03**: Las reglas de Firestore deniegan `list` sobre las asignaciones y permiten `get` solo al propio regalador (probado contra el emulador)
- [ ] **SEC-04**: La exportación usa un identificador de pedido opaco y no incluye la identidad de los participantes, de modo que no se pueda inferir el emparejamiento cruzando talla+equipo con las preferencias públicas

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Notificaciones y Coordinación

- **NOTF-01**: Recordatorio a quien no ha rellenado su pedido
- **NOTF-02**: Aviso al completar todos los pedidos

### Gestión de Evento

- **MGMT-01**: Re-sorteo controlado (con confirmación) antes de que existan pedidos
- **MGMT-02**: Reconexión de un participante tras salir del evento sin perder su asignación
- **MGMT-03**: Recuperación de identidad si el usuario borra el almacenamiento local (código de recuperación)
- **MGMT-04**: Eliminación de un participante antes del sorteo

### Alcance

- **SCOPE-01**: Soporte de varios eventos/grupos simultáneos
- **SCOPE-02**: Edición del pedido una vez guardado
- **SCOPE-03**: Cloud Function que ejecute el sorteo de forma verdaderamente ciega incluso para el dueño del proyecto

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Login con contraseña u OAuth | El evento es privado entre amigos; basta el nombre (la Anonymous Auth es invisible y no es "login con contraseña/OAuth") |
| Pagos o checkout en la app | Los pedidos se envían manualmente al vendedor; no hay transacción que procesar |
| Backend propio / API REST | Firebase Firestore es el backend; añadir un servidor contradice el objetivo de simplicidad |
| Notificaciones push o email | Herramienta puntual entre amigos; fuera de alcance para v1 |
| Múltiples eventos o salas simultáneas | Un evento activo, un grupo |
| Cloud Function para el sorteo ciego real | Requiere cuenta de facturación y contradice "sin backend"; documentado como ruta de mejora futura, no como entregable v1 |
| Corregir los datos de tallas del spec (Player 2XL vs XXXL, rango de peso M=L) | El spec pide incorporar los datos literalmente; se muestran tal cual y se señalan como anomalías a confirmar con el vendedor |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EVENT-01 | Phase 1 | Complete |
| EVENT-02 | Phase 1 | Complete |
| EVENT-03 | Phase 1 | Complete |
| EVENT-04 | Phase 1 | Pending |
| PREF-01 | Phase 1 | Pending |
| PREF-02 | Phase 1 | Pending |
| PREF-03 | Phase 1 | Pending |
| PREF-04 | Phase 1 | Pending |
| PREF-05 | Phase 1 | Pending |
| DRAW-01 | Phase 1 | Pending |
| DRAW-02 | Phase 1 | Pending |
| DRAW-03 | Phase 1 | Pending |
| DRAW-04 | Phase 1 | Pending |
| DRAW-05 | Phase 1 | Pending |
| ORDER-01 | Phase 1 | Pending |
| ORDER-02 | Phase 1 | Pending |
| ORDER-03 | Phase 1 | Pending |
| ORDER-04 | Phase 1 | Pending |
| ORDER-05 | Phase 1 | Pending |
| ADMIN-01 | Phase 1 | Pending |
| ADMIN-02 | Phase 1 | Pending |
| ADMIN-03 | Phase 2 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 2 | Pending |
| SEC-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26 ✓
- Unmapped: 0 ✓

**By phase:**
- Phase 1: 23 requirements (EVENT ×4, PREF ×5, DRAW ×5, ORDER ×5, ADMIN-01..02, SEC-01..02)
- Phase 2: 3 requirements (ADMIN-03, SEC-03, SEC-04 — las garantías de privacidad cuya entrega *es* su verificación ejecutable)

---
*Requirements defined: 2026-10-17*
*Last updated: 2026-10-17 after roadmap creation (26/26 requirements mapped)*
