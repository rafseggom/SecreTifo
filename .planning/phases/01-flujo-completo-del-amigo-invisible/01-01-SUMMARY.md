---
phase: 01-flujo-completo-del-amigo-invisible
plan: 01
subsystem: infra
tags: [vite, react, tailwind, react-router, firebase, firestore, emulator, anonymous-auth, security-rules, react-context]

requires: []
provides:
  - "Scaffold Vite 8 + React 19 + Tailwind v4 + React Router 8 + Firebase 13 que compila y empaqueta (tsc -b && vite build)"
  - "src/lib/firebase.ts — app/auth/db desde import.meta.env.VITE_FIREBASE_* con fallo nombrado y temprano si falta una variable"
  - "src/lib/session.ts — ensureSignedIn() (anónima, una sola vez), saveIdentity/loadIdentity/clearIdentity"
  - "src/domain/types.ts + src/domain/normalizeName.ts — el contrato de datos y el normalizador de nombres"
  - "firestore.rules — default-deny (assignments con list denegado, adminUid write-once, orders sin recipientUid) compiladas por el emulador"
  - "firebase.json / .firebaserc — emuladores sobre demo-secretkit + rewrite catch-all de hosting"
  - "src/lib/joinEvent.ts — transacción bootstrap-o-unión de tres pasos con rollback post-commit (TOCTOU)"
  - "src/lib/lobby.ts — subscribeParticipants (orden por nameNormalized) y subscribeEvent, ambos devolviendo su unsubscribe"
  - "src/session/SessionProvider.tsx — useSession() con role derivado de event.adminUid === uid"
  - "src/components/{Screen,Card,FullScreenSpinner,ErrorBoundary}.tsx y las versiones finas de S1/S2/S4"
affects: [01-02, 01-03, 01-04, 01-05, 01-06]

actuals:
  tokens: 14545
  tasks: 5
  commits: 5
plan_head_before: e77f3648c05ae7f341a687451750d1bf34df075d
plan_head_after: 763da877c598e2950e78af18d0a122b807ff873f
estimate_tokens: 96000

tech-stack:
  added: ["vite@^8.3.0", "@vitejs/plugin-react@^6.1.1", "react@^19.2.8", "react-dom@^19.2.8", "tailwindcss@^4.3.3", "@tailwindcss/vite@^4.3.3", "react-router@^8.4.0", "firebase@^13.0.0", "vitest@^5.0.5", "firebase-tools@^15.34.0", "oxlint@^1.81.0", "typescript@~6.0.2"]
  patterns:
    - "src/lib/ es el único directorio que importa de firebase/*"
    - "import * as x cuando un gate de forma cuenta un símbolo exactamente una vez en el archivo"
    - "tokens de diseño en @theme {} de src/index.css; clases literales de la paleta de Tailwind en el marcado"
    - "las guardas de ruta son UX; la autoridad es firestore.rules"
    - "un único <h1> por pantalla, propiedad de Screen; Display (28px) reservado a / y /reveal"

key-files:
  created:
    - "firestore.rules — default-deny, path literal /events/main, assignments list: if false"
    - "firebase.json, .firebaserc (demo-secretkit), .env.example, .gitattributes"
    - "src/domain/types.ts, src/domain/normalizeName.ts"
    - "src/lib/firebase.ts, src/lib/session.ts, src/lib/joinEvent.ts, src/lib/lobby.ts"
    - "src/session/SessionProvider.tsx"
    - "src/components/Screen.tsx, src/components/Card.tsx, src/components/FullScreenSpinner.tsx, src/components/ErrorBoundary.tsx"
  modified:
    - "package.json, vite.config.ts, index.html, src/index.css, .gitignore"
    - "src/main.tsx, src/App.tsx"
    - "src/pages/EntryPage.tsx, src/pages/PreferencesPage.tsx, src/pages/LobbyPage.tsx, src/pages/RevealPage.tsx, src/pages/AdminPage.tsx"

key-decisions:
  - "Reglas y contrato de datos escritos en el primer plan, junto al esquema (D-05/D-06 son one-way)"
  - "joinEvent hace el pre-chequeo de nombre fuera de la transacción porque Transaction.get() no acepta Query"
  - "El lobby ordena por nameNormalized y nunca por la marca de unión, que es null en la instantánea local"
  - "role se deriva de event.adminUid === uid en SessionProvider: el rol se calcula, no se almacena"
  - "SessionProvider pone loading:false cuando falla la resolución de identidad para que el spinner nunca gire para siempre"
  - "Namespace imports en session.ts/joinEvent.ts/LobbyPage.tsx para que los gates de forma (exactamente una llamada) puedan cumplirse"

