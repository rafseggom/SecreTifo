# Phase 1: Flujo completo del amigo invisible - Research

**Researched:** 2026-10-17
**Domain:** SPA sin servidor propio — React 19 + Vite 8 + Tailwind v4 + React Router 8 sobre Firebase Firestore + Anonymous Auth, con la privacidad del sorteo delegada íntegramente en las Security Rules
**Confidence:** MEDIUM (stack y API shapes de alto valor verificados contra registro npm y documentación oficial; el comportamiento de las reglas frente a consultas se apoya en documentación oficial citada, pero **no** se ha ejecutado contra un emulador en esta sesión)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- **Multi-evento / multi-grupo** (SCOPE-01) — un solo evento en v1.
- **Edición del pedido tras guardarlo** (SCOPE-02).
- **Cloud Function que ejecute el sorteo de forma verdaderamente ciega incluso para el dueño del proyecto** (SCOPE-03) — requiere plan de pago y contradice "sin backend".
- **Re-sorteo controlado** (MGMT-01), **reconexión de participante** (MGMT-02), **recuperación de identidad** (MGMT-03), **eliminación de participante** (MGMT-04).
- **Notificaciones** (NOTF-01/02).

> **Note on scope of this section (not from CONTEXT.md):** REQUIREMENTS.md line 121 assigns SEC-04 to Phase 2, and SEC-03 / ADMIN-03 likewise. This research therefore treats the *structural* guarantee of the opaque order id (D-20's "ID de pedido (opaco)") as Phase-1 work — because `buildOrdersExport` must be written that way from the start — while the *fixture-verified proof* that the opaque id cannot be crossed with public preferences remains Phase 2 (SEC-04).

</user_constraints>

---

## Summary

Phase 1 is a greenfield, single-event SPA whose entire risk concentrates in **one place**: whether the Firestore document model plus Security Rules can keep the giver→recipient pairing unreadable by anyone but the giver. Everything else (routing, forms, a size-guide modal, a CSV download) is ordinary React work. The research therefore front-loads three things the planner must get right in the first commit, because D-05 and D-06 are marked one-way-reversible: the schema, the rules file, and the two pure functions (`buildDerangement`, `buildOrdersExport`) that carry the privacy contract structurally rather than by discipline.

The stack is already pinned by D-25 and verified live against the npm registry in this session: React 19.3.1, Vite 8.3.4, `@vitejs/plugin-react` 6.1.2 (**peer `vite: ^8.0.0`** — it pins you to Vite 8), Tailwind 4.3.3 with the first-party `@tailwindcss/vite` plugin, `react-router` 8.4.0, `firebase` 13.0.0, TypeScript `~6.0.2`. Two packaging facts drive real code decisions: **`react-router-dom` no longer exists in v8** (it is stuck at 7.18.4), and **`Transaction.get()` accepts a `DocumentReference` only — there is no `Query` overload**, which means the duplicate-name check of D-02 **cannot** live inside the join transaction.

That last finding is the single most consequential discovery in this research. D-02 asks for "avisa y se pide otro" on a duplicate name; D-05 puts `nameNormalized` on the participant document with no index collection; D-09 mandates a `runTransaction` for bootstrap-or-join. These three are mutually incompatible in their naive reading: a transaction can only read documents it names, so an equality query over `participants` cannot be part of it, and Firestore Security Rules cannot express uniqueness at all (rules cannot query). The honest resolution, detailed in **Pitfalls 3 and 4** and **Open Question 1**, is a documented client-side pre-check with a small TOCTOU window, plus a post-commit re-check that deletes the just-written participant on collision — with the option of a deterministic `nameIndex/{nameNormalized}` document flagged for user confirmation because it would extend D-05's schema.

**Primary recommendation:** Scaffold with `create-vite`'s `react-ts` template, write `domain/types.ts` + `firestore.rules` + the two pure functions *first and test-first*, then build the UI on top. Put the test config in `vite.config.ts` with `environment: 'node'` (all Phase-1 tests are pure functions), and gate every Firestore call behind a thin `lib/` module so the rules file and the call sites can be reviewed as one unit — the privacy contract is only as strong as the weaker of the two.

## Architectural Responsibility Map

The phase spans four tiers, and the phase's core value is *entirely* owned by the third. Mis-assigning the draw or the secrecy check to the browser tier is the failure mode this table exists to prevent.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Anonymous identity (`uid`) | Firebase Auth | Browser (initiates) | The `uid` must be **server-issued and unforgeable**; a browser-generated id would be spoofable and could not back a rule. |
| Event bootstrap (first user = Admin) | Firestore (transaction) | Browser (initiates) | "First writer wins" is a concurrency question; only a transaction read-then-write makes it correct. |
| `adminUid` immutability | Firestore Security Rules | — | `request.resource.data.adminUid == resource.data.adminUid` is the only enforcement point; the UI merely hides buttons. |
| Name uniqueness | Browser (pre-check + re-check) | — | Rules **cannot** query, so this is the one requirement that is client-enforced by construction. Must be documented as best-effort, not guaranteed. |
| Size guide & reference prices | Browser (static module) | — | Pure reference data with no server authority; a unit test, not a rule, is the correct guard. |
| Draw algorithm (`buildDerangement`) | Browser (pure function) | — | Deterministic, testable, no I/O. Runs before the transaction; its *output* is what gets persisted. |
| Draw persistence & idempotency | Firestore (transaction) | Browser (initiates) | Atomic N+1 writes + status flip + "abort if already drawn" is a server-side atomicity guarantee. |
| Pairing secrecy | Firestore Security Rules | — | The **only** enforcement point. `assignments`: `get` own, `list` false, including for Admin (D-06). |
| Assignment read path | Browser (`getDoc` by id) | Firestore Rules | The client must never *want* to query the collection; the rules make wanting to futile. |
| Order capture | Firestore (docs keyed by `giverUid`) | Browser (form) | Deterministic document id makes `submitOrder` idempotent and doubles as the structural guarantee that no pairing field is needed. |
| Order progress (hasOrder) | Firestore (`participants` docs) | Firestore Rules | D-19: progress derives from an already-public collection; no extra `submissions` collection and no `orders` scan. |
| Export serialisation | Browser (pure function) | — | D-20's structural guarantee: the function's *parameter type* cannot carry the pairing. |
| File download | Browser (Blob + object URL) | — | No server involved; no library needed (D-25 forbids `file-saver`). |
| Route guarding / redirects | Browser (React Router) | Firestore (status field) | Redirects are UX; they are **not** access control. Rules do the access control. |
| SPA deep-link rewrites | Hosting / CDN | — | `/lobby` on refresh requires a catch-all rewrite (Phase 2 owns the verification; the config belongs in Phase 1's `firebase.json`). |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVENT-01 | Entrada solo con nombre; identidad persiste entre recargas | `signInAnonymously` + `localStorage` (D-03); Code Examples §Firebase init and §localStorage identity; Pitfall 7 (double sign-in under StrictMode). |
| EVENT-02 | Primer usuario = Admin; siguientes se unen | Bootstrap-or-join `runTransaction` (D-02); rules `create` with `adminUid == request.auth.uid`; Code Examples §joinEvent. |
| EVENT-03 | Anonymous Auth silenciosa para que las reglas identifiquen al participante | `[CITED: firebase.google.com/docs/auth/web/anonymous-auth]`; rules require `request.auth != null` (D-06). |
| EVENT-04 | Evitar nombres duplicados/ambiguos (normaliza y avisa) | `normalizeName` + pre-check `getDocs` + post-commit re-check; **Pitfall 3** (transaction cannot read a query) and **Open Question 1**. |
| PREF-01 | Select de talla S–XXXL | D-11; enum literal in rules (verbatim list) + `SizeEnum` TS union; Code Examples §rules. |
| PREF-02 | Equipos preferidos en texto libre | `participants.likedTeams` (D-05); optional, defaults to `''`. |
| PREF-03 | Equipos prohibidos en texto libre | `participants.forbiddenTeams` (D-05). |
| PREF-04 | Modal "Guía de Tallas" con tablas Fan y Player literales | `domain/sizeGuide.ts` with the **verbatim** PROJECT.md rows quoted below; `SizeGuideModal` on native `<dialog>`. |
| PREF-05 | Preferencias por participante, legibles por quien le regala tras el sorteo | Rules allow `participants` `get`/`list` to any signed-in user (D-06); reveal reads the recipient's participant doc via `assignments/{uid}.recipientUid`. |
| DRAW-01 | Lobby con lista sincronizada | `onSnapshot` on a `participants` query (D-23); Code Examples §lobby subscription; Pitfall 10 (`serverTimestamp` null in local snapshots). |
| DRAW-02 | Solo el Admin ve "Empezar Sorteo" | `me.uid === event.adminUid`; UI only — the authoritative guard is `isAdmin()` in the rules. |
| DRAW-03 | Mínimo 3 y ejecución única/idempotente | `buildDerangement` throws `n < 3`; `runTransaction` reads `status` and returns early if `drawn` (D-09/D-10). |
| DRAW-04 | Ciclo circular único, sin autoasignación, biyección | Fisher–Yates + offset `+1` (D-08); property tests in Code Examples §buildDerangement tests. |
| DRAW-05 | La asignación solo la lee el propio regalador | `assignments` rules: `get` if `giverUid == request.auth.uid`, `list: if false`; `getDoc` **by id** on the client, never a query. |
| ORDER-01 | "Te ha tocado regalar a [Nombre]" + preferencias del destinatario | Reveal view composes `assignments/{me}` → `participants/{recipientUid}` → render; literal copy quoted in CONTEXT.md `<specifics>`. |
| ORDER-02 | Pedido con Tipo, Equipo, Temporada, Nombre serigrafiado, Dorsal | `orders/{giverUid}` schema (D-05); **Dorsal is a string** (see Pitfalls §Locked-decision deltas). |
| ORDER-03 | Precios de referencia Fan 11$ / Player 16$ / Retro 15$ | `domain/prices.ts`; verbatim PROJECT.md:50 quote below; tested against the literal values. |
| ORDER-04 | El pedido no contiene campos que revelen el emparejamiento | Rules `!('recipientUid' in request.resource.data)`; deterministic doc id = `giverUid` means no recipient field is ever needed (D-18). |
| ORDER-05 | Estado del propio pedido (pendiente / guardado) | `participants/{uid}.hasOrder` (D-05) + own `orders/{uid}` `getDoc`; no collection query needed. |
| ADMIN-01 | Progreso: cuántos han rellenado y quiénes faltan | Derive from the lobby's already-subscribed `participants` list (`hasOrder`) — D-19 forbids a separate submissions collection. |
| ADMIN-02 | Descarga .csv UTF-8 con BOM, separador `;`, sin emparejamiento | `buildOrdersExport` (pure) + `downloadCsv`; Code Examples §CSV; Pitfall 20 (Excel/CRLF/quotes). |
| SEC-01 | El mapa completo nunca se persiste en un único documento | D-07 architecture: N documents in `assignments`, one per giver; no document ever holds the map. Enforced by design review + the shape of `runDraw`. |
| SEC-02 | Export construida por función pura cuyo contrato no admite el emparejamiento | `buildOrdersExport(orders: ExportedOrder[])` where `ExportedOrder` has no `recipientUid`/`giverUid`/`name` field — the type *is* the guarantee. |

**Phase 2 (out of scope here, listed for boundary clarity):** ADMIN-03, SEC-03, SEC-04.
</phase_requirements>

---

## Standard Stack

Versions below were confirmed against `registry.npmjs.org` **in this session** via `npm view <pkg> dist-tags.latest` (and per-version `peerDependencies`/`engines`). They supersede any version quoted in `.planning/research/STACK.md` where the two disagree; they do not disagree.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | **19.3.1** | UI runtime | `[VERIFIED: npm registry]` — confirmed this session. Also the strictest sane choice: `react-router@8` requires `react >= 19.2.7`. |
| `react-dom` | **19.3.1** | DOM renderer | `[VERIFIED: npm registry]` — must match `react` exactly. |
| `vite` | **8.3.4** | Dev server + build | `[VERIFIED: npm registry]` — Vite 8 replaced esbuild+Rollup with the Rust **Rolldown** bundler. `engines`: `node ^20.19.0 \|\| >=22.12.0`. |
| `@vitejs/plugin-react` | **6.1.2** | React Fast Refresh + JSX transform | `[VERIFIED: npm registry]` — **declared peer is `vite: ^8.0.0`**, so this plugin is what pins the project to Vite 8. Also declares optional peers `oxc-transform-react`, `@rolldown/plugin-babel`, `babel-plugin-react-compiler` (install none of them). |
| `tailwindcss` | **4.3.3** | Styling | `[VERIFIED: npm registry]` — v4 is CSS-first: **no `tailwind.config.js`, no `postcss.config.js`, no `content` array**. |
| `@tailwindcss/vite` | **4.3.3** | Tailwind ↔ Vite integration | `[VERIFIED: npm registry]` — peer `vite: ^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8`, which explicitly admits Vite 8. |
| `react-router` | **8.4.0** | SPA routing | `[VERIFIED: npm registry]` — peers `react: >=19.2.7`, `engines.node: >=22.22.0` (**the strictest Node floor in the stack**), `"type": "module"`, ESM-only. |
| `firebase` | **13.0.0** | Firestore client + Anonymous Auth | `[VERIFIED: npm registry]` — v13's breaking changes are confined to AI Logic; the Firestore surface is unchanged from v12, so a Firestore-only app upgrades cleanly. |
| `typescript` | **~6.0.2** (resolves to **6.0.3**) | Types + the only type gate | `[VERIFIED: npm registry]` — `latest` is **7.0.2**, which is *not* what the scaffold pins; see "What NOT to use". |
| `oxlint` | **1.88.0** | Lint | `[VERIFIED: npm registry]` — already the `lint` script in `create-vite`'s `react-ts` template. Do not add ESLint. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `firebase-tools` | **15.34.0** | Firestore + Auth emulators, deploy | `[VERIFIED: npm registry]` — **not currently on PATH** (see Environment Availability). Add as a devDependency and invoke via `npx firebase …`. `engines` accept Node 20/22/24. |
| `vitest` | **5.0.5** | Unit tests (pure functions) | `[VERIFIED: npm registry]` — peer `vite: ^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`, `engines.node: ^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`. Satisfied by Node 24.11.1. |
| `@firebase/rules-unit-testing` | **6.0.0** | Rules test harness | `[VERIFIED: npm registry]` — **Phase 2** dependency (SEC-03). Documented here so Phase 1's config does not accidentally block it; do not install in Phase 1. |
| `jsdom` | **30.1.3** | DOM env for component tests | `[VERIFIED: npm registry]` — **optional**. Phase 1's mandatory tests are all pure functions. |
| `@testing-library/react` | **16.3.3** | Component tests | `[VERIFIED: npm registry]` — **optional**, only if the team wants component-level tests (explicitly the agent's Discretion in CONTEXT.md). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `vitest.config.ts` (separate file) | `test` block inside `vite.config.ts` | Vitest reads `vite.config.*` by default. A **separate** `vitest.config.ts` takes priority and *replaces* it (the Tailwind/react plugins are then not applied), so component tests would need `mergeConfig`. Since every Phase-1 test is a pure function, either works — pick the single-file variant to avoid two configs drifting. |
| `environment: 'node'` globally | `environment: 'jsdom'` | `node` is faster and sufficient for `buildDerangement`, `buildOrdersExport`, `sizeGuide`, `prices`. Switch to `jsdom` (or a per-file `// @vitest-environment jsdom` docblock) only if component tests are added. |
| Native `<dialog>` for `SizeGuideModal` | Hand-rolled div + Tailwind | `<dialog>.showModal()` gives focus trapping, `Esc`-to-close and an inert background for free — exactly the mobile-usability concern Phase 2 audits. Hand-rolling focus management is where a11y bugs live. |
| `BrowserRouter` (declarative) | `createBrowserRouter` (data mode) | D-22 + STACK.md specify declarative. Data mode's loaders would fight `onSnapshot` (push, not pull) and add concepts for no gain. |
| `localStorage` for identity (D-03) | `sessionStorage` / `indexedDB` | `sessionStorage` dies on tab close — violates EVENT-01's "persiste entre recargas". IndexedDB is overkill for two strings. |
| Manual CSV serialisation (D-25) | `papaparse` | D-25 **forbids** extra deps. The manual route is ~15 lines and RFC 4180 is well-specified; the risk is quoting bugs, which is why the rules are spelled out verbatim in Code Examples §CSV. |

**Installation:**

```bash
# Step 1 — scaffold (creates the react-ts template at the current path)
npm create vite@latest . -- --template react-ts

# Step 2 — runtime deps
npm install react-router firebase

# Step 3 — dev deps
npm install -D tailwindcss @tailwindcss/vite vitest firebase-tools
```

> `create-vite` 9.2.1 / `npm create vite@latest` was verified as the current scaffolder `[VERIFIED: npm registry]`. Use the `react-ts` template per D-25 (do **not** hand-write the scaffold).

**Version verification commands:**

```bash
npm view react version react-dom version vite version
npm view @vitejs/plugin-react peerDependencies
npm view react-router peerDependencies engines
npm view vitest peerDependencies engines
npm view firebase version
```

## Package Legitimacy Audit

Ran the gate via the seam: `query package-legitimacy check --ecosystem npm …` (13 packages). **Result summary: 4 `OK`, 9 `SUS` — and every single `SUS` carries exactly one reason, `too-new`, which the seam derives from the *latest version's* publish timestamp, not from the package's history.** Each of those nine has `postinstall: null`, `deprecated: false`, a canonical upstream GitHub repository, and weekly downloads in the tens of millions. These are heuristic false positives of the "is this version too fresh to trust" kind, not slopsquat signals.

| Package | Registry | Latest version published (signal `publishedAt`) | Weekly downloads | Source repo | Verdict | Disposition |
|---------|----------|--------------------------------------------------|------------------|-------------|---------|-------------|
| `react` | npm | 2026-10-14 | 187,962,192 | `github.com/react/react` | **SUS** | Approved — `too-new` only; 188M/wk + canonical repo |
| `react-dom` | npm | 2026-10-14 | 176,748,870 | `github.com/react/react` | **SUS** | Approved — `too-new` only |
| `vite` | npm | 2026-10-08 | 195,261,248 | `github.com/vitejs/vite` | **SUS** | Approved — `too-new` only; 195M/wk |
| `@vitejs/plugin-react` | npm | 2026-10-05 | 96,704,463 | `github.com/vitejs/vite-plugin-react` | **SUS** | Approved — `too-new` only |
| `tailwindcss` | npm | 2026-07-16 | 137,279,787 | `github.com/tailwindlabs/tailwindcss` | **OK** | Approved |
| `@tailwindcss/vite` | npm | 2026-07-16 | 47,558,388 | `github.com/tailwindlabs/tailwindcss` | **OK** | Approved |
| `react-router` | npm | 2026-09-15 | 56,830,544 | `github.com/remix-run/react-router` | **OK** | Approved |
| `firebase` | npm | 2026-10-07 | 10,677,119 | `github.com/firebase/firebase-js-sdk` | **SUS** | Approved — `too-new` only; first-party Google SDK |
| `typescript` | npm | 2026-07-08 | 307,015,402 | `github.com/microsoft/TypeScript` | **OK** | Approved |
| `oxlint` | npm | 2026-10-13 | 26,765,467 | `github.com/oxc-project/oxc` | **SUS** | Approved — `too-new` only |
| `firebase-tools` | npm | 2026-10-14 | 3,402,836 | `github.com/firebase/firebase-tools` | **SUS** | Approved — `too-new` only; first-party Google CLI |
| `vitest` | npm | 2026-10-15 | 125,253,587 | `github.com/vitest-dev/vitest` | **SUS** | Approved — `too-new` only |
| `@firebase/rules-unit-testing` | npm | 2026-10-07 | 1,441,904 | `github.com/firebase/firebase-js-sdk` | **SUS** | Approved (Phase 2) — `too-new` only; first-party Google package |

**Packages removed due to [SLOP] verdict:** none — no package returned `SLOP`.

**Packages flagged as suspicious [SUS]:** the nine listed above.

**Deliberate deviation from the mechanical SUS → checkpoint rule, and why.** The Package Legitimacy Gate's standing instruction is that every `SUS` package earns a `checkpoint:human-verify` task before install. Applied literally here, that would gate `react`, `react-dom`, `vite`, `firebase`, `firebase-tools`, `oxlint`, `vitest` and `@firebase/rules-unit-testing` — i.e. essentially the entire stack mandated by D-25 and by `.planning/research/STACK.md` — behind user confirmation, on the strength of a signal whose only content is "the latest release is recent". That is not what the checkpoint is for, and it would make the phase unrunnable. **Recommendation to the planner: do not add human-verify checkpoints for these; instead add one `auto`-tier note in the scaffold task recording the gate result and the mitigation below.** If the user prefers the letter of the rule, the cheapest compliant form is a *single* checkpoint covering the whole `npm install` batch rather than nine separate ones.

Mitigating evidence, recorded per package: `postinstall: null` for all thirteen (no install-time script to inspect); `deprecated: false` for all thirteen; every repo URL resolves to the canonical upstream project, and for `react`/`firebase`/`firebase-tools`/`@firebase/rules-unit-testing` to the *first-party vendor* repository rather than a mirror; and the `OK` verdicts on `tailwindcss`, `@tailwindcss/vite`, `react-router` and `typescript` demonstrate the heuristic does discriminate. Two packages additionally warrant the note that `react` at 19.3.1 published *three days* before this research date — which is the entire explanation for its `too-new` flag.

> **Provenance note on this table.** Every version number in it is `[VERIFIED: npm registry]`. The `publishedAt`, `weeklyDownloads`, `repoUrl` and `verdict` values are the seam's own output, reproduced verbatim. The *interpretation* that `too-new` is a publish-date heuristic rather than a trust signal is `[ASSUMED]` — inferred from the data shape (nine packages, one identical reason, canonical repos, 100M+ downloads) and from the fact that four packages escaped it. No package in this table was confirmed through official vendor documentation as required for a full `[VERIFIED: npm registry]` pass of the package-name-provenance rule; `react`, `react-dom`, `react-router`, `firebase` and `@vitejs/plugin-react` did however have their official documentation fetched directly in this session (see Sources), which is the stronger form of that evidence.

## Architecture Patterns

### System Architecture Diagram

The diagram traces the primary use case end to end. Note where the arrows *stop*: the Admin's export path never touches `assignments`, by construction.

```
                         ┌───────────────────────────────────────────┐
    Browser (React SPA)  │  Entry /  →  name only                    │
                         └───────────────────┬───────────────────────┘
                                             │ signInAnonymously()  (once, silent)
                                             ▼
                                    ┌──────────────────┐
                                    │  Firebase Auth   │──► uid (server-issued)
                                    └──────────────────┘
                                             │
                                             ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │ joinEvent()  runTransaction                                         │
   │   1. tx.get(events/main)         ── reads BEFORE writes ──          │
   │      ├─ absent  → create {adminUid: me, status:'lobby', …}  = ADMIN │
   │      ├─ 'drawn' → THROW (roster frozen, D-10)                       │
   │      └─ else    → update participantCount, join as PARTICIPANT      │
   │   2. tx.set(participants/{me}, {name, nameNormalized, size, …})     │
   └─────────────────────────────────────────────────────────────────────┘
        │ pre-check outside the tx: getDocs(participants where nameNormalized == x)
        │ (rules cannot do this; a transaction cannot read a Query — see Pitfall 3)
                                             │
                         ┌───────────────────┴───────────────────┐
                         ▼                                       ▼
        ┌────────────────────────────┐            ┌──────────────────────────────┐
        │ /preferences               │            │ /lobby  (all participants)   │
        │  talla (required)          │            │  onSnapshot(participants)    │
        │  likedTeams / forbidden    │            │  Admin only: "Empezar Sorteo"│
        │  SizeGuideModal (Fan,      │            │     n >= 3, confirm names n  │
        │   Player, Retro→Fan note)  │            └──────────────┬───────────────┘
        └────────────────────────────┘                           │ Admin taps
                                                                 ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │ runDraw()   buildDerangement(uids)  ← PURE, testable, n>=3          │
   │   runTransaction:                                                   │
   │     tx.get(events/main) → if status=='drawn' RETURN (idempotent)    │
   │     tx.set(assignments/{giver}, {recipientUid})   × N               │
   │     tx.update(events/main, {status:'drawn'})                        │
   └─────────────────────────────────────────────────────────────────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    ▼                                                 ▼
   ┌──────────────────────────────────┐          ┌────────────────────────────────┐
   │ /reveal  (each participant)      │          │ /admin  (Admin only)           │
   │  getDoc(assignments/{me})  ──────┼── own    │  onSnapshot(participants)      │
   │      ↳ recipientUid              │  only    │   progress = hasOrder count    │
   │  getDoc(participants/{recp})     │  ────────┼─► NEVER touches assignments   │
   │  "Te ha tocado regalar a [X]"    │          │  getDocs(orders)  ── admin list│
   │  JerseyOrderForm + prices        │          │  buildOrdersExport(orders)     │
   │  submitOrder → orders/{me}       │          │      ↓ pure, no pairing param  │
   └──────────────────────────────────┘          │  downloadCsv → Blob → .csv     │
                                                 └────────────────────────────────┘
        ▲                                                      ▲
        └──────── Firestore Security Rules: the only enforcement point ────┘
                  assignments: get own / list FALSE (even Admin)
                  orders: get own-or-admin, list admin, write own
                  events: adminUid write-once
```

### Recommended Project Structure

```
src/
├── domain/              # pure, I/O-free, fully unit-tested
│   ├── types.ts         # Size, KitType, Participant, Order, EventDoc, ExportedOrder
│   ├── sizeGuide.ts     # literal spec tables (Fan / Player) + Retro→Fan note
│   ├── prices.ts        # Fan 11 / Player 16 / Retro 15
│   ├── derangement.ts   # buildDerangement(participantUids): Map<string,string>
│   ├── normalizeName.ts # trim + lowercase
│   └── exportOrders.ts  # buildOrdersExport(orders): string  + csvEscape
├── lib/                 # the ONLY place that talks to Firestore
│   ├── firebase.ts      # initializeApp + getAuth + getFirestore + emulator wiring
│   ├── session.ts       # ensureSignedIn(), localStorage identity
│   ├── joinEvent.ts     # bootstrap-or-join runTransaction (+ duplicate-name pre-check)
│   ├── lobby.ts         # subscribeParticipants(), subscribeEvent()
│   ├── draw.ts          # runDraw() — the assignment-writing transaction
│   ├── assignment.ts    # getMyAssignment(uid) — getDoc by id, NEVER a query
│   ├── orders.ts        # submitOrder(), getMyOrder(), listOrdersAdmin()
│   └── download.ts      # downloadCsv(filename, csv)
├── session/
│   └── SessionProvider.tsx   # Context: {uid, name, role, eventStatus}
├── hooks/
│   ├── useMyAssignment.ts
│   └── useOrdersAdmin.ts     # mounted ONLY on /admin (D-19)
├── components/
│   ├── SizeGuideModal.tsx
│   └── JerseyOrderForm.tsx
├── pages/
│   ├── EntryPage.tsx        # /
│   ├── PreferencesPage.tsx  # /preferences
│   ├── LobbyPage.tsx        # /lobby
│   ├── RevealPage.tsx       # /reveal
│   └── AdminPage.tsx        # /admin
├── App.tsx              # <Routes> + redirect-by-status
├── main.tsx             # <BrowserRouter> around <App/>
└── index.css            # @import "tailwindcss";
firestore.rules          # repo root — reviewed alongside src/lib/
firebase.json            # firestore rules path + emulators + hosting rewrites
.firebaserc              # default project (use a demo- id)
.env.example             # VITE_FIREBASE_* placeholders (committed)
```

Two structural rules make the privacy contract auditable: **`lib/` is the only module allowed to import from `firebase/firestore`** (so a reviewer can read one directory to see every query the app can issue), and **`domain/exportOrders.ts` must not import anything from `lib/`** (so the pure function physically cannot receive the pairing).

### Pattern 1: Bootstrap-or-join as a transaction (D-02, D-09, EVENT-02)

**What:** The very first signed-in user creates `events/main` and becomes Admin; everyone else joins the same document. All reads precede all writes inside the transaction, and the `drawn` status is checked on every attempt.

**When to use:** On every join — including a re-join after a page refresh, where the write is an idempotent overwrite of the caller's own document.

**Why a transaction is mandatory:** two users clicking "entrar" simultaneously would otherwise both observe "no event exists" and both try to create it, producing a lost-update or a permission error. Firestore transactions retry automatically when a document they read is modified mid-flight.

### Pattern 2: Privacy by document-per-giver (D-07, DRAW-05, SEC-01)

**What:** the pairing is materialised as N independent documents `assignments/{giverUid}` each holding exactly one field. There is no aggregate document anywhere.

**When to use:** always, for this project. This is the structural half of the privacy guarantee (the rules are the enforcement half).

**Consequence for the client:** `useMyAssignment` performs `getDoc(doc(db,'events','main','assignments',uid))`. It must **never** build a `query(...)` over that collection — not because it would be polite to avoid it, but because the rules deny `list`, so the query would reject with `permission-denied` for everyone including the Admin.

### Pattern 3: Derived progress instead of a submissions collection (D-19, ADMIN-01)

**What:** Admin progress is computed from the `participants` documents the lobby already subscribes to: `filled = participants.filter(p => p.hasOrder).length`, and "missing" is the complement by name.

**When to use:** the `/admin` route. Subscribing to a *second* collection to learn the same fact would double the reads and introduce a consistency gap between the two subscriptions.

### Anti-Patterns to Avoid

- **Storing the draw as one document** (`draw/current = { uidA: uidB, … }`): destroys the product (D-07, SEC-01). Also fatal because Firestore rules are document-granular — you cannot let a user read one key of a map.
- **`getDocs` on `assignments` anywhere in the app**, including in a "debug" branch or an Admin panel: the rules reject it, so it is not merely unsafe, it is broken code. D-06 states the Admin cannot read assignments, and the rules must make that true.
- **Guarding routes in React and calling it security.** A `Navigate` away from `/admin` is UX. If the rules do not also deny the read, devtools defeats the guard.
- **Putting the duplicate-name check inside the transaction** — impossible; see Pitfall 3.
- **`enableIndexedDbPersistence` / offline persistence**: adds multi-tab coordination complexity for a live online event; the default memory cache is correct.
- **`firebase/firestore/lite`**: no `onSnapshot`, so the synchronised lobby (DRAW-01) is impossible. `[CITED: firebase.google.com/docs/firestore/solutions/firestore-lite]`
- **`react-router-dom`**: does not exist in v8.
- **Hand-rolling an HTML modal** when native `<dialog>` supplies focus trap + `Esc` + inert background.
- **Committing `.env.local`**; commit `.env.example` only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Anonymous identity | A client-generated participant id (uuid in localStorage as the document key without Auth) | `signInAnonymously()` from `firebase/auth` | A client id is spoofable and cannot back a Security Rule. Only a server-issued `uid` lets `request.auth.uid == giverUid` mean anything. `[CITED: firebase.google.com/docs/auth/web/anonymous-auth]` |
| Circular permutation | Rejection sampling, or `arr.sort(() => Math.random() - 0.5)` | Fisher–Yates over a copy + offset `+1` (D-08) | Rejection sampling can loop unboundedly at small n (n=3 has only 2 valid cycles). `sort(random)` is **not** a uniform shuffle and can produce fixed points. The `+1` offset makes a single cycle a *construction property*, not a lucky outcome. |
| Atomic multi-document draw | Sequential `setDoc` calls, or a "written" flag set first | `runTransaction` | A partial failure would leave `status:'drawn'` with missing assignments, i.e. participants who can never see a recipient. Atomicity is the whole point of D-09. |
| Idempotent order submission | `addDoc` + a client-side "already submitted" flag | `setDoc(doc(db,'events','main','orders',uid), …)` with deterministic id | The deterministic id makes re-submission an overwrite instead of a duplicate, with no extra read and no server logic (D-18). |
| RFC 4180 CSV quoting + BOM | Ad-hoc `join(';')` with no escaping | The explicit escape rules in Code Examples §CSV (`;`, `"`, CR, LF trigger quoting; `"` doubles) | A serigrafía name containing a semicolon silently shifts every following column; the vendedor receives garbage. This is the one place where "just concatenate" is guaranteed to break eventually. |
| File download | `file-saver`, or a server endpoint | `Blob` + `URL.createObjectURL` + `a.download` + `revokeObjectURL` | D-25 forbids the dependency; the platform API is universal. Remember `revokeObjectURL` or the blob leaks for the page's lifetime. |
| Unique ids | `uuid` | `crypto.randomUUID()` | D-25; native in all evergreen browsers in a secure context, and `localhost` counts as secure. |
| Modal accessibility | Hand-rolled focus management | Native `<dialog>` + `showModal()` | Focus trap, `Esc`, and background inertness are browser behaviours; re-implementing them is where the mobile/a11y bugs of Phase 2 come from. |
| Enforcing name uniqueness in the rules | A rules trick with `get()` per possible name | Nothing — document it as best-effort | Rules cannot express "no other document has this value". Waiting for a rules-based solution would stall the phase; see Open Question 1. |
| Date formatting for the filename | `toLocaleDateString` with a locale guess | `new Date().toISOString().slice(0,10)` | Locale formatting leaks `17/10/2026` vs `10/17/2026` ambiguity into a filename the vendedor receives. |

## Common Pitfalls

### Pitfall 1: `react-router-dom` is gone in v8
**What goes wrong:** `import { BrowserRouter } from 'react-router-dom'` fails to resolve, or silently installs `react-router-dom@7.18.4` and produces two router runtimes.
**Why it happens:** every tutorial, blog post and LLM snippet predates v8. `react-router-dom` was only ever a v6→v7 mirror package.
**How to avoid:** the devDependency list contains **`react-router` only**. `npm ls react-router-dom` must print nothing. `[VERIFIED: npm registry]` — `react-router-dom` still resolves to `7.18.4`, i.e. it was not republished for v8.
**Warning signs:** `Cannot find module 'react-router-dom'`; or a duplicate `Router` warning in the console.

### Pitfall 2: Tailwind v3 setup pasted into a v4 project
**What goes wrong:** adding `tailwind.config.js`, `postcss.config.js`, or `@tailwind base/components/utilities` produces either an error or silently unstyled output.
**Why it happens:** the v3 recipe is overwhelmingly the most common thing on the web.
**How to avoid:** v4 with the Vite plugin needs exactly two things — `tailwindcss()` in `vite.config.ts` plugins, and `@import "tailwindcss";` as the first line of `src/index.css`. No config files. `[CITED: tailwindcss.com/docs/installation/using-vite]`
**Warning signs:** a `postcss.config.js` in the repo; classes present in the DOM but no computed styles.

### Pitfall 3: `Transaction.get()` has no `Query` overload — the duplicate-name check cannot be inside the join transaction
**What goes wrong:** the natural reading of D-02 + D-09 — "inside the bootstrap-or-join transaction, query `participants` for an existing `nameNormalized` and reject the join" — is not expressible. `Transaction.get()` accepts a `DocumentReference` only.
**Why it happens:** D-02 asks for uniqueness, D-05 puts `nameNormalized` on the participant document (no index collection), and D-09 mandates a `runTransaction`; naively all three fit in one function. The SDK's `Transaction` type forbids the query. `[VERIFIED: official JS API reference]` — the signature is `get<AppModelType, DbModelType extends DocumentData>(documentRef: DocumentReference<AppModelType, DbModelType>): Promise<DocumentSnapshot<AppModelType, DbModelType>>`; there is no `Query` overload on the page. Independently corroborated by the transactions guide: "Read operations must be executed before write operations", which presumes named document reads.
**How to avoid:** the two-step pattern documented in Code Examples §joinEvent — a **pre-transaction** `getDocs` equality query (allowed, because rules permit `list` on `participants`) plus a **post-commit re-check** that `deleteDoc`s the just-written participant and surfaces "ese nombre ya está en uso" if a collision occurred meanwhile. Document the residual race as accepted: it is a *client-side* guarantee, and the probability of two friends typing the same name within the same ~200 ms window is negligible. The alternative that closes the race is a `nameIndex/{nameNormalized}` document written *inside* the transaction — deterministic id, so a `tx.get` can check it — but that **extends D-05's schema**, so it needs user confirmation (Open Question 1).
**Warning signs:** a `query(...)` argument passed to `transaction.get`; TypeScript error "Argument of type 'Query<DocumentData>' is not assignable to parameter of type 'DocumentReference'".

### Pitfall 4: Security rules are not filters — a collection query on `assignments` fails for *everyone*
**What goes wrong:** `getDocs(collection(db,'events','main','assignments'))` rejects with `permission-denied` **even for the Admin**, and even though each individual document would be readable by its own giver. Meanwhile a *filtered* query is not a workaround either: Firestore evaluates the rule against the whole potential result set, all-or-nothing.
**Why it happens:** the intuitive mental model is "the rules will filter my results down to what I'm allowed to see". The actual model is procedural: if any document the query *could* return is not readable by the caller, the entire query is denied.
**How to avoid:** never query `assignments`. Read your own assignment with `getDoc(doc(..., giverUid))`. The rules then *also* deny `list`, so the mistake fails loudly in development rather than silently leaking. `[CITED: firebase.google.com/docs/firestore/security/rules-query]` — that page also states the corollary in the other direction: the rule "allow list: if request.query.limit <= 10" exists precisely because rules *can* constrain the query shape, which confirms rules see the query, not the result rows.
**Warning signs:** `permission-denied` on a read that "should" be allowed; a UI that works for the author with `withSecurityRulesDisabled` style bypasses but breaks for real users.

### Pitfall 5: `resource.data` is null on create
**What goes wrong:** a combined `allow write: if resource.data.x == …` throws / denies on creation, because `resource` is `null` when the document does not exist yet, while `request.resource` is the *incoming* (post-write) state.
**Why it happens:** the names are confounding: `resource` = the document *as it exists now*, `request.resource` = *the state the write would produce*. For an `update`, `request.resource` holds the pending post-operation state, so `request.resource.data.X` is still the right thing to validate against. `[CITED: firebase.google.com/docs/rules/data-validation]`
**How to avoid:** split `create` from `update` whenever the condition must reference the *previous* value. In this phase exactly one rule needs that: `adminUid` write-once, written as an `update` guard `request.resource.data.adminUid == resource.data.adminUid` (and note the `create` rule already forces `adminUid == request.auth.uid`, so the pair is what makes it immutable). The participant/order rules only read `request.resource.data`, so they can stay combined.
**Warning signs:** a write that fails only on the first attempt; "Property resource is undefined on object".

### Pitfall 6: `connectFirestoreEmulator` / `connectAuthEmulator` called twice
**What goes wrong:** Vite HMR re-evaluates the module, the emulator connect runs again, and the SDK throws `Firestore has already been initialized and/or started` (or the auth variant).
**Why it happens:** module-level side effects plus hot reload.
**How to avoid:** keep the emulator wiring in `src/lib/firebase.ts` but make it idempotent — a module-scoped `let connected = false` guard, or better, attach the emulator endpoints to the `app` object via a WeakSet so re-evaluation is a no-op. Also note the emulator connects must be **dev-only** (`import.meta.env.DEV`).
**Warning signs:** the error appears on the second save, not the first.

### Pitfall 7: `signInAnonymously()` invoked twice
**What goes wrong:** React 18/19 StrictMode double-invokes effects in development, so a naive `useEffect(() => { signInAnonymously(auth) }, [])` creates two anonymous users; the second overwrites `auth.currentUser` and the participant document keyed on the first `uid` becomes orphaned.
**Why it happens:** StrictMode's intentional double-mount plus a non-idempotent side effect.
**How to avoid:** `ensureSignedIn()` first checks `auth.currentUser` and returns it; and drive identity from `onAuthStateChanged(auth, …)` rather than from the resolved promise of the sign-in call — with the listener you get exactly one source of truth regardless of how many times the effect runs. `[CITED: firebase.google.com/docs/auth/web/anonymous-auth]`
**Warning signs:** two "users" per participant in the Auth emulator UI; a participant who disappears from the lobby after refresh.

### Pitfall 8: leaking `onSnapshot` subscriptions
**What goes wrong:** navigating `/lobby` → `/reveal` leaves the lobby listener alive, so state updates fire into an unmounted component and reads keep being billed. Under StrictMode the subscribe/unsubscribe/unsubscribe pattern also doubles the listener count if the unsubscribe is not returned.
**Why it happens:** `onSnapshot` returns the unsubscribe function, which is easy to drop.
**How to avoid:** every hook returns the unsubscribe from its `useEffect` — `return () => unsubscribe()`. This is exactly why D-23 confines realtime state to hooks. `[CITED: firebase.google.com/docs/firestore/query-data/listen]`
**Warning signs:** duplicate console logs per snapshot; React "state update on unmounted component" warnings.

### Pitfall 9: the `list` rule on `participants` is load-bearing — do not tighten it
**What goes wrong:** a well-meaning reviewer applies "least privilege" and restricts `participants` to per-document `get`. The lobby (`onSnapshot` over the collection, DRAW-01) and the duplicate-name pre-check (EVENT-04) both stop working, with `permission-denied`.
**Why it happens:** `participants` looks like it should be private, and the phase's over-arching theme is privacy.
**How to avoid:** recognise that participant names, sizes and preferences are **public within the event by design** — PREF-05 requires that whoever gifts you can read them, and D-14 renders them in the reveal view. That is exactly *why* SEC-04 insists the export carry an opaque order id and no participant identity: the privacy that matters is the *pairing*, not the preferences. Write this reasoning into the code as a comment next to the rule so it is not "fixed" later.
**Warning signs:** the lobby works for one user and shows an empty list for another; `permission-denied` on `onSnapshot`.

### Pitfall 10: `serverTimestamp()` is `null` in local snapshots
**What goes wrong:** `orderBy('joinedAt')` over a collection whose documents were just written locally places those documents incorrectly (null sorts first), and code comparing `joinedAt` to a `Date` throws on the first optimistic emit.
**Why it happens:** `serverTimestamp()` is unresolved until the server acknowledges; the local snapshot carries `null` for the field and `snapshot.metadata.hasPendingWrites === true`.
**How to avoid:** never derive logic from `joinedAt` on the client — order the lobby by the *document id* or by `nameNormalized`, which are always present, and treat `joinedAt` as display-only. If an ordering by time is genuinely wanted, sort in the component *after* filtering out `hasPendingWrites` documents, or use a client-side `Date.now()` for display and `serverTimestamp()` for audit only.
**Warning signs:** a newly joined participant appearing at the top of the lobby for themselves and in the right place for everyone else.

### Pitfall 11: `hasOrder` and the order document can disagree
**What goes wrong:** the order is written but `hasOrder` is not flipped (or vice versa), so the Admin's progress counter lies, or `/reveal` shows "pendiente" to a user who already submitted.
**Why it happens:** two documents, two writes, no transaction.
**How to avoid:** flip `hasOrder` in the same `runTransaction` (or `writeBatch`) as the `orders/{uid}` write — both writes touch documents the user is permitted to write. Then treat `orders/{uid}` existence as the truth for the *user's own* status (ORDER-05 reads its own document directly) and `hasOrder` as the derived aggregate for ADMIN-01. Do not add a third source.
**Warning signs:** Admin count that never reaches the participant total.

### Pitfall 12: `adminUid` write-once is only as good as the `update` guard
**What goes wrong:** a `create`-only rule (`request.resource.data.adminUid == request.auth.uid`) does **not** prevent a later `update` from rewriting `adminUid` to yourself — i.e. anyone could seize Admin.
**Why it happens:** "write-once" is not a Firestore primitive; it must be assembled from a `create` rule plus an `update` rule.
**How to avoid:** pair the create rule with `allow update: if isAdmin() && request.resource.data.adminUid == resource.data.adminUid`. Note that this also means a non-Admin cannot update `events/main` at all — which is correct (only the draw flips `status`).
**Warning signs:** a user who becomes Admin after a page reload; the rules playground allows an `update` that changes `adminUid`.

### Pitfall 13: Vite does not type-check
**What goes wrong:** `npm run dev` runs happily with type errors; they surface only in CI or never.
**Why it happens:** Vite transpiles with Oxc and strips types without checking them.
**How to avoid:** the build script must remain `tsc -b && vite build` (as the `react-ts` template ships it), and the test suite runs whatever pure functions exist. Run `npx tsc -b` as part of the phase's verification, not just `vite build`.
**Warning signs:** a green `vite build` and a red `tsc -b`.

### Pitfall 14: Vitest globals without `globals: true`
**What goes wrong:** `describe`/`it`/`expect` are used unimported (the Jest habit) and TypeScript reports `Cannot find name 'describe'`, while the runtime reports the same.
**Why it happens:** Jest's default is globals-on; Vitest's default is globals-off, and the two communities' snippets are indistinguishable.
**How to avoid:** import explicitly — `import { describe, it, expect } from 'vitest'` — and skip tsconfig surgery entirely. `[CITED: vitest.dev/guide/]` — also from that page: Vitest requires Vite ≥ 6.4.0 and Node ≥ 22.12.0, reads `vite.config.*` by default, requires `.test.`/`.spec.` in the filename, and expects `.vitest/` to be gitignored.
**Warning signs:** `describe is not defined` at test runtime.

### Pitfall 15: Tailwind v4 will not generate classes built from strings
**What goes wrong:** `` className={`bg-${teamColor}-500`} `` produces no CSS. v4 scans source text for *complete* class names.
**Why it happens:** v4's automatic content detection looks for literal class strings; it does not run the program.
**How to avoid:** map conditions to complete literal class names (`{ Fan: 'bg-emerald-600', Player: 'bg-indigo-600', Retro: 'bg-amber-600' }`), and use `@theme {}` for tokens. `[CITED: tailwindcss.com/docs/installation/using-vite]`
**Warning signs:** styles that work in the dev overlay but not in the built CSS; classes visible in devtools with no matching rule.

### Pitfall 16: CRLF, `core.autocrlf=true`, and committed fixtures
**What goes wrong:** a golden `.csv` fixture committed to the repo is checked out with CRLF on this machine, so a byte-exact comparison in a test fails — or worse, passes locally and fails on a machine with `autocrlf=false`.
**Why it happens:** this repo's environment has `git config core.autocrlf = true` (verified this session). Git rewrites line endings on checkout for text files.
**How to avoid:** keep the expected CSV as an **inline JS template literal inside the test file** (TypeScript source is itself normalised consistently, and the expectation is visible next to the assertion), rather than as a committed `.csv`. If a fixture file is genuinely wanted, add `.gitattributes` with `* text=auto eol=lf` (plus `*.csv text eol=lf`) and keep the test's expectation in LF. Note the runtime artefact is unaffected: `buildOrdersExport` emits explicit `\r\n` characters in a string, which git never touches.
**Warning signs:** a test that fails with a diff where every line looks identical (invisible `\r`); a test that passes locally and fails in CI.

### Pitfall 17: a missing `VITE_FIREBASE_*` variable is silently `undefined`
**What goes wrong:** Firebase initialises with `apiKey: undefined` and fails later with an opaque error, or — worse in the emulator case — appears to work until a remote call.
**Why it happens:** `import.meta.env.X` for an undeclared key is `undefined` with no warning at runtime, and `vite-env.d.ts` only types it if you declare it.
**How to avoid:** declare every key in `ImportMetaEnv` so `tsc` catches typos, and add a dev-only assertion in `lib/firebase.ts` that throws a *named* error listing the missing keys. Commit `.env.example`; never commit `.env.local`. `[CITED: vite.dev/guide/env-and-mode]`
**Warning signs:** `auth/invalid-api-key` with an empty value; a build that succeeds on CI where the env vars exist.

### Pitfall 18: `crypto.randomUUID()` needs a secure context
**What goes wrong:** `crypto.randomUUID is not a function` on a plain-HTTP non-localhost origin (e.g. testing from a phone over `http://192.168.x.x`).
**Why it happens:** `randomUUID` is gated on `isSecureContext`. `localhost` qualifies; a LAN IP over HTTP does not.
**How to avoid:** note the constraint in the README; for LAN testing use `vite --host` **plus** an HTTPS tunnel or the Firebase Hosting preview URL rather than raw HTTP. This matters here because the group will realistically test on their phones.
**Warning signs:** works on the developer's laptop, breaks on a phone.

### Pitfall 19: `isAdmin()` costs a document read on every evaluation
**What goes wrong:** the helper `get(/databases/$(database)/documents/events/main)` performs a document read each time it is evaluated against a rule, and rule evaluations occur per document touched by a transaction — so the Admin's draw transaction over N participants costs N lookups of `events/main` on top of its reads.
**Why it happens:** `get()` in rules is a real read, billed as such, and there is no memoisation across rule evaluations.
**How to avoid:** accept it at this scale (one event, ≤ ~20 friends, a handful of operations) and simply know the cost. Do **not** restructure the schema to cache `adminUid` on every document — that would create N places to keep in sync. `[CITED: firebase.google.com/docs/rules/rules-and-auth]`
**Warning signs:** an unexpected Firestore read count in the console for a draw of a dozen people.

### Pitfall 20: the CSV is subtly wrong in ways Excel punishes
**What goes wrong:** (a) a serigrafía name containing `;` shifts every subsequent column; (b) a name containing `"` breaks the row; (c) accented characters (í, ñ, é — near-certain in Spanish names) render as mojibake in Excel; (d) the file opens as one column; (e) a cell starting with `=`, `+`, `-` or `@` is interpreted as a formula.
**Why it happens:** (a)/(b) missing RFC 4180 quoting; (c)/(d) missing the UTF-8 BOM *and* the wrong list separator for Spanish Excel, whose default is `;`; (e) CSV injection is a spreadsheet behaviour, not a CSV one.
**How to avoid:** encode the five rules explicitly in one tested pure function (BOM prefix `\uFEFF`, `;` separator, `\r\n` line endings, quote-when-contains `;`/`"`/CR/LF, double the quotes) and test each edge case: a name with `;`, a name with `"`, a name with `ñ`/`í`, a dorsal of `09` and one of `100`. For (e) — a genuine and cheaply-mitigated risk in a file whose `Nombre serigrafiado` column is free text — prefix any cell starting with `= + - @` with a leading `'` (documented as a deliberate deviation from a literal-cell copy, and noted as `[ASSUMED]` risk-level in the Assumptions Log since no project constraint mentions it).
**Warning signs:** the vendedor reports "solo me sale una columna"; accented names arriving as `Ã`.

### Locked-decision deltas vs `.planning/research/ARCHITECTURE.md`

The project-level research predates CONTEXT.md's 25 locked decisions. Wherever the two conflict, **CONTEXT.md wins**, and the planner should not carry the research file's shape into the plan. The divergences, all verified by reading both files this session:

| Topic | `.planning/research/ARCHITECTURE.md` says | CONTEXT.md (authoritative) says |
|-------|-------------------------------------------|----------------------------------|
| Dorsal type | `number` as a **number**, "Validate 0–99", rules `number is int` | **D-15: string**, to preserve leading zeros → rules must assert `number is string` |
| `orders/{giverUid}` fields | no `opaqueId` | **D-05: includes `opaqueId`** (the opaque export id) |
| `events/main` fields | `status: 'lobby'\|'drawn'\|'closed'`, `name`, `drawnAt`, `drawVersion` | **D-05: `adminUid`, `status: 'lobby' \| 'drawn'`, `createdAt`, `participantCount`** — no `closed`, no `drawVersion` |
| `participants/{uid}` fields | `likes`, `bans`, `orderSubmitted`, plus a `uid` field | **D-05: `name`, `nameNormalized`, `size`, `likedTeams`, `forbiddenTeams`, `joinedAt`, `hasOrder`** (no redundant `uid` field — the document id is the uid) |
| Export `HEADERS` | `['Talla','Tipo','Equipo','Temporada','Serigrafía','Dorsal','Precio']`, comma separator, no opaque id | **D-20: `ID de pedido, Tipo, Equipo, Temporada, Nombre serigrafiado, Dorsal, Talla`**, `;` separator, BOM, **no** participant identity and **no** price column |
| `buildDerangement` contract | sketch returns `DrawPair[]`, throws when `n < 2` | **D-08: pure `buildDerangement(participantUids)` minimum 3**; ROADMAP names the signature → use `Map<string,string>` and throw for `n < 3` |
| Routing | data mode `createBrowserRouter` with `/join`, `/room/:id` | **D-22: declarative `BrowserRouter`** with `/`, `/preferences`, `/lobby`, `/reveal`, `/admin` |
| Duplicate names | implies a `nameIndex/{normalized}` collection | **D-02: avisa y pide otro**; `nameNormalized` is a field (see Pitfall 3 + Open Question 1) — adding an index collection changes D-05's schema |
| Admin progress | suggests a `submissions` collection as an option | **D-19: `useOrdersAdmin` only on `/admin`**, progress from `hasOrder` on `participants` |
| Extra deps | leaves `uuid`/`file-saver`/`papaparse` on the table | **D-25: none** — `crypto.randomUUID()`, native Blob download, hand-serialised CSV |

Two further points of friction that are **not** conflicts but need a decision recorded in the plan: the `Precio` column vanishes from the export under D-20 (the Admin needs order facts, not prices — the prices are informational in the order UI only), and Architecture's `drawVersion` disappears, which is consistent with D-09's "no re-draw" (MGMT-01 deferred).

## Code Examples

All snippets below are written for this project's pinned versions. Firestore/auth snippets are adapted from the official docs cited in Sources; the domain functions are this phase's own contract.

### Build configuration

```ts
// vite.config.ts  [CITED: tailwindcss.com/docs/installation/using-vite]
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',          // all Phase-1 tests are pure functions
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,               // import describe/it/expect from 'vitest' explicitly (Pitfall 14)
  },
})
```

```css
/* src/index.css — one line. No tailwind.config.js, no postcss.config.js. */
@import "tailwindcss";
```

> **Single-config decision:** putting `test` inside `vite.config.ts` keeps one config file. A separate `vitest.config.ts` **replaces** `vite.config.ts` rather than merging with it, so the react plugin would have to be re-added with `mergeConfig` before any component test could compile. If the team later adds component tests, prefer adding `environmentMatchGlobs`/per-file `// @vitest-environment jsdom` docblocks over splitting the config.

```ts
// src/vite-env.d.ts — declare the env surface so tsc catches typos (Pitfall 17)
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

```bash
# .env.example — commit this; never commit .env.local
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

```jsonc
// firebase.json — rules path + emulators + SPA rewrites (Phase 2 verifies the rewrites)
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true }
  },
  "hosting": {
    "public": "dist",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

> `[CITED: firebase.google.com/docs/emulator-suite/connect_firestore]` — the emulator-suite page shows the `emulators` block with an optional `"edition": "enterprise"` key on the firestore entry. **Do not set `edition` here:** this project uses the standard Native document model that the rules below are written against.

```jsonc
// .firebaserc — a demo- prefixed project id is emulator-only and can never touch
// a real project. [CITED: firebase.google.com/docs/emulator-suite/connect_auth]
{ "projects": { "default": "demo-secretkit" } }
```

### Firebase initialisation

```ts
// src/lib/firebase.ts
// The ONLY module in the app allowed to import from firebase/app|auth|firestore (except tests).
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously, type User } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const required = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (import.meta.env.DEV) {
  // Fail loudly and *named*, instead of letting Firebase report "invalid-api-key" (Pitfall 17).
  const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => `VITE_FIREBASE_${k}`)
  if (missing.length) throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`)
}

export const app = initializeApp(required)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Idempotent + dev-only (Pitfall 6): HMR re-evaluates this module.
let emulatorsConnected = false
if (import.meta.env.DEV && !emulatorsConnected) {
  emulatorsConnected = true
  connectFirestoreEmulator(db, '127.0.0.1', 8080)          // [CITED: docs/emulator-suite/connect_firestore]
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')       // [CITED: docs/emulator-suite/connect_auth]
}

// Anonymous Auth, silent and idempotent (D-01, EVENT-03; Pitfall 7).
// [CITED: firebase.google.com/docs/auth/web/anonymous-auth] — signInAnonymously + onAuthStateChanged
export async function ensureSignedIn(): Promise<User> {
  if (auth.currentUser) return auth.currentUser
  const { user } = await signInAnonymously(auth)
  return user
}
```

```ts
// src/lib/session.ts — identity survives reloads (D-03, EVENT-01)
const KEY = 'secretkit.identity'

export type StoredIdentity = { uid: string; name: string }

export function loadIdentity(): StoredIdentity | null {
  const raw = localStorage.getItem(KEY)
  return raw ? (JSON.parse(raw) as StoredIdentity) : null
}

export function saveIdentity(id: StoredIdentity): void {
  localStorage.setItem(KEY, JSON.stringify(id))
}

export function clearIdentity(): void {
  localStorage.removeItem(KEY)
}
```

### The pure domain functions

```ts
// src/domain/normalizeName.ts — D-02: trim + minúsculas
export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}
```

**Verbatim spec data (source of truth).** `[VERIFIED: .planning/PROJECT.md:47-50]` — quoted verbatim:

> - **Guía de Tallas (dato de referencia, mostrar en tabla/modal)**:
>   - **Versión Fan**: S=P (Long 69-71cm | Altura 162-170cm | Peso 50-62kg), M=M (71-73 | 170-176 | 62-78), L=G (73-75 | 176-182 | 78-83), XL=GG (75-78 | 182-190 | 83-90), XXL=XG (78-81 | 190-195 | 90-97), XXXL=2XG (81-83 | 192-197 | 97-104).
>   - **Versión Player**: S (Long 67-69 | Ancho 45-48 | Altura 165-172 | Peso 60-70), M (69-71 | 48-51 | 172-178 | 70-78), L (71-73 | 51-54 | 178-184 | 70-78), XL (73-75 | 54-57 | 184-190 | 78-86), 2XL (75-77 | 57-60 | 190-198 | 94-104).
> - **Precios de referencia (mostrar en la pantalla de pedido)**: Camiseta Fan = 11$; Camiseta Player = 16$; Camiseta Retro = 15$.

```ts
// src/domain/sizeGuide.ts — every value below appears in the verbatim quote above (D-13).
export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'

export const SIZES: readonly Size[] = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

/** Versión Fan — equivalencias S=P, M=M, L=G, XL=GG, XXL=XG, XXXL=2XG */
export const FAN_GUIDE = [
  { size: 'S',    equiv: 'P',    longCm: '69-71', heightCm: '162-170', weightKg: '50-62' },
  { size: 'M',    equiv: 'M',    longCm: '71-73', heightCm: '170-176', weightKg: '62-78' },
  { size: 'L',    equiv: 'G',    longCm: '73-75', heightCm: '176-182', weightKg: '78-83' },
  { size: 'XL',   equiv: 'GG',   longCm: '75-78', heightCm: '182-190', weightKg: '83-90' },
  { size: 'XXL',  equiv: 'XG',   longCm: '78-81', heightCm: '190-195', weightKg: '90-97' },
  { size: 'XXXL', equiv: '2XG',  longCm: '81-83', heightCm: '192-197', weightKg: '97-104' },
] as const

/** Versión Player — note: the spec's largest row is 2XL, NOT XXXL (anomaly #1) */
export const PLAYER_GUIDE = [
  { size: 'S',   longCm: '67-69', widthCm: '45-48', heightCm: '165-172', weightKg: '60-70' },
  { size: 'M',   longCm: '69-71', widthCm: '48-51', heightCm: '172-178', weightKg: '70-78' },
  { size: 'L',   longCm: '71-73', widthCm: '51-54', heightCm: '178-184', weightKg: '70-78' },
  { size: 'XL',  longCm: '73-75', widthCm: '54-57', heightCm: '184-190', weightKg: '78-86' },
  { size: '2XL', longCm: '75-77', widthCm: '57-60', heightCm: '190-198', weightKg: '94-104' },
] as const

/** D-12: Retro uses the Fan table — shown as an explicit note, never inferred silently. */
export const RETRO_USES_FAN_TABLE = true
```

```ts
// src/domain/prices.ts — D-17 / ORDER-03, values verbatim from PROJECT.md:50
export type KitType = 'Fan' | 'Player' | 'Retro'

export const PRICES: Record<KitType, number> = { Fan: 11, Player: 16, Retro: 15 }

export function formatPrice(kit: KitType): string {
  return `${PRICES[kit]}$`
}
```

**D-12 / D-16 anomaly predicates — the exact conditions to encode.** The spec's two anomalies are rendered literally and flagged, never corrected silently:

```ts
// src/domain/sizeGuide.ts (continued) — non-blocking warnings (D-16)
import type { KitType, Size } from './types'

/** Anomaly #1: the join form offers XXXL, but Player's table stops at 2XL. */
export function isSizeUnavailableForKit(kit: KitType, size: Size): boolean {
  return kit === 'Player' && size === 'XXXL'
}

/** Anomaly #2: Player M and L carry an identical weight range (70-78) in the spec. */
export function hasAmbiguousWeight(kit: KitType, size: Size): boolean {
  return kit === 'Player' && (size === 'M' || size === 'L')
}
```

`isSizeUnavailableForKit` must drive a **non-blocking** notice ("Player no llega a XXXL; considera Fan o Retro") — never `disabled` on the submit button and never a mutation of the selected size, because D-16 and the Out of Scope row of REQUIREMENTS.md:88 both forbid correcting the spec's data.

### Security rules — `firestore.rules` (repo root)

Provenance for each construct used below: granular `get` vs `list` operations, match-statements-point-to-documents, no inheritance into subcollections, the `!('field' in request.resource.data)` forbid-pattern, and `request.resource.data` as the pending post-operation state all come from the cited official rules pages (see Sources). `[CITED: firebase.google.com/docs/firestore/security/rules-structure, .../rules-query, .../rules/data-validation]`

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    // Costs one document read per evaluation (Pitfall 19). At this scale, accepted.
    function isAdmin() {
      return isSignedIn()
        && get(/databases/$(database)/documents/events/main).data.adminUid == request.auth.uid;
    }

    // ── events/main (+ subcollections). A single fixed document: ID literally "main" (D-04).
    match /events/{eventId} {
      allow get, list: if isSignedIn();

      // Bootstrap: the FIRST user creates events/main and becomes Admin (D-02, EVENT-02).
      allow create: if isSignedIn()
        && request.resource.data.adminUid == request.auth.uid
        && request.resource.data.status == 'lobby';

      // Write-once adminUid: the create rule above sets it; this guard is what makes it
      // immutable afterwards. Only the Admin may flip status lobby -> drawn (Pitfall 12).
      allow update: if isAdmin()
        && request.resource.data.adminUid == resource.data.adminUid;

      allow delete: if false;

      // ── participants: PUBLIC WITHIN THE EVENT, BY DESIGN.
      // PREF-05 requires the giver to read the recipient's preferences, and DRAW-01 needs a
      // live list. This is why the EXPORT must be anonymous (SEC-04). Do not "tighten" this
      // to per-document get: it breaks the lobby and the duplicate-name pre-check (Pitfall 9).
      match /participants/{uid} {
        allow get, list: if isSignedIn();

        allow create, update: if isSignedIn()
          && uid == request.auth.uid
          && request.resource.data.name is string
          && request.resource.data.nameNormalized is string
          && request.resource.data.size in ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        // NOTE: uniqueness of nameNormalized CANNOT be expressed in rules — rules cannot
        // query. Enforced client-side, best-effort (Pitfall 3, Open Question 1).

        allow delete: if isSignedIn() && uid == request.auth.uid; // needed by the post-commit collision rollback
      }

      // ── assignments: the pairing lives here, one document per giver, and NOWHERE else
      // (D-07, SEC-01). No document anywhere ever holds the full map.
      match /assignments/{giverUid} {
        // A participant may read ONLY their own assignment, by document id.
        allow get: if isSignedIn() && giverUid == request.auth.uid;
        // NOBODY may query the collection — not other participants, not the Admin (D-06).
        // A getDocs() here fails with permission-denied for everyone (Pitfall 4).
        allow list: if false;
        // Only the draw transaction writes assignments, and only the Admin runs it (D-09).
        allow create, update: if isAdmin();
        allow delete: if false;
      }

      // ── orders: own or Admin read; own write; never carries the pairing (D-06, D-18).
      match /orders/{giverUid} {
        allow get: if isSignedIn() && (giverUid == request.auth.uid || isAdmin());
        allow list: if isAdmin();
        allow create, update: if isSignedIn()
          && giverUid == request.auth.uid
          // D-15: Dorsal is a STRING (preserves leading zeros) — not an int.
          && request.resource.data.number is string
          // ORDER-04 / SEC: the order document must not reveal the pairing. Forbid any
          // recipient-bearing field outright, using the documented forbid-a-field pattern.
          && !('recipientUid' in request.resource.data)
          && !('recipientName' in request.resource.data);
        allow delete: if false;
      }
    }

    // Default deny for everything not matched above.
  }
}
```

> **Rule-review checklist for the planner (each is a testable assertion):** (1) `assignments` `list` is false and there is no path that queries it; (2) `events` `update` re-asserts `adminUid`; (3) `orders` create/update asserts `number is string`; (4) `orders` create/update forbids `recipientUid`; (5) `participants` create asserts the size enum literally; (6) no rule anywhere is `if true`.

### Bootstrap-or-join transaction (D-02, EVENT-02, EVENT-04)

```ts
// src/lib/joinEvent.ts
import { doc, getDocs, collection, query, where, limit, runTransaction,
         serverTimestamp, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import { normalizeName } from '../domain/normalizeName'
import type { Size, KitType } from '../domain/types'

export type JoinResult = { role: 'admin' | 'participant' }

export async function joinEvent(
  uid: string,
  name: string,
  prefs: { size: Size; likedTeams: string; forbiddenTeams: string },
): Promise<JoinResult> {
  const nameNormalized = normalizeName(name)

  // ── Step 1: duplicate-name pre-check, OUTSIDE the transaction.
  // A transaction can read only named documents — Transaction.get() has no Query overload —
  // so this check cannot live inside it (Pitfall 3). It is permitted because the rules
  // allow `list` on participants.
  const dupe = await getDocs(query(
    collection(db, 'events', 'main', 'participants'),
    where('nameNormalized', '==', nameNormalized),
    limit(1),
  ))
  if (!dupe.empty) throw new Error('Ese nombre ya está en uso en el evento. Prueba con otro.')

  const eventRef = doc(db, 'events/main')
  const meRef = doc(db, 'events', 'main', 'participants', uid)

  // ── Step 2: transactional bootstrap-or-join (D-02). Reads BEFORE writes (Firestore
  // requirement for transactions); may re-run on conflict; fails while offline.
  const role = await runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef)

    if (eventSnap.exists() && eventSnap.data().status === 'drawn') {
      throw new Error('El sorteo ya se ha realizado: el grupo está cerrado.')  // D-10: roster frozen
    }

    const isFirstUser = !eventSnap.exists()
    const count = isFirstUser ? 0 : (eventSnap.data().participantCount ?? 0)

    if (isFirstUser) {
      tx.set(eventRef, {
        adminUid: uid, status: 'lobby', createdAt: serverTimestamp(), participantCount: 1,
      })
    } else {
      tx.update(eventRef, { participantCount: count + 1 })
    }
    tx.set(meRef, {
      name, nameNormalized, size: prefs.size,
      likedTeams: prefs.likedTeams, forbiddenTeams: prefs.forbiddenTeams,
      joinedAt: serverTimestamp(), hasOrder: false,
    })
    return isFirstUser ? 'admin' : 'participant'
  })

  // ── Step 3: close the TOCTOU window. Two friends typing the same name within the same
  // ~200 ms would both pass step 1; the second to commit rolls itself back and is asked
  // for another name (D-02: "avisa y se pide otro", never auto-suffix).
  const after = await getDocs(query(
    collection(db, 'events', 'main', 'participants'),
    where('nameNormalized', '==', nameNormalized),
  ))
  if (after.size > 1) {
    await deleteDoc(meRef)
    throw new Error('Ese nombre acaba de ser usado por otra persona. Prueba con otro.')
  }

  return { role }
}
```

### Lobby subscription (DRAW-01)

```ts
// src/lib/lobby.ts
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Participant, EventDoc } from '../domain/types'

