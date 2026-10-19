# Phase 3: Admin login con credenciales .env + ver todos los participantes en panel - Context

**Gathered:** 2026-10-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Añadir autenticación explícita para el Admin mediante credenciales en `.env` (reemplazando el modelo "primer usuario = admin") y extender el panel de Admin para mostrar TODOS los participantes en una tabla con estado de pedido y acciones. El Admin es una persona distinta de los participantes; puede participar en una sesión separada si lo desea.

Esta fase NO modifica el flujo de participantes ni el sorteo. Solo afecta: creación del evento, acceso al panel Admin y vista del panel.
</domain>

<decisions>
## Implementation Decisions

### Autenticación Admin
- **D-01:** Admin se autentica con **clave secreta en `.env`** (`VITE_ADMIN_SECRET`). Es un string simple comparado en frontend. **No usa Firebase Auth** para el Admin — el secret es gate de UI únicamente.
- **D-02:** Flujo de setup en dos pasos:
  1. **`/admin/setup`** (protegido por secret): Admin entra, `signInAnonymously()` → obtiene `uid` → crea `events/main` con `adminUid = uid` **SIN crear documento en `participants`**. Evento queda en `status: 'lobby'`.
  2. **`/admin/login`** (protegido por secret): Admin entra secret → redirige a `/admin`. La sesión anónima del paso 1 persiste (localStorage), así `request.auth.uid === adminUid` en Firestore rules.
- **D-03:** Admin **NO es participante** al crear el evento. Si quiere participar, abre pestaña/incógnito y se une normal (`/` → nombre → preferencias). Dos identidades separadas, dos `uid` anónimos distintos.
- **D-04:** `VITE_ADMIN_SECRET` en `.env` (y `.env.example` con placeholder). Validación simple: `import.meta.env.VITE_ADMIN_SECRET === inputSecret`.

### Modelo de Datos y Reglas (sin cambios)
- **D-05:** `firestore.rules` **inalteradas**. `isAdmin()` sigue siendo `request.auth.uid == get(/events/main).data.adminUid`. El Admin accede a `orders` (list) porque su `uid` anónimo coincide con `adminUid` creado en `/admin/setup`.
- **D-06:** `events/main` se crea en `/admin/setup` (no en `joinEvent`). Campos: `adminUid` (uid anónimo del admin), `status: 'lobby'`, `createdAt`, `participantCount: 0`. El primer participante que se une incrementa `participantCount`.

### Panel Admin — Vista "Todos los Participantes"
- **D-07:** Nueva tabla en `AdminPage` (además de progreso/pendientes actuales) con columnas:
  - **Nombre** (link a preferencias si no completado)
  - **Talla** (badge)
  - **Equipos preferidos** (texto truncado + tooltip completo)
  - **Equipos prohibidos** (texto truncado + tooltip)
  - **Estado** (badge: `✓ Pedido guardado` / `✗ Pendiente`)
  - **Acciones** (botón `Liberar` — borra `participants/{uid}` y decrementa `participantCount`; solo si `status === 'lobby'` y `!hasOrder`)
- **D-08:** Orden: **pendientes arriba** (ordenados por `joinedAt`), luego **completados** (ordenados por `joinedAt`).
- **D-09:** Datos via `useOrdersAdmin` (ya suscribe `participants` con `hasOrder`). No nueva suscripción. La tabla se deriva de `participants` array completo.

### Rutas y UI
- **D-10:** Rutas nuevas:
  - `/admin/setup` — solo accesible si `!exists(events/main)` Y secret válido. Crea evento.
  - `/admin/login` — solo accesible si `exists(events/main)` Y secret válido. Gate a `/admin`.
  - `/admin` — panel (existente), ahora requiere sesión anónima del admin (del setup) + secret validado.
- **D-11:** Guards en `App.tsx`:
  - `/admin/setup`: `!eventExists && secretValid`
  - `/admin/login`: `eventExists && secretValid && !adminAuthed`
  - `/admin`: `eventExists && adminAuthed && role === 'admin'` (role deriva de `adminUid === uid`)

### Stack y Convenciones
- **D-12:** Sin nuevas dependencias. `crypto.randomUUID()` para IDs si hace falta. Tailwind v4, React Router 8, Firebase 13.
- **D-13:** Componente `AdminSetupPage`, `AdminLoginPage` (pantallas completas, estilo `EntryPage`/`Screen`+`Card`).
- **D-14:** `AdminPage` extiende tabla con `ParticipantRow` extendido o nueva `ParticipantTableRow` para la vista tabular.
- **D-15:** `localStorage` key `secretkit.adminSecretValidated` (boolean) para persistir validación de secret entre recargas en `/admin/login` → `/admin`.

### Discrecionalidad del Agente
- Estructura exacta de `AdminSetupPage`/`AdminLoginPage` (copy, loading, error states).
- Diseño exacto de la tabla (responsive: `< sm` → cards apiladas; `≥ sm` → tabla).
- Texto del botón `Liberar` y confirmación (modal nativo `<dialog>`).
- Microcopy de errores: secret inválido, evento ya creado, setup fallido.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto y Alcance
- `.planning/PROJECT.md` — Core Value, constraints, Guía de Tallas, precios.
- `.planning/REQUIREMENTS.md` — Requisitos v1 (ADMIN-01, ADMIN-02 ya cubiertos; ADMIN-03 en Fase 2).
- `.planning/ROADMAP.md` — Fase 3 goal y dependencia de Fase 2.
- `AGENTS.md` — Stack, workflow GSD enforcement.