patterns-established:
  - "Gates de forma: un node -e cuyo código de salida ES la aserción; los comentarios no pueden contener el literal vigilado"
  - "Toda animación (animate-spin/pulse) va acompañada de su contrapartida motion-reduce:animate-none"
  - "Los módulos que dependen de una variable de entorno fallan con el nombre de la variable, nunca con undefined silencioso"

requirements-completed: [EVENT-01, EVENT-02, EVENT-03]

coverage:
  - id: D1
    description: "El stack arranca: scaffold Vite 8 + React 19 + Tailwind v4 + React Router 8 + Firebase 13 que compila y empaqueta, sin tailwind.config.js ni postcss.config.js y sin react-router-dom"
    verification:
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
      - kind: other
        ref: "npm run build (exit 0, vite 8.3.4, 125 módulos)"
        status: pass
      - kind: other
        ref: "node -e shape gates: no tailwind/postcss config, no react-router-dom en package.json ni en src/**, @import \"tailwindcss\"; en la primera línea de src/index.css"
        status: pass
    human_judgment: false
  - id: D2
    description: "Identidad anónima silenciosa resuelta una sola vez y expuesta por useSession(); ninguna consulta sale con request.auth == null"
    requirement: EVENT-03
    verification:
      - kind: other
        ref: "node -e: exactamente una ocurrencia de signInAnonymously en src/lib/session.ts; auth.currentUser antes de la llamada"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (contrato de useSession consumido por App.tsx)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Security Rules default-deny escritas junto al esquema y compiladas por el Emulator Suite (assignments: list denegado, adminUid write-once, orders sin recipientUid)"
    requirement: EVENT-01
    verification:
      - kind: integration
        ref: "npx firebase emulators:exec --only firestore,auth \"node -e 'process.exit(0)'\" (exit 0)"
        status: pass
      - kind: other
        ref: "node -e shape gates: sin 'if true', exactamente un 'allow list: if false', exactamente un recipientUid"
        status: pass
    human_judgment: false
  - id: D4
    description: "Unión transaccional bootstrap-o-unión: el primer usuario es Admin y nadie puede reescribir adminUid; nombre duplicado detectado antes y después del commit con rollback"
    requirement: EVENT-02
    verification:
      - kind: other
        ref: "node -e shape gates sobre joinEvent.ts: runTransaction === 1, getDocs antes de runTransaction; npx tsc -b --force"
        status: pass
    human_judgment: true
    rationale: "La forma del código y la compilación están probadas, pero las garantías que importan (dos clientes creando el evento a la vez ⇒ un solo Admin; carrera de nombre ⇒ rollback del segundo) sólo se prueban con dos clientes reales contra el emulador; ninguna aserción estática las demuestra."
  - id: D5
    description: "Recorrido de punta a punta: escribir el nombre, elegir talla, unirse y ver la sala de espera actualizarse sola (primer usuario con la insignia Admin, segunda pestaña sin recargar)"
    verification: []
    human_judgment: true
    rationale: "El <human-check> del plan exige dos pestañas (una de incógnito) contra `firebase emulators:start` + `npm run dev`; se cosecha al final de la fase. En este plan la pantalla de entrada sólo es alcanzable antes de que se resuelva la identidad, porque el redirect de `/` manda a /preferences en cuanto hay uid — el tramo «nombre primero» llega con el delta S8 de 01-03."

duration: 23min
completed: 2026-10-18
status: complete
---

# Phase 01 Plan 01: Flujo completo del amigo invisible — walking skeleton Summary

**Walking skeleton de SecretKit en pie: scaffold Vite 8 + React 19 + Tailwind v4 + React Router 8 + Firebase 13, reglas default-deny escritas junto al contrato de datos, identidad anónima silenciosa y el primer ciclo real nombre → unión transaccional → sala de espera sincronizada por `onSnapshot`.**

## Performance

- **Duration:** 23 min de ejecución activa (12:53:34Z → 13:17:01Z, los cinco commits de tarea). La sesión se reanudó más tarde para la verificación final y este informe; el tiempo natural transcurrido total es de ~2 h 26 min.
- **Started:** 2026-10-18T12:53:34Z (commit `e77f364` de arranque de fase)
- **Completed:** 2026-10-18T15:19:25Z
- **Tasks:** 5/5
- **Files:** 36 archivos en el diff del plan (35 contados para `actuals`, excluyendo el `package-lock.json` generado)