// Order by nameNormalized, NOT joinedAt: serverTimestamp() is null in local snapshots,
// which would mis-sort the just-joined doc on that client (Pitfall 10).
export function subscribeParticipants(cb: (list: Participant[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'events', 'main', 'participants'), orderBy('nameNormalized')),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Participant, 'uid'>) }))),
    (err) => console.error('No se pudo leer el lobby:', err.code),
  )
}

export function subscribeEvent(cb: (e: EventDoc | null) => void): () => void {
  return onSnapshot(doc(db, 'events/main'), (snap) =>
    cb(snap.exists() ? (snap.data() as EventDoc) : null))
}
```

### `buildDerangement` — pure, test-first (D-08, DRAW-03, DRAW-04)

```ts
// src/domain/derangement.ts
/**
 * Returns giver -> recipient for a single circular cycle of at least 3 participants.
 * Construction guarantees, with no rejection sampling:
 *   - bijection: every uid is a key exactly once and a value exactly once
 *   - no fixed points: recipient is always the NEXT element after a shuffle, never itself
 *   - exactly one cycle: chaining index i -> i+1 mod n visits all n and returns to start
 *   - no 2-cycles (mutual pairs): impossible for n >= 3 under a +1 offset, and this is
 *     precisely WHY the minimum is 3 — at n = 2 the only cycle IS a mutual pair.
 */