### Fase 1 Context (decisiones base)
- `.planning/phases/01-flujo-completo-del-amigo-invisible/01-CONTEXT.md` — D-01 a D-25, modelo de datos, reglas, identidad, sorteo, pedido, exportación.
- `.planning/phases/01-flujo-completo-del-amigo-invisible/01-PATTERNS.md` — Patrones establecidos: `SessionProvider`, `useOrdersAdmin`, `joinEvent`, `Screen`/`Card`/`Field`/`Button`/`Notice`/`Modal`, `downloadCsv`, `buildOrdersExport`.

### Código Existente (reutilizable)
- `src/pages/AdminPage.tsx` — Panel actual, `useOrdersAdmin`, `handleDownload`, `ParticipantRow` para pendientes.
- `src/hooks/useOrdersAdmin.ts` — Suscripción a `participants` con `hasOrder`, deriva `filled/total/pending`.
- `src/lib/orders.ts` — `listOrdersAdmin()` (enumera orders, proyección explícita), `submitOrder()`.
- `src/lib/lobby.ts` — `subscribeParticipants`, `getParticipant`, `joinEvent` (transacción bootstrap-o-unión).
- `src/lib/session.ts` — `ensureSignedIn()`, `saveIdentity/loadIdentity/clearIdentity`.
- `src/session/SessionProvider.tsx` — `useSession()` expone `uid`, `role` (derivado `adminUid === uid`), `hasPreferences`, `eventStatus`.
- `src/domain/types.ts` — `Participant`, `EventDoc`, `Role`, `ExportedOrder`, `StoredIdentity`.
- `src/components/` — `Screen`, `Card`, `Field`, `Input`, `Button`, `Notice`, `Modal`, `Badge`, `ParticipantRow`, `Table` (si existe) o crear.
- `firestore.rules` — Reglas actuales (no cambian).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useOrdersAdmin`** — Ya suscribe `participants` completo con `hasOrder`. Fuente única de verdad para la tabla.
- **`ParticipantRow`** — Componente existente para filas de pendientes. Extender o crear `ParticipantTableRow` para vista tabular completa.
- **`joinEvent`** — Transacción que crea participante + incrementa `participantCount`. Adaptar para que NO cree `events/main` (ya existe tras setup).
- **`SessionProvider`** — Ya deriva `role = adminUid === uid`. Funcionará si admin hizo setup (su `uid` = `adminUid`).
- **`downloadCsv` + `buildOrdersExport`** — Exportación ya funciona, sin cambios.
- **Componentes UI** — `Screen`, `Card`, `Field`, `Input`, `Button`, `Notice`, `Modal`, `Badge` listos para páginas nuevas.

### Established Patterns (de Fase 1)
- Páginas: `Screen` + `Card` + `Field`/`Input`/`Button`/`Notice` para formularios.
- Estado: `useState` local + `useSession()` para auth/role/eventStatus.
- Errores: `Notice tone="error"` con `action` para reintentar; mapeo códigos Firestore → copy S8.
- Descarga: `downloadCsv(filename, buildOrdersExport(orders))` en handler async con loading/error states.
- Reglas: Default-deny, `isAdmin()` = `adminUid === request.auth.uid`, `assignments` sin `list`.

### Integration Points
- `joinEvent.ts` debe permitir unirse a evento **ya creado** (sin bootstrap). Ya lo hace: si `events/main` existe, solo crea participante.
- `SessionProvider` ya observa `events/main` para `eventStatus` y `adminUid`. El setup crea el doc, la suscripción lo detecta.
- `App.tsx` route guards usan `role === 'admin'`. Tras setup + login, `uid` del admin = `adminUid` → `role === 'admin'` → acceso a `/admin`.

</code_context>

<specifics>
## Specific Ideas

- Copy `/admin/setup`: "Crear evento SecretKit" / "Eres el organizador. Define la clave del evento y crea la sala para que tus amigos se unan."
- Copy `/admin/login`: "Acceso Admin" / "Introduce la clave secreta para ver el panel de pedidos."
- Tabla columnas: `Nombre` | `Talla` | `Pref.` | `Proh.` | `Estado` | `Acciones`
- Badge estado: `✓ Completado` (verde) / `✗ Pendiente` (ámbar)
- Botón `Liberar` solo en `status === 'lobby'` y `!hasOrder`. Confirmación: "Esto eliminará a [Nombre] del evento. ¿Continuar?"
- `VITE_ADMIN_SECRET` en `.env.example`: `VITE_ADMIN_SECRET=tu_clave_secreta_aqui`

</specifics>

<deferred>
## Deferred Ideas

- **Login Admin con Firebase Email/Password** (si secret simple resulta insuficiente) — futura iteración.
- **Edición de participante por Admin** (cambiar talla, equipos) — v2.
- **Notificación a pendientes** (NOTF-01) — v2.
- **Múltiples eventos / grupos** (SCOPE-01) — v2.
- **Recuperación de identidad** (MGMT-03) — v2.

</deferred>

---

*Phase: 3-Admin login con credenciales .env + ver todos los participantes en panel*
*Context gathered: 2026-10-19*