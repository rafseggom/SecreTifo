# Investigación de Features — SecretKit

**Dominio:** Amigo invisible (Secret Santa) + coordinación de pedido grupal de camisetas de fútbol
**Fecha de investigación:** 2026-10-17
**Confianza global:** MEDIUM (fuentes web cross-verificadas; sin proveedores de docs curados habilitados en `.planning/config.json` — todos los flags de búsqueda externa están en `false`, por lo que el seam enrutó a `websearch` → LOW aislado, MEDIUM al cruzar ≥2 fuentes independientes)

> Nota de método: las fuentes disponibles son documentación pública de producto (organizadores de amigo invisible) + guías de proveedores de equipación deportiva + literatura de derangements. No hay acceso a datos de uso internos. Las etiquetas de confianza son por hallazgo.

---

## 0. Clasificación de los requisitos exigidos en PROJECT.md

Mapa explícito de cada feature pedida → categoría → complejidad:

| # | Requisito exigido | Categoría | Complejidad | Comentario |
|---|-------------------|-----------|-------------|------------|
| F1 | Entrada solo con nombre; primer usuario = Admin; el resto se une | **Table Stakes** | LOW (admin: MEDIUM por concurrencia) | "No account required" es el estándar de facto del sector (Drawnames lo publicita como feature). La elección de admin es LOW salvo la carrera de dos primeros usuarios simultáneos. |
| F2 | Formulario de preferencias al unirse: talla S–XXXL, equipos que le gustan, equipos prohibidos, modal "Guía de Tallas" | **Table Stakes** | MEDIUM | La **talla es obligatoria**, los equipos son opcionales (ver §3, dependencias). El modal es LOW; el formulario completo es MEDIUM por validación/normalización. |
| F3 | Precios de referencia visibles (Fan 11$ / Player 16$ / Retro 15$) | **Table Stakes** | LOW | Dato estático. Es información mínima para que el regalador no se pase del presupuesto implícito del grupo. Equivale al "budget guideline" que ofrecen Elfster/Drawnames. |
| F4 | Lobby con la lista de participantes; Admin ve "Empezar Sorteo" | **Table Stakes** | LOW–MEDIUM | LOW con `onSnapshot`; MEDIUM si se añade estado por participante (prefs completadas / pedido enviado). |
| F5 | Sorteo aleatorio circular, nadie se autoasigna | **Table Stakes** | MEDIUM | El núcleo del producto. Rotación de una lista barajada = ciclo único garantizado. Ver §4.1. |
| F6 | Vista post-sorteo: destinatario + sus preferencias + formulario de pedido (Tipo, Equipo, Temporada, Nombre a serigrafiar, Dorsal) | **Table Stakes** | MEDIUM–HIGH | Es la feature más costosa del MVP: 5 campos + validación + prefill desde preferencias + manejo de "preferencias ausentes". |
| F7 | Vista Admin: progreso de pedidos + "Descargar Pedidos" (.txt/.csv) **sin** revelar quién regala a quién | **Table Stakes** | MEDIUM (export) + HIGH (no-fuga) | El export es MEDIUM; **garantizar la no-revelación es la parte difícil** y es el Core Value. Ver §4.7 — incluye una fuga por inferencia que el requisito no contempla. |

**Ninguno de los 7 requisitos exigidos es un anti-feature ni un diferenciador puro: los 7 son table stakes.** El producto tal como está especificado es un MVP de flujo mínimo; los diferenciadores están en el *cómo* (guía de tallas real de camisetas, export listo para el vendedor, sorteo ciego) no en *features adicionales*. Esto es coherente con el `granularity: coarse` y el `mode: yolo` de la config.

---

## Feature Landscape

### Table Stakes (Imprescindibles — sin esto el flujo se rompe)

