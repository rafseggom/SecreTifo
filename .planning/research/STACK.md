# Stack Research — SecretKit (football-jersey amigo invisible)

**Domain:** Small, client-only React SPA with Firestore as the backend (no custom server), used by one friends group for one event.
**Researched:** 2026-10-17
**Confidence:** MEDIUM overall — **HIGH for version numbers** (read directly from the npm registry `dist-tags` + official release notes/blogs), MEDIUM for ecosystem rationale (web search, cross-checked across ≥2 independent sources per claim).

> Confidence ceiling note: `.planning/config.json` has every curated search provider disabled (`exa_search`, `tavily_search`, `brave_search`, `firecrawl`, `ref_search`, `perplexity`, `jina` all `false`) and no Context7/ref MCP server is exposed to this session. Per the `classify-confidence` seam, `websearch --verified` tops out at **MEDIUM** and `context7` (unverified) is MEDIUM. Everything below was therefore fetched with built-in web access and `--verified` (multiple independent sources), which is why rationale claims are MEDIUM rather than HIGH. Version numbers are additionally cross-checked against the authoritative npm registry, so treat those as HIGH-evidence.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | **19.3.1** | UI runtime | Current stable (`react` and `react-dom` both 19.3.1 on the registry; 19.3.0 shipped 2026-09-09). Also the *minimum* that React Router 8 accepts is 19.2.7, so 19.3.x is the only sane choice. |
| React DOM | **19.3.1** | DOM renderer | Must match `react` exactly. |
| Vite | **8.3.4** | Dev server + build | Current `latest`. Vite 8 (released 2026-03-12) replaced the esbuild+Rollup pair with the Rust **Rolldown** bundler — one pipeline, 10–30x faster production builds. `create-vite@9.2.1` scaffolds it. Engines `node ^20.19.0 \|\| >=22.12.0`. |
| @vitejs/plugin-react | **6.1.2** | React Fast Refresh + JSX transform | Shipped alongside Vite 8. v6 uses **Oxc** for the React Refresh transform and dropped Babel, so install size and transform time both drop. **Declares `peer vite: ^8.0.0`** — this pins you to Vite 8. |
| Tailwind CSS | **4.3.3** | Styling | Current `latest` (published 2026-10-16). v4 is a Vite-first, CSS-first framework: no `tailwind.config.js`, no `postcss.config.js`, automatic content detection. |
| @tailwindcss/vite | **4.3.3** | Tailwind ↔ Vite integration | The first-party plugin; peer range `vite: ^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8` confirms Vite 8 compatibility. Faster than driving Tailwind through PostCSS. |
| react-router | **8.4.0** | SPA routing | Current `latest`; v8.0.0 shipped 2026-06-17 on a new **yearly major** cadence. **`react-router-dom` no longer exists in v8** — the package is `react-router` (+ subpath `react-router/dom`). Baselines: `react >= 19.2.7`, `node >= 22.22.0`, ESM-only. |
| firebase | **13.0.0** | Firestore client (backend) | Current `latest` (2026-10-07). Its v13 breaking changes are **confined to AI Logic**; Firestore only gained BSON types, wider `UpdateData<T>`, and `Temporal` declarations. So a Firestore-only app upgrades to ^13 with no API changes. |
| TypeScript | **~6.0.2** | Types | Exactly what `create-vite@9.2.1`'s `react-ts` template pins (`typescript: ~6.0.2`, build script `tsc -b && vite build`). Vite transpiles via Oxc and does **not** type-check — `tsc -b` is the type gate. |
| Node.js | **24.x LTS** (local: 24.11.1, npm 11.6.2) | Toolchain runtime | React Router 8 requires `node >= 22.22.0`, which is the strictest floor in the stack. Node 24 LTS satisfies Vite, Tailwind, Firestore tooling and the scaffold. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| oxlint | **1.88.0** | Lint | Already the `lint` script in `create-vite`'s `react`/`react-ts` templates (pinned `^1.87.0`). Native/Rust, zero config. Use it — do not add ESLint. |
| firebase-tools | **15.34.0** | Firestore emulator + Hosting deploy | Use `firebase emulators:start` to test the draw and rules with 5–6 fake participants before touching production, and `firebase deploy --only hosting` to ship. Engines accept Node 20/22/24. |
| **firebase/auth** (same `firebase` package) | 13.0.0 | *Anonymous* identity (`signInAnonymously`) | Recommended: one extra import that gives every participant a stable Firebase `uid`, which is the only way Firestore Security Rules can enforce "you may only read your own assignment". This is **not** password/OAuth auth, so it does not violate the project's out-of-scope list. |
| papaparse | **5.7.0** | Correct CSV serialisation | **Optional.** Only if you decide the export must be a true `.csv` that opens cleanly in Excel. For a tab-separated `.txt` you need no library. |

