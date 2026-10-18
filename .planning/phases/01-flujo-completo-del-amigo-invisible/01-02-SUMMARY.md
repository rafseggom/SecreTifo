---
phase: 01-flujo-completo-del-amigo-invisible
plan: 02
subsystem: domain
tags: [tdd, vitest, pure-functions, size-guide, prices, normalize-name, derangement, fischer-yates, csv, bom, crlf, rfc4180, formula-injection, sec-02]

requires:
  - phase: 01-flujo-completo-del-amigo-invisible
    provides: "src/domain/types.ts (Size, KitType, ExportedOrder sin campo de identidad), src/domain/normalizeName.ts, vitest@^5.0.5 con el bloque test de vite.config.ts (environment node, globals false), tsc -b en verde"
provides:
  - "src/domain/sizeGuide.ts — SIZES, FAN_GUIDE (6 filas), PLAYER_GUIDE (5 filas), RETRO_USES_FAN_TABLE, isSizeUnavailableForKit, hasAmbiguousWeight"
  - "src/domain/prices.ts — PRICES (11/16/15) y formatPrice(kit), el único lugar que compone un precio"
  - "src/domain/derangement.ts — buildDerangement(participantUids): Map<string,string>, ciclo único para n >= 3"
  - "src/domain/exportOrders.ts — EXPORT_HEADERS (7 columnas), escapeCsvCell y buildOrdersExport, serializador ciego con garantía estructural"
  - "src/domain/*.test.ts — cinco archivos de test puros (28 aserciones) que fijan los cinco contratos"
affects: [01-03, 01-04, 01-05, 01-06]

actuals:
  tokens: 4730
  tasks: 3
  commits: 6
plan_head_before: 41b9c2d20eb674497fbf3394b39a46b15dfb2f74
plan_head_after: 65c289d599874f92749982b008f6cf2dc3688cd0
estimate_tokens: 63000

tech-stack:
  added: []
  patterns:
    - "Datos literales del spec fijados por test valor a valor, con las anomalías del proveedor expuestas como predicados en lugar de corregidas"
    - "Algoritmo puro + test de propiedades en el mismo directorio: la aserción que importa es biyección / cero puntos fijos / un solo ciclo, no un valor concreto"
    - "Gate de forma: un node -e cuyo exit code ES la aserción, y los comentarios cuentan (no pueden contener el literal vigilado)"
    - "La garantía de privacidad la sostiene el tipo del parámetro, no una convención: ExportedOrder no tiene dónde poner el emparejamiento"

key-files:
  created:
    - "src/domain/sizeGuide.ts"
    - "src/domain/sizeGuide.test.ts"
    - "src/domain/prices.ts"
    - "src/domain/prices.test.ts"
    - "src/domain/normalizeName.test.ts"
    - "src/domain/derangement.ts"
    - "src/domain/derangement.test.ts"
    - "src/domain/exportOrders.ts"
    - "src/domain/exportOrders.test.ts"
  modified: []

key-decisions:
  - "Los datos literales del spec se fijan por test (D-13) incluida la fila 2XL de Player y el rango 70-78 repetido de M y L: las anomalías del proveedor se publican literales y se señalizan con dos predicados no bloqueantes, nunca se corrigen (D-12, D-16)."
  - "Retro no tiene tabla propia: RETRO_USES_FAN_TABLE = true lo declara explícitamente en lugar de dejar que un consumidor lo infiera."
  - "buildDerangement es Fisher–Yates sobre una copia más un desplazamiento +1 con una única fuente de aleatoriedad: biyección, cero puntos fijos y un solo ciclo para n >= 3 por construcción; lanza por debajo de 3 y no muta el array del llamante (D-08, DRAW-03, DRAW-04)."
  - "El tipo del parámetro de buildOrdersExport (ExportedOrder, declarado una sola vez en domain/types.ts) no tiene campo de identidad ni de destinatario y el módulo no importa nada de src/lib/, así que SEC-02 lo sostiene el compilador; la neutralización de fórmulas en escapeCsvCell es el supuesto A2, una decisión del plan reversible en una línea."
  - "normalizeName no necesitó ningún cambio: 01-01 ya entregó trim + colapso de espacios internos + minúsculas. Su contrato queda ahora fijado por test y su límite declarado es que los acentos NO se pliegan ('José' y 'Jose' son claves distintas)."