| Feature | Por qué se espera | Complejidad | Notas de implementación |
|---------|-------------------|-------------|-------------------------|
| Entrada solo con nombre (sin cuenta ni contraseña) | Todo el sector lo ofrece sin fricción; Drawnames lo publicita como "no account needed". Añadir login mata a un grupo de 8 amigos. | LOW | Normalizar nombre (trim, colapsar espacios, fold de acentos para la clave de unicidad). Guardar clave `nameKey` en minúsculas sin acentos. |
| Unicidad de nombre en el evento | Dos "Marc" rompen la revelación (¿a cuál le regalo?) y corrompen el export. Es la *identidad* del sistema, así que debe ser única. | LOW | Clave derivada; rechazar duplicado con mensaje accionable ("ya hay un Marc — prueba Marc G."). Ver §4.6. |
| Identidad persistente en el dispositivo (soy "Marc" al recargar) | Sin auth, un F5 no puede devolverte a la vista post-sorteo. Es el fallo más común de los clones de amigo invisible. | MEDIUM | `participantId` + token en `localStorage`. Con Firebase Anonymous Auth el uid hace esto gratis y además habilita reglas de seguridad reales. **Recomendado: Anonymous Auth (invisible al usuario).** Ver §4.7. |
| Enlace de invitación compartible al evento | Un grupo de WhatsApp necesita un link; sin link descubrible nadie se une. | LOW | Ruta `/e/:eventId` o `/e/:joinCode`. El `eventId` de Firestore es suficientemente opaco. |
| Primer usuario = Admin (rol único, no elegido) | Elimina gestión de roles/permisos: el organizador natural abre el evento. | LOW (carrera: MEDIUM) | Escribir `adminId` una sola vez con transacción; la regla `create` debe fallar si el doc ya existe. Ver §4.10. |
| Formulario de preferencias: **talla obligatoria** (S, M, L, XL, XXL, XXXL) | La talla es el único campo que el regalador *no puede inventar*: la camiseta debe caberle a otra persona. | LOW | Select cerrado. **Bloquear el envío del pedido si el destinatario no tiene talla.** |
| Formulario de preferencias: equipos que le gustan (texto libre) | Es el input directo para elegir camiseta; sin él el regalador adivina. | LOW | Texto libre, un solo campo multilínea o lista separada por comas. No construir catálogo de equipos en v1. |
| Formulario de preferencias: equipos prohibidos (texto libre) | Tan importante como los gustos: la gracia del amigo invisible entre futboleros es *no* regalar la camiseta del rival. | LOW | Igual que el anterior. Se muestra al regalador de forma destacada. |
| Modal "Guía de Tallas" siempre visible | Sin tabla de equivalencias (P/M/G/GG/XG/2XG) nadie acierta la talla de otro. Es el error nº1 que arruina el regalo. | LOW | Datos estáticos de PROJECT.md (Fan + Player). **Decisión pendiente: Retro usa la tabla Fan — declararlo explícitamente en el modal** (ver §4.16). |
| Precios de referencia visibles en la pantalla de pedido | El grupo tiene presupuesto implícito; sin precio el regalador no puede autocontenerse. | LOW | Fan 11$ / Player 16$ / Retro 15$. Mostrar el precio del tipo seleccionado de forma dinámica. |
| Lobby con lista de participantes en tiempo real | Es la confirmación social de que "ya están todos"; el Admin necesita saber cuándo sortear. | LOW | `onSnapshot` sobre `participants`. Con unsubscribe en cleanup (ver PITFALLS). |
| Sorteo circular con garantía de no-autoasignación | Si alguien se saca a sí mismo, el producto ha fallado de forma visible y no reparable. | MEDIUM | Barajar (Fisher–Yates) + rotar 1 posición → ciclo único uniforme. Ver §4.1 y §4.2. |
| Congelar el roster en el momento del sorteo | Si entra alguien después del sorteo, el ciclo se rompe (n cambia) y hay una persona sin regalador/persona que regalar. | LOW–MEDIUM | `drawStatus: OPEN → DRAWN`; las reglas deniegan `create` en `participants` cuando `drawStatus == 'DRAWN'`. |
| Vista post-sorteo "Te ha tocado regalar a [Nombre]" | Es el momento de valor; sin él no hay producto. | LOW | Solo lectura de la propia asignación (regla: `request.auth.uid == resource.data.giverId`). |
| Preferencias del destinatario visibles en la vista post-sorteo | El regalador necesita talla + gustos + prohibidos en el mismo pantallazo donde rellena el pedido. | LOW | Requiere leer el doc del destinatario. **Solo talla + equipos; nunca la asignación de nadie más.** |
| Formulario de pedido: Tipo (Fan/Player/Retro), Equipo, Temporada/Año, Nombre a serigrafiar, Dorsal | Son exactamente los campos que un proveedor de equipación personalizada exige (roster: nombre, número, talla, estilo — confirmado por guías de proveedores como Makeform/Paperform/UncommonFit). | MEDIUM–HIGH | 5 campos + validación. Dorsal 1–99 (o vacío). Nombre serigrafiado ≤ ~15 chars, se normaliza a mayúsculas. Temporada: texto con placeholder `2024/25` o select de temporadas recientes. |
| Talla del pedido = talla del **destinatario** (no del regalador) | El error silencioso más caro: si el formulario pre-rellena la talla del regalador, se pide la camiseta del tamaño equivocado. | LOW | El formulario vive dentro del contexto "destinatario"; precargar la talla del destinatario y mostrarla como dato heredado (editable solo con aviso). |
| Guardar/editar el pedido propio | La gente se equivoca de dorsal o cambia de equipo; obligar a pedir al Admin que lo edite expone el sistema. | LOW | `setDoc` idempotente sobre `orders/{giverId}` → editar = reenviar. |
| Estado vacío / carga / error en cada pantalla | Sin estados, una lista vacía parece un error y el grupo se dispersa. | LOW | Al menos "cargando", "nadie se ha unido todavía", "el sorteo no ha empezado". |
| Confirmación explícita en "Empezar Sorteo" | Es la única acción irreversible del producto; un clic accidental bloquea el roster. | LOW | Modal de confirmación + texto con nº de participantes actual. |
| Vista Admin: progreso (X de N pedidos completados) + "Descargar Pedidos" | Es el Core Value operativo: convertir N pedidos dispersos en una orden al vendedor. | MEDIUM | Contador derivado de `orders`; botón genera .csv/.txt. Ver F7. |
| **El export y la vista Admin no exponen la relación regalador → destinatario** | Es una constraint dura de PROJECT.md, no una opción. Es además la feature que **ningún competidor de amigo invisible tiene** (los genéricos muestran el sorteo completo al organizador; solo GiftList lo publicita como "organizer-blind draw"). | HIGH | Ver §4.7 — incluye la fuga por inferencia talla+equipo y la solución de ID opaco de pedido. |
| Export listo para el vendedor (camiseta, talla, tipo, dorsal, nombre serigrafiado) | El Admin reenvía esto al vendedor; si el formato es ilegible, el pedido grupal falla. | MEDIUM | UTF-8 **con BOM** para Excel; sin columna de regalador; dorsales como texto citado (evitar pérdida de ceros iniciales). |
| El Admin es también participante y no ve su propia asignación desde la vista Admin | Es el caso que más rompe la ilusión: el organizador es el más tentado a mirar. | MEDIUM | Reglas por uid, no por rol. La vista Admin no consulta `assignments` en absoluto. |

### Differentiators (Ventaja competitiva — alineados con el Core Value)