That is the whole list. Everything else this app needs is in the platform.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `create-vite` 9.2.1 | Scaffold | `npm create vite@latest secretifo -- --template react-ts` (templates: `react`, `react-ts`, `react-compiler`, `react-compiler-ts`). |
| Firestore Emulator | Local DB for the draw | Wire it behind `if (import.meta.env.DEV)` with `connectFirestoreEmulator(db, '127.0.0.1', 8080)`. This is how you test a 6-person circular draw without polluting production. |
| Rules Unit Testing / rules playground | Verify the pairing is not readable by the Admin | Rules are the *only* enforcement point for the project's core privacy constraint. |
| Vite Devtools | Debugging | Built into Vite 8 via the `devtools` config option; `server.forwardConsole` forwards browser console errors to the terminal (auto-enabled when a coding agent is detected). |

## Setup Recipes (canonical code the roadmap should reuse)

These snippets are the exact integration points. They are deliberately small — if a phase plan grows beyond this, something is wrong.

**1. `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**2. `src/index.css`** — Tailwind v4 is one import plus optional design tokens:

```css
@import 'tailwindcss';

@theme {
  --color-pitch: #0b6b3a;   /* example token; sizes/prices as data, not CSS */
}
```

**3. Env files** — `.env.local` (git-ignored) and a committed `.env.example`:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=secretkit.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=secretkit
VITE_FIREBASE_STORAGE_BUCKET=secretkit.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

`*.local` is already in the `create-vite` `.gitignore`. Only `VITE_`-prefixed vars reach the browser; all values arrive as **strings**; they are inlined at build time, so changing them requires a rebuild (and CI/hosting must provide them, since `.env.local` is not committed).

**4. `src/vite-env.d.ts`** — typed env (per Vite docs; must contain no `import` statements):

```ts
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**5. `src/lib/firebase.ts`** — single init point, full Firestore (not `lite`), optional anonymous auth:

```ts
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const db = getFirestore(app)          // default = memory cache, no offline persistence
export const auth = getAuth(app)

if (import.meta.env.DEV) {
  // import { connectFirestoreEmulator } from 'firebase/firestore'
  // connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export const identityReady = signInAnonymously(auth)   // once, at module load
```

**6. Routing** — React Router 8, *declarative* mode (smallest concept count for 3–4 screens):

```tsx
import { BrowserRouter } from 'react-router'   // NOT react-router-dom

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
```

Routes to plan: `/` (join/create event) → `/room/:roomId` (lobby) → `/room/:roomId/assignment` (post-draw + order form) → `/room/:roomId/admin` (export). If you outgrow it, *data* mode is `createBrowserRouter` from `react-router` + `RouterProvider` from `react-router/dom`, created once outside the React tree.

**7. `src/lib/identity.ts`** — survive a refresh without real auth:

```ts
const KEY = 'secretkit:identity:v1'

export type Identity = {
  participantId: string      // Firestore doc id in the room
  roomId: string
  name: string
  isAdmin: boolean
}

export const loadIdentity = (): Identity | null => {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null }
  catch { return null }
}
export const saveIdentity = (id: Identity) => localStorage.setItem(KEY, JSON.stringify(id))
export const clearIdentity = () => localStorage.removeItem(KEY)
```

Rules of thumb: `localStorage` (not `sessionStorage`) so a refresh *and* a second tab keep you in the room; always try/catch (Safari private mode throws); namespace the key; expose a visible **"No soy yo / salir"** action that calls `clearIdentity()`, because two people testing on one laptop will otherwise fight over the same slot.

**8. `src/lib/download.ts`** — client-side file export, no dependency:

```ts
export function downloadTextFile(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob(['\uFEFF' + text], { type: `${mime};charset=utf-8` })  // BOM => Excel reads accents
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
```

Format recommendation: emit **one tab-separated `.txt`** (`pedidos.txt`) with a header row — tab separation removes all comma/quote escaping ambiguity for Spanish names, teams and serigrafía text, and is exactly what a vendor copy-pastes. Offer `.csv` as a second button only if the vendor asks for it; then quote fields per RFC 4180 (or call `Papa.unparse`).

**9. Draw (no library needed)**

