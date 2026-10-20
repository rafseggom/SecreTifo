---
quick_id: 261020-admin-clave-compartida
slug: admin-clave-compartida
date: 2026-10-20
status: complete
---

# Quick Task — Acceso Admin con contraseña compartida

## Descripción

El panel de Admin debe abrirse desde cualquier navegador con la contraseña, sin
depender del navegador que creó el evento (`events/main.adminUid`).

## Decisión

Modelo de **contraseña compartida** (elegido por el usuario):

- La contraseña (`VITE_ADMIN_SECRET`) es la única puerta de la UI del panel.
- Para que el panel y el sorteo funcionen desde cualquier navegador, las reglas de
  Firestore autorizan las operaciones de Admin a **cualquier usuario autenticado**.
- La privacidad del emparejamiento no cambia: `assignments` sigue sin `list` para
  nadie y con `get` solo del propio documento.
- Riesgo aceptado y documentado: la contraseña viaja en el bundle público y
  cualquier participante con devtools puede leer los pedidos, liberar participantes,
  lanzar el sorteo o escribir assignments. Es un evento entre amigos, no un panel
  multi-tenant.

## Tareas

1. `firestore.rules`: `isAdmin()` pasa a ser «autenticado»; actualizar comentarios
   del contrato y dejar intactas las reglas de lectura de `assignments`.
2. `src/App.tsx`: quitar `role === 'admin'` de `/admin`; simplificar el guard de
   `/admin/setup` para que el hand-off no dependa del rol.
3. `src/pages/AdminLoginPage.tsx`: quitar la comprobación de rol; la contraseña
   válida basta en cualquier navegador.
4. `src/pages/AdminSetupPage.tsx`: actualizar el texto de «El evento ya existe».
5. `src/pages/LobbyPage.tsx` y `src/pages/RevealPage.tsx`: los controles de Admin se
   muestran con el flag local (`isAdminSecretValidated()`), no con `role`.
6. Tests de reglas: pedidos y actualización de `events/main` permitidos a un
   participante autenticado; mantener las denegaciones de `assignments`.
7. README y `.env.example`: documentar el modelo y sus límites.
8. `npm run build`, `npm test`, `npm run test:rules` y recorrido manual con dos
   orígenes distintos.

## Criterios de aceptación

- Un segundo navegador (uid distinto) entra en `/admin/login` con la contraseña y
  ve el panel.
- Ese segundo navegador puede lanzar el sorteo desde `/lobby`.
- Sin la contraseña, `/admin` redirige al login.
- `getDocs(assignments)` sigue denegado para todos y `get` sigue siendo solo del
  propio gid.
- La documentación explica que la contraseña no es un secreto de servidor.
