# Roadmap: SecretKit

## Overview

SecretKit recorre el amigo invisible completo de una sola tirada: un amigo abre el enlace y entra solo con su nombre, el primero forma el evento como Admin, el grupo declara talla y preferencias mientras consulta la Guía de Tallas, la sala de espera se sincroniza en tiempo real, el Admin lanza un sorteo circular de una sola pasada, cada participante descubre a quién regala y registra su pedido con los precios de referencia, y el Admin descarga un archivo unificado sin saber nunca quién regala a quién.

Las dos fases se separan por una línea de responsabilidad, no por funcionalidad. La **Fase 1** construye el recorrido entero con el modelo de datos privado correcto y las reglas de Firestore escritas junto al esquema — no al final — porque cambiar el esquema después obliga a reescribir cada hook y cada regla. La **Fase 2** no añade producto nuevo: demuestra con tests ejecutables contra el Emulator Suite que la privacidad prometida es real y no retórica, verifica el artefacto de exportación por fixture, y pule los estados de interfaz que harían fracasar el uso real desde un móvil.

El límite honesto: un cliente sin servidor propio nunca podrá ocultar el emparejamiento al dueño del proyecto de Firebase, que puede abrir la consola o el Admin SDK (ambos saltan las reglas por diseño). La postura adoptada es (a) hacer imposible la exposición *accidental* — UI, exportación o enumeración por un participante —, (b) no persistir jamás el mapa completo en un único documento para acotar el daño, y (c) declarar el contrato de confianza en voz alta. La solución de verdad —una Cloud Function que posea el sorteo— requiere plan de pago y contradice el "sin backend propio" de PROJECT.md, así que queda documentada como vía futura y nunca como entregable v1.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Flujo completo del amigo invisible** - Fundamentos, identidad, preferencias con Guía de Tallas, lobby, sorteo circular, pedido y exportación ciega sobre un modelo de datos privado desde el primer commit
- [ ] **Phase 2: Privacidad verificada y pulido** - Reglas de Firestore probadas contra el emulador, exportación verificada por fixture, estados de carga/vacío/error, responsive móvil y contrato de confianza

## Phase Details

### Phase 1: Flujo completo del amigo invisible

**Goal**: Entregar el recorrido completo y funcionando — entrar con el nombre, declarar preferencias con la Guía de Tallas, ver el lobby sincronizado, sortear de forma circular y privada, descubrir el destinatario, registrar el pedido y exportar los pedidos desde el Admin — con el modelo de datos privado y las reglas de Firestore escritas desde el primer commit, no al final.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: EVENT-01, EVENT-02, EVENT-03, EVENT-04, PREF-01, PREF-02, PREF-03, PREF-04, PREF-05, DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, ORDER-01, ORDER-02, ORDER-03, ORDER-04, ORDER-05, ADMIN-01, ADMIN-02, SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. Un participante abre el enlace, escribe su nombre y, tras recargar el navegador, sigue siendo la misma persona; si intenta un nombre ya usado dentro del evento, recibe un aviso accionable en lugar de duplicar la identidad.
  2. El primer usuario que entra aparece como Admin y es el único que ve "Empezar Sorteo"; el resto ve la lista de participantes del lobby actualizándose sola, sin ese botón.
  3. Al unirse, cada participante elige su talla (S, M, L, XL, XXL, XXXL), declara equipos preferidos y equipos prohibidos en texto, y abre el botón/modal "Guía de Tallas" para ver las tablas Fan y Player con los datos literales del spec (incluida la nota de que Retro usa la tabla Fan).
  4. Tras el sorteo, cada participante ve "Te ha tocado regalar a [Nombre]" junto a las preferencias de esa persona y registra su pedido (Tipo Fan/Player/Retro, Equipo, Temporada/Año, Nombre a serigrafiar, Dorsal) viendo los precios de referencia (Fan 11$, Player 16$, Retro 15$); nadie se regala a sí mismo y nadie ve un emparejamiento que no sea el suyo.
  5. El Admin ve cuántos participantes han rellenado su pedido y cuántos faltan, y descarga un .csv UTF-8 con BOM y separador `;` con camisetas, tallas, tipo (Fan/Player/Retro) y dorsales, sin ninguna columna ni campo que revele quién regala a quién.

**Plans**: 6 plans