## Accomplishments

- **El stack completo compila y empaqueta**: `tsc -b --force` y `npm run build` (vite 8.3.4, 125 módulos) salen 0, con Tailwind v4 vía `@tailwindcss/vite` (`@import "tailwindcss";` como primera línea de `src/index.css`), sin `tailwind.config.js`/`postcss.config.js` y sin `react-router-dom` en `package.json` ni en `src/**`.
- **`firestore.rules` escrito junto al esquema, no al final**: default-deny, `match /events/main` con id literal, `adminUid` write-once (`request.resource.data.adminUid == resource.data.adminUid` en el `update`), `assignments` con `allow list: if false` (ni el Admin enumera) y `orders` prohibiendo `recipientUid`/`recipientName`. El emulador `demo-secretkit` arranca y compila el archivo sin errores.
- **Identidad anónima silenciosa**: `ensureSignedIn()` reutiliza `auth.currentUser.uid` y sólo firma si no hay usuario (una sola ocurrencia literal de `signInAnonymously`); ninguna lectura de Firestore sale antes de que `uid !== null`, y la suscripción al evento se monta después de resolver la identidad.
- **Primera escritura real transaccional**: `joinEvent()` hace el pre-chequeo de nombre duplicado fuera de la transacción (porque `Transaction.get()` no tiene sobrecarga para `Query`), dentro de la transacción lee `events/main` antes de escribir, hace Admin al primer usuario y rechaza entrar si el evento ya se sorteó, y cierra la ventana TOCTOU con un rollback que borra su propio documento si detecta la carrera. Nunca auto-sufija ni fusiona nombres.
- **Primera lectura en vivo**: `subscribeParticipants` ordena por `nameNormalized` (nunca por la marca de unión, que es `null` en la instantánea local) y devuelve su `unsubscribe`; `LobbyPage` lo limpia al desmontar y pinta la línea de recuento con `aria-live="polite"` y `aria-atomic="true"`.

## Task Commits

Cada tarea se commiteó atómicamente:

1. **Task 1 (tracer): Scaffold y tokens del tema** - `f1d10f7` (feat)
2. **Task 2: Cliente de Firebase, sesión anónima y cáscara de la app** - `df1abbe` (feat)
3. **Task 3: Contrato de datos, Security Rules y config del emulador** - `8d592f1` (feat)
4. **Task 4: Transacción de bootstrap-o-unión y suscripción del lobby** - `8e75211` (feat)
5. **Task 5: Superficies finas (entrada, unión, sala en vivo)** - `763da87` (feat)

**Plan metadata:** (este commit) `docs(01-01): complete ...`

Puerta de feedback del tracer (modo auto, fila 2): `npm run build` re-ejecutado tras la Task 1 y de nuevo sobre el código commiteado de la Task 5 → verde en ambas; `⚡ Tracer verificado de punta a punta — expandiendo`.

## Files Created/Modified

- `firestore.rules` — reglas default-deny, path literal `/events/main`, `assignments` con `list` denegado, `adminUid` write-once, `orders` sin `recipientUid`
- `firebase.json` / `.firebaserc` — emuladores firestore+auth sobre `demo-secretkit` y rewrite catch-all de hosting
- `src/domain/types.ts` — `Size`, `KitType`, `EventStatus`, `Role`, `Participant`, `Order`, `OrderInput`, `StoredIdentity`, `EventDoc`, `ExportedOrder` (sin campo de identidad ni de emparejamiento: SEC-02 por construcción)
- `src/domain/normalizeName.ts` — trim + colapso de espacios internos + `toLowerCase`
- `src/lib/firebase.ts` — `app`/`auth`/`db` desde `import.meta.env.VITE_FIREBASE_*`, fallo nombrado si falta una variable, conexión a emuladores bajo `DEV` con flag de módulo
- `src/lib/session.ts` — `ensureSignedIn`, `saveIdentity`, `loadIdentity`, `clearIdentity` sobre `localStorage`
- `src/lib/joinEvent.ts` — transacción de tres pasos con rollback post-commit
- `src/lib/lobby.ts` — `subscribeParticipants` (orden `nameNormalized`) y `subscribeEvent`
- `src/session/SessionProvider.tsx` — Context + `useSession()` con `role` derivado
- `src/App.tsx` — armazón de rutas con la precedencia exacta de `home` y `FullScreenSpinner` durante el arranque, envuelto en `ErrorBoundary`
- `src/components/Screen.tsx`, `src/components/Card.tsx`, `src/components/FullScreenSpinner.tsx`, `src/components/ErrorBoundary.tsx`
- `src/pages/EntryPage.tsx`, `src/pages/PreferencesPage.tsx`, `src/pages/LobbyPage.tsx` (versiones finas de S1/S2/S4)
- `vite.config.ts`, `src/index.css`, `index.html` (`lang="es"`), `.env.example`, `.gitignore`, `.gitattributes`