Fisher–Yates shuffle of the participant id list, then assign `shuffled[i] → shuffled[(i + 1) % n]`. That is a single cycle: nobody self-assigns, everyone gives exactly once and receives exactly once. Use `crypto.randomUUID()` for participant/room ids instead of adding `uuid`. Do **not** delegate this to a "random pairing" snippet — a naive random derangement does not guarantee a single cycle, and a multi-cycle draw breaks the "everyone gives/receives exactly once in one chain" property the project specifies.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vite 8 + `@vitejs/plugin-react` 6 | Vite 7.3 + `@vitejs/plugin-react` 5 | Only if Vite 8 ecosystem breakage bites. Plugin-react v6 hard-requires Vite 8 (`peer vite: ^8.0.0`); v5 still works on Vite 8, so a mixed downgrade is possible but pointless for greenfield. Vite 7.3 receives backported fixes/security patches. |
| React Router 8 declarative mode | React Router 8 **data** mode | When you want route-level `loader`/`action`, pending UI, and `errorElement`. Adds concepts but no new dependency. |
| `BrowserRouter` | `HashRouter` | If you host somewhere you cannot configure a catch-all rewrite to `index.html` (e.g. plain GitHub Pages). URLs get ugly (`/#/room/abc`) but deep links work with zero server config. |
| Full `firebase/firestore` | `firebase/firestore/lite` | Lite is ~84% smaller for one-time reads, but per Firebase docs it **omits snapshot listeners, persistence helpers and bundles**. Since the project's own Key Decision is "sincronización en tiempo real del lobby", the full SDK is required. Revisit only if the lobby becomes poll-based. |
| Anonymous Auth + rules keyed on `request.auth.uid` | No auth + permissive rules | If "zero Firebase concepts" is a hard constraint. Understand the cost: with open rules every visitor holding the project id can `getDocs` the assignments collection, so the surprise is protected only by obscurity. |
| Firebase Hosting | Vercel / Netlify / Cloudflare Pages | Any of them host the built `dist/` fine with an SPA rewrite. Firebase Hosting keeps Firestore + hosting in one project and one CLI, which matches the "no extra infrastructure" goal. |
| TypeScript (`react-ts` template) | Plain JavaScript (`react` template) | If the group wants zero type friction. The domain has real shape risk (order fields: Fan/Player/Retro, talla, dorsal, temporada) where types pay for themselves; but the app is ~1k LOC and JS is a defensible choice. |
| oxlint | Biome 2.x / ESLint 10.13 | If you need an ESLint-plugin rule oxlint lacks. Do not hand-roll ESLint + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` when the scaffold ships a working native linter. |
| Tailwind v4 via `@tailwindcss/vite` | Plain CSS modules / `@tailwindcss/postcss` | PostCSS route only if a build constraint forces it; plain CSS is fine if the team dislikes utility classes, but Tailwind is the project's stated constraint. |
| Firestore | Supabase / Realtime Database | Supabase gives Postgres + RLS (nice for the privacy constraint, needs an account elsewhere). RTDB is simpler but weaker for structured orders. Firestore is already the stated decision and has a free tier that comfortably covers ~10 users. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-router-dom` | **Removed in React Router v8.** It was only a v6→v7 migration mirror. Nearly every tutorial/LLM snippet still imports from it, which is the #1 way to break this build. | `react-router`; `react-router/dom` only for `RouterProvider` in data mode. |
| React Router v6 or Remix v2 patterns | v6 and Remix v2 are **End of Life** as of the v8 announcement and no longer receive security updates. | React Router 8 (`^8.4.0`). v7.18.4 is security-updated but is last year's major. |
| Tailwind **v3** setup | `tailwind.config.js` + `postcss.config.js` + `@tailwind base; @tailwind components; @tailwind utilities;` is the pre-v4 path. Copy-pasting it into a Vite 4.x/8.x project produces either a PostCSS plugin error or silently unconfigured styles, and it drags in `autoprefixer` you do not need. | `@tailwindcss/vite` plugin + `@import 'tailwindcss';` + optional `@theme {}` tokens. |
| Firestore **Lite** (`firebase/firestore/lite`) for this app | No `onSnapshot`, no persistence helpers, no bundles — the realtime lobby is impossible. | `firebase/firestore`. |
| Firestore offline persistence (IndexedDB) | Adds multi-tab coordination complexity for a live, always-online event; the default memory cache already gives you fast repeat reads and avoids stale-write surprises. Note the modern API is `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` — `enableIndexedDbPersistence` is the legacy helper. | Default memory cache (`getFirestore(app)`). |
| `file-saver` | Unnecessary; the `download` attribute + object URL is universally supported. | The `downloadTextFile` helper above. |
| `uuid` | `crypto.randomUUID()` is native in all evergreen browsers (secure contexts only — `localhost` counts). | `crypto.randomUUID()`. |
| `@vitejs/plugin-react-swc` / Babel-based React plugins | The official `@vitejs/plugin-react` v6 already uses Oxc for the React Refresh transform; adding a second transform plugin only creates conflicts. | `@vitejs/plugin-react@^6.1.2`, nothing else. |
| TypeScript **7.0** right now | TS 7.0.2 GA'd 2026-07-08 as the Go-native `tsgo` compiler. It has no stable programmatic compiler API until 7.1 and breaks API-dependent tooling (e.g. ts-morph); Microsoft's own `create-vite` template still pins `typescript ~6.0.2`. | Stay on the scaffolded `~6.0.2`; revisit TS 7 after 7.1. |
| Redux / Zustand / TanStack Query | One room, a handful of documents, all state ultimately lives in Firestore. A context + hooks layer over `onSnapshot` is sufficient and much less code. | React Context + `onSnapshot` subscriptions; `useSyncExternalStore` if you need a shared store shape. |
| react-hook-form / formik | The order form is ~6 fields and one submit. | Controlled components; validate in one pure function (it is domain logic worth unit-testing). |
| axios / fetch wrappers | Firestore is the only network surface; there is no REST API to call. | Firebase SDK only. |
| Create React App | Long deprecated and unmaintained; no Vite/Rolldown benefit, no Oxc, worse DX. | `create-vite`. |
| Hardcoding the Firebase config inline | Secrets-in-source habit; makes env rotation painful and violates the project's stated constraint. | `import.meta.env.VITE_FIREBASE_*` + committed `.env.example`. |
| Committing `.env.local` | Contains deployment-specific config and is explicitly marked local-only by Vite's own docs. | Commit `.env.example`; provide real values via hosting/CI env. |
| Storing the draw as one world-readable document | The Admin (and anyone with devtools) could read `giver → receiver` and destroy the whole point of the app. | One document per participant, doc id = participant id, containing only *their* target; Security Rules restrict read to `request.auth.uid == resource.data.ownerUid`. Keep the export projection free of any giver/receiver fields. |
| `allow read, write: if true` with no expiry | The default "test mode" rule; leaves the event writable by anyone forever. | Auth-scoped rules from day one, or at minimum a dated shutdown (delete the project / disable rules after the event). |