| Feature | Propuesta de valor | Complejidad | Notas |
|---------|--------------------|-------------|-------|
| Sorteo ciego **estructuralmente garantizado** (no solo "oculto en la UI") | Se puede *prometer* al grupo: "el Admin no puede ver el sorteo" y sostenerlo con reglas de seguridad, no con buenas intenciones. Es lo único que este producto hace mejor que Drawnames/Elfster, que muestran todo al organizador. | MEDIUM | Anonymous Auth + reglas `allow read: if request.auth.uid == resource.data.giverId`. Sin uid (solo nombre) las reglas de Firestore **no pueden** proteger un campo — no hay forma de saber quién pregunta. Ver §4.7. |
| **ID opaco de pedido** como identificador del pedido en la vista y el export | Rompe matemáticamente la inferencia talla+equipo+nombre→pareja: el Admin ve "pedido #7: Player, Madrid, L, 'SEBAS', 7" sin saber de quién es ni para quién es. El regalador empareja su `#id` con su destinatario al entregar la camiseta. | LOW (con la decisión de diseño) | Es la pieza que hace que el export sea realmente ciego. Sin esto, el export revela los pedidos por persona y el Admin puede deducir parejas. Ver §4.7. |
| Guía de tallas **específica de camiseta de fútbol** (Fan vs Player, con equivalencias P/M/G/GG/XG/2XG) | Ningún organizador de amigo invisible tiene esto: son herramientas de regalos genéricos. Y ningún proveedor te lo pone en el flujo de decisión. Es *el* diferenciador de dominio. | LOW | Datos ya definidos en PROJECT.md. Añadir conversión cruzada Fan↔Player en el modal (S de Fan ≈ M de Player en altura) — es el consejo de compra más útil que puede dar la app. |
| Aviso automático de **incompatibilidad talla/tipo** | El dato real de PROJECT.md lo exige: la tabla **Player solo llega a 2XL** mientras Fan llega a XXXL. Un participante XXXL al que le regalan "Player" genera un pedido inválido que se descubre en el vendedor. | LOW | Al elegir tipo, comparar con la talla del destinatario y bloquear/avisar: `XXXL ⇒ Fan o Retro únicamente`. Regla derivada de datos, no inventada. **Alto valor, coste casi nulo.** |
| Aviso de **conflicto con equipos prohibidos** en el formulario de pedido | El regalador puede escribir el equipo que el destinatario odia sin darse cuenta (el texto libre se lee una vez y se olvida). Un check blando convierte un error social en una advertencia. | LOW–MEDIUM | Comparación de strings normalizados contra `forbiddenTeams`. **Advisory, no bloqueante** (los equipos son texto libre, falsos positivos inevitables). |
| Export **agrupado por SKU** (N× Player / Madrid / L / dorsal 7) | El vendedor quiere cantidades por modelo, no una lista de 8 líneas desordenadas. Es lo que convierte el export en una orden real. | LOW–MEDIUM | Agrupar por (tipo, equipo, temporada, talla) y sumar cantidades; mantener la lista detallada como segunda sección si hace falta el detalle de serigrafía. |
| Contador de progreso + lista de **quién falta por pedir** | El Admin puede reclamar sin ver nada del sorteo. Elimina la fricción real: "¿quién coño no ha pedido aún?". | LOW | Mostrar **nombres de participantes que han enviado pedido** (no del destinatario ni de la pareja). Información neutra: no revela parejas. |
| Preferencias editables **después** del sorteo | La realidad: alguien rellena corriendo al unirse y luego recuerda que odia al Barça. Si no puede editarlas, el regalador trabaja con datos malos y no lo sabrá nunca. | LOW | Formulario alcanzable desde el lobby con `drawStatus = DRAWN`. El regalador ve la versión actual (marcar `updatedAt`). |
| Estado "sin preferencias todavía" bien resuelto en la vista post-sorteo | El escenario más probable en un grupo real. Se convierte en diferenciador si la app guía ("pregúntale en el grupo" / "elige un equipo neutro de los que le gustan a todos") en vez de mostrar un hueco vacío. | LOW | Ver §4.3. |
| Compartir/copiar el pedido propio en texto plano al chat | Muchos grupos acaban cerrando el círculo por WhatsApp; permitirlo reduce fricción y es trivial. | LOW | Botón "copiar mi pedido". **Cuidado: no incluir a quién regala** en el texto copiado. |

### Anti-Features (Pedidos con frecuencia, problemáticos aquí)

| Anti-Feature | Por qué se pide | Por qué es problemático | Alternativa |
|--------------|-----------------|-------------------------|-------------|
| Contraseñas / OAuth / cuentas reales | "Para que nadie entre como otro" | Fricción desproporcionada para 8 amigos; matarías la adopción y contradice Out of Scope. El riesgo (suplantación en un grupo privado) es irrelevante frente al coste. | Nombre único + **Anonymous Auth** (invisible) + token local. Da la protección estructural de reglas sin pedir nada al usuario. |
| Motor de **exclusiones** ("estos dos no pueden emparejarse") | Es la feature estrella de Elfster/Drawnames y siempre surge el "que no me toque mi hermano" | **Conflicto directo con el Core Value**: con restricciones, una permutación de ciclo único puede no existir, el sorteo puede fallar, y hay que resolver emparejamiento con backtracking (complejidad alta, resultados no uniformes, y reintentos que revelan información al organizador). | No construir en v1. Si aparece la necesidad: se resuelve socialmente (intercambio manual entre dos givers, que sigue siendo válido si se hace en cadena), no en código. Documentar en Out of Scope. |
| Botón "ver el sorteo completo" para el Admin | Comodidad del organizador; **todos los competidores lo tienen** | Aniquila el Core Value completo. Es una tentación de diseño, no una feature. Un solo campo de admin con lectura de `assignments` convierte la promesa en mentira. | El Admin nunca lee `assignments`. Un test de seguridad (regla + prueba con el uid del admin) debe demostrar la denegación. |
| Re-sorteo libre en cualquier momento | "Se nos olvidó meter a Juan" | Destruye pedidos ya enviados y, repetido, erosiona la sensación de azar justo. | Permitido **solo** si `drawStatus == DRAWN && ordersCount == 0`, con confirmación destructiva y `drawVersion++`. Ver §4.4. |
| Re-sorteo individual ("cámbiame a mí") | "Es que me ha tocado el que no quería" | Rompe la biyección (alguien se queda sin regalador o con dos) y es la vía obvia de manipulación. | Prohibido en v1. La única reparación legítima es la reconexión del leaver (§4.5) o un re-sorteo completo. |
| Listas de deseos / catálogo de productos / "Santa Mail" (mensajería anónima) | Es el núcleo de Elfster/GiftList | El dominio ya fija el regalo (una camiseta concreta). Construir un wishlist genérico duplica un producto existente y añade moderación, privacidad y datos que nadie usará. | El formulario de pedido **es** el wishlist, pero restringido a un dominio (camisetas). Preferencias de equipos = el "wishlist" mínimo suficiente. |
| Pagos / checkout / split de gastos | "Así cerramos el círculo" | Rompe Out of Scope; introduce PCI, reembolsos, y quién-ya-pagó (otra fuente de fuga de información). | Export para el vendedor + el grupo cobra por su vía habitual (Bizum/transferencia). |
| Notificaciones push / emails | "Para avisar de que ya hay sorteo" | Infraestructura (FCM/SMTP/plantillas), y el grupo ya tiene un chat donde se avisa en 2 segundos. | El link del grupo es el canal. Estado visible en el lobby al recargar. Un "copiar texto de aviso" opcional reemplaza todo el sistema. |
| Múltiples eventos / multi-sala / multi-tenant | "Para reutilizarlo el año que viene" | Dispara el modelo de datos (aislamiento, índices, reglas multi-evento, selección de evento) y Out of Scope ya lo cierra. | Un evento activo. Reutilización = borrar y crear otro evento (v2 si se pide). |
| Chat integrado / comentarios | "Para que se coordinen" | Moderación, notificaciones, tiempo real adicional; el grupo ya tiene WhatsApp. | Link al grupo. |
| Catálogo/validación de equipos y tallas reales contra el vendedor | "Para no pedir un equipo que no existe" | Requiere integración con datos del vendedor o un dataset de equipos (mantenimiento eterno, ligas, temporadas). | Texto libre + confirmación humana del vendedor. |
| Roles/permisos configurables (varios admins, co-admin) | "Por si el Admin se va" | Complejidad de modelo y de reglas, para un evento de horas con un organizador obvio. | Un Admin. Transferencia = eliminar el evento y recrearlo (documentado como limitación). |
| Histórico de sorteos pasados / estadísticas ("¿repetiste con X?") | Curioso, y Elfster lo insinúa | Es una **fuga de datos** de ediciones anteriores y almacenamiento sin propósito. Además nadie puede ver la asignación pasada sin romper la privacidad. | Eliminar los datos del evento al cerrarlo. |
| Hash ciego / criptografía casera para "probar" que el Admin no miró | Parece "más seguro" | Criptografía propia mal hecha da falsa confianza; un hash del emparejamiento no impide leer Firestore. | Aislamiento estructural con Auth anónima + reglas + export sin identidades (§4.7). Es verificable con un test real. |
| Panel de Admin con los pedidos **por persona** ("para organizar la entrega") | Operativamente cómodo: "así sé qué sobre dar a quién" | Es exactamente la fuga: si el Admin ve "el pedido de Marc es una camiseta del Madrid talla L" **y** conoce la preferencia de Sebas (Madrid, L), reconstruye la pareja por intersección. | Export con **ID opaco** + talla/equipo/serigrafía/dorsal, sin nombre del regalador. La entrega se resuelve con el ID. Ver §4.7. |

