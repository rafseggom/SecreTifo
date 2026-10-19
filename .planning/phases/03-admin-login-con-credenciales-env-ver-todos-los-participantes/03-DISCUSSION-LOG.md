# Phase 3: Admin login con credenciales .env + ver todos los participantes en panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-19
**Phase:** 3-Admin login con credenciales .env + ver todos los participantes en panel
**Areas discussed:** Auth Strategy, Admin Model Migration, Panel All Participants, Login UI, Rules Compatibility

---

## Auth Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| A) Firebase Email/Password | Crear usuario admin en Firebase Console; signInWithEmailAndPassword. request.auth nativo, reglas funcionan. | |
| B) Clave secreta simple (VITE_ADMIN_SECRET) | String en .env; app compara input contra secreto. Simple, sin Firebase Auth extra. Menos seguro, reglas no validan. | ✓ |
| C) Firebase Custom Token vía Admin SDK | Backend/Functions genera token custom con claim admin: true. Requiere backend — contradice "sin backend". | |

**User's choice:** B) Clave secreta simple (VITE_ADMIN_SECRET)
**Notes:** Usuario prefiere simplicidad. "Solo necesito que yo tenga la clave y pueda entrar al panel."

---

## Admin Model Migration

| Option | Description | Selected |
|--------|-------------|----------|
| 1) Pre-crear admin en Firebase → su uid = adminUid fijo | Crear usuario admin en Firebase Console; adminUid = uid_del_admin. Mantiene reglas actuales. | |
| 2) Cambiar a Custom Claim 'admin: true' | Al hacer login admin, setear custom claim via Admin SDK. Requiere Functions. | |
| 3) Mantener adminUid pero permitir que admin se loguee Y sea el adminUid | Admin se crea en Firebase Console; su uid en .env (VITE_ADMIN_UID); login normal email/pass. | |
| **Agent decision (refined): Admin Setup Flow** | Admin va a /admin/setup (protegido por secret) → signInAnonymously() → crea events/main con adminUid = su uid SIN ser participante. Luego /admin/login con secret → panel. Admin participa en sesión separada si quiere. | ✓ |

**User's choice:** Agent decision (Admin Setup Flow)
**Notes:** Usuario dijo: "Si la decision del .env va a dar problema deshaz la decision... y decide lo más correcto por ti mismo, algo que cumpla con lo ya hecho y las reglas actuales y sea eficiente y 'facil'". La solución elegida mantiene reglas intactas (isAdmin = adminUid === request.auth.uid), admin separado de participantes, sin backend, eficiente.

---

## Panel All Participants

| Option | Description | Selected |
|--------|-------------|----------|
| Tabla con columnas: Nombre \| Talla \| Equipos pref. \| Estado \| Acciones | Orden: pendientes arriba, luego completados. Columna Acciones con botón Liberar. | ✓ |
| Cards (reusando ParticipantRow) separadas en 2 secciones: Pendientes + Completados | Consistente con UI actual. Cada card muestra nombre, talla, badge estado. | |
| Lista simple tipo lobby pero con estado de pedido visible | Como LobbyPage pero añadiendo columna/icono Pedido: Sí/No. Mínimo cambio. | |

**User's choice:** Tabla completa con columnas y acciones
**Notes:** "Tabla con columnas: Nombre | Talla | Equipos pref. | Estado (✓/✗) | Acciones". Quiere ver todo de un vistazo y poder liberar nombres duplicados.

---

## Login UI

| Option | Description | Selected |
|--------|-------------|----------|
| Ruta dedicada /admin/login (pantalla completa) | Página propia con formulario. Redirige a /admin tras login. Más limpio. | ✓ |
| Modal en /admin si no hay sesión admin | Al entrar a /admin sin role=admin, muestra modal. Queda en misma URL. | |
| Formulario inline en /admin | AdminPage renderiza login si !isAdminAuthed, sino panel. Sin navegación extra. | |

**User's choice:** Ruta dedicada /admin/login (pantalla completa)
**Notes:** "Ruta dedicada /admin/login (pantalla completa)". Separación clara de concerns.

---

## Rules Compatibility (Agent Decision)

| Option | Description | Selected |
|--------|-------------|----------|
| A) Admin crea evento primero → su uid = adminUid. Secret gate UI. | Mantiene reglas. Admin es participante en esa sesión. Participa en otra pestaña. | |
| B) /admin/setup crea evento SIN participante → adminUid = uid anónimo. /admin/login gate. | Admin NO es participante. Reglas intactas. Sesión anónima persiste. | ✓ |
| C) Cambiar reglas con custom claim | Requiere Functions. No. | |
| D) Volver a Email/Password | Usuario eligió secret simple. No. | |

**User's choice:** Agent decision (Option B - Admin Setup Flow)
**Notes:** Decidido por el agente tras análisis de compatibilidad con reglas existentes. Usuario delegó: "decide lo más correcto por ti mismo".

---

## the agent's Discretion

- **Admin Setup Flow** (vs. opciones A/B/C/D originales): Diseñado para satisfacer: secret simple + reglas intactas + admin separado + sin backend + eficiente.
- **Estructura exacta de AdminSetupPage/AdminLoginPage**: Copy, loading, error states, validación secret.
- **Diseño tabla responsive**: `< sm` → cards apiladas; `≥ sm` → tabla HTML.
- **Botón Liberar**: Confirmación nativa `<dialog>`, solo en lobby y sin pedido.
- **Microcopy de errores**: Secret inválido, evento ya creado, setup fallido, sin permisos.

## Deferred Ideas

- Login Admin con Firebase Email/Password (si secret simple resulta insuficiente) — futura iteración.
- Edición de participante por Admin (cambiar talla, equipos) — v2.
- Notificación a pendientes (NOTF-01) — v2.
- Múltiples eventos / grupos (SCOPE-01) — v2.
- Recuperación de identidad (MGMT-03) — v2.