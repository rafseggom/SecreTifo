---
phase: 01-flujo-completo-del-amigo-invisible
plan: 03
subsystem: ui
tags: [react, tailwind, native-dialog, react-router, firebase, forms, accessibility, copy-deck, size-guide]

requires:
  - phase: 01-flujo-completo-del-amigo-invisible
    provides: "src/lib/joinEvent.ts (transacción bootstrap-o-unión de tres pasos) y src/lib/session.ts (saveIdentity/loadIdentity/clearIdentity); src/session/SessionProvider.tsx (useSession); primitivas Screen/Card/FullScreenSpinner/ErrorBoundary y las versiones finas de S1/S2"
  - phase: 01-flujo-completo-del-amigo-invisible
    provides: "src/domain/sizeGuide.ts (SIZES, FAN_GUIDE, PLAYER_GUIDE, RETRO_USES_FAN_TABLE) y src/domain/prices.ts (PRICES, formatPrice) — la fuente única que estas pantallas consumen"
provides:
  - "src/components/{Button,Field,Input,Select}.tsx — las primitivas de formulario con el contrato de la UI-SPEC"
  - "src/components/{Badge,Notice}.tsx y src/components/icons.tsx — insignias slate, avisos role=status por tono y exactamente dos SVG inline"
  - "src/components/Modal.tsx — envoltorio fino sobre <dialog>.showModal()"
  - "src/components/{SizeGuideTable,SizeGuideModal}.tsx — la superficie de referencia literal del proveedor"
  - "src/pages/EntryPage.tsx (S1, con pre-chequeo y sin escrituras) y src/pages/PreferencesPage.tsx (S2, la única pantalla que crea el participante)"
  - "src/lib/joinEvent.ts — delta: isNameTaken exportado y las tres constantes de error consumidas por los throw y por la UI"
  - "src/App.tsx — delta: el estado de identidad perdida (S8), resuelto antes que las rutas"
affects: [01-04, 01-05, 01-06]

actuals:
  tokens: 9610
  tasks: 4
  commits: 4
plan_head_before: 1f77e94df2a9e4732d56b6ed2b9287ac43ac7ff5
plan_head_after: db82c5bd1dd01087e2fdff671459c9b9ce81dd7e
estimate_tokens: 69000

tech-stack:
  added: []
  patterns:
    - "Las variantes y los tonos se resuelven con un objeto de búsqueda de nombres de clase Tailwind COMPLETOS; nunca se compone una clase por concatenación (Pitfall 15)"
    - "`role=\"alert\"` está reservado a los errores de campo (`Field`); todo aviso no bloqueante es `role=\"status\"` (`Notice`): la distinción es contrato, no preferencia"
    - "El pre-chequeo de nombre vive una sola vez en `isNameTaken` y lo consumen tanto S1 como la transacción, de modo que no pueden divergir"
    - "Las tres cadenas de error de unión son constantes exportadas por `src/lib/joinEvent.ts`: la copia mostrada y el error lanzado son literalmente el mismo símbolo"
    - "Un solo `SizeGuideTable` con dos props de datos; ninguna fila del proveedor se transcribe en un componente (se lee de `FAN_GUIDE`/`PLAYER_GUIDE`)"
    - "El estado de identidad perdida se resuelve en `App.tsx` antes que las rutas: ningún deep-link cae en una pantalla vacía"

key-files:
  created:
    - "src/components/Button.tsx, Field.tsx, Input.tsx, Select.tsx, Badge.tsx, Notice.tsx, icons.tsx, Modal.tsx, SizeGuideTable.tsx, SizeGuideModal.tsx"
  modified:
    - "src/pages/EntryPage.tsx, src/pages/PreferencesPage.tsx, src/lib/joinEvent.ts, src/App.tsx"

key-decisions:
  - "El estado de identidad perdida (S8) se pinta en App.tsx comparando `loadIdentity()` con el `uid` de `useSession()`; su única salida es `clearIdentity()` seguida del formulario de S1, sin añadir ningún campo a SessionProvider ni ninguna suscripción (D-03, D-10)."
  - "Con `eventStatus === 'drawn'` la misma superficie añade la frase del roster congelado y RETIRA la acción `Volver a entrar`: ofrecer reintento prometería una salida que la transacción rechaza (D-10)."
  - "`isNameTaken` extraído de la transacción y exportado: S1 y el paso 1 de `joinEvent` comparten literalmente la misma consulta `where('nameNormalized','==',normalizeName(name))` con `limit(1)` (D-02, EVENT-04)."
  - "Las tres constantes de error (`ERR_NAME_TAKEN`, `ERR_NAME_RACE`, `ERR_EVENT_CLOSED`) se declaran una vez y se usan tanto en los `throw` como en la UI, así que copia y errores no pueden separarse (UI-SPEC §Copywriting Contract)."
  - "El modal se construye sobre el `<dialog>` nativo sin reimplementar nada del navegador (trampa de foco, `Esc`, fondo inerte, retorno de foco): es la razón de elegirlo (D-25, 01-RESEARCH §Alternatives)."
  - "Los datos del proveedor se pintan literales desde `FAN_GUIDE`/`PLAYER_GUIDE`, incluida la fila mayor de Player (`2XL`): las anomalías se señalan con las tres notas ámbar y nunca se corrigen (D-12, D-16)."

