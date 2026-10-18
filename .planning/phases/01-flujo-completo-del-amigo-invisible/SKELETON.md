# Walking Skeleton — SecretKit

**Phase:** 1 — Flujo completo del amigo invisible
**Generated:** 2026-10-17

> Phase 1 of a new project under MVP mode: the Walking Skeleton is the Phase-1 special case of the
> tracer bullet — a whole-application tracer slice. It records the architectural decisions that
> Phase 2 and every later slice build on. Treat it as a contract, not a scratchpad.

## Capability Proven End-to-End

Un amigo abre la app, escribe solo su nombre, elige su talla y se une al evento; la sala de espera
muestra la lista de participantes actualizándose sola en tiempo real desde Firestore, con el primer
usuario marcado como Admin. Ese recorrido ejerce **toda** la pila: build de Vite 8 + Tailwind v4,
React Router 8, Firebase Anonymous Auth silenciosa, una escritura transaccional en Firestore,
las Security Rules default-deny contra el Emulator Suite, una lectura `onSnapshot` en vivo y la
persistencia de identidad en `localStorage` que sobrevive a una recarga.

El resto del recorrido (sorteo circular, revelado, pedido, exportación ciega) son **expansiones del
mismo esqueleto**: no añaden ninguna capa nueva, solo más superficie sobre las capas ya probadas aquí.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | React 19.3.1 + Vite 8.3.4 (`react-ts`, TypeScript ~6.0.2) | Fijado por D-25 y verificado contra el registro npm en `01-RESEARCH.md` §Standard Stack. Vite 8 (Rolldown) + `@vitejs/plugin-react` 6 (Oxc) es la pareja que el propio plugin fija (`peer vite: ^8.0.0`). |
| Styling | Tailwind **v4** vía `@tailwindcss/vite` + `@import "tailwindcss";` en `src/index.css` | CSS-first: **sin** `tailwind.config.js`, **sin** `postcss.config.js`, **sin** array `content`. Los tokens viven en un bloque `@theme { }`. Un archivo de config v3-style es un defecto. |
| Routing | `react-router@8.4.0` en modo declarativo (`BrowserRouter`) | D-22. **`react-router-dom` no existe en v8** (congelado en 7.18.4) — es el fallo nº1 de esta build. Los datos llegan por `onSnapshot` (push), así que los `loader` del data mode no aportan nada. |
| Data layer | Firebase Firestore 13.0.0 — documento raíz único `events/main` con subcolecciones `participants/{uid}`, `assignments/{giverUid}`, `orders/{giverUid}` | D-04/D-05. Un solo evento, un solo grupo, ID literal fijo. El emparejamiento vive SOLO en `assignments/{giverUid}` (D-07/SEC-01): nunca un documento agregado, porque las reglas son document-granular y no pueden dejar leer una clave de un mapa. |
| Auth | Firebase **Anonymous Auth** silenciosa (`signInAnonymously()`, una sola vez) | D-01/EVENT-03. El `uid` debe ser emitido por el servidor y no falsificable: un id generado en el cliente no puede respaldar una regla. No es contraseña ni OAuth, así que no viola el Out of Scope de PROJECT.md. |
| Access control | `firestore.rules` default-deny, escrito **junto** al esquema (repo root) | D-06. Es el **único** punto de aplicación de la privacidad. `assignments`: `get` propio, `list: false` (también para el Admin); `events` con `adminUid` write-once; `orders` propio-o-Admin y **prohibido** `recipientUid`. |
| Emulator | `demo-secretkit` + `firebase.json` (firestore/auth) + `npx firebase firebase-tools` como devDependency | `01-RESEARCH.md` §Environment Availability: el CLI **no** está en PATH y hay Java 21.0.5 (requisito del emulador). Un `demo-` id es solo-emulador: no hace falta proyecto real, ni facturación, ni credenciales para construir y probar la Fase 1. |
| Persistence | `localStorage` para `{uid, name}`; caché en memoria por defecto de Firestore (**sin** persistencia offline) | D-03. `sessionStorage` muere al cerrar la pestaña (viola EVENT-01); IndexedDB añade coordinación multi-pestaña para un evento en vivo siempre conectado. |
| Directory layout | `src/domain` (puro, sin I/O) · `src/lib` (única capa que importa `firebase/*`) · `src/session` · `src/hooks` · `src/components` · `src/pages` | `01-RESEARCH.md:302-345`, prescriptivo. Dos reglas estructurales son la garantía auditable de la privacidad: **solo `src/lib/` importa `firebase/*`** (se auditan juntos reglas y call-sites), y **`src/domain/` no importa nada de `src/lib/`** (la garantía de tipo de SEC-02). |
| Tests | Vitest 5.0.5, `environment: 'node'`, `globals: false`, config dentro de `vite.config.ts` | Todos los tests obligatorios de la fase son funciones puras. Un `vitest.config.ts` separado **reemplaza** (no fusiona) `vite.config.ts`, perdiendo los plugins. |
| Deployment | **No** en Fase 1. Comando local de pila completa: `npx firebase emulators:start` + `npm run dev` | `01-RESEARCH.md` §Environment Availability: ningún proyecto Firebase real hace falta para construir/probar la Fase 1. `firebase.json` incluye ya el rewrite catch-all de hosting (deep-links sobreviven a la recarga; la verificación es de Fase 2). |