patterns-established:
  - "Los módulos de src/domain/ no importan firebase/*, ni React, ni nada de src/lib/ — y un gate de forma lo comprueba línea a línea"
  - "Las expectativas de test van inline (nunca un .csv commiteado) porque core.autocrlf=true reescribiría los finales de línea del fixture"
  - "Los comentarios de cabecera declaran el límite conocido del contrato para que no se confunda con un olvido"

requirements-completed: [EVENT-04, PREF-04, ORDER-03, DRAW-04, SEC-02]

coverage:
  - id: D1
    description: "Guía de Tallas literal: FAN_GUIDE con seis filas (S=P, M=M, L=G, XL=GG, XXL=XG, XXXL=2XG) y PLAYER_GUIDE con cinco filas cuya última talla es 2XL, con los rangos de cm y kg copiados del spec; RETRO_USES_FAN_TABLE declara que Retro usa la tabla Fan"
    requirement: PREF-04
    verification:
      - kind: unit
        ref: "src/domain/sizeGuide.test.ts#FAN_GUIDE — datos literales del spec (D-13, PREF-04)"
        status: pass
      - kind: unit
        ref: "src/domain/sizeGuide.test.ts#PLAYER_GUIDE — datos literales del spec, anomalía incluida (D-12, D-13)"
        status: pass
      - kind: unit
        ref: "src/domain/sizeGuide.test.ts#SIZES y equivalencia de Retro (D-11, D-12)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Anomalías del proveedor expuestas como predicados no bloqueantes: isSizeUnavailableForKit('Player','XXXL') es verdadero y falso en las otras diecisiete combinaciones; hasAmbiguousWeight es verdadero sólo para Player M y Player L"
    requirement: PREF-04
    verification:
      - kind: unit
        ref: "src/domain/sizeGuide.test.ts#predicados de anomalía (D-12, D-16)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Precios de referencia literales: PRICES es 11/16/15 y formatPrice(kit) devuelve '11$', '16$' y '15$' desde un único módulo puro"
    requirement: ORDER-03
    verification:
      - kind: unit
        ref: "src/domain/prices.test.ts#PRICES — precios de referencia literales (D-17, ORDER-03, D-13)"
        status: pass
      - kind: other
        ref: "node -e shape gate: cero líneas con import de firebase o React y cero backticks en sizeGuide.ts + prices.ts (exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Contrato de normalizeName fijado por test: recorta extremos, colapsa espacios internos a uno y baja a minúsculas; el caso vacío devuelve cadena vacía y los acentos NO se pliegan (límite declarado)"
    requirement: EVENT-04
    verification:
      - kind: unit
        ref: "src/domain/normalizeName.test.ts#normalizeName"
        status: pass
      - kind: other
        ref: "node -e shape gate: exactamente una línea con replace(/ en normalizeName.ts (exit 0)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Sorteo circular puro: buildDerangement devuelve una biyección sobre la entrada, sin puntos fijos, con un único ciclo para n = 3, 4, 6 y 12, lanza por debajo de 3 y no muta el array del llamante; reproducible con una fuente aleatoria fija"
    requirement: DRAW-04
    verification:
      - kind: unit
        ref: "src/domain/derangement.test.ts#buildDerangement"
        status: pass
      - kind: other
        ref: "node -e shape gates: cero imports de firebase/React, exactamente una línea con Math.random, ninguna llamada a sort( (exit 0)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Exportación ciega: BOM UTF-8, siete columnas exactas, separador ';', CRLF y salto final; dorsales con ceros a la izquierda intactos, citado RFC 4180 de ';' y comillas, acentos respetados, fórmulas neutralizadas, y ni giverUid ni recipientUid ni Precio en la salida"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "src/domain/exportOrders.test.ts#buildOrdersExport — el formato del archivo (D-20, D-21)"
        status: pass
      - kind: unit
        ref: "src/domain/exportOrders.test.ts#escapeCsvCell — RFC 4180 (ORDER-02)"
        status: pass
      - kind: unit
        ref: "src/domain/exportOrders.test.ts#la exportación es ciega (SEC-02, ORDER-04, D-20)"
        status: pass
      - kind: other
        ref: "node -e shape gates: ningún archivo de src/domain/ importa de src/lib/; el módulo no nombra ningún campo de emparejamiento; contiene '\\r\\n' y '\\uFEFF' (exit 0)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-10-18
