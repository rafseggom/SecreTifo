# Phase 4: Privacidad verificada y pulido - Context

**Gathered:** 2026-10-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Verificar ejecutablemente la promesa central de privacidad (reglas vs emulador, fixture de exportación) y pulir la experiencia de usuario (estados carga/vacío/error en todas las rutas, responsive móvil de Guía de Tallas, deep-links). NO añade features nuevas — solo testing, hardening y polish.

Esta es la **Fase 2 del ROADMAP** (renumerada como Fase 4 en planning por inserción de Fase 3).
</domain>

<decisions>
## Implementation Decisions

### Testing de Reglas contra Emulador
- **D-01:** **Vitest + Firestore Emulator** real (localhost:8080). Tests arrancan emulador vía `firebase emulators:exec --only firestore,auth "vitest run ..."` o conectan a emulador ya corriendo. Usa `connectFirestoreEmulator(db, '127.0.0.1', 8080)` en setup de tests.
- **D-02:** Suite de aserciones mínimas (SEC-03, ADMIN-03):
  1. `getDocs(collection(assignments))` → `permission-denied` (participante)
  2. `getDocs(collection(assignments))` → `permission-denied` (admin)
  3. `getDoc(doc(assignments, ownUid))` → OK (participante lee su asignación)
  4. `getDoc(doc(assignments, otherUid))` → `permission-denied` (participante NO lee ajena)
  5. `getDocs(collection(orders))` → OK (admin lista orders)
  6. `getDocs(collection(orders))` → `permission-denied` (participante)
  7. `create participant` → solo en lobby, uid propio
  8. `update participant` → solo hasOrder tras draw
  9. `update events/main` → solo admin, status forward-only (lobby→drawn, no drawn→lobby)
- **D-03:** Tests en `src/lib/__tests__/rules.test.ts` (o similar). Un test por aserción. Cleanup entre tests (emulador se resetea solo con `clearFirestoreData` o reinicio).

### Fixture de Exportación (SEC-04)
- **D-04:** **4 participantes** con casos edge cubriendo todos los requisitos:
  | # | Nombre | Equipo | Temporada | Impreso | Dorsal | Talla | Tipo |
  |---|--------|--------|-----------|---------|--------|-------|------|
  | 1 | José | Real Madrid | 2024 | José | 9 | M | Fan |
  | 2 | María González | Atlético, SA | 2023 | María | 09 | L | Player |
  | 3 | O'Connor | Barça "Fan" | 2025 | O'Connor | 100 | S | Retro |
  | 4 | Juan Pérez | Valencia CF | 2024 | Juan Pérez | 007 | XXL | Fan |
- **D-05:** Verificaciones exactas en test:
  1. Cabecera exacta: `ID de pedido;Tipo;Equipo;Temporada;Nombre serigrafiado;Dorsal;Talla`
  2. **Ninguna celda** coincide con nombre de participante (ni "José", "María", "O'Connor", "Juan Pérez", "González", "Pérez")
  3. Dorsales preservan ceros: `09`, `100`, `007` (strings, no números)
  4. Acentos: `José`, `O'Connor`, `Pérez` → UTF-8 correcto
  5. Comas: `Atlético, SA` → escapado CSV correcto (`"Atlético, SA"`)
  6. Comillas: `Barça "Fan"` → escapado CSV correcto (`"Barça ""Fan"""`)
  7. **UTF-8 BOM** presente (`\uFEFF` al inicio)
  8. Separador `;` y CRLF `\r\n`
  9. Round-trip: parsear CSV generado → comparar con datos esperados

### Auditoría Estados UI (Todas las Rutas)
- **D-06:** Revisar 7 rutas y documentar/implementar estados faltantes:
  | Ruta | Loading | Empty | Error (permission-denied/unavailable/resource-exhausted) |
  |------|---------|-------|----------------------------------------------------------|
  | `/` (EntryPage) | ✅ FullScreenSpinner (global) | N/A | ✅ Notice en form |
  | `/preferences` | ❌ Falta | ✅ (form vacío) | ❌ Falta Notice S8 |
  | `/lobby` | ✅ useOrdersAdmin loading | ✅ "Todavía no hay participantes" | ❌ Falta Notice S8 en subscription |
  | `/reveal` | ❌ Falta (assignment + preferences) | ❌ Falta | ❌ Falta |
  | `/admin` | ✅ useOrdersAdmin loading | ✅ "Todavía no hay ningún pedido" | ✅ Notice S8 + retry |
  | `/admin/setup` | ✅ Button loading | N/A | ✅ Notice S8 + retry |
  | `/admin/login` | ✅ Button loading | N/A | ✅ Notice S8 + retry |
