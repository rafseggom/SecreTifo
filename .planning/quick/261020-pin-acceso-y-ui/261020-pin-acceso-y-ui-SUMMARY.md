---
quick_id: 261020-pin-acceso-y-ui
slug: pin-acceso-y-ui
date: 2026-10-20
status: complete
---

# Summary — Acceso con PIN y pulido de interfaz

## Qué se ha hecho

### 1. Navegación tras entrar con el nombre

La causa no era el formulario: `App` lee `loadIdentity()` durante el render, pero
`<Routes>` no vuelve a renderizar `App` al navegar, así que los `element` de las rutas
seguían calculados con la identidad anterior. Se añadió `useLocation()` en `App` y se
pasa `location` a `<Routes>`, de modo que la identidad se reevalúa en cada navegación.
Entrar con un nombre va directo a `/preferences` sin recargar.

### 2. PIN de acceso

- Nuevo `src/domain/pin.ts`: `sanitizePin`, `isValidPin` (4–6 dígitos), `hashPin` y
  `verifyPin` con PBKDF2-SHA256 (120 000 iteraciones, salt aleatorio de 16 bytes,
  comparación en tiempo constante).
- El hash se guarda en `participants/{uid}.pinHash` (sin cambio de reglas: el `create`
  ya acepta campos extra) y en la identidad local.
- Primera entrada (`EntryPage`): nombre + PIN + confirmación. La cuenta anónima y el
  documento del participante siguen creándose en el orden original.
- Apertura posterior (`UnlockPage`): lista de participantes y PIN. El estado de
  desbloqueo vive en `sessionStorage` (`secretkit.unlockedUid`), así que una pestaña
  nueva pide PIN y un refresh en la misma pestaña no.
- Un PIN incorrecto no navega ni marca la pestaña como desbloqueada.
- **Límite honesto:** el `uid` anónimo es por navegador y Firestore autoriza por
  `request.auth.uid`. Sin backend no se puede entrar al perfil de otro dispositivo; la
  UI lo explica cuando se selecciona otro perfil en vez de fingir un login.
- Participantes antiguos sin `pinHash` siguen funcionando sin candado.

### 3. Pulido visual

- Paleta papel cálido + verde campo, fondo con degradado sutil y tokens en `index.css`.
- Marca `Brand` (escudo + nombre) en el shell; titulares con tracking negativo.
- Primitivas revisadas: `Screen`, `Button` (48 px, feedback al pulsar, foco visible),
  `TextButton`, `Input`, `Select`, `Card`, `Field`, `Notice`, `Badge`, iconos.
- Se respeta `prefers-reduced-motion` y se mantienen los contratos que ya probaban los
  tests de la guía de tallas.

### 4. «Cambiar nombre»

`clearIdentity()` (que también limpia el desbloqueo de la pestaña) + `navigate('/')`.
Con el arreglo de navegación, vuelve al formulario sin recargar.

### 5. Estilo de «Cambiar nombre»

Nuevo `TextButton`: texto subrayado, sin caja, sin altura de botón ni borde.

### 6. Guía de tallas inline

Se eliminó `SizeGuideModal` y el botón que lo abría. `SizeGuideContent` se renderiza
siempre bajo el formulario de preferencias: tablas Fan y Player, notas del proveedor y
aviso de que Retro usa la tabla Fan.

## Archivos

- Nuevos: `src/domain/pin.ts`, `src/domain/pin.test.ts`, `src/pages/UnlockPage.tsx`,
  `src/components/SizeGuideContent.tsx`, `src/components/TextButton.tsx`,
  `src/components/Brand.tsx`.
- Modificados: `src/App.tsx`, `src/pages/EntryPage.tsx`, `src/pages/PreferencesPage.tsx`,
  `src/lib/session.ts`, `src/lib/lobby.ts`, `src/lib/joinEvent.ts`,
  `src/domain/types.ts`, `src/index.css` y las primitivas de `src/components/`.
- Eliminado: `src/components/SizeGuideModal.tsx`.

## Verificación

| Comprobación | Resultado |
|--------------|-----------|
| `npm test` | 9 archivos, 66 tests — pasan (incluye 15 tests nuevos de PIN) |
| `npm run build` | `tsc -b && vite build` — pasa |
| `npm run lint` | Sin errores nuevos en los archivos de la tarea. El comando sigue fallando por dos archivos ajenos (`src/vitest.d.ts`: TS1036; `AdminLoginPage`: hooks condicionales) y muestra avisos de Fast Refresh preexistentes |

Comprobación manual en el emulador (Auth + Firestore):

- Entrar con nombre + PIN navega a `/preferences` sin recargar.
- «Cambiar nombre» vuelve a `/` y muestra el formulario.
- En una pestaña nueva aparece «Hola de nuevo»; un PIN erróneo muestra el error y no navega; el correcto desbloquea.
- Al unirse, `participants/{uid}` contiene el `pinHash` en formato `pbkdf2-sha256$…`.
- La guía de tallas se ve completa a 464 px de contenido: ambas tablas caben sin scroll horizontal.

## Notas

- El PIN encarece el acceso casual, no resiste un ataque offline dedicado: un PIN de
  4–6 dígitos no tiene entropía para ello. Está documentado en `pin.ts`.
- El hash es legible por cualquier participante autenticado (`participants` se lee para
  el lobby), igual que el resto del documento; no se usa como credencial de servidor.
- Los cambios locales previos del usuario (`.firebaserc`, `package-lock.json`,
  `rules.test.ts`, `emulator-setup.ts`, `tsconfig.app.json`, `vite.config.ts`, `.env`,
  `src/vitest.d.ts`) se han conservado y no forman parte del commit de esta tarea.