patterns-established:
  - "Objeto de búsqueda con nombres de clase completos para variantes/tonos: prohibida la concatenación `bg-${x}-500`"
  - "Render prop en `Field` para que la página conserve su propio `ref` y pueda retener el foco tras un envío rechazado"
  - "Gate de forma como `node -e` cuyo exit code ES la aserción, con los comentarios incluidos en el conteo"

requirements-completed: [PREF-01, PREF-02, PREF-03, PREF-04, PREF-05, EVENT-01, EVENT-04]

coverage:
  - id: D1
    description: "Primitivas de formulario: Button (4 variantes + loading + aria-busy), Field (label/ayuda/error con el rol de alerta reservado), Input y Select a 16px con anillo de foco indigo y placeholder deshabilitado; Select lee las opciones de SIZES"
    verification:
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
      - kind: other
        ref: "node -e gates: concatenación de clases en src/components = 0; bg-indigo-600 exactamente 1 en Button.tsx; role=alert exactamente 1 en src/components"
        status: pass
    human_judgment: false
  - id: D2
    description: "Primitivas de aviso: icons.tsx con exactamente dos SVG (CloseIcon, SpinnerIcon con motion-reduce), Badge slate sin indigo y Notice con los cuatro tonos y role=status"
    verification:
      - kind: other
        ref: "node -e gates: <svg> = 2; role=status = 1 en Notice.tsx; cero animate-* sin motion-reduce en Badge/Notice/icons"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Superficie de referencia (S3): Modal sobre <dialog> nativo, SizeGuideTable con tarjeta por talla en <sm y <table> en ≥sm, y SizeGuideModal con el orden fijo tabla Fan → tabla Player → tres notas ámbar literales"
    requirement: PREF-04
    verification:
      - kind: other
        ref: "node -e gates: showModal = 1; SizeGuideTable lee FAN_GUIDE/PLAYER_GUIDE y no contiene 2XL ni XXXL; tone=warning = 3; sin overflow-x"
        status: pass
      - kind: unit
        ref: "src/domain/sizeGuide.test.ts (datos literales fijados en 01-02, incluida la fila 2XL)"
        status: pass
    human_judgment: true
    rationale: "La corrección de los datos está probada por los tests de 01-02 y por los gates de forma, pero la lectura responsive (un card por talla en ≈360px sin scroll horizontal, con las tres notas ámbar visibles) es visual y la cubre el <human-check> del plan, que sigue sin ejecutarse."
  - id: D4
    description: "S1 entra con solo el nombre: rechaza vacío y duplicado en la ranura de error con el foco retenido, guarda el nombre pendiente y navega a /preferences, SIN escribir nada en Firestore"
    requirement: EVENT-01
    verification:
      - kind: other
        ref: "node -e gate: EntryPage.tsx sin setDoc/runTransaction/joinEvent( (exit 0); contiene isNameTaken y navigate('/preferences')"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: true
    rationale: "El invariante «aquí no se escribe» está probado por forma, pero el comportamiento en ejecución (error inline con el foco retenido, pre-chequeo contra el emulador, rechazo por el aviso del duplicado) lo cubre el <human-check> del plan, todavía sin ejecutar."
  - id: D5
    description: "S2 ejecuta la unión: talla obligatoria desde SIZES, dos campos de equipos opcionales guardados como cadena vacía, disparador de la Guía de Tallas, y los cuatro errores distinguibles con su copia literal"
    requirement: PREF-05
    verification:
      - kind: other
        ref: "node -e gate: PreferencesPage.tsx llama a joinEvent; sin truncate en src/pages ni src/components"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: true
    rationale: "La mitad de escritura de PREF-05 (equipos en blanco persistidos como cadena vacía y no null, unidos con éxito) y la visibilidad de los cuatro errores exigen el emulador y las dos pestañas del <human-check>, que sigue sin ejecutarse."
  - id: D6
    description: "S8 identidad perdida: superficie propia resuelta antes que las rutas, con titular, cuerpo, acción secondary «Volver a entrar» que llama a clearIdentity(), y variante del evento ya sorteado que retira la acción"
    verification:
      - kind: other
        ref: "node -e gates sobre src/App.tsx: titular, cuerpo, variante sorteada y clearIdentity exactamente 1 cada uno"
        status: pass
      - kind: other
        ref: "npx tsc -b --force (exit 0)"
        status: pass
    human_judgment: false