- **D-07:** Fixes a implementar:
  - `/preferences`: loading skeleton en `PreferencesPage` mientras `useSession` resuelve + Notice S8 en error de join
  - `/lobby`: Notice S8 en `onFailure` de `subscribeParticipants` (ya tiene `onFailure` propagando `err.code`)
  - `/reveal`: Loading state mientras `useMyAssignment` + `getParticipant` resuelven; empty state si no hay asignación; error Notice S8
  - Todas: usar taxonomía S8 (`errorCopy` pattern de `AdminPage.tsx`) para mapear códigos → copy + retry

### SizeGuideModal Responsive Móvil
- **D-08:** Breakpoint **`sm` (640px)** per Tailwind v4:
  - `< sm`: **Cards apiladas** por talla (una card = una fila de la tabla: talla, largo, ancho, altura, peso)
  - `≥ sm`: **Tabla completa** (Fan y Player lado a lado o pestañas)
- **D-09:** Dialog nativo `<dialog>` con:
  - `max-h-[80vh] overflow-y-auto` (altura acotada, scroll interno)
  - `showModal()` + focus trap nativo (sin reimplementar)
  - Headers sticky en tabla desktop: `thead th { position: sticky; top: 0; }`
- **D-10:** Datos literales de PROJECT.md §Constraints (Fan + Player + nota Retro usa Fan). Anomalías señaladas (Player 2XL máx vs XXXL en Select; peso M=L 70-78) con badges ámbar, sin corregir.

### README Contrato de Confianza
- **D-11:** Sección completa en `README.md` (o `TRUST.md` linkado) con:
  1. **Qué garantiza la app entre participantes**:
     - Nadie se regala a sí mismo (derangement circular)
     - Solo tú ves a quién regalas (assignment por `get` en `assignments/{tuUid}`)
     - Nadie ve el mapa completo (reglas: `assignments` sin `list` para nadie)
  2. **Qué NO garantiza (límite aceptado)**:
     - El dueño del proyecto Firebase **SÍ puede** leer Firestore por consola/Admin SDK (saltan reglas por diseño)
     - Cloud Function para sorteo ciego real requiere plan Blaze y backend — fuera de v1
  3. **Por qué el emparejamiento nunca está en un documento único**:
     - `assignments/{giverUid}` = 1 doc por regalador, solo `recipientUid`
     - Exportación usa `opaqueId` (UUID aleatorio), sin nombres ni IDs de participante
     - Cruzar talla+equipo con preferencias públicas NO revela emparejamiento (muchos comparten talla/equipo)
  4. **Cómo verificar**:
     - `firebase emulators:exec` corre tests de reglas (SEC-03)
     - Test fixture verifica exportación (SEC-04)
     - Rules son default-deny, escritas junto al esquema

### Stack y Convenciones
- **D-12:** Sin nuevas dependencias. Vitest ya configurado. Firebase Emulator via `firebase-tools`.
- **D-13:** Tests en `src/lib/__tests__/` y `src/domain/__tests__/` siguiendo patrón existente (`*.test.ts`).
- **D-14:** `errorCopy` / `downloadErrorCopy` pattern reutilizado de `AdminPage.tsx` para mapeo S8 consistente.
- **D-15:** `firebase.json` ya tiene rewrite catch-all para deep-links (verificar y confirmar).

### Discrecionalidad del Agente
- Estructura exacta de test files y helpers de emulador
- Nombres de test cases descriptivos
- Copy exacta de README trust section
- Ubicación exacta de fixes de UI states (componentes vs hooks vs pages)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto y Alcance
- `.planning/PROJECT.md` — Core Value, constraints, Guía de Tallas, precios, Key Decisions.
- `.planning/REQUIREMENTS.md` — ADMIN-03, SEC-03, SEC-04 (Fase 2 requirements).
- `.planning/ROADMAP.md` — Phase 2 success criteria (5 criterios).
- `AGENTS.md` — Stack, workflow.

### Fase 1 Context (base)
- `.planning/phases/01-flujo-completo-del-amigo-invisible/01-CONTEXT.md` — D-01 a D-25, modelo datos, reglas, identidad, sorteo, pedido, exportación.
- `.planning/phases/01-flujo-completo-del-amigo-invisible/01-PATTERNS.md` — Patrones: `SessionProvider`, `useOrdersAdmin`, `joinEvent`, `useMyAssignment`, componentes UI, `errorCopy` S8 pattern.
- `.planning/phases/01-flujo-completo-del-amigo-invisible/01-UI-SPEC.md` — S1-S8 copywriting contracts, empty/loading/error states.

### Fase 3 Context (reciente)
- `.planning/phases/03-admin-login-con-credenciales-env-ver-todos-los-participantes/03-CONTEXT.md` — Admin setup/login flow, tabla participantes, liberar.

