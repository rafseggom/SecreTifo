# Phase 1 — Spec-less Edge Coverage Report

> Authored by plan-phase step 7.95 (spec-less probe fallback). No SPEC supplied "## Edge Coverage", so the deterministic edge probe ran over the 23 phase requirement IDs. Under `--auto` every applicable edge auto-resolved (explicit where a defensible acceptance criterion exists, otherwise backstop); an `unclassified` row stays `unresolved` and is surfaced as a flagged assumption.

**Coverage:** applicable 42 · resolved 30 (explicit 25 / backstop 5) · unresolved 12 (unclassified 12) — no silent drops.

## Resolved edges → lift into must_haves.truths

| Req | Category | Verification | Resolution (lift as-is) |
|-----|----------|--------------|------------------------|
| EVENT-01 | empty | explicit | Un nombre vac├¡o o formado solo por espacios no permite entrar: el bot├│n no se deshabilita por validación; al pulsarlo aparece el texto inline «Escribe tu nombre para entrar», el foco se mantiene en el campo y no se escribe nada en Firestore. |
| EVENT-01 | encoding | explicit | El nombre se normaliza con trim + colapso de espacios internos + toLowerCase en el campo nameNormalized; la detecci├│n de duplicados compara siempre la forma normalizada, nunca el texto original. |
| EVENT-02 | idempotency | explicit | Reintentar la transacci├│n de bootstrap tras un fallo de red no crea un segundo evento ni reescribe adminUid: la transacci├│n re-lee events/main y la regla de update impide cambiar adminUid una vez escrito. |
| EVENT-02 | concurrency | explicit | Si dos usuarios crean el evento simult├íneamente, runTransaction garantiza que solo uno escribe adminUid; el que pierde re-lee el documento y se une como participante no-Admin (nunca hay dos admins). |
| EVENT-03 | adjacency | explicit | Un usuario con sesi├│n an├│nima ya iniciada que recarga no vuelve a llamar a signInAnonymously(): se reutiliza auth.currentUser.uid y solo se llama cuando no hay usuario. |
| EVENT-03 | empty | explicit | Si signInAnonymously() falla o no hay conectividad no se renderiza ninguna ruta: se muestra FullScreenSpinner con PreparandoÔÇª acotado por Algo ha ido mal. y Reintentar. |
| EVENT-03 | ordering | explicit | El uid an├│nimo se resuelve antes de cualquier lectura o escritura de Firestore: ninguna consulta se emite con request.auth == null. |
| EVENT-04 | empty | explicit | Un nombre que normaliza a cadena vac├¡a se trata como el caso vac├¡o y se rechaza; nunca se crea un participante sin nombreNormalized. |
| EVENT-04 | encoding | explicit | Dos nombres que difieren solo en may├║sculas, acentos o espacios m├║ltiples cuentan como duplicados: la comprobaci├│n y el rechazo operan sobre nameNormalized. |
| PREF-02 | adjacency | backstop | Cuando dos cosas son exactamente iguales o se tocan, ┬┐se fusionan, colisionan o se separan? El texto libre de equipos debe conservarse literal y nunca reinterpretarse como una lista separada por delimitadores cuando contiene ; o comillas. |
| PREF-02 | empty | explicit | Un campo de equipos vac├¡o se guarda como cadena vac├¡a (nunca null/undefined) y se renderiza Sin indicar en la vista de quien regala. |
| PREF-02 | encoding | explicit | Los acentos y caracteres no-ASCII sobreviven al guardado y a la re-lectura (UTF-8 de extremo a extremo); el valor se renderiza con break-words y nunca con truncate. |
| PREF-02 | ordering | backstop | Cuando los elementos comparan igual, ┬┐se especifica y es estable el orden de salida? El orden y el formato del texto introducido por el usuario se preservan literalmente. |
| PREF-03 | adjacency | backstop | ┬┐Se fusionan, colisionan o separan dos valores que se tocan? El texto de equipos prohibidos es literal y no se parsea como lista. |
| PREF-03 | empty | explicit | Un campo de equipos prohibidos vac├¡o se guarda como cadena vac├¡a y se renderiza Sin indicar; la fila nunca se oculta. |
| PREF-03 | encoding | explicit | Igual que los equipos preferidos: acentos y no-ASCII se preservan, break-words en render, sin truncate sobre datos del usuario. |
| PREF-03 | ordering | backstop | ┬┐Es estable el orden cuando los elementos comparan igual? Se preserva el formato literal introducido por el usuario. |
| DRAW-01 | adjacency | backstop | ┬┐Qu├® ocurre cuando dos filas se tocan o coinciden en el orden? Dos participantes con el mismo nameNormalized no pueden coexistir (EVENT-04); el desempate visual se resuelve de forma determinista. |
| DRAW-01 | empty | explicit | Un lobby con cero participantes (instantánea con cero documentos) muestra Todavía no hay nadie en la lista. con En cuanto alguien entre, aparecerá aquí. en lugar de una lista vacía; y Empezar Sorteo permanece deshabilitado hasta que haya al menos tres (DRAW-01, D-10). |
| DRAW-01 | ordering | explicit | La lista del lobby se ordena de forma estable por nameNormalized, con la fila propia marcada (t├║) y la del Admin con la insignia Admin. |
| DRAW-04 | adjacency | explicit | buildDerangement nunca produce un punto fijo ni un par mutuo: para n=3, n=4 y n=6 todo uid aparece exactamente una vez como regalador y exactamente una vez como destinatario, y ning├║n uid se apunta a s├¡ mismo. |
| DRAW-04 | empty | explicit | El sorteo no puede ejecutarse con menos de 3 participantes: con 0, 1 o 2 el bot├│n est├í deshabilitado y el servidor (regla + transacci├│n) rechaza la escritura igualmente. |
| DRAW-04 | ordering | explicit | El resultado es un ├║nico ciclo circular sobre el array de participantes barajado con FisherÔÇôYates y desplazado +1; el mismo array de entrada produce el mismo ciclo y el orden de escritura de las asignaciones es determinista. |
| ORDER-01 | empty | explicit | Si el usuario llega a /reveal con status != drawn, App.tsx redirige antes de pintar; con status == drawn pero sin asignación legible ve No encontramos tu asignación. con Vuelve a la sala de espera e inténtalo de nuevo. y la acción Ir a la sala de espera, nunca un nombre vacío. (La copia de identidad perdida — No encontramos tu identidad en este evento. — pertenece a S8, no a esta fila.) |
| ORDER-01 | encoding | explicit | El nombre del destinatario se renderiza literal y con break-words: nombres compuestos o con acentos no se truncan ni se escapan de forma visible. |
| ORDER-02 | boundary | explicit | Los l├¡mites exactos: Tipo solo admite Fan\|Player\|Retro, la talla debe pertenecer al enum S..XXXL, el dorsal es texto de hasta 3 caracteres y la serigraf├¡a de hasta 30; un valor fuera de rango se rechaza en el formulario y la regla de Firestore lo rechaza igualmente. |
| ORDER-02 | empty | explicit | Tipo y Talla son obligatorios con placeholder visible y mensaje Este campo es obligatorio.; Equipo, Temporada, serigraf├¡a y dorsal son opcionales y se guardan como cadena vac├¡a, nunca como null. |
| ORDER-02 | encoding | explicit | El dorsal se almacena como string: 09 y 007 sobreviven a la ida y vuelta sin convertirse en 9 o 7; los caracteres no-ASCII del equipo y de la serigraf├¡a se preservan. |
| ORDER-02 | precision | explicit | No hay aritm├®tica num├®rica sobre el dorsal: es un identificador textual, de modo que no existe p├®rdida de precisi├│n ni redondeo posible. |
| ADMIN-02 | concurrency | explicit | Descargar dos veces seguidas, o mientras llega una escritura nueva de pedido, no corrompe el archivo: cada descarga serializa una instant├ínea coherente y revoca el object URL tras el click. |

## Unresolved (unclassified) → surface as flagged assumptions, never drop

| Req | Category | Probe |
|-----|----------|-------|
| PREF-01 | unclassified | unclassified ÔÇö review manually |
| PREF-04 | unclassified | unclassified ÔÇö review manually |
| PREF-05 | unclassified | unclassified ÔÇö review manually |
| DRAW-02 | unclassified | unclassified ÔÇö review manually |
| DRAW-03 | unclassified | unclassified ÔÇö review manually |
| DRAW-05 | unclassified | unclassified ÔÇö review manually |
| ORDER-03 | unclassified | unclassified ÔÇö review manually |
| ORDER-04 | unclassified | unclassified ÔÇö review manually |
| ORDER-05 | unclassified | unclassified ÔÇö review manually |
| ADMIN-01 | unclassified | unclassified ÔÇö review manually |
| SEC-01 | unclassified | unclassified ÔÇö review manually |
| SEC-02 | unclassified | unclassified ÔÇö review manually |

Backstop rows lift as flat scalars `{ statement, verification: backstop }` in `must_haves.truths` (never prose); at verify time an unconfirmed backstop abstains to `human_needed` rather than passing silently.