## Decisions Made

- **Reglas y contrato de datos en el primer plan.** D-05/D-06 están marcados one-way; escribirlos al final obligaría a reescribir cada hook y cada regla. `firestore.rules` se escribe junto al esquema y se compila en el emulador en el mismo commit.
- **El pre-chequeo de nombre vive fuera de la transacción.** `Transaction.get()` sólo acepta `DocumentReference`, así que la consulta por `nameNormalized` va antes (sin `limit` en la comprobación post-commit) y el rollback de la carrera es un `deleteDoc` propio.
- **`role` se calcula, no se almacena.** Se deriva de `event.adminUid === uid` en `SessionProvider`, con una sola ocurrencia textual de `adminUid` en el archivo (lo que también satisface el gate de forma de 01-04). Gracias a ello, `isMe && role === 'admin'` es exactamente «esta fila es el `adminUid` del evento» sin exponer `adminUid` en el contexto (forma congelada).
- **`loading:false` en el fallo de identidad.** El spinner de arranque nunca gira para siempre; la superficie con la copia «Algo ha ido mal.» + «Reintentar» se materializa en el delta S8 de 01-03.
- **Namespace imports donde un gate cuenta apariciones.** `session.ts` (`firebase/auth`), `joinEvent.ts` (`firebase/firestore`) y `LobbyPage.tsx` (`../lib/lobby`) importan con `import * as` para que la llamada sea la única mención textual del símbolo vigilado.
- **Estimación vs realidad.** `estimate.tokens: 96000` frente a `actuals.tokens: 14545` (chars/4 sobre los archivos cambiados por el plan, excluyendo el `package-lock.json` generado). El plan sobre-estimó en ~6.6×: el realized diff de un plan de andamiaje es pequeño aunque consuma mucha lectura y muchas vueltas de verificación, así que la estimación parece haber contado contexto/verificación y no tamaño de artefacto. Se registra sin ajustar a la baja.

## Deviations from Plan

### Desviaciones aceptadas y documentadas

**1. [Rule 3 - Bloqueante] El scaffold se generó fuera del repo y se copió**
- **Encontrado en:** Task 1
- **Problema:** `npm create vite@latest .` no se puede ejecutar de forma no interactiva en este entorno y `--overwrite` es destructivo sobre un repo que ya contiene `.planning/`.
- **Solución:** se generó el scaffold en un directorio temporal (`C:/Users/Dekker/AppData/Local/Temp/opencode/vite-probe`) con la plantilla `react-ts` y se copió al repo excluyendo `.git` y `README.md`.
- **Efecto secundario documentado:** el scaffold real difiere de lo que el plan asumía — no trae `src/vite-env.d.ts`, y sí trae `public/favicon.svg`, `public/icons.svg` y `src/assets/hero.png`. `src/vite-env.d.ts` se escribió a mano (Task 2) y `src/App.css` con `src/assets/*` se borraron en la Task 2 por quedar sin uso.
- **Commit:** `f1d10f7` / `df1abbe`

**2. [Rule 3 - Bloqueante] El orden de tareas del plan invierte las dependencias de compilación**
- **Encontrado en:** Task 2
- **Problema:** `App.tsx` (Task 2) importa páginas y módulos que el plan crea en las Tasks 3–5, y `RevealPage`/`AdminPage` pertenecen a 01-05/01-06 y ningún plan posterior los cablea en `App.tsx`.
- **Solución:** la Task 2 adelanta la declaración de los módulos necesarios para que la cáscara compile — `src/domain/types.ts` y `src/lib/lobby.ts` completos, `FullScreenSpinner.tsx` y `ErrorBoundary.tsx` reales, y marcadores mínimos `src/pages/{EntryPage,PreferencesPage,LobbyPage,RevealPage,AdminPage}.tsx`. `App.tsx` importa las cinco páginas; las olas siguientes sólo sobrescriben módulos.
- **Commit:** `df1abbe`

