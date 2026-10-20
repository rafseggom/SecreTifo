# SecretKit

Aplicación web para organizar un amigo invisible centrado en regalar camisetas de fútbol.

## Descripción

SecretKit permite a un grupo de amigos organizar un sorteo de amigo invisible donde cada participante define sus preferencias (talla, equipos favoritos, equipos prohibidos) y, tras el sorteo, descubre a quién debe regalar. El organizador (Admin) obtiene una lista unificada de pedidos para enviar al vendedor, **sin nunca ver los emparejamientos**.

## Flujo de usuario

### 👤 Usuario Nuevo
1. Introduce nombre y PIN (dos veces)
2. Rellena preferencias (talla, equipos favoritos, prohibidos) y envía
3. Accede a su pantalla principal donde ve:
   - A quién le toca regalar y sus preferencias
   - Campo de texto para introducir su pedido de camiseta y enviar

### 🔑 Usuario Existente
1. Se selecciona de la lista de participantes
2. Introduce su PIN
3. Si no ha rellenado preferencias → paso 2 del usuario nuevo
4. Si ya las tenía → pantalla principal directa

### 🛡️ Admin
- Acceso via `/admin` o botón en esquina → contraseña `admin123`
- Ve: quién ha rellenado preferencias, quién ha enviado pedido
- Botón para iniciar sorteo (cuando quiera, si no está iniciado)
- Al iniciar sorteo: reparto circular clásico (derangement), todos regalan y reciben una vez
- Cuando todos hayan respondido (ej. 7/7): botón para descargar `.txt` con los pedidos **anónimos** (sin identificadores de quién mandó qué)

## Características

- **Sorteo circular (derangement)**: Nadie se regala a sí mismo; todos regalan y son regalados exactamente una vez.
- **Privacidad por diseño**: Cada participante solo ve su propio emparejamiento; el Admin ve solo la lista agregada de pedidos.
- **Guía de tallas integrada**: Tablas de referencia Fan/Player/Retro con versión móvil responsive.
- **Exportación ciega a CSV/TXT**: Formato compatible con Excel (BOM UTF-8, separador `;`, CRLF) que nunca filtra identidades.
- **Tiempo real**: Sala de espera con lista de participantes actualizada en vivo vía Supabase Realtime.
- **Sin device memory**: Solo usuario + PIN. Ninguna cuenta vinculada a dispositivo/navegador.
- **Admin separado**: El admin es el único que ve datos generales e inicia el sorteo.

## Stack tecnológico

- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Enrutamiento**: React Router 8 (modo declarativo)
- **Tests**: Vitest
- **Lint**: Oxlint
- **Despliegue**: Vercel (gratuito)

## Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd secretkit

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Desarrollo
npm run dev

# Tests unitarios
npm test

# Lint
npm run lint

# Build producción
npm run build
```

## Variables de entorno

Crea `.env.local` basado en `.env.example`:

```env
# Supabase Configuration (get these from your Supabase project dashboard)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Admin Secret (used to create the event initially via /admin/setup)
VITE_ADMIN_SECRET=your-secure-admin-secret-here

# Note: The admin panel password is hardcoded as "admin123" in the code
# (src/pages/AdminLoginPage.tsx). Change it there if needed.
```

## Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve al SQL Editor y ejecuta el contenido de `supabase-schema.sql`
3. Habilita Realtime para las tablas `participants` y `event` (en Database > Replication)
4. Copia la URL y la Anon Key a tu `.env.local`

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build de producción (`tsc -b && vite build`) |
| `npm run lint` | Oxlint |
| `npm test` | Tests unitarios (Vitest) |
| `npm run preview` | Preview del build |

## Despliegue en Vercel

```bash
# 1. Conecta tu repo a Vercel
# 2. Configura las variables de entorno en Vercel:
#    - VITE_SUPABASE_URL
#    - VITE_SUPABASE_ANON_KEY
#    - VITE_ADMIN_SECRET
# 3. Deploy automático en cada push a main
```

El archivo `vercel.json` ya está configurado con rewrites para SPA routing.

## Estructura del proyecto

```
src/
├── components/       # Componentes UI reutilizables
├── domain/           # Lógica de negocio pura (sin Supabase)
│   ├── exportOrders.ts    # Serializador CSV/TXT ciego
│   ├── derangement.ts     # Algoritmo sorteo circular
│   ├── sizeGuide.ts       # Datos guía de tallas
│   ├── pin.ts             # Hash/verificación PIN (PBKDF2)
│   ├── normalizeName.ts   # Normalización de nombres
│   ├── prices.ts          # Precios de referencia
│   └── types.ts           # Tipos compartidos
├── hooks/            # Custom React hooks
├── lib/              # Supabase client, utilidades, sesiones
├── pages/            # Páginas de la app (rutas)
├── session/          # Proveedor de sesión (localStorage + PIN)
├── App.tsx           # Routing shell + guards
└── main.tsx          # Entry point
```

## Contrato de Confianza y Privacidad

### Qué garantiza la app entre participantes

- Nadie se regala a sí mismo (derangement circular).
- Solo tú ves a quién regalas (assignment por `get` en `assignments/{tuNombreNormalizado}`).
- Nadie ve el mapa completo (RLS: `assignments` sin `SELECT` policy para nadie excepto el giver).
- La exportación Admin usa `opaqueId` (UUID aleatorio), sin nombres ni IDs de participante.

### Acceso del Admin (contraseña compartida)

- `/admin/setup` crea el evento la primera vez (pide `VITE_ADMIN_SECRET`).
- `/admin/login` abre el panel desde **cualquier navegador** con contraseña `admin123`.
- Las RLS policies autorizan las operaciones del panel a usuarios autenticados.
- El emparejamiento **sí sigue privado**: tabla `assignments` no tiene policy de `SELECT` para nadie excepto el giver.

### Por qué el emparejamiento nunca está en un documento único

- `assignments/{giverNameNormalized}` = 1 fila por regalador, solo `recipientNameNormalized`.
- Exportación usa `opaqueId` (UUID aleatorio), sin nombres ni IDs de participante.
- Cruzar talla+equipo con preferencias públicas NO revela emparejamiento (muchos comparten talla/equipo).

## Licencia

MIT