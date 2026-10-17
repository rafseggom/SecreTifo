# Phase 1: Flujo completo del amigo invisible - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Entregar el recorrido completo y funcional del amigo invisible sobre un modelo de datos privado: entrar con el nombre, declarar preferencias con la Guía de Tallas, ver el lobby, sortear de forma circular y privada, descubrir el destinatario, registrar el pedido y exportar los pedidos desde el Admin. Las reglas de Firestore se escriben en esta misma fase junto al esquema — no al final — porque cambiar el esquema después obliga a reescribir cada hook y cada regla.

Esta fase NO añade producto nuevo más allá de lo definido en ROADMAP.md. La verificación ejecutable de la privacidad (emulador + fixture) y el pulido móvil pertenecen a la Fase 2.

</domain>

<decisions>
## Implementation Decisions

### Identidad y Sesión
- **D-01:** Entrada solo con nombre; se ejecuta Firebase **Anonymous Auth** silenciosa al arrancar (`signInAnonymously()` una sola vez, sin pantalla). El `uid` anónimo es la clave de identidad y el nombre se guarda en el documento del participante. No es autenticación con contraseña ni OAuth, por lo que respeta el Out of Scope de PROJECT.md. — **Reversibility:** one-way — deshacerlo obliga a migrar todas las claves de documento (`participants/{uid}`, `assignments/{giverUid}`, `orders/{giverUid}`) y a reescribir las reglas.
- **D-02:** La unión al evento es una transacción de bootstrap-o-unión: el **primer** usuario se convierte en Admin (`events/main.adminUid` write-once); los demás se unen. El nombre se normaliza (trim + minúsculas) y, si ya existe, se **avisa y se pide otro** — nunca se auto-sufija ni se duplica identidad.
- **D-03:** La identidad (uid + nombre) se persiste en `localStorage` para sobrevivir a recargas. Si el usuario borra el almacenamiento, puede re-unirse en v1 (la recuperación avanzada MGMT-03 queda diferida a v2).
- **D-04:** Un único evento con ID de documento fijo (`events/main`). Un solo grupo/sala; el enlace de la app es el punto de entrada (sin multi-sala).

### Modelo de Datos y Reglas
- **D-05:** Firestore: `events/main` (`adminUid`, `status: 'lobby' | 'drawn'`, `createdAt`, `participantCount`) con subcolecciones `participants/{uid}` (`name`, `nameNormalized`, `size`, `likedTeams`, `forbiddenTeams`, `joinedAt`, `hasOrder`), `assignments/{giverUid}` (`recipientUid` **solo**), `orders/{giverUid}` (`type`, `team`, `season`, `printedName`, `number`, `size`, `opaqueId`, `submittedAt`). — **Reversibility:** one-way — es la forma de datos de la que dependen hooks, reglas y exportación.
- **D-06:** `firestore.rules` default-deny, escritas en esta fase junto al esquema. `assignments`: `allow get` si `request.auth.uid == giverUid`; `list` **denegado**. `participants`: lectura para usuarios autenticados; escritura propia (el primer usuario crea el evento en transacción). `orders`: lectura propia o del Admin; escritura propia. El Admin **no** puede leer `assignments`.
- **D-07:** El emparejamiento NUNCA se persiste como mapa/objeto único ni como campo en ningún documento que el lobby escuche. Vive exclusivamente en `assignments/{giverUid}`, una asignación por regalador.

### Sorteo
- **D-08:** Algoritmo: **Fisher–Yates + asignación con offset +1** sobre el array de participantes. Garantiza por construcción un **único ciclo**: cero puntos fijos (nadie se autorregala) y cero pares mutuos; no se usa rejection sampling. Se implementa como **función pura test-first** `buildDerangement(participantUids)`.
- **D-09:** Persistencia: `runTransaction` que lee `events/main.status`, **aborta si ya es `drawn`** (idempotente ante doble clic) y, si no, escribe las N asignaciones y cambia `status` a `drawn`. Nunca se persiste semilla ni permutación completa.
- **D-10:** Mínimo 3 participantes. "Empezar Sorteo" visible solo para el Admin, con confirmación que nombra el número de participantes. Tras el sorteo el roster queda **congelado** (no se permiten uniones con `status === 'drawn'`).

