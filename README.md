# SecretKit

Aplicación web para organizar un amigo invisible centrado en regalar camisetas de fútbol.

## Descripción

SecretKit permite a un grupo de amigos organizar un sorteo de amigo invisible donde cada participante define sus preferencias (talla, equipos favoritos, equipos prohibidos) y, tras el sorteo, descubre a quién debe regalar. El organizador (Admin) obtiene una lista unificada de pedidos para enviar al vendedor, **sin nunca ver los emparejamientos**.

## Características

- **Sorteo circular (derangement)**: Nadie se regala a sí mismo; todos regalan y son regalados exactamente una vez.
- **Privacidad por diseño**: Cada participante solo ve su propio emparejamiento; el Admin ve solo la lista agregada de pedidos.
- **Guía de tallas integrada**: Tablas de referencia Fan/Player/Retro con versión móvil responsive.
- **Exportación ciega a CSV**: Formato compatible con Excel (BOM UTF-8, separador `;`, CRLF) que nunca filtra identidades.
- **Tiempo real**: Sala de espera con lista de participantes actualizada en vivo vía Firestore.

## Stack tecnológico

- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4
- **Backend**: Firebase Firestore (emulador local para desarrollo)
- **Enrutamiento**: React Router 8 (modo declarativo)
- **Tests**: Vitest + Firebase Rules Unit Testing
- **Lint**: Oxlint

## Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd secretkit

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Firebase

# Desarrollo (requiere emuladores Firebase)
npm run dev

# Tests unitarios
npm test

# Tests de reglas de seguridad (requiere emuladores)
npm run test:rules

# Lint
npm run lint

# Build producción
npm run build
```

## Variables de entorno

Crea `.env.local` basado en `.env.example`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_SECRET=...  # Clave del panel Admin (UI gate; viaja en el bundle público)
```

## Emuladores Firebase (desarrollo)

```bash
# Terminal 1: Iniciar emuladores
firebase emulators:start --only firestore,auth

# Terminal 2: Ejecutar tests de reglas
npm run test:rules

# Terminal 3: Desarrollo
npm run dev
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build de producción (`tsc -b && vite build`) |
| `npm run lint` | Oxlint |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:rules` | Tests de reglas Firestore (emulador) |
| `npm run preview` | Preview del build |

## Despliegue

```bash
# Build
npm run build

# Deploy a Firebase Hosting
firebase deploy --only hosting

# Deploy reglas Firestore
firebase deploy --only firestore:rules
```

## Estructura del proyecto

```
src/
├── components/       # Componentes UI reutilizables
├── domain/           # Lógica de negocio pura (sin Firebase)
│   ├── exportOrders.ts    # Serializador CSV ciego
│   ├── derangement.ts     # Algoritmo sorteo circular
│   ├── sizeGuide.ts       # Datos guía de tallas
│   └── types.ts           # Tipos compartidos
├── hooks/            # Custom React hooks
├── lib/              # Firebase, utilidades, sesiones
├── pages/            # Páginas de la app (rutas)
├── session/          # Proveedor de sesión (auth anónima)
└── main.tsx          # Entry point
```

## Contrato de Confianza y Privacidad

### Qué garantiza la app entre participantes

- Nadie se regala a sí mismo (derangement circular).
- Solo tú ves a quién regalas (asignment por `get` en `assignments/{tuUid}`).
- Nadie ve el mapa completo (reglas: `assignments` sin `list` para nadie).

### Qué NO garantiza (límite aceptado)

- El dueño del proyecto Firebase **SÍ puede** leer Firestore por consola/Admin SDK (saltan reglas por diseño).
- Cloud Function para sorteo ciego real requiere plan Blaze y backend — fuera de v1.
- **El panel de Admin usa una contraseña compartida, no una cuenta de servidor.** Cualquier navegador que la introduzca entra al panel. La clave viaja en el bundle público, así que un participante con devtools puede extraerla y leer los pedidos, liberar participantes, lanzar el sorteo o escribir `assignments`. Para un evento entre amigos se acepta; si necesitas aislamiento real, habría que migrar a Firebase Auth con cuenta de Admin.

### Acceso del Admin (contraseña compartida)

- `/admin/setup` crea el evento la primera vez y pide la clave.
- `/admin/login` abre el panel desde **cualquier navegador** con esa clave.
- Las reglas de Firestore autorizan las operaciones del panel y del sorteo a cualquier usuario autenticado, porque no pueden ver la contraseña.
- El emparejamiento **sí sigue privado**: `assignments` no tiene `list` para nadie y `get` solo funciona con el propio uid.

### Por qué el emparejamiento nunca está en un documento único

- `assignments/{giverUid}` = 1 doc por regalador, solo `recipientUid`.
- Exportación usa `opaqueId` (UUID aleatorio), sin nombres ni IDs de participante.
- Cruzar talla+equipo con preferencias públicas NO revela emparejamiento (muchos comparten talla/equipo).

### Cómo verificar

- `firebase emulators:exec` corre tests de reglas (SEC-03).
- Test fixture verifica exportación (SEC-04).
- Rules son default-deny, escritas junto al esquema.

## Licencia

MIT