**3. [Rule 1 - Bug] Colisiones con los gates de forma**
- **Encontrado en:** Tasks 2, 3, 4 y 5
- **Problema:** los gates `node -e` cuentan apariciones literales **incluidos los comentarios**, y se dispararon cuatro veces: un comentario de `main.tsx` contenía `react-router-dom`; la cabecera de `firestore.rules` contenía `if true`; el comentario de `lobby.ts` contenía `joinedAt`; y `LobbyPage.tsx` mencionaba el símbolo del listener tres veces (docblock + import + llamada) cuando el gate exige exactamente una.
- **Solución:** reescribir los comentarios que contenían el literal vigilado y usar `import * as lobby from '../lib/lobby'` en la sala para que la llamada sea la única mención textual. Ninguna corrección cambió comportamiento; todas se verificaron re-ejecutando el gate.
- **Commit:** `df1abbe`, `8d592f1`, `8e75211`, `763da87`

**4. [Rule 2 - Falta crítica] Ranura de error en la sala de espera**
- **Encontrado en:** Task 5
- **Problema:** el plan difiere todos los estados de error del lobby a la ola 4; sin ninguno, un fallo de la suscripción quedaría en silencio (una suscripción que falla no pinta nada).
- **Solución:** se pasa el segundo argumento de `subscribeParticipants` y se pinta `No hemos podido cargar el grupo.` en una región `role="status"`, sin botón de reintento. La taxonomía S8 completa (`permission-denied`/`unavailable`/`resource-exhausted`) sigue siendo de 01-04.
- **Commit:** `763da87`

**5. [Rule 1 - Bug] `SIZES` local en `PreferencesPage.tsx`**
- **Encontrado en:** Task 5
- **Problema:** el plan pide leer las opciones de talla de `SIZES`, pero esa constante la crea 01-02 en `src/domain/sizeGuide.ts`, que todavía no existe.
- **Solución:** constante local `SIZES: readonly Size[]` en la página, con un comentario que declara que 01-02 la sustituye por la fuente única. No se añadió `SIZES` a `domain/types.ts` para no pisar el contrato que 01-02 verifica con tests.
- **Commit:** `763da87`

**6. [Rule 1 - Bug] La pantalla de entrada se adelanta al estado de identidad**
- **Encontrado en:** Task 5
- **Problema:** el plan dice que S1 guarda el nombre en el «estado pendiente», pero en este plan `/` sólo se renderiza cuando `uid === null` (el redirect manda a `/preferences` en cuanto hay uid) y `SessionProvider` no expone ningún setter de nombre.
- **Solución:** S1 guarda el nombre con `saveIdentity({ uid: uid ?? '', name })` y S2 lo lee con `loadIdentity()?.name` con `session.name` como reserva. Es exactamente el «nombre pendiente» mientras el tramo «nombre primero» no exista; 01-03 reescribe el archivo entero (S1 completa + `isNameTaken` + el delta S8 en `App.tsx` que hace alcanzable la entrada).
- **Commit:** `763da87`

**7. Higiene de `.gitignore`** — se añadieron `.firebase/` y `database-debug.log` (los genera el emulador) y se mantuvieron `.env.local` y `dist/`.

---

**Total de desviaciones:** 7 (1 bloqueante de scaffold, 1 bloqueante de orden de dependencias, 3 colisiones de gates, 1 falta crítica, 1 constante local)
**Impacto en el plan:** ninguna desviación cambió el alcance ni el diseño. Las tres colisiones de gates y la constante local son ajustes de forma; las dos bloqueantes eran inevitables (el generador de Vite no es no interactivo y el orden de tareas del plan es incompatible con la compilación de TypeScript).

## Issues Encountered