status: complete
---

# Phase 01 Plan 02: Dominio puro test-first Summary

**Los cinco contratos puros de SecretKit fijados por test: las tablas y los precios literales del spec con sus anomalías señalizadas como predicados, el normalizador con su límite declarado, el sorteo circular biyectivo de un solo ciclo y el serializador CSV ciego que no puede recibir el emparejamiento.**

## Performance

- **Duration:** 6 min (13:25Z → 13:31Z; los seis commits van de 13:26:37Z a 13:30:19Z)
- **Started:** 2026-10-18T13:25:00Z
- **Completed:** 2026-10-18T13:31:00Z
- **Tasks:** 3/3
- **Files modified:** 9 (9 creados, 0 modificados)

## Accomplishments

- **Los datos literales del spec son ahora ejecutables.** `FAN_GUIDE` (seis filas, S=P/M=M/L=G/XL=GG/XXL=XG/XXXL=2XG) y `PLAYER_GUIDE` (cinco filas, terminando en `2XL`) reproducen `PROJECT.md` §Constraints carácter a carácter, incluidos los dos rangos de peso idénticos de Player M y L (`70-78`) y la ausencia de `XXXL` en Player. El test afirma fila a fila, así que un dato alterado, reordenado o "completado" rompe la suite.
- **Las anomalías del proveedor están expuestas, no corregidas.** `isSizeUnavailableForKit('Player','XXXL')` y `hasAmbiguousWeight('Player', M|L)` son los dos únicos pares marcados de las dieciocho combinaciones (KitType × Size), y el test enumera exactamente esos; la UI de la wave 3 puede avisar sin bloquear sin volver a decidir la regla.
- **El sorteo está garantizado por construcción y probado por propiedades.** `buildDerangement` baraja una copia con Fisher–Yates y cierra el ciclo con un desplazamiento +1: biyección sobre claves y valores, cero puntos fijos y un único ciclo que visita los n nodos para n = 3, 4, 6 y 12. Lanza por debajo de 3 (porque en n = 2 el único ciclo *es* un par mutuo), no muta el array del llamante y contiene exactamente una fuente de aleatoriedad, de modo que un generador fijo reproduce el mismo ciclo y el mismo orden de escritura.
- **La exportación no *puede* transportar el emparejamiento.** `buildOrdersExport` recibe `ExportedOrder` (declarado una sola vez en `domain/types.ts`, sin campo de identidad ni de destinatario) y `src/domain/` no importa nada de `src/lib/`: la garantía de SEC-02 la sostiene el compilador antes que ninguna inspección. El archivo sale con BOM, siete columnas, `;`, CRLF y salto final; los dorsales `09`/`100` sobreviven, `;` y comillas se citan según RFC 4180 con comillas duplicadas, los acentos viajan intactos y una celda que empiece por `=`, `+`, `-` o `@` queda neutralizada.
- **28 aserciones en cinco suites, todas verdes**, con `npx tsc -b --force` en 0 y los cuatro gates de forma en 0.