---

## Feature Dependencies

```
[Lobby tiempo real]
    └──requires──> [Unirse al evento] ──requires──> [Nombre único]

[Sorteo circular] ──requires──> [≥3 participantes]
                  ──requires──> [Roster congelado]
                  ──requires──> [Sorteo transaccional (una sola vez)]

[Vista post-sorteo] ──requires──> [Sorteo ejecutado]
                    ──requires──> [Identidad persistente en el dispositivo]
                    ──requires──> [Preferencias del destinatario legibles por el giver]

[Preferencias del destinatario] ──requires──> [Formulario de preferencias]
                                 └──soft──> [Talla]  (talla ausente ⇒ formulario de pedido sin base)

[Formulario de pedido] ──requires──> [Vista post-sorteo]
                       ──requires──> [Talla del destinatario]
                       ──enhances──> [Aviso incompatibilidad talla/tipo]
                       ──enhances──> [Aviso conflicto equipos prohibidos]

[Vista Admin / progreso] ──requires──> [Pedidos enviados]
                         ──requires──> [Rol Admin]

[Export sin fugas] ──requires──> [Pedidos enviados]
                   ──requires──> [ID opaco de pedido]
                   ──requires──> [Reglas de seguridad que deniegan la lectura de assignments al Admin]
                   ──requires──> [Auth anónima]   (¡sin uid no hay regla posible!)

[Guía de Tallas] ──standalone──> (no depende de nada; dato estático)
[Precios de referencia] ──standalone──> (dato estático)
[Editar preferencias post-sorteo] ──requires──> [Sorteo ejecutado] (para que el lobby cambie de estado)

[Motor de exclusiones] ──conflicts──> [Sorteo circular]
[Re-sorteo] ──conflicts──> [Pedidos enviados]
[Congelar roster] ──conflicts──> [Unirse después del sorteo]
```

### Dependency Notes

- **El sorteo requiere ≥3:** n=2 produce una pareja mutua forzada (A→B y B→A). No es un ciclo real y es trivialmente adivinable. n=1 es imposible. Confirmado por Elfster y GiftList: el mínimo es 3, y **el par/impar es irrelevante porque un amigo invisible es un ciclo, no un emparejamiento.**
- **El sorteo requiere roster congelado:** el ciclo se define sobre un conjunto fijo. Permitir joins tras el sorteo hace que los nuevos no reciban ni den.
- **El formulario de pedido depende de la talla del destinatario:** es la única dependencia dura de datos. Si la talla falta, el pedido no puede completarse con sentido ⇒ **la talla debe ser obligatoria en el join**, mientras que los equipos pueden faltar sin bloquear.
- **El export sin fugas requiere Auth anónima:** sin un `uid` no hay nada contra lo que comparar, y las reglas de Firestore no pueden expresar "el admin no puede leer esto". Esta dependencia es la que decide si la privacidad es real o solo cosmética.
- **El ID opaco de pedido habilita el export ciego:** sin él, la única forma de que el export sea útil (saber cuántas camisetas de cada cosa) implica listar por persona, y listar por persona + conocer preferencias = inferencia de parejas.
- **El motor de exclusiones entra en conflicto con el sorteo circular:** con exclusiones puede no existir ciclo único válido. Es el anti-feature de mayor riesgo de scope creep porque "es lo que hacen todos".
- **El re-sorteo entra en conflicto con los pedidos:** re-sortear cambia destinatarios, luego invalida pedidos ya colocados. De ahí la guarda `ordersCount == 0`.
- **Editar preferencias post-sorteo** no conflictúa con nada y elimina la dependencia de "todos deben rellenar antes de sortear". Es la salida elegante al edge case §4.3.

---

## MVP Definition

### Launch With (v1)