## Stack Patterns by Variant

**If hosting on Firebase Hosting (recommended):**
- Add `firebase.json` with `"hosting": { "public": "dist", "rewrites": [{ "source": "**", "destination": "/index.html" }] }`
- Because without the catch-all rewrite, deep links like `/room/abc123` 404 on refresh — and the whole point of `localStorage` identity is that a refresh keeps you in the room.

**If hosting on GitHub Pages:**
- Switch to `HashRouter` (or ship a `404.html` copy of `index.html`)
- Because Pages cannot be told to rewrite unknown paths.

**If you keep the zero-auth constraint:**
- Ship rules that are open but *narrow* — collection-scoped, and paired with an unguessable room id (`crypto.randomUUID()`), plus a documented teardown step.
- Because with no `auth`, `request.auth` is `null` and rules can express nothing; the pairing secrecy then rests entirely on URL obscurity.

**If you adopt Anonymous Auth:**
- Call `signInAnonymously()` exactly once at module load, persist the resulting `uid` with the participant doc, and gate assignment reads on `request.auth.uid`.
- Because anonymous accounts give you a server-issued, unforgeable id while keeping the UX name-only — the cheapest possible enforcement of "the Admin cannot reconstruct the pairing". Anonymous users are removable in the console and can be bulk-deleted after the event.

**If you want the export to open cleanly in Excel on a Spanish locale:**
- Emit `.txt` tab-separated as the primary artefact and treat `.csv` as an opt-in extra (BOM + RFC 4180 quoting, or `Papa.unparse`).
- Because es-ES Excel defaults to `;` as the list separator, so a comma-CSV with accents can land in one column; a BOM plus tabs sidesteps both problems.

**If TypeScript feels like overhead:**
- Use the `react` template and add JSDoc types on the order/draw helpers.
- Because the high-risk logic is the draw, and a pure function with a doc-comment type is testable without a compiler.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `vite@8.3.4` | `@vitejs/plugin-react@6.1.2` | Declared peer is `vite: ^8.0.0` — **plugin-react v6 requires Vite 8.** Do not pair v6 with Vite 7. |
| `vite@8.3.4` | `@tailwindcss/vite@4.3.3` | Peer `vite: ^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8` ✔ |
| `vite@8.3.4` | Node `^20.19.0 \|\| >=22.12.0` | Satisfied by Node 24 LTS (local: 24.11.1). |
| `react-router@8.4.0` | `react@>=19.2.7`, `react-dom@>=19.2.7` | Pin React **19.3.1**; anything below 19.2.7 fails the peer range. |
| `react-router@8.4.0` | Node `>=22.22.0` | **This is the strictest engine floor in the whole stack** — it, not Vite, decides your minimum Node version. |
| `react-router@8.4.0` | ESM-only build | `"type": "module"` (create-vite sets it) is required; no CJS consumers. |
| `firebase@13.0.0` | Node 20+ tooling | v12.0.0 raised the Node floor to 20; nothing in v13 changes that. Firestore API surface unchanged from v12. |
| `@vitejs/plugin-react@6.1.2` | `oxc-transform-react`, `@rolldown/plugin-babel`, `babel-plugin-react-compiler` | All three are **optional** peers — you install none of them unless you want the React Compiler (`react-compiler-ts` template). |
| `typescript@~6.0.2` | `tsc -b && vite build` | The scaffold type-checks with `tsc -b`; Vite/Oxc still does not type-check at dev time. |
| `oxlint@1.88.0` | Node `^20.19.0 \|\| >=22.12.0` | Template pins `^1.87.0`. |
| `firebase-tools@15.34.0` | Node `>=20 \|\| >=22 \|\| >=24` | Emulator + deploy CLI. |