## Task Commits

Cada tarea se commiteó atómicamente, con un commit RED y otro GREEN (plan `type: tdd`):

1. **Task 1 (RED): aserciones de los datos literales del spec** - `2c7ab1c` (test)
2. **Task 1 (GREEN): guía de tallas y precios literales** - `281a165` (feat)
3. **Task 2 (RED): tests de normalización de nombre y sorteo** - `b07a8db` (test)
4. **Task 2 (GREEN): sorteo circular** - `f686bef` (feat)
5. **Task 3 (RED): aserciones de la exportación CSV** - `2f9c759` (test)
6. **Task 3 (GREEN): serializador CSV ciego** - `65c289d` (feat)

**Plan metadata:** (este commit) `docs(01-02): complete ...`

Sin commits REFACTOR: la fase GREEN ya era la forma de referencia mínima en los tres casos y no hubo limpieza que hacer (el ciclo lo permite: "Only commit if changes made").

## Files Created/Modified

- `src/domain/sizeGuide.ts` — `SIZES`, `FAN_GUIDE`, `PLAYER_GUIDE`, `RETRO_USES_FAN_TABLE`, `isSizeUnavailableForKit`, `hasAmbiguousWeight`; importa `KitType`/`Size` de `./types`
- `src/domain/sizeGuide.test.ts` — once aserciones: seis filas literal a literal, la fila mayor de Player es `2XL`, el peso repetido de M y L, los dos predicados enumerados sobre las dieciocho combinaciones
- `src/domain/prices.ts` — `PRICES` (11/16/15) y `formatPrice(kit)` por concatenación simple, sin plantilla interpolada
- `src/domain/prices.test.ts` — los tres precios, los tres `formatPrice`, y que no se redondean ni multiplican
- `src/domain/normalizeName.test.ts` — el contrato de D-02 (trim, colapso de espacios internos, minúsculas), el caso vacío y el límite declarado de que los acentos no se pliegan
- `src/domain/derangement.ts` — `buildDerangement(participantUids): Map<string, string>`; Fisher–Yates sobre copia + offset +1, una sola llamada a `Math.random`, sin `sort(`
- `src/domain/derangement.test.ts` — lanza bajo 3, biyección, cero puntos fijos y ciclo único para n = 3/4/6/12, no mutación del array y reproducibilidad bajo un generador fijo
- `src/domain/exportOrders.ts` — `EXPORT_HEADERS` (siete literales), `escapeCsvCell`, `buildOrdersExport`; importa `ExportedOrder` de `./types` y no lo redeclara
- `src/domain/exportOrders.test.ts` — formato del archivo, dorsales con ceros a la izquierda, RFC 4180, acentos, neutralización de fórmulas y la aserción negativa de identidad y precio

Ningún archivo de la wave 1 se modificó: `src/domain/types.ts` y `src/domain/normalizeName.ts` quedan tal cual los dejó 01-01.

## Decisions Made