Plans:
**Wave 1**
- [ ] 01-01-PLAN.md — Walking skeleton: stack completo, contrato de datos y reglas, identidad anónima y el primer ciclo real nombre → unión → sala de espera en vivo

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 01-02-PLAN.md — Dominio puro test-first: normalizador, sorteo circular, datos literales de tallas y precios, y la exportación sin campo de emparejamiento

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 01-03-PLAN.md — Preferencias y Guía de Tallas: primitivas de componente, modal con las tablas literales y las dos pantallas de entrada y unión

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 01-04-PLAN.md — Sala de espera completa y sorteo transaccional idempotente con un documento por regalador

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 01-05-PLAN.md — Revelación con las preferencias del destinatario y formulario de pedido idempotente con precios de referencia

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 01-06-PLAN.md — Panel del Admin: progreso derivado, pendientes y descarga del CSV sin quién regala a quién

**UI hint**: yes

**Sub-steps (el orden de construcción de 7 pasos de la investigación, comprimido dentro de esta única fase):**
  1. **Fundamentos** — Vite + React + Tailwind v4 vía `@tailwindcss/vite` + React Router 8 (`react-router`, no `react-router-dom`); `firebase.ts` inicializado desde `import.meta.env.VITE_FIREBASE_*` (+ `.env.example`); cableado del emulador; `domain/types.ts`, `domain/sizeGuide.ts` y `domain/prices.ts` con sus datos estáticos y su test.
  2. **Modelo de datos y reglas** — `events/main` (ID literal fijo, sin mapa/semilla/permutación) con subcolecciones `participants/{uid}`, `assignments/{giverUid}`, `orders/{giverUid}`; `firestore.rules` default-deny con `assignments` solo `get` (nunca `list`) y `adminUid` write-once.
  3. **Identidad** — Firebase Anonymous Auth silenciosa en `SessionProvider`; `joinEvent` como transacción de bootstrap-o-unión (primer usuario = Admin, unicidad de nombre normalizado); página de entrada solo con el nombre.
  4. **Preferencias** — formulario de unión con talla obligatoria, equipos preferidos/prohibidos opcionales y `SizeGuideModal` con las tablas literales (Fan y Player) más la aclaración de Retro.
  5. **Lobby y sorteo** — lista sincronizada vía `onSnapshot`; "Empezar Sorteo" solo para el Admin con confirmación que nombra el número de participantes; `buildDerangement` escrito test-first como función pura + `runDraw` transaccional idempotente con roster congelado y guardia n ≥ 3.
  6. **Pedido** — `useMyAssignment` con `get` por ID (nunca consulta de colección); vista "Te ha tocado regalar a…" con las preferencias del destinatario; `JerseyOrderForm` con precios de referencia visibles, talla pre-cargada del destinatario y aviso de incompatibilidad talla/tipo; `submitOrder` idempotente por ID determinista.
  7. **Admin y exportación** — `useOrdersAdmin` montado solo en la ruta de Admin; contador de progreso; `buildOrdersExport(orders)` escrito test-first, cuyo contrato no admite ningún parámetro capaz de transportar el emparejamiento; `exportOrders` + `download` (Blob, BOM, `;`, ID de pedido opaco).

### Phase 2: Privacidad verificada y pulido

**Goal**: Convertir la promesa central del producto en evidencia ejecutable — demostrar contra el Emulator Suite que las reglas hacen ilegible el emparejamiento incluso para el Admin, verificar por fixture que el artefacto de exportación no permite reconstruirlo, y pulir los estados y la ergonomía móvil que el uso real exige.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: ADMIN-03, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. La suite de reglas contra el Emulator Suite demuestra que `getDocs(assignments)` falla con `permission-denied` tanto siendo Admin como siendo participante, que `getDoc` de la propia asignación se permite y la ajena se deniega, y que el Admin no puede leer las asignaciones secretas.
  2. El test de fixture de la exportación verifica la cabecera exacta, que ninguna celda coincide con el nombre de un participante, dorsales con ceros a la izquierda (`09`, `100`), acentos, comas y comillas, y el round-trip UTF-8 con BOM — es decir, que el identificador de pedido es opaco y no se puede inferir el emparejamiento cruzando talla+equipo con las preferencias públicas.
  3. Ninguna ruta muestra una pantalla vacía antes de la primera respuesta del servidor: todas exponen estados explícitos de carga, vacío y error, incluidos `permission-denied`, sin conexión y cuota agotada.
  4. La "Guía de Tallas" es usable en móvil (tarjeta por talla por debajo de `sm`, diálogo desplazable con altura acotada) y cualquier deep-link (`/lobby`, `/reveal`, `/admin`) sobrevive a una recarga gracias al rewrite catch-all del hosting.
  5. El README declara el contrato de confianza: qué privacidad está garantizada entre participantes, que el emparejamiento nunca se persiste como un único documento, y que el dueño del proyecto Firebase sí puede leer Firestore por consola — límite aceptado conscientemente, no descuido.

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Flujo completo del amigo invisible | 0/6 | Planned | - |
| 2. Privacidad verificada y pulido | 0/TBD | Not started | - |
