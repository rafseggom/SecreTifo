---
quick_id: 261020-fix-rutas-admin
slug: fix-rutas-admin
date: 2026-10-20
status: complete
---

# Quick Task — Arreglar las rutas de Admin

## Descripción

`/admin`, `/admin/login` y `/admin/setup` redirigen siempre a `/`, incluso con la
base de datos vacía y sin sesión de Admin. Hay que restaurar el flujo
setup → login → panel.

## Causa

1. `SessionProvider` declara `eventStatus` como `EventStatus` (`'lobby' | 'drawn'`)
   y lo inicializa a `'lobby'`, pero `App` usa `eventStatus === null` para detectar
   que **no existe evento**. La suscripción a `events/main` convierte también el
   caso «no existe» en `'lobby'`, así que `/admin/setup` nunca es accesible.
2. `/admin/login` exige `role !== 'admin'`. Si el navegador ya es el Admin pero
   perdió el flag `secretkit.adminSecretValidated`, la página se redirige a `/`
   y el panel exige el flag: callejón sin salida.
3. `AdminSetupPage` navega a `/admin/login` justo después de `setDoc`, antes de que
   la suscripción a `events/main` actualice `eventStatus` y `role`. El guard ve el
   estado viejo y redirige a `/`.

## Decisiones

- `eventStatus` pasa a `EventStatus | null`, con `null` = «no hay evento».
- `/admin/login` se muestra siempre que falte el flag y el evento exista, aunque
  el rol ya sea `admin`.
- Tras crear el evento, `AdminSetupPage` espera a que la sesión observe
  `eventStatus !== null` y `role === 'admin'`; entonces guarda el flag y navega
  a `/admin`. Nada de navegar con el estado anterior.

## Tareas

1. `src/session/SessionProvider.tsx`: permitir `null` y propagarlo desde
   `subscribeEvent`.
2. `src/App.tsx`: quitar `role !== 'admin'` del guard de login.
3. `src/pages/AdminSetupPage.tsx`: esperar al estado de sesión antes de navegar.
4. Verificar: tests, build y recorrido manual en emuladores.

## Criterios de aceptación

- Con la base de datos vacía, `/admin/setup` muestra el formulario.
- Crear el evento lleva al panel `/admin` sin pasar por `/`.
- Con el flag borrado, `/admin/login` se muestra y permite recuperar el panel.
- `/admin` sigue negando el acceso a un uid que no es el `adminUid`.