- **`PLAYER_GUIDE` termina en `2XL` a propósito.** El enum del participante (`SIZES`) llega a `XXXL` porque D-11 lo fija ahí; el desajuste se señala con `isSizeUnavailableForKit`, nunca recortando el enum ni "arreglando" la tabla a `XXXL`. El test nombra la anomalía para que un futuro "arreglo" falle.
- **Las anomalías se exponen como predicados, no como datos corregidos.** Es la traducción literal de D-12/D-16 a código: dos funciones booleanas que la UI usa para avisar sin bloquear.
- **Retro declara su tabla.** `RETRO_USES_FAN_TABLE = true` existe para que un consumidor no tenga que inferirlo ni decidirlo; el modal de la wave 3 lo lee.
- **`normalizeName` no se tocó.** 01-01 ya implementaba el colapso de espacios internos, así que el "arreglo condicional" que el plan contemplaba no aplicaba; esta tarea sólo fija su contrato por test y documenta su límite (los acentos no se pliegan, para no cambiar la clave de comparación de documentos ya escritos).
- **El precio se compone en un solo lugar.** `formatPrice` usa concatenación (`PRICES[kit] + '$'`) en vez de plantilla interpolada, lo que además satisface el gate de forma que prohíbe backticks en los dos módulos de datos.
- **Estimación vs realidad.** `estimate.tokens: 63000` frente a `actuals.tokens: 4730` (chars/4 sobre los nueve archivos creados, 18920 caracteres). El plan sobre-estimó en ~13×: son cinco módulos pequeños con mucha lectura de contexto y pocas vueltas de edición. Se registra sin ajustar a la baja.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Un backtick en un comentario disparó el gate de pureza**
- **Found during:** Task 1 (`sizeGuide.ts`, recién escrito)
- **Issue:** la cabecera del módulo citaba la ruta de `PROJECT.md` entre backticks, y el gate `node -e "…|\x60|…"` cuenta backticks **incluidos los comentarios**. `GATE_PURITY` salió 1 con el archivo recién escrito.
- **Fix:** se reescribió el comentario para nombrar el archivo sin backticks (`the Constraints section of .planning/PROJECT.md`). Ningún cambio de comportamiento.
- **Files modified:** `src/domain/sizeGuide.ts`
- **Verification:** `GATE_PURITY=0` re-ejecutado, `npx vitest run src/domain/sizeGuide.test.ts src/domain/prices.test.ts` → 11/11 en verde.
- **Committed in:** `281a165` (commit GREEN de la Task 1)

### Desviaciones aceptadas y documentadas

**2. [Supuesto del plan desmentido] `normalizeName.test.ts` nació en VERDE**
- **Found during:** Task 2 (fase RED)
- **Issue:** el plan afirma que en RED "el de `normalizeName` fallará porque la implementación de 01-01 no colapsa espacios internos". Al correrlo, las cuatro aserciones pasaron (`normalizeName.ts` ya contiene `name.trim().replace(/\s+/g, ' ').toLowerCase()`); el plan cita además el fix como condicional ("si el archivo de 01-01 no colapsa espacios internos, esta es la tarea que lo corrige"), y no aplicaba.
- **Investigation (fail-fast de TDD, regla 1 "unexpected GREEN"):** se leyó `src/domain/normalizeName.ts` y el SUMMARY de 01-01: el colapso es una entrega declarada de la wave 1. La funcionalidad ya existía; el test no podía fallar sin estar mal escrito.
- **Fix:** ninguno en producción — el archivo no se tocó. El test se queda como el ancla del contrato y su límite declarado. Queda anotado en el cuerpo del commit `b07a8db`.
- **Files modified:** ninguno (sólo se añadió el test).
- **Verification:** `npx vitest run src/domain/normalizeName.test.ts` → 4/4 en verde; `GATE_NORMALIZE=0` (exactamente una línea con `replace(/`).
- **Committed in:** `b07a8db`

**3. [Fidelidad de mensaje de commit] El subject GREEN de la Task 2 no dice "harden name normalization"**
- **Found during:** Task 2 (commit GREEN)
- **Issue:** el plan prescribe `feat(01-02): add circular derangement and harden name normalization`, pero no hubo endurecimiento alguno que commitear (desviación 2).
- **Fix:** se usó `feat(01-02): add circular derangement for the draw`, con un bullet del cuerpo explicando por qué la normalización no necesitó cambio. El prefijo de scope `feat(01-02)` que valida el gate de TDD se mantiene intacto.
- **Files modified:** n/a (mensaje de commit).
- **Committed in:** `f686bef`

---

**Total de desviaciones:** 3 (1 auto-corregida por Rule 1, 2 documentadas: un supuesto del plan desmentido y un ajuste de fidelidad del mensaje de commit)
**Impacto en el plan:** ninguno sobre el alcance ni sobre el diseño. La corrección del gate es cosmética; el supuesto desmentido elimina trabajo en vez de añadirlo; y el mensaje de commit sigue cumpliendo el contrato de scope del gate de TDD.

