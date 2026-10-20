---
quick_id: 261020-admin-clave-compartida
slug: admin-clave-compartida
date: 2026-10-20
status: complete
---

# Summary — Acceso Admin con contraseña compartida

## Resultado

El panel de Admin ya se abre desde **cualquier navegador** introduciendo la
contraseña compartida. La autorización dejó de depender de que el `uid` anónimo
coincidiera con `events/main.adminUid`.

## Cambios

- `firestore.rules`
  - `isAdmin()` sustituido por `canAdmin()`, que devuelve `isSignedIn()`.
  - Las operaciones de Admin (leer pedidos, liberar participantes, escribir
    `assignments`, cambiar `events/main` a `drawn`) se permiten a cualquier
    usuario autenticado.
  - `adminUid` sigue siendo inmutable y `drawn` sigue siendo terminal; la
    privacidad del emparejamiento no cambia (`assignments` sin `list`, `get`
    solo del propio giver).
- `src/App.tsx`
  - `/admin` ya no exige `role === 'admin'`; exige evento + flag local.
  - `/admin/setup` se mantiene montado durante el hand-off y también cuando el
    evento existe pero falta el flag (muestra «El evento ya existe»).
  - `/admin/login` sigue disponible cuando hay evento y falta el flag.
- `src/pages/AdminLoginPage.tsx`: eliminada la comprobación de rol y el mensaje
  «este navegador no es el del organizador».
- `src/pages/AdminSetupPage.tsx`: copia actualizada; cualquier navegador puede
  entrar después con la contraseña.
- `src/pages/LobbyPage.tsx` y `src/pages/RevealPage.tsx`: los controles de Admin
  se muestran según `isAdminSecretValidated()`, no según `role`.
- `src/lib/orders.ts` y `src/pages/AdminPage.tsx`: comentarios alineados con el
  nuevo modelo.
- `README.md` y `.env.example`: documentado el modelo, su límite y la necesidad
  de cambiar `VITE_ADMIN_SECRET`.

## Verificación

| Comprobación | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm test` | ✅ 9 archivos, 66 tests |
| `npm run test:rules` | ✅ 1 archivo, 15 tests |
| `npm run lint` | ✅ 0 errores (3 warnings preexistentes de Fast Refresh) |
| Manual: `/admin/setup` en `localhost:5173` | ✅ crea el evento y entra en `/admin` |
| Manual: `/admin` en `localhost:5174` sin flag | ✅ redirige a `/` |
| Manual: `/admin/login` en `localhost:5174` con la clave | ✅ entra en `/admin` |
| Manual: participante de 5174 (uid distinto del creador) en `/lobby` | ✅ ve «Empezar Sorteo» y «Panel del Admin» |

## Correcciones de infraestructura de tests

El script `test:rules` no ejecutaba ninguna prueba tras el split de proyectos de
`vite.config.ts`. Se corrigió:

- Nuevo `vitest.rules.config.ts` y script `test:rules` apuntando a él.
- El harness siembra con `withSecurityRulesDisabled` y usa las rutas reales
  (`events/main/participants`, `events/main/assignments`,
  `events/main/orders`).
- Corregida una aserción que esperaba denegar la edición de preferencias en
  `lobby`; la regla (y el producto) permiten editarlas antes del sorteo.
- Eliminado `expect.extend(matchers)` de `src/vitest.d.ts` (no es válido en un
  archivo de declaración; los setup de tests ya registran jest-dom).

## Riesgo aceptado (explícito)

`VITE_ADMIN_SECRET` viaja en el bundle público y **no es un secreto de
servidor**. Cualquier participante con devtools puede extraerla y, como las
reglas autorizan a cualquier usuario autenticado, podría leer pedidos, liberar
participantes, lanzar el sorteo o escribir `assignments`. El emparejamiento
regalador→destinatario sigue privado. Es el compromiso del modelo elegido para
un evento entre amigos.

Antes de desplegar: cambiar `VITE_ADMIN_SECRET` por una cadena larga y aleatoria
y desplegar las reglas (`firebase deploy --only firestore:rules`).

## Archivos tocados

- `firestore.rules`
- `src/App.tsx`
- `src/pages/AdminLoginPage.tsx`
- `src/pages/AdminSetupPage.tsx`
- `src/pages/AdminPage.tsx`
- `src/pages/LobbyPage.tsx`
- `src/pages/RevealPage.tsx`
- `src/lib/orders.ts`
- `src/lib/__tests__/emulator-setup.ts`
- `src/lib/__tests__/rules.test.ts`
- `src/vitest.d.ts`
- `vitest.rules.config.ts`
- `package.json`
- `README.md`
- `.env.example`
- `.planning/quick/261020-admin-clave-compartida/*`
- `.planning/STATE.md`