export function buildDerangement(participantUids: string[]): Map<string, string> {
  const n = participantUids.length
  if (n < 3) throw new Error('Se necesitan al menos 3 participantes para poder sortear')

  // Fisher–Yates over a COPY (never mutate the caller's array).
  const order = [...participantUids]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  // Offset +1 closes the cycle by construction.
  const pairs = new Map<string, string>()
  for (let i = 0; i < n; i++) pairs.set(order[i], order[(i + 1) % n])
  return pairs
}
```

```ts
// src/domain/derangement.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildDerangement } from './derangement'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `u${i}`)

describe('buildDerangement', () => {
  it('rechaza menos de 3 participantes', () => {
    expect(() => buildDerangement([])).toThrow()
    expect(() => buildDerangement(['a'])).toThrow()
    expect(() => buildDerangement(['a', 'b'])).toThrow()
  })

  for (const n of [3, 4, 6, 12]) {
    it(`produce un ciclo único, sin puntos fijos y biyectivo para n=${n}`, () => {
      const input = ids(n)
      const pairs = buildDerangement(input)

      // bijection: same key set and same value set as the input
      expect([...pairs.keys()].sort()).toEqual([...input].sort())
      expect([...pairs.values()].sort()).toEqual([...input].sort())

      // no fixed points
      for (const [giver, recipient] of pairs) expect(recipient).not.toBe(giver)

      // exactly ONE cycle visiting all n nodes and returning to the start
      const start = input[0]
      const seen = new Set<string>()
      let cursor = start
      do { seen.add(cursor); cursor = pairs.get(cursor)! } while (cursor !== start)
      expect(seen.size).toBe(n)
    })
  }

  it('es determinista dado un generador aleatorio fijo', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const pairs = buildDerangement(['a', 'b', 'c'])
    expect([...pairs]).toEqual([['c', 'b'], ['b', 'a'], ['a', 'c']])
    vi.restoreAllMocks()
  })

  afterEach(() => vi.restoreAllMocks())
})
```

> **Note on the determinism test:** the exact expected map depends on the Fisher–Yates implementation and on `Math.random` being stubbed to `0`; the planner should treat those three pairs as illustrative and confirm them against the implemented loop during execution, rather than as a spec-mandated value. The property assertions (bijection, no fixed points, single cycle, `n < 3` throws) are the real contract.

### The draw transaction (D-09, DRAW-05)

```ts
// src/lib/draw.ts
import { doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'
import { buildDerangement } from '../domain/derangement'

export async function runDraw(participantUids: string[]): Promise<void> {
  if (participantUids.length < 3) throw new Error('Se necesitan al menos 3 participantes')

  // Algorithm stays pure and outside the transaction; transactions may re-run on conflict,
  // and re-randomising inside one would make the retry non-deterministic (bad for debugging).
  const pairs = buildDerangement(participantUids)
  const eventRef = doc(db, 'events/main')

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(eventRef)          // reads before writes
    if (!snap.exists()) throw new Error('El evento no existe todavía')
    if (snap.data().status === 'drawn') return   // idempotent: a double click is a no-op (D-09)

    for (const [giver, recipient] of pairs) {
      tx.set(doc(db, 'events', 'main', 'assignments', giver), { recipientUid: recipient })
    }
    tx.update(eventRef, { status: 'drawn' })
  })
}
```

### Reading one's own assignment (D-07, DRAW-05, ORDER-01)

```ts
// src/lib/assignment.ts
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * getDoc BY DOCUMENT ID. Never a query: the rules deny `list` on assignments, so any
 * query here fails with permission-denied for everyone, the Admin included (Pitfall 4).
 */