- [ ] **Unirse con nombre + unicidad + link de invitación** — sin puerta de entrada, no hay producto.
- [ ] **Primer usuario = Admin (transaccional)** — define el rol antes de que dos personas lo reivindiquen.
- [ ] **Formulario de preferencias con talla obligatoria + Guía de Tallas (modal) + equipos gustados/prohibidos** — sin talla el pedido no existe; sin guía la talla se elige mal.
- [ ] **Lobby en tiempo real con contador** — es el mecanismo social que hace que el grupo se organice y el Admin sepa cuándo sortear.
- [ ] **Sorteo circular transaccional (n ≥ 3, roster congelado)** — el momento de valor, y la única acción irreversible.
- [ ] **Vista post-sorteo con destinatario + preferencias** — cierra la promesa del amigo invisible.
- [ ] **Formulario de pedido (5 campos) con precios de referencia visibles** — sin esto el Admin no tiene nada que exportar.
- [ ] **Auth anónima + reglas que hacen el emparejamiento ilegible para el Admin (incluido el auto-Admin)** — es la constraint dura; no es opcional y no se puede "añadir después" sin rehacer el modelo de datos.
- [ ] **Vista Admin: progreso + quién falta + export .csv/.txt con ID opaco, sin regalador, UTF-8 BOM** — es el Core Value operativo.
- [ ] **Estados vacío/carga/error + confirmación del sorteo** — sin ellos el flujo se siente roto.
- [ ] **Editar mi pedido y mis preferencias** — la corrección de errores es obligatoria cuando el único canal es esta app.

### Add After Validation (v1.x)

- [ ] **Aviso de incompatibilidad talla/tipo (XXXL ⇒ Fan/Retro)** — añadir cuando aparezca el primer pedido Player en talla inexistente; derivado de los datos de PROJECT.md. Barato y de alto valor; candidato a subir a v1 si sobra poco.
- [ ] **Aviso de conflicto con equipos prohibidos** — trigger: alguien pide la camiseta que el destinatario odia.
- [ ] **Export agrupado por SKU con cantidades** — trigger: el vendedor pide totales en vez de líneas.
- [ ] **Recuperación de identidad (cambio de dispositivo / storage borrado)** — trigger: alguien reclama y el Admin no puede arreglarlo sin romper el ciclo. Con Auth anónima + custom token o "reclamar mi nombre" con verificación por el Admin.
- [ ] **Re-sorteo controlado (solo con 0 pedidos)** — trigger: alguien se une tarde y el grupo no quiere cancelar el evento.
- [ ] **Copiar mi pedido / copiar aviso del chat** — trigger: uso real de WhatsApp como canal.

### Future Consideration (v2+)

- [ ] **Transferir el rol de Admin** — diferido: requiere modelo de roles; evento de horas.
- [ ] **Unirse sin prefs y completarlas solo tras el sorteo como flujo normal** — diferido: implica UX de recordatorios.
- [ ] **Motor de exclusiones** — diferido indefinidamente: conflicto estructural con el sorteo circular. Reconsiderar solo si se abandona la garantía de ciclo único.
- [ ] **Múltiples eventos / histórico** — diferido: Out of Scope.
- [ ] **Reconstruir/exportar en formato del vendedor específico** — diferido hasta tener un vendedor real.

---

## Feature Prioritization Matrix

| Feature | Valor de usuario | Coste de implementación | Prioridad |
|---------|------------------|-------------------------|-----------|
| Unirse con nombre único + link | HIGH | LOW | P1 |
| Primer usuario = Admin (transaccional) | HIGH | LOW | P1 |
| Preferencias (talla obligatoria + equipos) | HIGH | LOW | P1 |
| Guía de Tallas (modal estático) | HIGH | LOW | P1 |
| Lobby tiempo real | HIGH | LOW | P1 |
| Sorteo circular (n ≥ 3, congelado, transaccional) | HIGH | MEDIUM | P1 |
| Vista post-sorteo con preferencias del destinatario | HIGH | MEDIUM | P1 |
| Formulario de pedido + precios | HIGH | MEDIUM–HIGH | P1 |
| Auth anónima + reglas de empatamiento privado | HIGH | MEDIUM | P1 |
| Export ciego (ID opaco, BOM, agrupable) | HIGH | MEDIUM | P1 |
| Progreso Admin + quién falta | MEDIUM | LOW | P1 |
| Editar pedido/preferencias | MEDIUM | LOW | P1 |
| Estados vacío/carga/error + confirmaciones | MEDIUM | LOW | P1 |
| Aviso incompatibilidad talla/tipo | HIGH | LOW | P1–P2 (subir a P1: sale gratis de los datos) |
| Aviso equipos prohibidos | MEDIUM | LOW–MEDIUM | P2 |
| Export agrupado por SKU | MEDIUM | LOW–MEDIUM | P2 |
| Recuperación de identidad | MEDIUM | MEDIUM | P2 |
| Re-sorteo controlado | MEDIUM | LOW | P2 |
| Copiar pedido/aviso al chat | LOW | LOW | P3 |
| Transferencia de Admin | LOW | MEDIUM | P3 |
| Motor de exclusiones | LOW (aquí) | HIGH | P3 + anti-feature |
| Multi-evento / histórico | LOW | HIGH | P3 + anti-feature |

**Clave:** P1 = imprescindible para lanzar · P2 = debería estar, añadir cuando se pueda · P3 = futuro.

---

## Competitor Feature Analysis

| Feature | Elfster | Drawnames | GiftList / SecretSantaOrganizer | Formularios de equipación (Makeform, Paperform, tiendas de equipo) | Nuestro enfoque |
|---------|---------|-----------|--------------------------------|-------------------------------------------------------------------|-----------------|
| Cuenta requerida | Sí | No ("no account needed") | No | N/A | **No** — solo nombre (+ Auth anónima invisible) |
| Listas de deseos | Sí (núcleo) | Sí | Sí (núcleo) | No | **No** — el pedido de camiseta es el wishlist |
| Exclusiones (quién no puede tocar a quién) | Sí | Sí | Sí ("couples, colleagues") | N/A | **No** — conflicto con ciclo único |
| El organizador ve el sorteo completo | Sí | Sí | **No — "organizer-blind draw"** | N/A | **No** — sorteo ciego con reglas, no solo con omisión en UI |
| Mínimo de participantes | 3 | 3 | 3 (GiftList hasta 100) | N/A | 3 (bloqueado con mensaje claro); par/impar irrelevante |
| Presupuesto guía | Sí | Sí | Sí | No | Precios de referencia fijos (11/16/15$) |
| Guía de tallas de camiseta de fútbol | No (regalos genéricos) | No | No | Manual/PDF del proveedor | **Sí — Fan + Player, con equivalencias** |
| Campos de pedido de camiseta (equipo, temporada, serigrafía, dorsal) | No | No | No | Sí (roster: nombre, número, talla, estilo) | **Sí, integrados en el flujo del sorteo** |
| Export agregado para el vendedor | No | No | No | Manual (roster a Excel) | **Sí — CSV con ID opaco, agrupable por SKU** |
| Recordatorios / notificaciones | Sí (email) | Sí | Sí (email) | No | **No** — el chat del grupo es el canal |
| Re-sorteo | Sí (libre) | Sí | Sí | N/A | **Solo con 0 pedidos** |
| Entregar el regalo (mapping a persona) | N/A | N/A | N/A | N/A | **ID opaco de pedido en el export** — rompe la inferencia |