duration: "~2min (Tasks 1-3, sesión 01-18) + sesión reanudada 01-19"
completed: 2026-10-19
status: complete
---

# Phase 01 Plan 03: Preferencias y Guía de Tallas Summary

**Las primitivas de la fase, la superficie literal de la Guía de Tallas y las dos pantallas de identidad: S1 entra solo con el nombre sin escribir nada, S2 es la única que crea el participante con talla obligatoria y cuatro errores distinguibles, y la app estrena la superficie de identidad perdida que evita re-unir en silencio.**

## Performance

- **Duration:** Tasks 1-3 se commitearon el 2026-10-18 entre 15:45:22 y 15:47:04 (+02:00, ~1 min 42 s de commits); la Task 4 se verifica y commitea en una sesión reanudada el 2026-10-19 a las 14:07:04 (+02:00). El barrido de verificación (gates + `tsc` + `vitest` + `lint`) fue corto; el tiempo natural transcurrido entre ambas sesiones es de ~22 h.
- **Started:** 2026-10-18T15:45:22+02:00 (primer commit de tarea)
- **Completed:** 2026-10-19T14:07:04+02:00
- **Tasks:** 4/4
- **Files modified:** 14 (todas bajo `src/`; 10 componentes nuevos, 2 páginas y 2 archivos de delta reescritos)

## Accomplishments

- **Las primitivas de la fase existen con el contrato de la UI-SPEC.** `Button` (cuatro variantes, `loading`, `h-11`, `aria-busy`+`aria-disabled`), `Field` (label + ayuda + error con `aria-describedby`, y el **único** `role="alert"` de la fase), `Input`/`Select` a 16px con anillo de foco indigo, `Badge` slate, `Notice` con los cuatro tonos y `role="status"`, `Modal` sobre `<dialog>`. Ninguna variante se compone por concatenación de clases (Tailwind v4 solo lee literales, Pitfall 15) y `bg-indigo-600` aparece exactamente una vez en toda la carpeta de componentes.
- **La Guía de Tallas es literal y nunca «corregida».** `SizeGuideTable` es un solo componente con dos props de datos que leen `FAN_GUIDE`/`PLAYER_GUIDE` de la wave 2; por debajo de `sm` cada tabla se convierte en una tarjeta por talla con una `<dl>` (cero scroll horizontal a 320px) y a partir de `sm` es una `<table>` con `<caption>` y `<th scope="col">`. `SizeGuideModal` fija el orden Fan → Player → **tres** notas ámbar, incluida la fila `2XL` del proveedor y las dos anomalías señaladas.
- **S1 deja de escribir y S2 pasa a ser la única puerta.** `EntryPage` valida vacío y normalización, comparte `isNameTaken` con la transacción para el pre-chequeo de duplicado, retiene el foco en el input y **no crea ningún documento**; `PreferencesPage` es la única pantalla que ejecuta `joinEvent`, con talla obligatoria desde `SIZES`, equipos opcionales guardados como cadena vacía y los cuatro errores distinguibles con su copia literal.
- **La identidad perdida tiene por fin superficie y salida.** `App.tsx` compara `loadIdentity()` con el `uid` de la sesión, y cuando no coinciden pinta el estado S8 **antes** de las rutas: titular, cuerpo y acción `secondary` «Volver a entrar» que llama a `clearIdentity()`; con el evento ya sorteado, añade la frase del roster congelado y retira la acción.
- **Verificación verde:** `tsc -b --force` exit 0; `vitest run` 5 archivos / 28 tests verdes; `npm run lint` exit 0 (solo warnings de fast-refresh); once gates de forma `node -e` en 0.

## Task Commits

Cada tarea se commiteó atómicamente:

1. **Task 1: Primitivas de formulario (Button, Field, Input, Select)** - `d11274b` (feat)
2. **Task 2: Primitivas de aviso (Badge, Notice) e iconos inline** - `5ba6281` (feat)
3. **Task 3: Modal nativo y superficie literal de la Guía de Tallas** - `07b3ae1` (feat)
4. **Task 4: Pantallas de entrada y unión + superficie de identidad perdida** - `db82c5b` (feat)