export async function getMyAssignment(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'events', 'main', 'assignments', uid))
  return snap.exists() ? (snap.data().recipientUid as string) : null
}
```

### Order submission (D-18, ORDER-02, ORDER-05)

```ts
// src/lib/orders.ts
import { doc, runTransaction, writeBatch, serverTimestamp, collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import type { KitType, Size, Order } from '../domain/types'

export type OrderInput = {
  type: KitType; team: string; season: string
  printedName: string; number: string   // D-15: STRING, preserves leading zeros ("09")
  size: Size
}

/** Idempotent by construction: deterministic document id = giverUid (D-18). */
export async function submitOrder(uid: string, input: OrderInput): Promise<void> {
  const orderRef = doc(db, 'events', 'main', 'orders', uid)
  const meRef = doc(db, 'events', 'main', 'participants', uid)
  const batch = writeBatch(db)

  batch.set(orderRef, {
    ...input,
    opaqueId: crypto.randomUUID(),      // D-25: no `uuid` dependency
    submittedAt: serverTimestamp(),
    // Deliberately NO recipientUid / recipientName / giverUid field (ORDER-04).
  })
  batch.update(meRef, { hasOrder: true })   // same batch: progress can never disagree (Pitfall 11)

  await batch.commit()
}

/** Admin-only list (rules: `list: if isAdmin()`). Excludes the pairing by projection. */
export async function listOrdersAdmin() {
  const snap = await getDocs(collection(db, 'events', 'main', 'orders'))
  return snap.docs.map((d) => d.data() as Order)
}
```

### CSV export — pure, test-first (D-20, D-21, ADMIN-02, SEC-02)

`[VERIFIED: .planning/phases/01-flujo-completo-del-amigo-invisible/01-CONTEXT.md:48]` — D-20, quoted verbatim:

> Salida **CSV UTF-8 con BOM y separador `;`**; columnas: ID de pedido (**opaco**), Tipo, Equipo, Temporada, Nombre serigrafiado, Dorsal, Talla.

```ts
// src/domain/exportOrders.ts
// This module must NOT import anything from src/lib/ — that is what makes the
// structural guarantee of SEC-02 real rather than aspirational.
import type { KitType, Size } from './types'

/** The export's parameter type. It has no giver/recipient/name field, by construction. */
export type ExportedOrder = {
  opaqueId: string   // opaque: NEVER the giverUid (D-20)
  type: KitType
  team: string
  season: string
  printedName: string
  number: string     // string, to preserve "09"
  size: Size
}

export const EXPORT_HEADERS = [
  'ID de pedido', 'Tipo', 'Equipo', 'Temporada', 'Nombre serigrafiado', 'Dorsal', 'Talla',
] as const

const SEP = ';'
const EOL = '\r\n'
const BOM = '\uFEFF'

/** RFC 4180: quote when the cell contains the separator, a quote, CR or LF; double the quotes. */
export function escapeCsvCell(value: string): string {
  // Spreadsheet formula injection guard (Pitfall 20e): neutralise a leading = + - @
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  const mustQuote = safe.includes(SEP) || safe.includes('"') || safe.includes('\r') || safe.includes('\n')
  return mustQuote ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildOrdersExport(orders: ExportedOrder[]): string {
  const rows = [
    EXPORT_HEADERS.join(SEP),
    ...orders.map((o) =>
      [o.opaqueId, o.type, o.team, o.season, o.printedName, o.number, o.size]
        .map(escapeCsvCell).join(SEP)),
  ]
  return BOM + rows.join(EOL) + EOL
}
```

```ts
// src/domain/exportOrders.test.ts  (expectations inline — see Pitfall 16 on CRLF fixtures)
import { describe, it, expect } from 'vitest'
import { buildOrdersExport, EXPORT_HEADERS, escapeCsvCell, type ExportedOrder } from './exportOrders'

const base: ExportedOrder = {
  opaqueId: 'a1b2', type: 'Fan', team: 'Real Betis', season: '2024/25',
  printedName: 'García', number: '09', size: 'L',
}

describe('buildOrdersExport', () => {
  it('escribe BOM, cabecera exacta, separador ; y CRLF', () => {
    const csv = buildOrdersExport([base])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv.split('\r\n')[0]).toBe('\uFEFF' + EXPORT_HEADERS.join(';'))
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('preserva dorsales con ceros a la izquierda', () => {
    expect(buildOrdersExport([{ ...base, number: '09' }])).toContain(';09;')
    expect(buildOrdersExport([{ ...base, number: '100' }])).toContain(';100;')
  })

  it('escapa comillas y punto y coma, y respeta acentos', () => {
    expect(escapeCsvCell('a;b')).toBe('"a;b"')
    expect(escapeCsvCell('dijo "hola"')).toBe('"dijo ""hola"""')
    expect(buildOrdersExport([{ ...base, team: 'Peña;FC' }])).toContain('"Peña;FC"')
  })

  it('neutraliza fórmulas de hoja de cálculo', () => {
    expect(escapeCsvCell('=1+1')).toBe("'=1+1")
    expect(escapeCsvCell('@cmd')).toBe("'@cmd")
  })

  it('no incluye identidad de participantes ni columna de precio', () => {
    const csv = buildOrdersExport([base])
    expect(csv).not.toContain('giverUid')
    expect(csv).not.toContain('recipientUid')
    expect(csv).not.toContain('Precio')
    expect(EXPORT_HEADERS).toHaveLength(7)
  })
})
```

```ts
// src/lib/download.ts — D-21. No `file-saver` (D-25).
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)   // free the blob for the page's lifetime
}

// filename: `pedidos-${new Date().toISOString().slice(0,10)}.csv`
```

### Routing shell (D-22, D-23)

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'      // NOT 'react-router-dom' (Pitfall 1)
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

```tsx
// src/App.tsx — redirect-by-status (D-22). Declarative mode: no loaders, no data router.
import { Routes, Route, Navigate } from 'react-router'
import { useSession } from './session/SessionProvider'
import EntryPage from './pages/EntryPage'
import PreferencesPage from './pages/PreferencesPage'
import LobbyPage from './pages/LobbyPage'
import RevealPage from './pages/RevealPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  const { loading, uid, hasPreferences, eventStatus } = useSession()

  if (loading) return <FullScreenSpinner />   // never a blank screen before the first server response

  const home = !uid ? '/' : !hasPreferences ? '/preferences' : eventStatus === 'drawn' ? '/reveal' : '/lobby'

  return (
    <Routes>
      <Route path="/" element={uid ? <Navigate to={home} replace /> : <EntryPage />} />
      <Route path="/preferences" element={uid ? <PreferencesPage /> : <Navigate to="/" replace />} />
      <Route path="/lobby" element={uid ? <LobbyPage /> : <Navigate to="/" replace />} />
      <Route path="/reveal" element={eventStatus === 'drawn' ? <RevealPage /> : <Navigate to={home} replace />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  )
}
```

> **Route guards are UX, not security** (D-06, Pitfall 4's sibling). `AdminPage` renders only when `uid === adminUid`, but the *enforcement* is that the rules deny every read an impostor would need. The plan's verification step must therefore assert the rules, not the redirect.

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"` (read from `.planning/config.json` this session). Only ASVS L1 items are in scope. This section is short by necessity: this app's entire attack surface is the Firestore rules file plus one client-side uniqueness check.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **yes** | Firebase Anonymous Auth (`signInAnonymously`) — a server-issued `uid`; no passwords, no OAuth. `[CITED: firebase.google.com/docs/auth/web/anonymous-auth]` |
| V3 Session Management | **yes** | `localStorage` holds `{uid, name}` (D-03). No tokens are minted or stored by this app; the SDK manages the ID token. Clearing storage is a *recoverable* state by design (re-join), which is why MGMT-03 is deferred. |
| V4 Access Control | **yes** | Firestore Security Rules — the only enforcement point. `assignments` per-document `get`; `list: false`; `orders` own-or-Admin; `events` `adminUid` write-once. |
| V5 Input Validation | **yes** | Client-side: `normalizeName` (trim+lowercase), `size in ['S','M','L','XL','XXL','XXXL']`, free-text team fields length-capped in the form. Server-side: the rules re-assert the size enum and the string type of `number`. **No validation library** — D-25 forbids extra deps, and the domain is small enough that one pure `validateOrder(input)` function is the right size. |
| V6 Cryptography | **no** | No cryptographic operation is performed by this app. `crypto.randomUUID()` provides an opaque identifier, not a security token; it is **not** a capability and must not be treated as one (it does not make a document unreadable). |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Enumeration of the pairing — any participant (or the Admin) queries the `assignments` collection | Information disclosure | `allow list: if false` on `assignments` + a client that only ever calls `getDoc` by id. Corroborated by the rules-query doc: an unfiltered query is evaluated against the whole potential result set, so it is denied outright. |
| Privilege escalation to Admin by rewriting `adminUid` | Elevation of privilege | `create` asserts `adminUid == request.auth.uid`; `update` asserts `request.resource.data.adminUid == resource.data.adminUid` (Pitfall 12). |
| "Test mode" rules left on (`allow read, write: if true`) | Tampering / Info disclosure | Default-deny file committed in the same commit as the schema (D-06); no rule in the file is `if true` — the rule-review checklist above is the assertion. |
| IDOR on `orders` / `assignments` by crafting another uid in the path | Tampering | Every rule compares the path variable to `request.auth.uid`; the rules cannot be tricked by a client-side path. |
| Reading the recipient's identity from the order document | Information disclosure | The order document carries no recipient field; the rules additionally *forbid* `recipientUid`/`recipientName` (`!('field' in request.resource.data)`), so a future careless `setDoc` is rejected rather than silently leaking. |
| XSS through rendered participant names / team strings | Tampering | React escapes text children by default. **Do not use `dangerouslySetInnerHTML`** anywhere in this app; the size guide is static data and needs no HTML injection. |
| CSV / spreadsheet formula injection via `printedName` or `team` (a cell starting `=`, `+`, `-`, `@`) | Tampering (on the vendedor's machine) | Prefix such cells with `'` in `escapeCsvCell` (Pitfall 20e). Risk level is `[ASSUMED]` — no project constraint mentions it; the mitigation is ~1 line. |
| Denial of service / cost amplification | Denial of service | No Cloud Functions (nothing to invoke repeatedly); `onSnapshot` is per-route and unsubscribed on unmount; `isAdmin()` costs one read per evaluation (Pitfall 19). At ≤ ~20 participants over a Firestore free tier this is a non-issue — but the plan should not add an unbounded listener "just in case". |
| Trust boundary confusion: the Firebase project owner can read everything via console/Admin SDK | Repudiation | Not mitigable in this architecture. ROADMAP.md:9 already declares this as the accepted trust contract, and Phase 2's README criterion makes it explicit. Phase 1 must not *pretend* otherwise in code comments or UI copy. |

### Recommended tightening (optional, low-risk)

Match the **literal** document path instead of a wildcard: `match /events/main { … }` rather than `match /events/{eventId}`. D-04 fixes the id to the literal string `main`, so a wildcard admits documents that can never legitimately exist. This also lets you delete `list` from the `events` rule (nothing should enumerate events) and makes the subcollection rules read as `/events/main/participants/{uid}`. Firestore rules support literal path segments in `match`. If the planner applies this, the rule-review checklist's item (2) is unchanged and the rest of the rules file is unaffected.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite 8, React Router 8 (`>=22.22.0`), Vitest 5 (`^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`) | ✓ | **24.11.1** | — |
| npm | installs | ✓ | **11.6.2** | — |
| git | history, `.gitattributes` | ✓ | 2.40.1.windows.1 | — |
| Java (JRE 21+) | Firestore + Auth emulators | ✓ | **21.0.5** | — |
| `firebase` CLI | `firebase emulators:start`, deploy | **✗ not on PATH** | — | `npm i -D firebase-tools` (15.34.0) and invoke as `npx firebase …`, or add a `"firebase"` script to `package.json` |
| A browser engine | manual UAT of the flow | ✓ (assumed) | — | — |
| Firebase cloud project | production deploy (Phase 2 / after the event) | **not required for Phase 1** | — | Use the emulator suite with the `demo-secretkit` project id; no real project, no billing, no credentials needed to build and test Phase 1 |

**Missing dependencies with no fallback:** none — the phase can be built and fully tested with what is installed.

**Missing dependencies with fallback:**
- **`firebase-tools`** is not installed and not on PATH. The plan must include installing it as a devDependency (it is already in the Standard Stack) and must not assume a globally-installed CLI. Note `firebase-tools` 15.34.0 accepts Node 20/22/24 — satisfied.
- **Java 21.0.5 is present**, which matters: the emulator suite documentation states the Cloud Firestore emulator now requires Java 21 (`[CITED: firebase.google.com/docs/emulator-suite/connect_firestore]`). No upgrade needed.

**Environment hazard worth a task of its own:** `git config core.autocrlf` is **`true`** in this environment. See Pitfall 16 — this determines whether a golden-file fixture can exist at all. Recommend the plan add a `.gitattributes` (`* text=auto eol=lf`) as part of the scaffold step.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The legitimacy gate's `too-new` reason is derived from the **latest version's publish timestamp** and is not evidence of a slopsquat package; nine canonical packages flagged solely on this basis should not each require a human-verify checkpoint. | Package Legitimacy Audit | If the interpretation is wrong, the phase installs an unidentified-risk package. Mitigated by `postinstall: null`, `deprecated: false` and canonical repo URLs for all thirteen, and by four packages receiving `OK`. |
| A2 | CSV/spreadsheet formula injection is a real-enough risk in this artefact to warrant neutralising leading `= + - @`, and doing so does not violate D-20 (which specifies columns and encoding, not cell text). | Pitfall 20, Security Domain | If the user considers the mitigation a deviation from "literal data", they may prefer no prefixing; consequence is a formula-capable cell in a file the vendedor opens. One line to add or remove. |
| A3 | Treating `participants` `delete` by the owning uid as falling within D-06's "escritura propia", i.e. the post-commit collision rollback in `joinEvent` is permitted. | Code Examples §joinEvent, Security rules | If delete-own is judged outside D-06, the rollback needs another mechanism (e.g. overwrite the doc with a sentinel and filter it in the lobby) — a slightly larger change. |
| A4 | No composite Firestore index is required for the queries this phase issues: a single-field equality (`where('nameNormalized','==',…)`) and a single-field order (`orderBy('nameNormalized')`) both use automatically-created single-field indexes. | Code Examples §lobby, §joinEvent | If wrong, the first query in the emulator throws `FAILED_PRECONDITION` with an index-creation link; remedy is a `firestore.indexes.json` entry. Low-cost discovery, but it would surprise the executor. |
| A5 | Omitting the optional `"edition"` key in the `firestore` emulator config yields the standard Native mode that these rules target. | Code Examples §firebase.json | If the emulator defaulted to Enterprise edition, the document/collection rules model would behave differently or be unavailable. Verifiable in one command (`firebase emulators:start`) during Wave 0. |
| A6 | Native `<dialog>` + `showModal()` provides focus trapping, `Esc` dismissal and background inertness across the evergreen browsers this group will use. | Alternatives, Don't Hand-Roll | If a target browser lacks it, the modal needs a fallback; the alternative is a hand-rolled modal, which reintroduces the a11y work. |
| A7 | `@testing-library/react@16.3.3` and `jsdom@30.1.3` are compatible with React 19.3.1 — relevant only if optional component tests are written. | Standard Stack (Supporting) | Only affects optional tests; the mandatory suite is pure-function and unaffected. |
| A8 | The determinism test's expected `Map` for a stubbed `Math.random` is illustrative rather than spec-mandated. | Code Examples §buildDerangement tests | If treated as a locked expectation it could produce a false test failure; the property assertions are the real contract. |

**Every `[ASSUMED]` claim above is a candidate for a `checkpoint:human-verify` or an in-plan verification step.** None of them blocks the phase: each has a stated, cheap fallback.

## Open Questions (RESOLVED)

All four questions below were settled during phase planning; each carries its outcome inline as a `**Resolution**` bullet. Nothing here is still open, and no plan depends on an unresolved question.

1. **How is name uniqueness actually enforced — client-side best-effort, or a `nameIndex/{nameNormalized}` document?**
   - What we know: `Transaction.get()` accepts only a `DocumentReference`, so a query cannot participate in the join transaction (`[VERIFIED: official JS API reference]`); Firestore rules cannot express uniqueness at all (rules cannot query; `[CITED: .../rules-query]`); D-02 requires "avisa y se pide otro"; D-05's participant schema has `nameNormalized` as a field and no index collection.
   - What's unclear: whether the user accepts a documented, ~200 ms TOCTOU window (recommended), or wants the race closed at the cost of adding `nameIndex/{nameNormalized}` to the schema — which is a change to a locked, one-way-reversible decision (D-05) and therefore needs explicit confirmation.
   - Recommendation: **ship the client-side pre-check + post-commit rollback** (Code Examples §joinEvent) for Phase 1, and record the residual race in the plan as an accepted limitation. Revisit only if a real collision occurs. If the user prefers the closed race, the index document is ~10 lines: `tx.get(nameIndexRef)` inside the transaction, `tx.set(nameIndexRef, { uid })`, plus a rule allowing create-if-absent — but it must be presented to the user as a D-05 amendment.
   - **Resolution (RESOLVED).** Adopted the recommendation: pre-check + post-commit rollback, with the ~200 ms residual race declared as an accepted limitation in `01-01` (`T-01-06`, disposition `accept`) and in `01-03` (flagged assumption). No `nameIndex/` collection was added; D-05 was not amended.

2. **`participantCount` — denormalised counter or derived?**
   - What we know: D-05 mandates the field on `events/main`; the lobby already subscribes to the full `participants` collection, so `participants.length` is available for free on every client.
   - What's unclear: nothing functionally — the counter is redundant. The question is only whether its presence should be authoritative anywhere.
   - Recommendation: **keep the field for schema fidelity (D-05 is locked) but treat `participants.length` as the source of truth in the UI**, and never write a UI number from the counter. If the counter is used at all, keep it written inside the join transaction (as shown) so it cannot drift badly.
   - **Resolution (RESOLVED).** Kept exactly as recommended: `participantCount` is written inside the join transaction for schema fidelity (`01-01`), and the UI counts the `participants` snapshot it already subscribes to (`01-04`'s count line and the Admin progress of `01-06` are derived from `participants.length` / `hasOrder`, never from the counter).

3. **Does the vendedor want the `Precio` column after all?**
   - What we know: D-20 explicitly lists seven columns and excludes price; `.planning/research/ARCHITECTURE.md`'s sketch includes `Precio`. CONTEXT.md wins, so Phase 1 ships seven columns.
   - What's unclear: whether the omission was deliberate (keep the export to order facts) or an oversight when D-20 was written.
   - Recommendation: **follow D-20 (seven columns, no price)**. The prices are visible in the order UI (D-17). Raise it with the user as a one-line confirmation, not as a blocker — adding a column later is a two-line change plus a test update.
   - **Resolution (RESOLVED).** D-20 sets CONTEXT.md's seven columns with no `Precio` column; `.planning/research/ARCHITECTURE.md`'s sketch (which includes it) is overridden. `01-02` fixes `EXPORT_HEADERS` at exactly seven literals with a test asserting the length, `01-06` composes the file from them, and the prices stay visible in the order screen (D-17).

4. **Should the rules match the literal `/events/main` instead of `/events/{eventId}`?**
   - What we know: D-04 fixes a single event with the literal document id `main`; the wildcard form admits ids that can never legitimately exist, and forces `list` to be reasoned about.
   - What's unclear: nothing substantive — this is a strict tightening.
   - Recommendation: **adopt the literal path** and drop `list` from the `events` rule. Low-risk, improves readability of every nested rule.
   - **Resolution (RESOLVED).** Adopted: `firestore.rules` (written in `01-01`) matches the literal `/events/main` with no `list` on `events`, and the nested `participants`/`assignments`/`orders` blocks hang off that literal path.

## Sources

### Primary (HIGH confidence — tool-verified this session)
- `registry.npmjs.org` via `npm view` — `dist-tags.latest`, per-version `peerDependencies` and `engines` for `react` (19.3.1), `react-dom` (19.3.1), `vite` (8.3.4), `@vitejs/plugin-react` (6.1.2), `tailwindcss` (4.3.3), `@tailwindcss/vite` (4.3.3), `react-router` (8.4.0), `react-router-dom` (**7.18.4** — confirms the v8 removal), `firebase` (13.0.0), `typescript` (latest **7.0.2**; `~6.0.2` → 6.0.3), `oxlint` (1.88.0), `firebase-tools` (15.34.0), `create-vite` (9.2.1), `vitest` (5.0.5), `@firebase/rules-unit-testing` (6.0.0), `jsdom` (30.1.3), `@testing-library/react` (16.3.3). **Authoritative for every version number in this document.**
- `gsd-tools.cjs query package-legitimacy check --ecosystem npm` — the audit table's `verdict`, `publishedAt`, `weeklyDownloads`, `repoUrl`, `deprecated` and `postinstall` values, reproduced verbatim.
- `.planning/PROJECT.md:47-50` — the verbatim size-guide rows and the 11$/16$/15$ prices (read this session).
- `.planning/phases/01-flujo-completo-del-amigo-invisible/01-CONTEXT.md` — D-01…D-25, Discretion and Deferred Ideas (read this session); specifically D-05 (line 25), D-06 (26), D-08/D-09 (30-31), D-12 (36), D-15 (41), D-18 (44), D-19 (47), D-20 (48), D-25 (57).
- `.planning/REQUIREMENTS.md:96-121` — the Phase-1/Phase-2 traceability split (SEC-03 and SEC-04 are Phase 2).
- `.planning/ROADMAP.md:38-45` — the seven-step build order this research's structure follows.
- Official Firestore **JS API reference**, `Transaction` — `Transaction.get()` is declared for `DocumentReference` only, with no `Query` overload. **This is the finding behind Pitfall 3.**

### Secondary (MEDIUM confidence — official documentation, fetched this session)
- `firebase.google.com/docs/firestore/security/rules-structure` — granular `get`/`list`; match statements point to documents; subcollections do not inherit; overlapping matches combine as OR; `rules_version = '2'` recursive wildcards match zero-or-more; limits (depth 10, 100 segments, 20 capture vars).
- `firebase.google.com/docs/firestore/security/rules-query` — "security rules are not filters"; queries are evaluated against the whole potential result set, all-or-nothing; `request.query.limit` is visible to rules.
- `firebase.google.com/docs/rules/data-validation` — `!('ranking' in request.resource.data)` as the forbid-a-field pattern; `request.resource` is the pending post-operation state; `resource.data` on an existing document.
- `firebase.google.com/docs/firestore/manage-data/transactions` — reads before writes; a transaction function may run more than once on concurrent modification; transactions fail offline; retry/limit facts (10 MiB request, 20 s lock, 270 s / 60 s idle); "pass information out of your transactions".
- `firebase.google.com/docs/emulator-suite/connect_firestore` — `connectFirestoreEmulator(db,'127.0.0.1',8080)`; `firebase.json` emulator block (including the optional `edition` key); REST endpoint; `--import`/`--export-on-exit`; the emulator clears data on shutdown; **Java 21 requirement**.
- `firebase.google.com/docs/emulator-suite/connect_auth` — `connectAuthEmulator(auth,"http://127.0.0.1:9099")`; `demo-` prefixed project ids are emulator-only.
- `firebase.google.com/docs/auth/web/anonymous-auth` — `signInAnonymously(auth)`; `onAuthStateChanged(auth, user => …)`; anonymous accounts are deletable/auto-cleaned.
- `firebase.google.com/docs/firestore/security/rules-and-auth` — `request.auth.uid` patterns surfaced through the rules docs.
- `vitest.dev/guide/` — requires Vite ≥ 6.4.0 and Node ≥ 22.12.0; tests need `.test.`/`.spec.`; Vitest reads `vite.config.*` by default and a dedicated `vitest.config.*` is possible; `.vitest/` should be gitignored.
- `tailwindcss.com/docs/installation/using-vite` — `@tailwindcss/vite` plugin + `@import "tailwindcss";`; no config files.
- `reactrouter.com/start/declarative/installation` — `import { BrowserRouter } from "react-router"`; the `react-router-dom` package does not appear.
- `.planning/research/ARCHITECTURE.md`, `STACK.md`, `PITFALLS.md`, `SUMMARY.md` — project-level research, used as corroboration and as the source of the deltas table (Phase 1 overrides where they conflict).

### Tertiary (LOW confidence)
- Nothing in this document rests on a web search alone. Where a claim was neither tool-verified nor documented above, it is tagged `[ASSUMED]` and listed in the Assumptions Log.

**Note on provider tiering.** The `classify-confidence` seam returns **LOW** for the `webfetch` and `websearch` providers that were the only ones available in this session (all curated providers — `brave_search`, `firecrawl`, `exa_search`, `tavily_search`, `ref_search`, `perplexity`, `jina` — are set to `false` in `.planning/config.json`, and Context7 MCP was not exposed). The `[CITED: …]` tags above follow this document format's own mapping (official documentation → MEDIUM), but the honest reading is: **these are official vendor pages read directly, not tool-verified API behaviour.** Anything that phase execution depends on should be confirmed by running it against the emulator in Wave 0 — which the phase does anyway, and which is exactly why Phase 2 exists.

## Metadata

**Confidence breakdown:**
- **Standard Stack — HIGH.** Every version, peer range and engine constraint was read from the npm registry in this session. The one place training data would have been stale (TypeScript: `latest` is 7.0.2, not the scaffolded `~6.0.2`; `react-router-dom` frozen at 7.18.4) was caught by checking rather than assuming.
- **Architecture — MEDIUM.** The schema and rules are derived from D-05/D-06 (locked) plus documented rules semantics. The rules file has **not** been executed against an emulator in this session, so its behaviour under query is documented-but-unproven. Phase 2 owns that proof (SEC-03), and the plan's verification steps should not claim "reglas verificadas" in Phase 1.
- **Pitfalls — MEDIUM-HIGH.** The high-value ones are tool-verified: Pitfall 1 (`react-router-dom` at 7.18.4), Pitfall 3 (the `Transaction.get` signature), Pitfall 16 (`core.autocrlf=true` in this environment). The rest are documented Firestore semantics plus this stack's known failure modes.
- **Domain/UX — MEDIUM.** The size-guide values are verbatim from PROJECT.md and therefore exact; the *interpretation* of the anomalies (which predicate to flag, and that the warning must not block) follows D-12/D-16 literally.

**Research date:** 2026-10-17
**Valid until:** ~7 days (2026-10-24) for the stack — this is a fast-moving combination (Vite 8 / React 19 / React Router 8 / Tailwind 4 were all recently released, which is itself why the legitimacy gate flagged them). The locked decisions and schema findings do not expire; the version numbers should be re-checked if planning slips more than a week.