**Lectura estratégica:** el mercado de amigo invisible resuelve "sortear un regalo genérico"; el mercado de equipación resuelve "recoger tallas y serigrafía para un pedido grupal". **Nadie une las dos mitades.** El espacio libre es exactamente ese: el sorteo ciego + el pedido específico de camiseta + el export al vendedor. Ese es el producto.

---

## Domain Edge Cases

Todos los casos límite del dominio, con manejo recomendado para v1:

### 4.1 Conteo par/impar de participantes
**Qué pasa:** ningún problema. Un amigo invisible no crea parejas, crea un ciclo: cada persona regala a una y recibe de otra. Con n impar el ciclo sigue cerrando. Cruzado en Elfster ("works with any number as long as there are at least three") y GiftList.
**Manejo v1:** mismo código para n par e impar. No añadir ninguna rama especial. Prohibir explícitamente el pan-de-2.

### 4.2 Mínimo de participantes (n ≥ 3)
**Qué pasa:** con n=1 no hay asignación; con n=2 la única solución es A→B y B→A, que no es un ciclo y que ambas partes deducen al instante.
**Manejo v1:** botón "Empezar Sorteo" deshabilitado con `n < 3`, con mensaje explícito ("Necesitáis al menos 3 personas; ahora sois 2"). Añadir también un **máximo razonable** (p. ej. 50) para que un evento abierto no se desborde. Alerta si `n == 3`: el ciclo es de longitud 3, cualquiera puede deducir la pareja por eliminación — avisar en la confirmación ("con 3 personas el sorteo es deducible; ¿seguro?").

### 4.3 Alguien nunca rellena sus preferencias
**Qué pasa:** el escenario más probable de todos. Bloquear el sorteo hasta que todos rellenen convierte a un rezagado en rehén del grupo entero.
**Manejo v1:**
- La **talla se pide al unirse** (obligatoria). El grupo se une junto, en minutos, así que la ventana de abandono es pequeña.
- **No bloquear el sorteo por preferencias incompletas.** El sorteo solo necesita el roster.
- En la vista post-sorteo, si el destinatario no tiene preferencias: estado explícito "Marc aún no ha rellenado sus preferencias — pregúntale en el grupo" + mostrar su talla si existe + recordar que los equipos prohibidos son opcionales.
- Si le falta **la talla** (caso raro), marcar el pedido como bloqueado hasta que la ponga (evita pedir la talla equivocada), pero permitir que el destinatario la complete después del sorteo.
- **Permitir editar preferencias después del sorteo** — es lo que hace este caso no-bloqueante.

### 4.4 Manejo de re-sorteo
**Qué pasa:** necesidad legítima (se olvidó alguien) vs. destrucción de datos y erosión del azar.
**Manejo v1:**
- Permitido únicamente si `drawStatus == DRAWN && orderCount == 0`.
- Con `orderCount > 0`, el botón desaparece y el Admin ve por qué ("ya hay pedidos enviados; re-sortear los invalidaría").
- Re-sorteo con confirmación destructiva + incrementar `drawVersion` (auditoría y para invalidar cachés locales).
- El re-sorteo debe ser **transaccional e idempotente**: doble clic no puede producir dos sorteos.
- **Prohibido el re-sorteo individual** (ver anti-features): rompe la biyección.

### 4.5 Un participante se va / abandona
**Qué pasa:** es el caso que rompe el ciclo. Si L se va, quien regalaba a L se queda sin destinatario y quien era regalado por L pierde su regalador. Además `n` cambia y el ciclo ya no es válido.
**Manejo v1:**
- **Congelar el roster en el sorteo**: nadie puede unirse ni salir con el sorteo hecho. Es la opción con mejor relación robustez/complejidad, y elimina toda una clase de bugs.
- Escape hatch documentado (solo pre-pedidos): el Admin elimina al participante y el sistema **reconecta G→R** (quien regalaba a L pasa a regalar a quien L regalaba). Sigue siendo un ciclo único válido y **preserva el resto de asignaciones**. Requiere decirle a G y R — es información mínima inevitable.
- Con pedidos ya enviados: solo re-sorteo completo (destructivo) o cerrar el evento con la baja asumida.
- El caso "el Admin se va" no tiene solución en v1 (un solo Admin) → documentar como limitación conocida.

### 4.6 Nombres duplicados
**Qué pasa:** el nombre **es** la identidad. Dos "Marc" producen revelaciones ambiguas, exports incomprensibles y una posible suplantación.
**Manejo v1:**
- Unicidad por clave normalizada: `trim` → colapsar espacios → `NFD` sin diacríticos → minúsculas. Rechazar el duplicado **en el join** con mensaje accionable.
- Sugerir desambiguación ("Marc G.") en vez de un error seco.
- Rechazar vacío / solo espacios / nombres de 1 carácter.
- Suplantación (entrar como "Marc" en otro dispositivo): **riesgo aceptado** en un grupo privado. Mitigación barata: token local + Auth anónima, y que la vista post-sorteo propia solo sea legible con ese uid.
- Cuidado con la normalización del *display*: conservar el nombre tal como lo escribió el usuario (con acentos y ñ) y usar la clave solo para unicidad y matches.