## Issues Encountered

- **`npx vitest` escribe su salida por stderr**, así que PowerShell pinta un banner `NativeCommandError` en cada ejecución. Los exit codes siguen siendo honestos (0 en verde, 1 en rojo) y son los que usan los gates; se comprobó en las seis ejecuciones. No es un defecto del código.
- **`requirements.ready-ids` dio resultados no deterministas entre invocaciones** (2/6 con `--raw` incluido como argumento, 1/5 al repetir los mismos cinco IDs, 0/1 para `EVENT-04`). Se calculó la disponibilidad a mano contra los PLAN de la fase, que es la fuente que el propio verbo consulta: de los cinco IDs de este plan, sólo `SEC-02` no lo declara ningún hermano pendiente; `EVENT-04` (01-03), `PREF-04` (01-03), `ORDER-03` (01-05) y `DRAW-04` (01-04) están bloqueados por el gate de IDs compartidos (#2388) hasta que esos planes produzcan su SUMMARY. **Sólo se marcó `SEC-02` como completo**; los otros cuatro quedan pendientes y los marcará el último plan que los declare.
- **Sin instalaciones nuevas:** esta wave sólo usa `vitest`, `typescript` y `vite`, fijados por 01-01 en las versiones exactas del §Package Legitimacy Audit. Cero checkpoints humanos por paquete (T-01-SC mitigado sin intervención).

## TDD Gate Compliance

| Gate | Presente | Commit |
|------|----------|--------|
| RED | Sí | `2c7ab1c` `test(01-02): add failing literal spec-data assertions` |
| GREEN | Sí | `281a165` `feat(01-02): add literal size guide and reference prices` |
| RED | Sí | `b07a8db` `test(01-02): add failing domain tests for name normalization and derangement` |
| GREEN | Sí | `f686bef` `feat(01-02): add circular derangement for the draw` |
| RED | Sí | `2f9c759` `test(01-02): add failing CSV export assertions` |
| GREEN | Sí | `65c289d` `feat(01-02): add pure blind CSV export builder` |
| REFACTOR | — | Ninguno: la fase GREEN ya era la forma mínima de referencia y no hubo limpieza que commitear |

Secuencia RED → GREEN completa y en orden para las tres tareas. Cada commit RED precede a su commit GREEN. Las cuatro suite RED fallaron por módulo inexistente, que es el modo de fallo que el propio plan prescribe para módulos que aún no existen; la única suite RED que nació verde es `normalizeName.test.ts`, documentada arriba como el supuesto desmentido nº 2.

## Known Stubs

Ninguno. Los cinco módulos son implementaciones completas y ninguno devuelve valores vacíos, marcadores ni texto de relleno. `src/domain/derangement.ts` no está cableado a `src/lib/draw.ts` todavía, pero eso no es un stub: es el orden de waves (draw.ts es de la wave 4) y la función está completa y probada.

## Threat Flags

Ninguna superficie nueva fuera del `<threat_model>` del plan. Las mitigaciones del registro están en el código commiteado y probadas: **T-01-09** (inyección de fórmulas) por `escapeCsvCell` con su test para `=1+1`, `@cmd`, `+1` y `-5`; **T-01-10** (fuga del emparejamiento al archivo) por el tipo del parámetro, el gate que prohíbe importar `src/lib/`, el gate que prohíbe nombrar campos de emparejamiento y la aserción negativa de `giverUid`/`recipientUid`/`Precio` más la longitud exacta 7 de `EXPORT_HEADERS`; **T-01-11** (sesgo o ciclo roto) por las cinco aserciones de propiedad y el test de no mutación. **T-01-SC** cubierto sin instalaciones nuevas.

## User Setup Required

None — módulos puros sin configuración, sin credenciales y sin red. No se generó ningún USER-SETUP.md (`user_setup: []` en el plan).

## Next Phase Readiness

- **Wave 3 (01-03) desbloqueada.** `SIZES`, `FAN_GUIDE`, `PLAYER_GUIDE`, `RETRO_USES_FAN_TABLE`, `isSizeUnavailableForKit`, `hasAmbiguousWeight`, `PRICES` y `formatPrice` existen con su forma fijada por test; el modal de la Guía de Tallas y la tabla de precios pueden consumirlas sin volver a decidir nada. **Recordatorio para 01-03:** `src/pages/PreferencesPage.tsx` todavía lleva su constante local `SIZES: readonly Size[]` (desviación 5 de 01-01); esta wave entrega la fuente única que la sustituye.
- **Wave 4 (01-04) desbloqueada.** `buildDerangement(participantUids): Map<string, string>` está lista para ser llamada por `src/lib/draw.ts` **fuera** de la transacción; el contrato `Map<string,string>` está congelado y no se debe reintroducir el `DrawPair[]` de la investigación antigua.
- **Wave 5 (01-05) y Wave 6 (01-06) desbloqueadas.** `formatPrice` es el único lugar que compone un precio, y `EXPORT_HEADERS`/`escapeCsvCell`/`buildOrdersExport` son la única ruta de serialización: ningún componente debe reimplementar el escapado.
- **Deuda registrada:** la mitad restante de SEC-02 (que el archivo descargado no permita reconstruir el emparejamiento cruzando talla+equipo con la lista pública del lobby) se cierra en la wave 6 con la proyección explícita de `listOrdersAdmin` y el gate de forma de `AdminPage.tsx`; su prueba por fixture pertenece a la Fase 2 (SEC-04). La verificación de que el modal *muestra* las tablas (PREF-04) y de que los tres precios se ven en la pantalla de pedido (ORDER-03) son de las waves 3 y 5, respectivamente.
- **Punto de atención menor:** cuatro de los cinco requirements de este plan (`EVENT-04`, `PREF-04`, `ORDER-03`, `DRAW-04`) siguen sin marcar como completos en REQUIREMENTS.md a propósito — los declaran también planes posteriores sin SUMMARY, y el gate de IDs compartidos (#2388) los libera cuando el último de ellos termine. Sólo `SEC-02` se marcó.

---

## Self-Check: PASSED

- Archivos creados verificados en disco: 9/9 FOUND (`sizeGuide.ts`, `sizeGuide.test.ts`, `prices.ts`, `prices.test.ts`, `normalizeName.test.ts`, `derangement.ts`, `derangement.test.ts`, `exportOrders.ts`, `exportOrders.test.ts`).
- Commits verificados en el historial: `2c7ab1c`, `281a165`, `b07a8db`, `f686bef`, `2f9c759`, `65c289d` — 6/6 FOUND.
- Recuento medido con el libro mayor `#3968`: `git rev-list --count 41b9c2d..HEAD` = **6**, coherente con las tres tareas (RED + GREEN cada una).
- `npx vitest run` (los cinco archivos) → 5 suites, 28 tests, exit 0. `npx tsc -b --force` → exit 0.
- Gates de forma re-ejecutados sobre el árbol commiteado: `GATE_2XL=0`, `GATE_PURITY=0`, `GATE_NORMALIZE=0`, `GATE_MATHRANDOM=0`, `GATE_NOSORT=0`, `GATE_TEST_HEADERS=0`, `GATE_NO_LIB=0`, `GATE_NO_PAIRING=0`, `GATE_EOL_BOM=0`.
- `git ls-files -- src/domain` nombra los once archivos (cinco módulos nuevos, cinco tests nuevos y el `types.ts` de 01-01).

---

*Phase: 01-flujo-completo-del-amigo-invisible*
*Completed: 2026-10-18*