### Preferencias y Guía de Tallas
- **D-11:** Formulario de unión: talla **obligatoria** (Select S, M, L, XL, XXL, XXXL); equipos preferidos y equipos prohibidos **opcionales** (texto libre).
- **D-12:** `SizeGuideModal` accesible desde el formulario con las tablas **Fan** y **Player** con los datos literales del spec, más una nota explícita de que **Retro usa la tabla Fan**. Las anomalías de origen (Player llega a 2XL mientras el Select ofrece XXXL; rango de peso idéntico en Player M y L) se **renderizan literales y se señalizan**, nunca se corrigen silenciosamente.
- **D-13:** Datos estáticos en `domain/sizeGuide.ts` y `domain/prices.ts`, con un test que verifica que los valores son exactamente los del spec.

### Pedido
- **D-14:** Vista reveal: "Te ha tocado regalar a [Nombre]" + preferencias del destinatario (talla, equipos preferidos, equipos prohibidos).
- **D-15:** Formulario de pedido con: Tipo (Fan/Player/Retro), Equipo, Temporada/Año, Nombre a serigrafiar, Dorsal (**string**, para preservar ceros a la izquierda) y la talla **pre-cargada desde la preferencia** del destinatario.
- **D-16:** Compatibilidad talla/tipo: si el destinatario es XXXL y se elige Player (que no llega a XXXL), se muestra un **aviso no bloqueante** que orienta a Fan/Retro. Nunca bloquea el envío. (Decisión de producto recomendada por la investigación; se documenta y se implementa como aviso.)
- **D-17:** Precios de referencia visibles en la pantalla de pedido: **Fan 11$, Player 16$, Retro 15$** — estáticos, informativos.
- **D-18:** `submitOrder` idempotente con ID de documento determinista (= `giverUid`). El documento de pedido **no** contiene `recipientUid` ni ningún campo que revele el emparejamiento.

### Admin y Exportación
- **D-19:** La vista Admin monta `useOrdersAdmin` **solo** en la ruta `/admin`; muestra progreso (pedidos rellenados / total) y quiénes faltan.
- **D-20:** `buildOrdersExport(orders)` es una **función pura cuyo contrato no acepta** el emparejamiento (garantía estructural). Salida **CSV UTF-8 con BOM y separador `;`**; columnas: ID de pedido (**opaco**), Tipo, Equipo, Temporada, Nombre serigrafiado, Dorsal, Talla. **Sin** identidades de participantes, para impedir la inferencia talla+equipo → persona.
- **D-21:** Descarga client-side vía `Blob` + `URL.createObjectURL` + `download`; nombre de archivo con fecha.

### Rutas y Estado
- **D-22:** React Router 8 (paquete `react-router`). Rutas: `/` (entrada), `/preferences`, `/lobby`, `/reveal`, `/admin`. Redirección según estado (ya unido → lobby; `drawn` → reveal).
- **D-23:** Estado global con React Context (`SessionProvider`) + hooks sobre `onSnapshot`/`getDoc`. Sin Redux/Zustand/React Query. Cada ruta expone estados explícitos de carga, vacío y error.
- **D-24:** UI con Tailwind v4 vía `@tailwindcss/vite`, mobile-first (la Guía de Tallas debe leerse bien en móvil).

### Stack (fijado desde la investigación)
- **D-25:** Vite 8 + `@vitejs/plugin-react` 6 + React 19 + Tailwind v4 (`@tailwindcss/vite`) + `react-router` 8 + `firebase` 13; plantilla `react-ts` (TypeScript ~6.0.2); linter `oxlint`. Sin dependencias extra: sin `uuid` (`crypto.randomUUID()`), sin `file-saver`, sin `axios`, sin `papaparse` (el CSV se serializa a mano con BOM + quoting). Firebase se inicializa desde `import.meta.env.VITE_FIREBASE_*` (+ `.env.example`).