### 4.7 El Admin no debe poder reconstruir el emparejamiento
**Qué pasa:** es el Core Value y es el punto donde la implementación por defecto falla. Tres cosas distintas se confunden:
1. **Fuga directa por UI/export** — trivial de evitar: la vista Admin no consulta `assignments` y el export no incluye la columna "regala a".
2. **Fuga estructural** — el Admin abre las DevTools o la consola de Firestore y lee el documento. **Con solo nombre (sin Firebase Auth) las reglas de Firestore no pueden impedirlo**: no existe `request.auth.uid` contra el que comparar, luego no se puede expresar "este campo solo lo lee su dueño". Cualquier esquema de "guardar el mapping en una subcolección secreta" es cosmético.
3. **Fuga por inferencia** (la que el requisito no contempla) — si el export lista los pedidos **por persona** ("Marc: Player, Madrid, L, 'MARC', 7"), y el Admin conoce las preferencias que el propio lobby muestra, puede cruzar talla+equipo contra la preferencia del destinatario probable y reconstruir parejas. En un grupo de 8 con tallas/equipos poco repetidos, la intersección es casi unívoca.

**Recomendaciones v1 (ordenadas por relación valor/coste):**
- **(a) Auth anónima de Firebase** por participante (sin pantalla de login, invisible: `signInAnonymously()` al entrar). Es lo que hace el "solo con nombre" compatible con una privacidad **real**: a partir de ahí las reglas pueden hacer `allow read: if request.auth.uid == resource.data.giverId` sobre `assignments`, y el Admin —que es un uid más— queda denegado. Sin esto, la promesa del producto es retórica.
- **(b) No persistir el mapping completo en un documento legible.** Cada documento de asignación debe exponer solo su destinatario al giver correspondiente. Evitar un doc `/events/{id}` con un mapa `{giverId: recipientId}` — es legible entero o no es legible, y en la práctica todo lo segundo implica lo primero.
- **(c) ID opaco de pedido.** El export y la vista Admin usan `orderId` (no el nombre del regalador). El Admin ve "pedido #7: Player · Madrid · L · dorsal 7 · 'SEBAS'"; el giver sabe que su pedido es el #7 y lo entrega. Sin identidades, la inferencia talla+equipo→persona se desactiva. **Es la mitigación más barata y la más efectiva contra la fuga por inferencia.**
- **(d) Escribir con `create`-only + reglas de campo.** La regla debe impedir que el cliente escriba un `giverId` ajeno en un pedido, y que alguien con uid distinto lea un `assignments/{giverId}`.
- **(e) Test negativo de seguridad como criterio de aceptación.** Un test que, autenticado con el uid del Admin, intente leer `assignments` y **verifique la denegación**. Sin ese test, la privacidad es una afirmación no verificada. (Coherente con `security_enforcement: true`, `security_asvs_level: 1` en la config.)
- **(f) Decir la verdad en la UI.** Un texto breve en el lobby ("el organizador no puede ver el sorteo") es parte de la propuesta de valor; prometer criptografía que no existe no lo es.

**Decisión pendiente para la fase de arquitectura:** (a) Auth anónima **sí/no** determina el modelo de datos entero. Se recomienda **sí** — es la única forma de cumplir la constraint dura sin servidor propio y sin pedir contraseña al usuario.

### 4.8 Doble ejecución del sorteo / dos Admins simultáneos
**Qué pasa:** dos clics, o dos personas escribiendo el evento a la vez. Un sorteo duplicado invalida asignaciones; dos admins degradan el modelo.
**Manejo v1:** transacción de Firestore; el campo `adminId` se escribe una sola vez (la regla `create` falla si el documento ya existe); la transición `OPEN → DRAWN` debe comprobar el estado dentro de la transacción y abortar si ya es `DRAWN`.

### 4.9 Unirse después del sorteo
**Qué pasa:** el recién llegado no está en el ciclo, no recibe ni da.
**Manejo v1:** denegado por regla cuando `drawStatus == 'DRAWN'`; la UI muestra "el sorteo ya se hizo, habla con el Admin". Alternativa social: el Admin re-sortea (solo con 0 pedidos).

### 4.10 Colisión / pérdida de identidad local
**Qué pasa:** el usuario borra el storage, cambia de móvil o abre en incógnito → pierde su identidad y no puede ver a quién regala. Sin recuperación, el Admin tendría que revelárselo (lo que rompe la privacidad) o romper el ciclo.
**Manejo v1:** minimizar la probabilidad (link con `participantId` en la URL, persistencia en `localStorage`) y, para Auth anónima, ofrecer re-vinculación: el nombre único ya reservado se "reclama" con verificación del Admin. En v1 puede aceptarse como limitación documentada con un aviso claro en el lobby ("no borres el enlace; es tu identidad").

### 4.11 Talla no disponible en el tipo elegido (dato real de PROJECT.md)
**Qué pasa:** la tabla **Player llega solo a 2XL**, mientras la Fan llega a XXXL. Un destinatario talla XXXL **no puede** recibir una camiseta Player — el pedido sería inválido y se descubriría tarde, en el vendedor, con el pedido grupal ya comprometido.
**Manejo v1:** al seleccionar tipo en el formulario de pedido, comparar con la talla del destinatario y **bloquear con explicación** ("Player no existe en XXXL: elige Fan o Retro"). Es una regla derivada de los datos ya presentes, coste casi nulo, alto valor. Candidato a P1.

### 4.12 Retro sin tabla de tallas propia
**Qué pasa:** las guías de PROJECT.md cubren Fan y Player; Retro aparece solo en precios. El usuario no sabrá qué talla pedir en Retro.
**Manejo v1:** declarar explícitamente en el modal que **Retro usa la tabla Fan** (o el tallaje del proveedor, a confirmar). No dejar el hueco: la ambigüedad silenciosa produce el error que la guía debía evitar.

### 4.13 Formato de "Temporada/Año"
**Qué pasa:** texto libre genera ruido (`2024`, `24/25`, `2024-2025`, `esta temporada`) que el vendedor tendrá que interpretar.
**Manejo v1:** campo de texto con placeholder `2024/25` + validación suave de patrón, o un select de las últimas 5 temporadas + "Otra". El select es preferible para el export.

### 4.14 Dorsal inválido
**Qué pasa:** `0`, `100`, `7bis`, o ceros iniciales (`07`). Un dorsal incorrecto se imprime y ya no hay marcha atrás.
**Manejo v1:** validar entero 1–99; permitir vacío (camiseta sin dorsal); **guardar como texto** en el export para no perder el cero inicial al abrir en Excel (problema clásico reportado en imports/exports CSV); normalizar el `07` a `7` con aviso, o conservarlo tal cual y citarlo siempre.