### Código Existente (reutilizable)
- `firestore.rules` — Reglas a testear (default-deny, `isAdmin()`, `assignments` sin list)
- `src/domain/exportOrders.ts` — `buildOrdersExport` (pure function a testear con fixture)
- `src/lib/download.ts` — `downloadCsv`, `ordersCsvFilename`
- `src/hooks/useOrdersAdmin.ts` — loading/error/pending pattern
- `src/hooks/useMyAssignment.ts` — assignment loading pattern
- `src/pages/PreferencesPage.tsx` — necesita loading/error states
- `src/pages/LobbyPage.tsx` — subscription error handling
- `src/pages/RevealPage.tsx` — necesita loading/empty/error states
- `src/components/SizeGuideModal.tsx` — necesita responsive mobile
- `src/components/SizeGuideTable.tsx` — tabla a hacer responsive
- `firebase.json` — hosting rewrite catch-all
- `src/lib/lobby.ts` — `subscribeParticipants` con `onFailure` propagando `err.code`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`errorCopy` pattern** en `AdminPage.tsx` — mapeo códigos Firestore → copy S8 + retry boolean. Reutilizar en todas las rutas.
- **`useOrdersAdmin`** — ya expone `loading`, `error`, `pending`, `filled`, `total`, `allParticipants`. Patrón a replicar en `useMyAssignment`.
- **`subscribeParticipants`** en `lobby.ts` — ya tiene `onFailure(code)` propagando `err.code` (D-01 de Fase 1).
- **`SizeGuideModal` + `SizeGuideTable`** — datos literales ya renderizados; solo falta responsive CSS.
- **Vitest config** — ya existe (tests en Fase 1: `derangement.test.ts`, `sizeGuide.test.ts`, `prices.test.ts`, `normalizeName.test.ts`, `exportOrders.test.ts`, `download.test.ts`, `joinEvent.test.ts`, `lobby.test.ts`).

### Established Patterns
- Tests puros en `domain/` (sin Firebase)
- Tests con Firebase en `lib/__tests__/` (usar emulador)
- S8 error taxonomy: `permission-denied` → "No tienes permiso..." (no retry); `unavailable` → "Sin conexión..." (retry); `resource-exhausted` → "Límite consultas..." (no retry); default → "Algo ha ido mal" (retry)
- Loading states: skeleton (`animate-pulse`) o Button `loading={true}`
- Empty states: Card con copy específico (ej. "Todavía no hay ningún pedido")

### Integration Points
- Emulator: `firebase emulators:start --only firestore,auth` para dev; `firebase emulators:exec --only firestore,auth "vitest run"` para CI
- `connectFirestoreEmulator` en test setup
- `clearFirestoreData` helper entre tests (o reinicio emulador)

</code_context>

<specifics>
## Specific Ideas

- **Fixture data** (4 participantes hardcodeados en test):
  ```ts
  const FIXTURE_PARTICIPANTS = [
    { uid: 'uid-1', name: 'José', likedTeams: 'Real Madrid', forbiddenTeams: '', size: 'M' },
    { uid: 'uid-2', name: 'María González', likedTeams: 'Atlético, SA', forbiddenTeams: 'Betis', size: 'L' },
    { uid: 'uid-3', name: 'O\'Connor', likedTeams: 'Barça "Fan"', forbiddenTeams: '', size: 'S' },
    { uid: 'uid-4', name: 'Juan Pérez', likedTeams: 'Valencia CF', forbiddenTeams: 'Levante', size: 'XXL' },
  ]
  const FIXTURE_ORDERS = [
    { opaqueId: 'opaque-1', type: 'Fan', team: 'Real Madrid', season: '2024', printedName: 'José', number: '9', size: 'M' },
    { opaqueId: 'opaque-2', type: 'Player', team: 'Atlético, SA', season: '2023', printedName: 'María', number: '09', size: 'L' },
    { opaqueId: 'opaque-3', type: 'Retro', team: 'Barça "Fan"', season: '2025', printedName: 'O\'Connor', number: '100', size: 'S' },
    { opaqueId: 'opaque-4', type: 'Fan', team: 'Valencia CF', season: '2024', printedName: 'Juan Pérez', number: '007', size: 'XXL' },
  ]
  ```
- **README Trust Section** heading: `## Contrato de Confianza y Privacidad`
- **SizeGuideModal CSS**: `@media (max-width: 639px) { .size-guide-table { display: none; } .size-guide-cards { display: block; } }` + viceversa

</specifics>

<deferred>
## Deferred Ideas

- **Playwright E2E tests** contra emulador — v2 (para flujo completo usuario real)
- **Regla `participantCount` no negativo** en transacción — validar en rules
- **Rate limiting** en tests de reglas (emulador tiene límites)
- **Tests de performance** (bundle size, LCP) — v2

</deferred>

---

*Phase: 4-Privacidad verificada y pulido (Fase 2 del Roadmap)*
*Context gathered: 2026-10-19*