### the agent's Discretion
- Estructura exacta de carpetas y nombres de componentes/hooks (`SessionProvider`, `useMyAssignment`, `useOrdersAdmin`, `SizeGuideModal`, `JerseyOrderForm`…).
- Tokens y utilidades de Tailwind, paleta y microcopy (más allá de la copia literal "Te ha tocado regalar a [Nombre]").
- Estrategia de tests unitarios (runner/framework) además de los tests obligatorios de datos literales, sorteo y exportación.
- Forma exacta de la confirmación del sorteo, siempre que nombre el número de participantes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto y Alcance
- `.planning/PROJECT.md` — Visión, Core Value, constraints (stack, Guía de Tallas literal, precios) y Key Decisions.
- `.planning/REQUIREMENTS.md` — 26 requisitos v1 con REQ-IDs; de aquí salen los criterios de aceptación de la fase.
- `.planning/ROADMAP.md` — Límite y criterios de éxito de la Fase 1 (y sub-pasos de construcción de 7 pasos).
- `AGENTS.md` — Stack de referencia y reglas de workflow GSD (enforcement de entrada por comandos GSD).

### Investigación (decisiones de diseño)
- `.planning/research/SUMMARY.md` — Resumen ejecutivo y decisiones transversales D1–D5 (Anonymous Auth, `assignments/{giverUid}`, límite del dueño del proyecto, transacción de sorteo, export puro).
- `.planning/research/ARCHITECTURE.md` — Esquema Firestore concreto, boceto de reglas, algoritmo de derangement y transacción, estructura de proyecto, anti-patrones.
- `.planning/research/STACK.md` — Versiones verificadas (npm registry) y recetas canónicas (`vite.config`, Tailwind v4, `.env.local`, init de Firebase, descarga Blob, sorteo).
- `.planning/research/PITFALLS.md` — 16 pitfalls (9 críticos) con señales, prevención y mapeo a fase; obligatorio antes de escribir reglas/identidad/export.
- `.planning/research/FEATURES.md` — Table stakes vs anti-features y edge cases del dominio (n=3, sin preferencias, doble clic en sortear, unirse tras el sorteo).

### Datos literales del spec (fuente de verdad)
- `.planning/PROJECT.md` §Constraints — Tablas Fan y Player y precios de referencia que deben incorporarse literalmente.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Ninguno — el repositorio es greenfield (solo `LICENSE`). No hay `.planning/codebase/` ni código previo.

### Established Patterns
- Ninguno establecido aún. Las convenciones nacerán en esta fase; `AGENTS.md` deja la sección "Conventions" pendiente de poblar.

### Integration Points
- No hay sistema existente al que integrarse. El proyecto se scaffoldea desde cero con Vite (`react-ts`) y se conecta a Firebase + Firestore Emulator.

</code_context>

<specifics>
## Specific Ideas

- La copia literal de la vista reveal debe ser: **"Te ha tocado regalar a [Nombre]"**.
- El botón del primer participante debe leerse **"Empezar Sorteo"**.
- La Guía de Tallas debe mostrar la **Versión Fan** (con equivalencias S=P, M=M, L=G, XL=GG, XXL=XG, XXXL=2XG) y la **Versión Player**, tal cual el spec.
- Los precios deben aparecer como **11$ / 16$ / 15$** en la pantalla de pedido.
- La exportación debe ser un archivo descargable (`.csv`) listo para enviar al vendedor.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-evento / multi-grupo** (SCOPE-01) — un solo evento en v1.
- **Edición del pedido tras guardarlo** (SCOPE-02).
- **Cloud Function que ejecute el sorteo de forma verdaderamente ciega incluso para el dueño del proyecto** (SCOPE-03) — requiere plan de pago y contradice "sin backend".
- **Re-sorteo controlado** (MGMT-01), **reconexión de participante** (MGMT-02), **recuperación de identidad** (MGMT-03), **eliminación de participante** (MGMT-04).
- **Notificaciones** (NOTF-01/02).

</deferred>

---

*Phase: 1-Flujo completo del amigo invisible*
*Context gathered: 2026-10-17*