**Practical consequence:** stay on **Node 24 LTS**. If a teammate is on Node 20 or Node 22.0–22.21, `npm install` will warn or fail on `react-router@8.22+` engines and Vite 8.

## Sources

- npm registry (`registry.npmjs.org`), `dist-tags` + per-version `peerDependencies`/`engines` for `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/vite`, `firebase`, `react-router`, `react-router-dom`, `typescript`, `oxlint`, `firebase-tools`, `papaparse` — **authoritative for all version numbers** (HIGH).
- https://vite.dev/blog/announcing-vite8 — Vite 8 / Rolldown, plugin-react v6, Node requirements, install-size delta (HIGH).
- https://vite.dev/releases — supported version lines (8.3 patches; 7.3/8.2 backports; 6.4/8.1 security) (HIGH).
- https://vite.dev/guide/env-and-mode — `import.meta.env.VITE_*`, `.env.local`, mode precedence, `vite-env.d.ts` augmentation, "VITE_* must not hold secrets" (HIGH).
- https://tailwindcss.com/docs (Install with Vite) + https://tailwindcss.com/blog/tailwindcss-v4 — v4 first-party Vite plugin, `@import "tailwindcss"`, CSS-first config, automatic content detection (MEDIUM).
- https://firebase.google.com/support/release-notes/js — v13.0.0 (2026-10-07) breaking changes are AI-Logic-only; Firestore v13 additions; v12.19.0 (2026-09-09); v12.0.0 Node 20 floor (HIGH).
- https://firebase.google.com/docs/firestore/solutions/firestore-lite — Lite's exact omissions: snapshot listeners/`onSnapshot`, persistence helpers, bundles (HIGH).
- `firebase@13.0.0` package `exports` map (via unpkg) — confirms `./firestore`, `./firestore/lite`, `./firestore/pipelines` all still exist (HIGH).
- https://reactrouter.com/changelog + https://remix.run/blog/react-router-v8 + https://reactrouter.com/upgrading/v7 — v8 release date, `react-router-dom` removal, baselines, EOL of v6/Remix v2, yearly cadence (HIGH).
- https://reactrouter.com/start/declarative/installation + https://reactrouter.com/start/data/installation — exact import specifiers for `BrowserRouter` and for `createBrowserRouter` + `RouterProvider` from `react-router/dom` (HIGH).
- `create-vite@9.2.1` template `package.json` for `react-ts` / `react` (fetched from the vite repo) — scaffold contents: Vite 8.3.4, plugin-react 6.1.2, React 19.3.0, TypeScript ~6.0.2, oxlint ^1.87.0 (HIGH).
- https://firebase.google.com/docs/rules/rules-and-auth and the Firebase blog on anonymous auth best practices — `request.auth.uid` matching, `sign_in_provider != 'anonymous'` (MEDIUM).
- https://firebase.google.com/docs/firestore/manage-data/enable-offline — `initializeFirestore` + `persistentLocalCache` / `persistentMultipleTabManager`, memory cache as default (MEDIUM).
- https://firebase.google.com/docs/hosting/full-config — catch-all SPA rewrite shape (MEDIUM).
- https://firebase.google.com/docs/firestore/query-data/listen — `onSnapshot` semantics for the lobby (MEDIUM).
- TypeScript 7.0 GA reporting (InfoQ, Microsoft DevBlogs commentary) — 2026-07-08 GA, no stable programmatic API until 7.1 (MEDIUM).

---
*Stack research for: SecretKit — client-only React SPA over Firestore for a football-jersey amigo invisible*
*Researched: 2026-10-17*
