---
quick_id: 261020-fix-rutas-admin
slug: fix-rutas-admin
date: 2026-10-20
status: complete
---

# Quick Task — Arreglar las rutas de Admin

## Resultado

Las tres rutas de Admin vuelven a funcionar de principio a fin:

1. Con la base de datos vacía, `/admin/setup` muestra el formulario.
2. Al crear el evento, la app entra directamente en `/admin` (sin pasar por `/`).
3. Si se pierde el flag local, `/admin/login` permite recuperar el panel.
4. Un navegador que no es el del organizador no entra al panel y recibe un
   mensaje explícito.

## Causa raíz

Eran tres fallos encadenados:

1. **`eventStatus` no podía representar «no hay evento».** Estaba tipado como
   `EventStatus` (`'lobby' | 'drawn'`) y se inicializaba a `'lobby'`, mientras
   `App` usaba `eventStatus === null` para detectar que no existe evento. La
   suscripción convertía también el caso «no existe» en `'lobby'`, así que
   `/admin/setup` nunca era accesible.
2. **La sesión terminaba de cargar antes de la primera instantánea del evento.**
   Durante esa ventana `eventStatus` valía `null` aunque el evento existiera, y
   los guards de `/admin` y `/admin/login` redirigían a `/` al Admin legítimo.
   Ocurría especialmente al recargar la página.
3. **El login exigía `role !== 'admin'`.** Un Admin que perdía el flag de
   localStorage (borrado de datos, desalojo de almacenamiento) no podía volver a
   validar la clave: `/admin/login` lo mandaba a `/` y `/admin` exigía el flag.
   Callejón sin salida.

Además, la navegación posterior a `setDoc` competía con la suscripción: el guard
desmontaba la página de setup antes de que se guardara el flag.

## Cambios

### `src/session/SessionProvider.tsx`

- `eventStatus: EventStatus | null`; `null` significa «no existe `events/main`».
- `INITIAL_STATE.eventStatus = null`.
- La suscripción propaga `event ? event.status : null`.
- La resolución inicial lee `events/main` una vez (junto a `participants/{uid}`) y
  fija `eventStatus` y `role` **antes** de `loading: false`. El primer render ya
  conoce el evento; la suscripción solo lo mantiene vivo.

### `src/lib/lobby.ts`

- Nuevo `getEvent()` de una sola lectura, usado por la resolución de sesión.

### `src/App.tsx`

- `/admin/login`: se muestra siempre que exista evento y falte el flag, aunque el
  rol ya sea `admin` (permite recuperar el panel).
- `/admin/setup`:
  - sin evento → formulario;
  - con evento y uid = `adminUid` → `/admin` si el flag ya está, o la página de
    setup (que muestra «El evento ya existe») si falta;
  - cualquier otro uid → home.
- `/admin` sigue exigiendo evento + `role === 'admin'` + flag.

### `src/pages/AdminSetupPage.tsx`

- Tras validar la clave y crear `events/main`, guarda el flag inmediatamente.
- El guard de la ruta se encarga de entrar en `/admin` en cuanto la sesión observa
  el evento, así que una recarga entre la escritura y la instantánea no deja al
  organizador en `/`.
- Con evento existente y sin flag muestra «El evento ya existe» + acceso al login.
- Mientras `submitting`, no muestra ese panel: la instantánea local puede llegar
  antes de que resuelva `setDoc` y sería un parpadeo confuso.

### `src/pages/AdminLoginPage.tsx`

- Se eliminó el `return` anticipado que rompía las reglas de hooks.
- Tras validar la clave comprueba `role === 'admin'`. Si el navegador no es el del
  organizador, muestra un mensaje explicativo y **no** escribe el flag, en lugar de
  dejar que `/admin` rebote a home sin explicación.

## Verificación

- `npm run build` ✅
- `npm test` ✅ — 9 archivos, 66 tests
- `npm run lint` — sin errores nuevos; persiste el error preexistente de
  `src/vitest.d.ts` (TS1036) y avisos de fast-refresh.
- Recorrido manual con emuladores (Firestore vacío):
  - `/admin/setup` renderiza con la base vacía.
  - Crear evento → `/admin` con el flag guardado (sin pasar por `/`).
  - Borrar el flag → `/admin` redirige a `/`; `/admin/login` renderiza.
  - Clave correcta en el navegador del organizador → `/admin`.
  - `/admin/setup` con evento y sin flag → «El evento ya existe» → login → panel.
  - Segundo origen (otro uid anónimo) → `/admin` redirige a `/`; en
    `/admin/login` la clave correcta muestra «este navegador no es el del
    organizador» y no escribe el flag.

## Notas operativas

- El Admin es el **navegador** que creó el evento: su uid anónimo queda en
  `events/main.adminUid` y la identidad de Firebase Auth vive en IndexedDB. Otro
  navegador no puede ser Admin aunque conozca la clave.
- Si el evento se creó desde un navegador que ya no se usará, hay que borrar
  `events/main` (consola de Firestore o emulador) y repetir `/admin/setup` desde el
  navegador correcto.
- `VITE_ADMIN_SECRET` sigue siendo el marcador `tu_clave_secreta_aqui`. Es una
  puerta de UI incluida en el bundle público, no un secreto de servidor: cámbialo
  antes de desplegar.