### 4.15 Nombre a serigrafiar
**Qué pasa:** espacios, acentos, ñ, guiones, emojis, o campos larguísimos. Los proveedores tienen límite de caracteres y de caracteres soportados.
**Manejo v1:** limitar longitud (~15 caracteres), permitir letras/espacios/guiones/acentos/ñ, normalizar a mayúsculas, recortar espacios. Mostrar un preview del texto. **Avisar que el serigrafiado va en la camiseta del destinatario**, no en la del regalador — es el error conceptual más probable.

### 4.16 Conflicto con equipos prohibidos
**Qué pasa:** el regalador elige, sin darse cuenta, exactamente el equipo que el destinatario prohibió.
**Manejo v1:** comprobación *advisory* por coincidencia normalizada de tokens contra `forbiddenTeams`, con aviso en el formulario ("Marc marcó este equipo como prohibido"). **No bloquear** — el texto libre genera falsos positivos ("Madrid" en "no quiero nada del Madrid").

### 4.17 Export con pedidos incompletos
**Qué pasa:** el Admin pulsa "Descargar" con 5 de 8 pedidos y manda un pedido incompleto al vendedor.
**Manejo v1:** mostrar `X de N` junto al botón; permitir descargar siempre pero incluir la lista de pendientes **fuera** del bloque exportable, o marcar las filas ausentes. No bloquear la descarga (a veces se quiere enviar lo que hay).

### 4.18 Nadie rellena ningún pedido / evento abandonado
**Qué pasa:** el grupo se dispersa. El admin ve un contador a 0.
**Manejo v1:** estado vacío informativo + la lista de quién falta. No añadir recordatorios automáticos (anti-feature).

### 4.19 Acentos y ñ en el export (Excel)
**Qué pasa:** Excel en Windows abre un CSV UTF-8 sin BOM y destroza "Ñ" / "Á" — en un grupo español es garantizado, sobre todo en los nombres serigrafiados.
**Manejo v1:** emitir con **BOM UTF-8**, separador explícito (`,` o `;` según locale — elegir `,` y documentarlo, o `.csv` con `;` para Excel es-ES), y citar los campos de texto libre.

---

## Sources

Fuentes web (todas vía `websearch`, tier MEDIUM cuando ≥2 fuentes independientes coinciden; LOW si única):

- **Organizadores de amigo invisible — funcionalidad y expectativas de table stakes (MEDIUM):**
  - Elfster — Secret Santa Generator / blog "Does Secret Santa Work with an Odd Number of People?" (works with any number ≥ 3; ciclo, no parejas) https://www.elfster.com/blog/secret-santa-odd-number
  - Elfster Help Center — "What do I do if someone signed up twice?" (el duplicado tras el sorteo no se deshace) https://help.elfster.com/en/articles/11475734
  - GiftList — Secret Santa exchange (mínimo 3, hasta 100 personas; **"organizer-blind draw": el organizador no puede ver el sorteo completo**) https://giftlist.com/exchange · comparativa GiftList vs Elfster (ambos requieren ≥3) https://giftlist.com/blog/giftlist-vs-elfster
  - Drawnames — "create a group, set exclusions, draw names", "no account required" https://www.drawnames.com/ y ficha de app (exclusiones, listas de deseos)
  - SecretSantaOrganizer — exclusions, wishlists, sin cuenta https://www.secretsantaorganizer.com/en
- **Algoritmo de sorteo / derangement (MEDIUM):**
  - Stack Overflow — "Secret Santa - Generating 'valid' permutations" (derangement, fracción → 1/e) https://stackoverflow.com/questions/8609644
  - Math StackExchange — "Secret Santa algorithm that does not rely on a trusted 3rd party?" https://math.stackexchange.com/questions/2896780
  - "Deranged Sinterklaas: The Math and Algorithms of Secret Santa" (generación uniforme de derangements) https://catswhisker.xyz/log/2020/12/7/deranged_sinterklaas/
  - Possibly Wrong — "Secret Santa Revisited" (las permutaciones no son equiprobables con el método ingenuo) https://possiblywrong.wordpress.com/2011/12/05/secret-santa-revisited/
- **Formularios de pedido de equipación / roster (MEDIUM):**
  - Makeform — Custom Jersey Order Form Generator (nombre, número, talla, estilo, cantidades) https://www.makeform.ai/tools/ai-custom-jersey-order-form-generator
  - Paperform — Sports Team Jersey Order Form template https://paperform.co/templates/sports-team-jersey-order-form/
  - Teamsideline — How to Create Rosters with Jersey Numbers and Sizes https://support.teamsideline.com/hc/en-us/articles/201152407
  - UncommonFit — Minimum Order Custom Team Jerseys (confirmar roster, tallas, nombres, números, fecha) https://www.uncommonfit.com/blogs/news/minimum-order-custom-team-jerseys
- **CSV / Excel (ceros iniciales, BOM) (MEDIUM):**
  - Jotform — "Form Number Fields: Leading Zeros Not Displaying in CSV" https://www.jotform.com/answers/35802191
  - Square Community — "Leading zeros dropped from CSV contact import" https://community.squareup.com/t5/Payments-Troubleshooting/Leading-zeros-dropped-from-CSV-contact-import/m-p/204793
  - Laserfiche Answers — "Leading zeros - Forms data lookup from CSVs" https://answers.laserfiche.com/questions/158749
- **Firestore: control de acceso por campo / privacidad (HIGH por ser doc oficial; aplicado aquí como MEDIUM):**
  - Firebase — Control access to specific fields https://firebase.google.com/docs/firestore/security/rules-fields
  - Firebase Blog — New improvements to Firestore Security Rules (sets, diff().changedKeys(), locals) https://firebase.blog/posts/2020/06/new-firestore-security-rules-features/
  - Stack Overflow — "Firestore security rules for public and private fields" https://stackoverflow.com/questions/46585330

**Limitaciones de la investigación:** sin acceso a métricas de uso reales, sin entrevistas de usuario, sin datos internos de competidores. Las complejidades son estimaciones de diseño. Las decisiones de compatibilidad talla/tipo (§4.11) y Retro (§4.12) se derivan de los propios datos de PROJECT.md, no de fuentes externas — deben confirmarse con el vendedor real.

---

*Investigación de features para: amigo invisible con camisetas de fútbol (SecretKit)*
*Investigado: 2026-10-17*