**Plan metadata:** (este commit) `docs(01-03): complete ...`

## Files Created/Modified

- `src/components/Button.tsx` — cuatro variantes por objeto de búsqueda, `loading` con `SpinnerIcon`, `aria-busy`/`aria-disabled`
- `src/components/Field.tsx` — render prop con `id`/`describedBy`/`invalid`; `role="alert"` reservado al error de campo
- `src/components/Input.tsx` / `src/components/Select.tsx` — controles a `text-base` con anillo indigo; `Select` lee `SIZES` y ofrece un placeholder deshabilitado con `value=""`
- `src/components/Badge.tsx` — insignia slate-100/slate-700, sin indigo
- `src/components/Notice.tsx` — `role="status"` y mapa de cuatro tonos a clases literales
- `src/components/icons.tsx` — exactamente dos SVG (`CloseIcon`, `SpinnerIcon` con `motion-reduce:animate-none`)
- `src/components/Modal.tsx` — `<dialog>.showModal()`, `max-h-[85vh] overflow-y-auto`, cierre con `aria-label="Cerrar"`
- `src/components/SizeGuideTable.tsx` — un componente, dos datos; `<table>` en `≥sm` y `<dl>` por talla en `<sm`
- `src/components/SizeGuideModal.tsx` — título `Guía de Tallas` y las tres notas ámbar verbatim
- `src/pages/EntryPage.tsx` — S1 completa, sin ninguna escritura
- `src/pages/PreferencesPage.tsx` — S2 completa, la única que ejecuta `joinEvent`
- `src/lib/joinEvent.ts` — delta quirúrgico: `isNameTaken` + tres constantes de error; transacción intacta
- `src/App.tsx` — delta: estado de identidad perdida resuelto antes que las rutas

## Decisions Made

- **`role="alert"` es exclusivo de los errores de campo.** Ningún otro aviso de la fase interrumpe; la distinción `status`/`alert` de `Notice` frente a `Field` es contrato, no preferencia (el aviso Player/XXXL debe poder aparecer mientras se escribe sin robar el foco).
- **Un solo pre-chequeo de nombre.** `isNameTaken` se extrajo de la transacción y lo consumen S1 y el paso 1 de `joinEvent`, de modo que la pantalla de entrada y la transacción no pueden divergir.
- **La variante del evento sorteado no ofrece reintento.** El roster está congelado (D-10); ofrecer «Volver a entrar» prometería una salida que la transacción rechaza, así que la explicación honesta es la única acción.
- **El modal es el `<dialog>` nativo.** No se reimplementa trampa de foco, `Esc`, fondo inerte ni retorno de foco: es exactamente la razón de elegirlo (D-25 prohíbe dependencias adicionales).
- **Estimación vs realidad.** `estimate.tokens: 69000` frente a `actuals.tokens: 9610` (chars/4 sobre los 14 archivos del diff, 38440 caracteres). El plan sobre-estimó en ~7×: son primitivas pequeñas con mucha lectura de contexto y verificación. Se registra sin ajustar a la baja.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Los comentarios contaban en los gates de forma**
- **Found during:** Tasks 1-3 (sesión del 01-18)
- **Issue:** los gates `node -e` cuentan apariciones literales **incluidos los comentarios**; las cabeceras de `Button.tsx` (que citaba `bg-${x}-500`) habrían disparado el gate de concatenación y las de `Modal.tsx`/`SizeGuideTable.tsx` mencionaban los símbolos vigilados.
- **Fix:** las cabeceras se redactaron para describir el patrón sin escribir el literal vigilado (p. ej. «A Tailwind class is never composed by filtering a colour step into the name»); ningún cambio de comportamiento, verificado re-ejecutando cada gate.
- **Files modified:** `src/components/Button.tsx`, `src/components/Modal.tsx`, `src/components/SizeGuideTable.tsx`, `src/components/icons.tsx`
- **Committed in:** `d11274b`, `07b3ae1`, `5ba6281`

---

**Total deviations:** 1 auto-corregida (Rule 1)
**Impact on plan:** ningún cambio de alcance ni de diseño; es un ajuste de forma para que los gates de forma no cuenten comentarios.

## Issues Encountered

