# Phase 1: Flujo completo del amigo invisible - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-17
**Phase:** 1-Flujo completo del amigo invisible
**Areas discussed:** Identidad y Sesión, Modelo de Datos y Reglas, Sorteo, Preferencias y Guía de Tallas, Pedido, Admin y Exportación, Rutas y Estado, Stack

> **Mode:** `--auto` — todas las áreas fueron auto-seleccionadas y la opción recomendada se eligió sin pregunta interactiva. Registrado para auditoría.

---

## Identidad y Sesión

| Option | Description | Selected |
|--------|-------------|----------|
| Anonymous Auth silenciosa + doc por `uid` | `signInAnonymously()` invisible; uid como clave; reglas aplicables | ✓ |
| Solo nombre con `localStorage` como clave | Sin `request.auth`; reglas incapaces de proteger nada | |
| Nombre + contraseña | Fuera de alcance (PROJECT.md Out of Scope) | |

**User's choice:** Anonymous Auth silenciosa + doc por `uid` (recommended default)
**Notes:** Es la única opción que hace la privacidad estructural; no es contraseña ni OAuth. Nombre duplicado → avisar, no auto-sufijar. Identidad persistida en `localStorage`.

---

## Modelo de Datos y Reglas

| Option | Description | Selected |
|--------|-------------|----------|
| `assignments/{giverUid}` separado + reglas default-deny escritas en Fase 1 | El path codifica la propiedad; `get` sí, `list` no | ✓ |
| `recipientId` como campo en el doc del participante | Firestore no puede ocultar campos en lecturas → fuga total | |
| Un documento único con el mapa completo | Peor blast radius posible; prohibido | |

**User's choice:** Colección `assignments` separada, reglas escritas junto al esquema (recommended default)
**Notes:** `events/main` con adminUid write-once; subcolecciones `participants`/`assignments`/`orders`. El Admin no puede leer `assignments`.

---

## Sorteo

| Option | Description | Selected |
|--------|-------------|----------|
| Fisher–Yates + offset +1 (función pura) + `runTransaction` idempotente | Único ciclo garantizado; sin puntos fijos; sin pares mutuos; idempotente | ✓ |
| Rejection sampling | Puede no converger ni garantizar único ciclo | |
| `writeBatch` | No puede leer `status` → no idempotente ante doble clic | |

**User's choice:** Fisher–Yates + offset +1 con transacción idempotente (recommended default)
**Notes:** Mínimo 3 participantes; roster congelado tras `drawn`; nunca se persiste semilla ni permutación.

---

## Preferencias y Guía de Tallas

| Option | Description | Selected |
|--------|-------------|----------|
| Talla obligatoria + equipos opcionales + modal con datos literales | Refleja el spec 1:1; anomalías señalizadas, no corregidas | ✓ |
| Corregir los datos de tallas | El spec pide incorporarlos literalmente | |
| Guía de tallas como imagen | Menos accesible y divergente del dato | |

**User's choice:** Datos literales + señalización de anomalías (recommended default)
**Notes:** Retro usa la tabla Fan (se declara). Player no llega a XXXL y el peso de M y L coincide — se muestran tal cual con nota.

---

## Pedido

| Option | Description | Selected |
|--------|-------------|----------|
| Talla pre-cargada del destinatario + aviso no bloqueante de incompatibilidad | Preserva el flujo y la información del spec | ✓ |
| Bloquear Player para destinatarios XXXL | Impide completar el pedido por una anomalía del dato | |
| Regalador elige talla libremente | Ignora la preferencia declarada | |

**User's choice:** Pre-carga + aviso no bloqueante (recommended default)
**Notes:** Dorsal como string (ceros a la izquierda). `submitOrder` idempotente por ID determinista. El pedido no contiene `recipientUid`.

---

## Admin y Exportación

| Option | Description | Selected |
|--------|-------------|----------|
| Función pura `buildOrdersExport(orders)` + CSV UTF-8 BOM `;` con ID opaco | Garantía estructural: el contrato no admite el emparejamiento | ✓ |
| Export en cliente que lee `assignments` para "ordenar" | Filtra la privacidad por la puerta de atrás | |
| `.txt` tabulado sin BOM | Roto en Excel es-ES con acentos | |

**User's choice:** Export puro + CSV con BOM (recommended default)
**Notes:** Sin identidades de participantes; ID de pedido opaco; descarga por Blob.

---

## Rutas y Estado

| Option | Description | Selected |
|--------|-------------|----------|
| React Router 8 + Context + `onSnapshot`/`getDoc` | Proporcional al tamaño; sin librerías de estado extra | ✓ |
| Redux/Zustand/TanStack Query | Sobre-ingeniería para un evento y un puñado de documentos | |
| Sin router (condicional por estado) | Peor para deep-links y recarga | |

**User's choice:** Router 8 + Context + hooks de Firestore (recommended default)
**Notes:** Estados loading/empty/error explícitos por ruta; redirección según estado.

---

## Stack

| Option | Description | Selected |
|--------|-------------|----------|
| Stack verificado pinneado (Vite 8, React 19, Tailwind v4, `react-router` 8, firebase 13) | Versiones verificadas contra el registro npm; recetas canónicas | ✓ |
| Tutoriales "clásicos" (Vite 5, `react-router-dom` v6, Tailwind v3) | EOL / eliminados / rotos con este stack | |

**User's choice:** Stack pinneado de la investigación (recommended default)
**Notes:** Sin dependencias extra (`crypto.randomUUID()`, serializer CSV a mano). Firebase vía `import.meta.env.VITE_FIREBASE_*`.

---

## the agent's Discretion

- Estructura de carpetas y nombres de componentes/hooks.
- Tokens de Tailwind y microcopy no literal.
- Framework de tests unitarios.
- Forma exacta de la confirmación del sorteo (debe nombrar el número de participantes).

## Deferred Ideas

- Multi-evento / multi-grupo; edición del pedido; Cloud Function de sorteo ciego; re-sorteo; reconexión de participante; recuperación de identidad; eliminación de participante; notificaciones. (Ver `deferred` en CONTEXT.md y v2 en REQUIREMENTS.md.)