- **El emulador quedó huérfano tras la verificación de la Task 3.** Un proceso `java` siguió escuchando en 8080/9150, así que la re-ejecución del gate del emulador falló con «Could not start Firestore Emulator, port taken». Se terminó el proceso y el gate volvió a salir 0. No es un defecto del código: es limpieza del entorno de verificación (dos apariciones, ambas resueltas).
- **`EBADENGINE` en la instalación**: los paquetes `@firebase/*` declaran `node >= 24.12.0` y la máquina tiene 24.11.1. Sólo es un aviso; el emulador y el build funcionan.
- **`npm audit` reporta 12 vulnerabilidades** (5 moderadas, 7 altas) provenientes del toolchain (vite/rolldown/firebase-tools). El plan no las aborda y no se tocaron versiones fuera de las auditadas en `01-RESEARCH.md` §Package Legitimacy Audit.
- **T-01-SC (legitimidad de paquetes):** se instalaron exactamente las versiones de `01-RESEARCH.md` §Package Legitimacy Audit — 0 marcadas `[SLOP]` y 9 marcadas `SUS` sólo por `too-new` (ninguna por typosquatting ni por nombre inexistente), así que no se insertó ningún checkpoint humano y se registra aquí la decisión.

## Known Stubs

| Stub | Archivo | Motivo |
|------|---------|--------|
| `RevealPage` devuelve `null` | `src/pages/RevealPage.tsx` | Marcador declarado en la Task 2 para que `App.tsx` compile; S5 completa es de 01-05. No es alcanzable en este plan porque `/reveal` sólo renderiza con `eventStatus === 'drawn'` y todavía no existe código de sorteo. |
| `AdminPage` devuelve `null` | `src/pages/AdminPage.tsx` | Marcador declarado en la Task 2; S7 completa es de 01-06. **La ruta `/admin` sí es alcanzable escribiendo la URL** (no tiene guarda) y pinta una página vacía hasta 01-06; la afordancia `Panel del Admin` que la enlaza llega en 01-04. |

Los dos son intencionales, están declarados como marcadores en su propio docblock y tienen dueño asignado en la misma fase (01-05 / 01-06). No impiden el objetivo de este plan.

## Threat Flags

Ninguna superficie nueva fuera del `<threat_model>` del plan. Las mitigaciones del registro se aplicaron en el código commiteado: T-01-01 (`allow list: if false` sobre `assignments`, verificado por forma), T-01-02 (`create` exige `adminUid == request.auth.uid` y el `update` lo reafirma), T-01-04 (el cliente no emite ninguna consulta antes de que `uid !== null`).

## User Setup Required

None — el proyecto usa el Emulator Suite sobre el proyecto `demo-secretkit`; no hacen falta credenciales reales. `.env.example` documenta las cinco variables `VITE_FIREBASE_*` para cuando exista un proyecto real (Fase 2).

## Next Phase Readiness

- **01-02 / 01-03 / 01-04 / 01-05 / 01-06 desbloqueados.** El contrato de datos, las reglas y las primitivas `Screen`/`Card` ya existen; los gates de las olas siguientes se comprobaron sobre los símbolos que heredan (`role === 'admin'` una sola vez en la sala, `adminUid` una sola vez en `SessionProvider`, `bg-indigo-600` reservado a `Button.tsx`).
- **Punto de atención para 01-03:** el tramo «nombre primero» del recorrido no existe todavía — `/` redirige a `/preferences` en cuanto hay `uid`, así que la pantalla de entrada sólo se ve antes de resolver la identidad. El delta S8 de 01-03 (fila 1 de la tabla de redirect de la UI-SPEC: «sin identidad o identidad sin nombre guardado ⇒ S1») es lo que hace alcanzable el recorrido completo del tracer.
- **Punto de atención para 01-04:** la insignia `Admin` de la sala se resuelve hoy como `isMe && role === 'admin'` porque la forma de `useSession()` está congelada y no expone `adminUid`; es equivalente a «la fila cuyo `uid === event.adminUid`», pero si 01-04 quiere insignia para el Admin visto desde otra pestaña necesitará la suscripción al evento dentro de la página.
- **Deuda registrada:** `src/domain/sizeGuide.ts` (01-02) sustituye la constante `SIZES` local de `PreferencesPage.tsx`; la superficie de error del lobby es genérica hasta 01-04.

---
*Phase: 01-flujo-completo-del-amigo-invisible*
*Completed: 2026-10-18*

## Self-Check: PASSED

- Archivos creados/modificados verificados en disco: 27/27 FOUND (incluido este SUMMARY).
- Commits verificados en el historial: `f1d10f7`, `df1abbe`, `8d592f1`, `8e75211`, `763da87` — 5/5 FOUND.
- Recuento medido con el libro mayor `#3968` (`$(git rev-parse --git-dir)/gsd-plan-head-before-01-01` = `e77f364`): `git rev-list --count e77f364..HEAD` = **5**, coherente con las cinco tareas.