- **Descubrimiento fuera de alcance:** `src/session/SessionProvider.tsx` importa `doc`/`getDoc` de `firebase/firestore` directamente, y no está en el `files_modified` de este plan (lo creó 01-01). La regla estructural de la UI-SPEC («`src/lib/` es el único directorio que importa de `firebase/*`») no se cumple al pie de la letra por ese archivo **preexistente**. Ninguno de los archivos tocados por este plan importa `firebase/*` (comprobado con un `node -e`), así que la verificación del plan se cumple para la superficie de esta wave. Se registra como deuda en `deferred-items.md`; no se corrige aquí por estar fuera de alcance (sería un refactor de la wave 1).
- **`requirements.ready-ids` sigue siendo no determinista** (ya señalado en 01-02): devolvió `6/6`, `1/1` y `0/1` según la invocación. La disponibilidad de este plan se calculó a mano cruzando el frontmatter `requirements:` de los seis PLAN de la fase: de los siete IDs, **`PREF-05` no está listo** porque 01-05 también lo declara (gate de IDs compartidos, #2388); los otros seis se marcaron completos.
- **Sin instalaciones nuevas:** esta wave solo usa `react`, `react-router` y las versiones ya auditadas en 01-01; cero checkpoints humanos por paquete (T-01-SC mitigado sin intervención).

## Known Stubs

Ninguno. Los diez componentes son implementaciones completas (ninguno devuelve valores vacíos, marcadores ni texto de relleno) y las dos páginas están enteras. `isSizeUnavailableForKit`/`hasAmbiguousWeight` (de 01-02) todavía no se consumen en esta wave porque el aviso no bloqueante Player/XXXL pertenece al formulario de pedido (wave 5); no es un stub, es el orden de waves.

## Threat Flags

Ninguna superficie nueva fuera del `<threat_model>` del plan. Las mitigaciones del registro se aplicaron en el código commiteado: **T-01-12** (duplicidad de nombres) por `isNameTaken` compartido entre S1 y la transacción más el rechazo con copia exacta y sin transformar el nombre; **T-01-13** (validación de cliente evitada) porque ninguna ruta nueva relaja el enum de talla de las reglas y **no se añadió ninguna escritura alternativa** (S1 sigue sin escribir nada); **T-01-14** (render del texto libre del usuario) por la prohibición total de `truncate` (gate `node -e` = 0 sobre `src/pages` y `src/components`) y el guardado/pintado literal de los equipos, sin parsearlos por delimitadores; **T-01-SC** cubierto sin instalaciones nuevas.

## User Setup Required

None — el proyecto usa el Emulator Suite sobre `demo-secretkit`; no hacen falta credenciales reales.

## Next Phase Readiness

- **Wave 4 (01-04) desbloqueada.** `Screen`, `Card`, `Button`, `Notice` y `Badge` existen con su contrato; el lobby puede montar `ParticipantRow` y la insignia `Admin` sobre estas primitivas. `Button variant="danger"` está reservada para el diálogo de confirmación del sorteo, que **no** se tocó aquí.
- **Wave 5 (01-05) desbloqueada.** `SizeGuideModal` se reutiliza tal cual desde el ayudante de talla del formulario de pedido (mismo título, mismo contenido); `Notice` es la superficie del aviso no bloqueante Player/XXXL.
- **Deuda registrada:** `PREF-05` queda pendiente de marcar (lo declara también 01-05; la mitad de lectura —quien regala leyendo las preferencias de su destinatario— se verifica allí). `src/session/SessionProvider.tsx` importa `firebase/firestore` directamente (preexistente de 01-01): deuda estructural a saldar en una wave futura.
- **Verificación humana pendiente:** el `<human-check>` de la Task 4 (emulador + dev server: entrar, abrir la guía a ≈360px, unirse con equipos en blanco y comprobar cadena vacía en Firestore, y el rechazo del duplicado desde incógnito) se cosecha al final de la fase.

---

## Self-Check: PASSED

- Archivos creados/modificados verificados en disco: 15/15 FOUND (los 14 del plan más este SUMMARY).
- Commits verificados en el historial: `d11274b`, `5ba6281`, `07b3ae1`, `db82c5b` — 4/4 FOUND.
- Recuento medido con el libro mayor `#3968` (`$(git rev-parse --git-dir)/gsd-plan-head-before-01-03` = `1f77e94`): `git rev-list --count 1f77e94..HEAD` = **4**, coherente con las cuatro tareas.
- Gates de forma (once) re-ejecutados sobre el árbol commiteado: todos en 0. `npx tsc -b --force` → exit 0. `npx vitest run` → 5 archivos / 28 tests, exit 0. `npm run lint` → exit 0.

---

*Phase: 01-flujo-completo-del-amigo-invisible*
*Completed: 2026-10-19*
