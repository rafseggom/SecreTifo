---
quick_id: 261020-pin-acceso-y-ui
slug: pin-acceso-y-ui
date: 2026-10-20
status: complete
---

# Quick Task — Acceso con PIN y pulido de interfaz

## Descripción

Corregir la navegación que no reaccionaba a los cambios de identidad, añadir un PIN
de acceso por participante, sustituir el botón de cambiar nombre por un enlace de
texto y mover la guía de tallas a la propia pantalla de preferencias, con un pulido
visual general.

## Decisiones

- **Bug de navegación (#1, #4):** `App` lee `loadIdentity()` durante el render, pero
  `<Routes>` no re-renderiza `App` al navegar. Se añade `useLocation()` al shell para
  que la identidad se reevalúe en cada navegación. Esto arregla tanto la entrada que
  se quedaba en el formulario como el «Cambiar nombre» que no volvía al login.
- **PIN (#2):** PIN de 4–6 dígitos, hash PBKDF2-SHA256 (120k iteraciones + salt
  aleatorio) guardado en `participants/{uid}.pinHash` y en la identidad local. En cada
  pestaña nueva se muestra una pantalla de desbloqueo con la lista de participantes.
  El perfil válido en este dispositivo es el vinculado al `uid` anónimo del navegador;
  el resto se muestra pero se explica que pertenece a otro dispositivo. La limitación
  se documenta en el código: sin backend no se puede autenticar como otro `uid`.
- **Interfaz (#3):** paleta verde campo + papel cálido, marca SecretKit, tarjetas
  redondeadas con sombra suave, controles de 48 px, feedback al pulsar, tipografía
  con tracking negativo en titulares y foco visible. Se respeta `prefers-reduced-motion`.
- **Cambiar nombre (#5):** nuevo `TextButton` con apariencia de enlace subrayado, sin
  altura ni borde de botón.
- **Guía de tallas (#6):** se elimina el modal y el botón; el contenido se renderiza
  siempre visible bajo el formulario de preferencias.

## Tareas

1. **Dominio y sesión**
   - `src/domain/types.ts`: `pinHash?` en `Participant` y `StoredIdentity`.
   - `src/domain/pin.ts`: normalización, validación, hash y verificación.
   - `src/lib/session.ts`: persistir `pinHash`, helpers de desbloqueo por pestaña.
   - `src/lib/lobby.ts`: `listParticipants()`.
   - `src/lib/joinEvent.ts`: escribir `pinHash` al crear el participante.

2. **Flujo de acceso**
   - `src/pages/EntryPage.tsx`: nombre + PIN + confirmación; lista de ya registrados.
   - `src/pages/UnlockPage.tsx`: selector de participante + PIN.
   - `src/App.tsx`: gate de desbloqueo y re-render por navegación.
   - `src/pages/PreferencesPage.tsx`: pasar el hash al join, enlace de texto y guía inline.

3. **Interfaz**
   - Tokens y shell (`index.css`, `Screen`, `Brand`).
   - Primitivas (`Button`, `Input`, `Select`, `Field`, `Card`, `Notice`, `Badge`).
   - Guía de tallas (`SizeGuideContent`, `SizeGuideTable`) y retirada del modal.

4. **Verificación**
   - Tests de `pin.ts` en `src/domain/pin.test.ts`.
   - `npm test`, `npm run build`, `npm run lint`.

## Criterios de aceptación

- Entrar con un nombre navega a preferencias sin recargar.
- «Cambiar nombre» vuelve al formulario sin recargar.
- La primera vez se crea un PIN; al reabrir la pestaña se exige.
- Un PIN incorrecto no deja pasar.
- La guía de tallas está siempre visible bajo el formulario.
- «Cambiar nombre» es texto subrayado, no un botón con caja.
- La app compila, pasa lint y los tests existentes.