## Stack Touched in Phase 1

- [x] **Project scaffold** — `npm create vite@latest . -- --template react-ts`, `vite.config.ts` con los plugins `react()` + `tailwindcss()` y el bloque `test`, `oxlint` como linter, `tsc -b` como única puerta de tipos.
- [x] **Routing** — cinco rutas reales (`/`, `/preferences`, `/lobby`, `/reveal`, `/admin`) + redirect-por-estado (D-22) y un catch-all.
- [x] **Database** — lecturas y escrituras reales: `set`/`update` dentro de `runTransaction` (bootstrap-o-unión), `set` en lote (`writeBatch`) para el pedido, `onSnapshot` sobre `participants`, `getDoc` por ID sobre `assignments`, `getDocs` sobre `orders` (solo Admin) y `getDocs` con `where`+`limit` para el pre-chequeo de nombres.
- [x] **UI** — al menos un elemento interactivo conectado a la API en cada una de las cinco rutas: `Entrar`, `Unirme al evento`, `Empezar Sorteo`, `Guardar pedido`, `Descargar Pedidos`.
- [x] **Full-stack local run command** — `npx firebase emulators:start` (Firestore + Auth contra `demo-secretkit`) junto a `npm run dev`. Sin despliegue: la Fase 2 posee la verificación del hosting.

## Out of Scope (Deferred to Later Slices)

- **Verificación ejecutable de las reglas** contra el Emulator Suite con `@firebase/rules-unit-testing` (SEC-03) — dependencia y suite de **Fase 2**.
- **Test de fixture de la exportación** (cabecera exacta, ceros a la izquierda, acentos, comas, comillas, round-trip del BOM) más allá de los tests unitarios de función pura escritos en Fase 1 (SEC-04) — Fase 2.
- **Estados de carga/vacío/error de todas las rutas, pulido responsive móvil y el README del contrato de confianza** — Fase 2.
- **Despliegue real a Firebase Hosting** y proyecto Firebase de producción — no requerido en Fase 1.
- `@testing-library/react`, `jsdom`, tests de componente — discreción, no obligatorio en Fase 1.
- Multi-evento (SCOPE-01), edición del pedido (SCOPE-02), Cloud Function del sorteo ciego (SCOPE-03), re-sorteo (MGMT-01), reconexión (MGMT-02), recuperación de identidad (MGMT-03), borrado de participante (MGMT-04), notificaciones (NOTF-01/02).
- Corregir las anomalías de las tablas de tallas del spec — se muestran literales y señalizadas (D-12).

## Subsequent Slice Plan

Cada fase posterior añade una rebanada vertical sobre este esqueleto **sin alterar sus decisiones arquitectónicas**:

- **Phase 2: Privacidad verificada y pulido** — convierte la promesa en evidencia ejecutable: la suite de reglas contra el emulador (SEC-03, `getDocs(assignments)` denegado para todos, `getDoc` propio permitido, ajeno denegado), el test de fixture de la exportación (SEC-04), los estados explícitos de carga/vacío/error en todas las rutas, el responsive móvil de la Guía de Tallas y el README con el contrato de confianza.
- **Futuras rebanadas** (fuera del milestone actual, documentadas para no re-litigar el minimalismo de la Fase 1): multi-evento por `events/{eventId}`, edición del pedido, recuperación de identidad por código, re-sorteo controlado, y — la única que cambia la postura de confianza — una Cloud Function que ejecute el sorteo de forma verdaderamente ciega también para el dueño del proyecto (requiere plan Blaze; hoy no-entregable).
