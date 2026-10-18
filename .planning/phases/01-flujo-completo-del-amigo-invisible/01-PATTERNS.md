# Phase 1: Flujo completo del amigo invisible - Pattern Map

**Mapped:** 2026-10-17
**Files analyzed:** 54 (all new — nothing to modify)
**Analogs found:** 0 / 54 — **this repository is greenfield**

---

## ⚠️ GREENFIELD CONFIRMATION — There Are No Codebase Analogs

Before classifying anything, the repository was enumerated. **There is no source code to copy patterns from.**

**Evidence (executed this session):**

```
$ git ls-files          # 28 tracked paths, verbatim
.planning/PROJECT.md
.planning/REQUIREMENTS.md
.planning/ROADMAP.md
.planning/STATE.md
.planning/config.json
.planning/phases/01-flujo-completo-del-amigo-invisible/01-CONTEXT.md
.planning/phases/01-flujo-completo-del-amigo-invisible/01-DISCUSSION-LOG.md
.planning/phases/01-flujo-completo-del-amigo-invisible/01-RESEARCH.md
.planning/phases/01-flujo-completo-del-amigo-invisible/01-UI-SPEC.md
.planning/research/.cache/*.json        (12 files)
.planning/research/ARCHITECTURE.md
.planning/research/FEATURES.md
.planning/research/PITFALLS.md
.planning/research/STACK.md
.planning/research/SUMMARY.md
AGENTS.md
LICENSE
```

Repository root contains exactly four entries: `.git/`, `.planning/`, `AGENTS.md`, `LICENSE`.

**Consequences for the planner — read this before writing any plan action:**

1. **No `package.json`, no `src/`, no `firestore.rules`, no `index.html`, no `.env.example`.** Every file in the classification table below is created from nothing. There is no `.planning/codebase/` directory and no prior `PATTERNS.md` from an earlier phase.
2. `AGENTS.md` confirms it in prose: `## Conventions` says *"Conventions not yet established. Will populate as patterns emerge during development."* and `## Architecture` says *"Architecture not yet mapped."*
3. `01-CONTEXT.md:94` (`<code_context>`) states it outright: *"Ninguno — el repositorio es greenfield (solo `LICENSE`). No hay `.planning/codebase/` ni código previo."*
4. **Therefore every excerpt in this document is a canonical excerpt from `01-RESEARCH.md` / `01-UI-SPEC.md` — not from existing code.** Each is labelled with its source line range. Do not cite them as "existing pattern in the codebase".
5. **Nothing in this phase can be validated by `git ls-files` for an analog.** The tracked-source gate is satisfied vacuously: no analog path is named anywhere in this file, so no gitignored install/runtime mirror can be propagated.

### How to use this document instead of a normal PATTERNS.md

A normal pattern map answers *"what existing code should new files copy from?"*. With no existing code, the useful equivalent is:

- **Vertical:** for each file, the **canonical excerpt** that the executor should implement (mostly from the research's Code Examples, which already contain reference implementations for Firebase init, the rules file, the join transaction, the derangement, the CSV serialiser, and the Router shell), plus the **binding constraints** from the locked decisions that the excerpt alone does not convey.
- **Horizontal:** the **intra-phase precedent order** (§ Intra-Phase Precedent Order). In a greenfield phase, the *first* file built in each layer becomes the analog for every later file in that layer. This section tells the planner which file to schedule first in each layer so that the rest have something to copy. This is the real answer to the pattern-mapping question for this phase.
- Each file carries the explicit tag **`first-of-kind — establishes the pattern`** so the planner knows these files are the precedents later phases (Phase 2 and any future milestone) will copy from, and therefore deserve slightly more care in their shape (naming, exported types, file header comments).

---

## File Classification

`Closest Analog` is `—` for every row (greenfield). `Canonical source` is the upstream artifact holding the reference implementation or the binding contract.

### Root configuration & scaffolding

| New File | Role | Data Flow | Closest Analog | Match Quality | Canonical source |
|----------|------|-----------|----------------|---------------|------------------|
| `package.json` | config | n/a | — | none — first-of-kind | `01-RESEARCH.md:184-193` (install recipe) |
| `vite.config.ts` | config | batch (build) | — | none — first-of-kind | `01-RESEARCH.md:543-558` |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | config | n/a | — | none — first-of-kind | scaffold output via `01-RESEARCH.md:186` |
| `index.html` | config | request-response | — | none — first-of-kind | `01-UI-SPEC.md:441` (`<html lang="es">`) |
| `.env.example` | config | n/a | — | none — first-of-kind | `01-RESEARCH.md:585-593` |
| `.gitignore` | config | n/a | — | none — first-of-kind | `01-RESEARCH.md:479` (`.vitest/`), `.env.local` |
| `.gitattributes` | config | n/a | — | none — first-of-kind | `01-RESEARCH.md:488-492`, `:1322` |
| `firebase.json` | config | n/a | — | none — first-of-kind | `01-RESEARCH.md:595-611` |
| `.firebaserc` | config | n/a | — | none — first-of-kind | `01-RESEARCH.md:613-617` |
| `firestore.rules` | config (access control) | request-response | — | none — first-of-kind | `01-RESEARCH.md:763-845` |
| `src/vite-env.d.ts` | config (types) | n/a | — | none — first-of-kind | `01-RESEARCH.md:567-583` |
| `src/index.css` | config (styling entry) | n/a | — | none — first-of-kind | `01-RESEARCH.md:560-563` + `01-UI-SPEC.md:32` (`@theme {}`) |

### Application shell

| New File | Role | Data Flow | Closest Analog | Match Quality | Canonical source |
|----------|------|-----------|----------------|---------------|------------------|
| `src/main.tsx` | provider (bootstrap) | request-response | — | none — first-of-kind | `01-RESEARCH.md:1223-1238` |
| `src/App.tsx` | route (shell) | request-response | — | none — first-of-kind | `01-RESEARCH.md:1240-1268`, `01-UI-SPEC.md:401-415` |
| `src/session/SessionProvider.tsx` | provider (context) | pub-sub (onSnapshot) | — | none — first-of-kind | `01-RESEARCH.md:315-323` (structure), `01-UI-SPEC.md:401-415` (redirect contract) |

### `domain/` — pure, I/O-free, unit-tested

| New File | Role | Data Flow | Closest Analog | Match Quality | Canonical source |
|----------|------|-----------|----------------|---------------|------------------|
| `src/domain/types.ts` | model | n/a | — | none — first-of-kind | `01-RESEARCH.md:307`, `:1125-1133` |
| `src/domain/normalizeName.ts` | utility | transform | — | none — first-of-kind | `01-RESEARCH.md:687-691` |
| `src/domain/sizeGuide.ts` | utility (static data) | transform | — | none — first-of-kind | `01-RESEARCH.md:700-727`, `:742-755` |
| `src/domain/prices.ts` | utility (static data) | transform | — | none — first-of-kind | `01-RESEARCH.md:729-738` |
| `src/domain/derangement.ts` | service (algorithm) | transform (pure) | — | none — first-of-kind | `01-RESEARCH.md:951-978` |
| `src/domain/derangement.test.ts` | test | batch | — | none — first-of-kind | `01-RESEARCH.md:980-1024` |
| `src/domain/exportOrders.ts` | service (serialiser) | transform (pure) | — | none — first-of-kind | `01-RESEARCH.md:1118-1160` |
| `src/domain/exportOrders.test.ts` | test | batch | — | none — first-of-kind | `01-RESEARCH.md:1162-1204` |
| `src/domain/sizeGuide.test.ts` † | test | batch | — | none — first-of-kind | required by D-13 (`01-CONTEXT.md:37`); no excerpt exists — planner names the file |
| `src/domain/prices.test.ts` † | test | batch | — | none — first-of-kind | required by D-13 (`01-CONTEXT.md:37`); no excerpt exists — planner names the file |

† Filenames are **planner discretion** (`01-CONTEXT.md:62`). The *requirement* (D-13) is a test asserting the literal spec values, not these specific paths. See § Gaps.

### `lib/` — the ONLY modules allowed to import from `firebase/*`

| New File | Role | Data Flow | Closest Analog | Match Quality | Canonical source |
|----------|------|-----------|----------------|---------------|------------------|
| `src/lib/firebase.ts` | config (client init) | request-response | — | none — first-of-kind | `01-RESEARCH.md:621-662` |
| `src/lib/session.ts` | utility (persistence) | file-I/O (localStorage) | — | none — first-of-kind | `01-RESEARCH.md:664-682` |
| `src/lib/joinEvent.ts` | service (transaction) | CRUD (transactional) | — | none — first-of-kind | `01-RESEARCH.md:851-923` |
| `src/lib/lobby.ts` | service (subscription) | streaming (onSnapshot) | — | none — first-of-kind | `01-RESEARCH.md:927-947` |
| `src/lib/draw.ts` | service (transaction) | CRUD (transactional) | — | none — first-of-kind | `01-RESEARCH.md:1030-1055` |
| `src/lib/assignment.ts` | service (by-id read) | request-response | — | none — first-of-kind | `01-RESEARCH.md:1059-1072` |
| `src/lib/orders.ts` | service (batch write + list) | CRUD + batch | — | none — first-of-kind | `01-RESEARCH.md:1076-1110` |
| `src/lib/download.ts` | utility (file output) | file-I/O | — | none — first-of-kind | `01-RESEARCH.md:1206-1219` |

### `hooks/`

| New File | Role | Data Flow | Closest Analog | Match Quality | Canonical source |
|----------|------|-----------|----------------|---------------|------------------|
| `src/hooks/useMyAssignment.ts` | hook | request-response | — | none — first-of-kind | `01-RESEARCH.md:1057-1072` (data source); `01-UI-SPEC.md:332` (states) |
| `src/hooks/useOrdersAdmin.ts` | hook | streaming + CRUD | — | none — first-of-kind | `01-RESEARCH.md:1105-1110`; `01-UI-SPEC.md:379-393` |

### `components/` — hand-rolled primitives (no component library; D-25)

| New File | Role | Data Flow | Closest Analog | Match Quality | Canonical source |
|----------|------|-----------|----------------|---------------|------------------|
| `src/components/Button.tsx` | component (primitive) | request-response | — | none — first-of-kind | `01-UI-SPEC.md:143` |
| `src/components/Field.tsx` | component (primitive) | request-response | — | none — first-of-kind | `01-UI-SPEC.md:144` |
| `src/components/Input.tsx` | component (primitive) | request-response | — | none — first-of-kind | `01-UI-SPEC.md:145` |
| `src/components/Select.tsx` | component (primitive) | request-response | — | none — first-of-kind | `01-UI-SPEC.md:146` |
| `src/components/Card.tsx` | component (primitive) | n/a | — | none — first-of-kind | `01-UI-SPEC.md:147` |
| `src/components/Badge.tsx` | component (primitive) | n/a | — | none — first-of-kind | `01-UI-SPEC.md:148` |
| `src/components/Notice.tsx` | component (primitive) | n/a | — | none — first-of-kind | `01-UI-SPEC.md:149`; `:105`, `:115-117` (tones) |
| `src/components/Modal.tsx` | component (primitive) | event-driven | — | none — first-of-kind | `01-UI-SPEC.md:150`; `01-RESEARCH.md:177` (native `<dialog>`) |
| `src/components/Screen.tsx` | component (layout) | n/a | — | none — first-of-kind | `01-UI-SPEC.md:151`; `:56-62` (shell constraints) |
| `src/components/FullScreenSpinner.tsx` | component (primitive) | n/a | — | none — first-of-kind | `01-UI-SPEC.md:152` |
| `src/components/ErrorBoundary.tsx` | component (guard) | event-driven | — | none — first-of-kind | `01-UI-SPEC.md:153`, `:425` |
| `src/components/icons.tsx` | component (asset) | n/a | — | none — first-of-kind | `01-UI-SPEC.md:165`, `:29` |
| `src/components/SizeGuideModal.tsx` | component (domain) | event-driven | — | none — first-of-kind | `01-UI-SPEC.md:159`, `:246-269` |
| `src/components/SizeGuideTable.tsx` | component (domain) | transform | — | none — first-of-kind | `01-UI-SPEC.md:160`, `:263-267` |
| `src/components/PriceTable.tsx` | component (domain) | n/a | — | none — first-of-kind | `01-UI-SPEC.md:161`, `:351` |
| `src/components/ParticipantRow.tsx` | component (domain) | n/a | — | none — first-of-kind | `01-UI-SPEC.md:162`, `:283-286` |
| `src/components/JerseyOrderForm.tsx` | component (domain, form) | CRUD | — | none — first-of-kind | `01-UI-SPEC.md:163`, `:338-369` |
| `src/components/DrawConfirmDialog.tsx` | component (domain, dialog) | event-driven | — | none — first-of-kind | `01-UI-SPEC.md:164`, `:300-309` |

### `pages/` — one route per file (D-22)

| New File | Role | Data Flow | Closest Analog | Match Quality | Canonical source |
|----------|------|-----------|----------------|---------------|------------------|
| `src/pages/EntryPage.tsx` | page (controller) | request-response | — | none — first-of-kind | `01-UI-SPEC.md:179-203` |
| `src/pages/PreferencesPage.tsx` | page (controller) | request-response | — | none — first-of-kind | `01-UI-SPEC.md:207-242` |
| `src/pages/LobbyPage.tsx` | page (controller) | streaming | — | none — first-of-kind | `01-UI-SPEC.md:273-311` |
| `src/pages/RevealPage.tsx` | page (controller) | request-response | — | none — first-of-kind | `01-UI-SPEC.md:315-334` |
| `src/pages/AdminPage.tsx` | page (controller) | streaming + file-I/O | — | none — first-of-kind | `01-UI-SPEC.md:373-393` |

---

## Intra-Phase Precedent Order

**This is the load-bearing section for a greenfield phase.** Because no external analog exists, the first file built in each layer becomes the copy source for its siblings. The planner should schedule each layer's "Pattern-setter" before its "Copiers", and should reference the pattern-setter path in the copiers' plan actions exactly as it would reference an existing analog.

| Layer | Pattern-setter (build first) | Copiers (copy the setter's shape) |
|-------|------------------------------|-----------------------------------|
| Build config | `vite.config.ts` | nothing — single file |
| App shell | `src/main.tsx` | `src/App.tsx` (same import style, `react-router` not `react-router-dom`) |
| Pure domain fn + colocated test | `src/domain/derangement.ts` + `derangement.test.ts` | `src/domain/exportOrders.ts` + `.test.ts`; `normalizeName.ts`; the D-13 data tests |
| Domain static data | `src/domain/sizeGuide.ts` | `src/domain/prices.ts` (`as const`, typed export, test asserts literals) |
| `lib/` Firebase surface | `src/lib/firebase.ts` | every other `src/lib/*` file (import from `./firebase`, never from `firebase/*` directly) |
| `lib/` transaction | `src/lib/joinEvent.ts` | `src/lib/draw.ts` (same `runTransaction` shape: read → guard → write; and the same 3-line header comment explaining *why* the Firestore boundary is here) |
| `lib/` by-id read | `src/lib/assignment.ts` | `src/lib/orders.ts`'s `getMyOrder` (if the planner splits it out) — the "never a query" comment is copied verbatim |
| Hook shape | `src/hooks/useMyAssignment.ts` | `src/hooks/useOrdersAdmin.ts` (same `{loading, error, data}` return triple + `useEffect` returning the unsubscribe) |
| Component primitive | `src/components/Button.tsx` | `Field`, `Input`, `Select`, `Card`, `Badge`, `Notice`, `Modal`, `Screen`, `FullScreenSpinner` — shared `h-11`/`rounded-lg`/focus-ring/variant-lookup idioms |
| Page shape | `src/pages/EntryPage.tsx` | `PreferencesPage`, `LobbyPage`, `RevealPage`, `AdminPage` — `Screen` shell + one `<h1>` + explicit loading/empty/error branches |
| Domain component | `src/components/SizeGuideModal.tsx` | `DrawConfirmDialog.tsx` (same `Modal` wrapper, same title/body/footer structure) |

**Rationale the planner should record in each plan:** `01-RESEARCH.md:302-345` already fixes the directory layout, and `01-UI-SPEC.md:139-165` already fixes the component inventory. The precedent order above is derived from the ROADMAP's own 7-step build order (`.planning/ROADMAP.md:38-45`), so it does not add sequencing the roadmap has not already declared — it only makes the *copy-from* relationship explicit.

---

## Pattern Assignments

### Cluster A — Build configuration (ROADMAP sub-step 1)

#### `vite.config.ts` — config / batch
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`.** Downstream copiers: none (singleton), but every `*.test.ts` depends on its `test` block.

**Canonical source:** `01-RESEARCH.md:543-558` — quoted verbatim:

```ts
// vite.config.ts  [CITED: tailwindcss.com/docs/installation/using-vite]
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',          // all Phase-1 tests are pure functions
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,               // import describe/it/expect from 'vitest' explicitly (Pitfall 14)
  },
})
```

**Constraints (not visible in the excerpt):**
- **One config file, not two.** `01-RESEARCH.md:565` — a separate `vitest.config.ts` *replaces* `vite.config.ts`, it does not merge; the react/tailwind plugins would then be absent.
- `globals: false` is deliberate: Pitfall 14 (`01-RESEARCH.md:476-480`) — Jest habits produce `describe is not defined`.
- The build script must stay `tsc -b && vite build` (Pitfall 13, `01-RESEARCH.md:470-474`). Vite/Oxc does not type-check.

#### `src/index.css` — config / styling entry
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`.**
**Canonical source:** `01-RESEARCH.md:560-563`:

```css
/* src/index.css — one line. No tailwind.config.js, no postcss.config.js. */
@import "tailwindcss";
```

**Constraints:** `01-UI-SPEC.md:32` — every colour in the UI-SPEC Colour table must exist as a **named token in an `@theme { }` block** in this file, so no component hardcodes a hex value. `01-UI-SPEC.md:31` — a `tailwind.config.js` or `postcss.config.js` appearing in the repo is a **defect**, not a style choice (Pitfall 2, `01-RESEARCH.md:404-408`).

#### `src/vite-env.d.ts` — config / types
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`.**
**Canonical source:** `01-RESEARCH.md:567-583`:

```ts
/// <reference types="vite/client" />

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

**Constraints:** Pitfall 17 (`01-RESEARCH.md:494-498`) — without this declaration a typo'd env key is silently `undefined` and Firebase fails later with an opaque `auth/invalid-api-key`.

#### `.env.example` — config
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`.**
**Canonical source:** `01-RESEARCH.md:585-593` — six keys with empty values, committed.
**Constraints:** `.env.local` must be **committed-never** (`01-RESEARCH.md:586`, D-25 at `01-CONTEXT.md:57`). Add `.env.local` to `.gitignore`.

#### `firebase.json` / `.firebaserc` — config
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`.**
**Canonical source:** `01-RESEARCH.md:595-617`:

```jsonc
// firebase.json
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true }
  },
  "hosting": {
    "public": "dist",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

```jsonc
// .firebaserc — a demo- prefixed project id is emulator-only and can never touch
// a real project. [CITED: firebase.google.com/docs/emulator-suite/connect_auth]
{ "projects": { "default": "demo-secretkit" } }
```

**Constraints:** `01-RESEARCH.md:611` — **do not set the optional `"edition"` key** on the firestore emulator entry; this project uses the standard Native document model the rules are written against (Assumption A5, `01-RESEARCH.md:1332`). The `hosting.rewrites` block is Phase-1 config even though Phase 2 owns its verification (`01-RESEARCH.md:104`).

#### `.gitattributes` — config
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`.**
**Canonical source:** Pitfall 16, `01-RESEARCH.md:488-492` and `:1322`.
**Constraints:** this environment has `git config core.autocrlf = true` (verified in research). Add `* text=auto eol=lf`; the test expectation for the CSV lives **inline in the test file** as a template literal, never as a committed `.csv` fixture.

### Cluster B — Firestore security rules (ROADMAP sub-step 2)

#### `firestore.rules` — config / access control
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`.** This is the highest-consequence file in the phase: `01-RESEARCH.md:97` states the rules are "the **only** enforcement point" for the phase's core value.
**Canonical source:** `01-RESEARCH.md:763-845` — the complete reference implementation, quoted verbatim:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    // Costs one document read per evaluation (Pitfall 19). At this scale, accepted.
    function isAdmin() {
      return isSignedIn()
        && get(/databases/$(database)/documents/events/main).data.adminUid == request.auth.uid;
    }

    // ── events/main (+ subcollections). A single fixed document: ID literally "main" (D-04).
    match /events/{eventId} {
      allow get, list: if isSignedIn();

      // Bootstrap: the FIRST user creates events/main and becomes Admin (D-02, EVENT-02).
      allow create: if isSignedIn()
        && request.resource.data.adminUid == request.auth.uid
        && request.resource.data.status == 'lobby';

      // Write-once adminUid: the create rule above sets it; this guard is what makes it
      // immutable afterwards. Only the Admin may flip status lobby -> drawn (Pitfall 12).
      allow update: if isAdmin()
        && request.resource.data.adminUid == resource.data.adminUid;

      allow delete: if false;

      // ── participants: PUBLIC WITHIN THE EVENT, BY DESIGN.
      // PREF-05 requires the giver to read the recipient's preferences, and DRAW-01 needs a
      // live list. This is why the EXPORT must be anonymous (SEC-04). Do not "tighten" this
      // to per-document get: it breaks the lobby and the duplicate-name pre-check (Pitfall 9).
      match /participants/{uid} {
        allow get, list: if isSignedIn();

        allow create, update: if isSignedIn()
          && uid == request.auth.uid
          && request.resource.data.name is string
          && request.resource.data.nameNormalized is string
          && request.resource.data.size in ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        // NOTE: uniqueness of nameNormalized CANNOT be expressed in rules — rules cannot
        // query. Enforced client-side, best-effort (Pitfall 3, Open Question 1).

        allow delete: if isSignedIn() && uid == request.auth.uid; // needed by the post-commit collision rollback
      }

      // ── assignments: the pairing lives here, one document per giver, and NOWHERE else
      // (D-07, SEC-01). No document anywhere ever holds the full map.
      match /assignments/{giverUid} {
        // A participant may read ONLY their own assignment, by document id.
        allow get: if isSignedIn() && giverUid == request.auth.uid;
        // NOBODY may query the collection — not other participants, not the Admin (D-06).
        // A getDocs() here fails with permission-denied for everyone (Pitfall 4).
        allow list: if false;
        // Only the draw transaction writes assignments, and only the Admin runs it (D-09).
        allow create, update: if isAdmin();
        allow delete: if false;
      }

      // ── orders: own or Admin read; own write; never carries the pairing (D-06, D-18).
      match /orders/{giverUid} {
        allow get: if isSignedIn() && (giverUid == request.auth.uid || isAdmin());
        allow list: if isAdmin();
        allow create, update: if isSignedIn()
          && giverUid == request.auth.uid
          // D-15: Dorsal is a STRING (preserves leading zeros) — not an int.
          && request.resource.data.number is string
          // ORDER-04 / SEC: the order document must not reveal the pairing. Forbid any
          // recipient-bearing field outright, using the documented forbid-a-field pattern.
          && !('recipientUid' in request.resource.data)
          && !('recipientName' in request.resource.data);
        allow delete: if false;
      }
    }

    // Default deny for everything not matched above.
  }
}
```

**Rule-review checklist — the planner must make each of these a testable assertion** (`01-RESEARCH.md:847`): (1) `assignments` `list` is false and no code path queries it; (2) `events` `update` re-asserts `adminUid`; (3) `orders` create/update asserts `number is string`; (4) `orders` create/update forbids `recipientUid`; (5) `participants` create asserts the size enum literally; (6) no rule anywhere is `if true`.

**Optional tightening the research recommends** (`01-RESEARCH.md:1300-1302`, Open Question 4 at `:1356-1359`): match the **literal** path `match /events/main { … }` instead of `match /events/{eventId}`, and drop `list` from the `events` rule. D-04 fixes the id to the literal string `main`, so the wildcard admits documents that can never legitimately exist.

**Pitfall 5 note** (`01-RESEARCH.md:422-426`): `resource.data` is `null` on create, so the `adminUid` immutability guard must live on the `update` rule (as written) — never on a combined `write`.

### Cluster C — Pure domain functions (ROADMAP sub-step 1 and 6)

> **Directory contract:** `01-RESEARCH.md:345` — `domain/exportOrders.ts` must **not** import anything from `lib/`. That is what makes the SEC-02 structural guarantee real rather than aspirational. The same discipline applies to every file in `domain/`: no `firebase/*` import, no React import, no I/O.

#### `src/domain/types.ts` — model
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`.** Every other `domain/` file and every `lib/` file imports its types from here.
**Canonical source:** `01-RESEARCH.md:307` lists the type set: `Size, KitType, Participant, Order, EventDoc, ExportedOrder`. Field-level shapes come from D-05 (`01-CONTEXT.md:25`) and the research's own type usages (`01-RESEARCH.md:859`, `:931`, `:1080`, `:1125-1133`).

**Constraints — the field names are locked by D-05 and already carry a research delta table** (`01-RESEARCH.md:518-535`), most importantly:
- `Order.number` is a **`string`** (D-15), *not* a number. `01-RESEARCH.md:524` marks this as an explicit override of `.planning/research/ARCHITECTURE.md`, which said "number, validate 0–99".
- `Order` includes `opaqueId: string` (D-05) — the earlier project research did not have it.
- `EventDoc.status` is `'lobby' | 'drawn'` only — **no `'closed'`, no `drawVersion`** (`01-RESEARCH.md:526`).
- `Participant` has **no redundant `uid` field** — the document id *is* the uid (`01-RESEARCH.md:527`).

#### `src/domain/normalizeName.ts` — utility / transform
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`.**
**Canonical source:** `01-RESEARCH.md:687-691`:

```ts
// src/domain/normalizeName.ts — D-02: trim + minúsculas
export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}
```

#### `src/domain/sizeGuide.ts` — utility / static data
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`** for static-data modules. Downstream copier: `prices.ts`.
**Canonical source:** `01-RESEARCH.md:700-727` (tables) and `:742-755` (anomaly predicates):

```ts
export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'

export const SIZES: readonly Size[] = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

/** Versión Fan — equivalencias S=P, M=M, L=G, XL=GG, XXL=XG, XXXL=2XG */
export const FAN_GUIDE = [
  { size: 'S',    equiv: 'P',    longCm: '69-71', heightCm: '162-170', weightKg: '50-62' },
  { size: 'M',    equiv: 'M',    longCm: '71-73', heightCm: '170-176', weightKg: '62-78' },
  { size: 'L',    equiv: 'G',    longCm: '73-75', heightCm: '176-182', weightKg: '78-83' },
  { size: 'XL',   equiv: 'GG',   longCm: '75-78', heightCm: '182-190', weightKg: '83-90' },
  { size: 'XXL',  equiv: 'XG',   longCm: '78-81', heightCm: '190-195', weightKg: '90-97' },
  { size: 'XXXL', equiv: '2XG',  longCm: '81-83', heightCm: '192-197', weightKg: '97-104' },
] as const

/** Versión Player — note: the spec's largest row is 2XL, NOT XXXL (anomaly #1) */
export const PLAYER_GUIDE = [
  { size: 'S',   longCm: '67-69', widthCm: '45-48', heightCm: '165-172', weightKg: '60-70' },
  { size: 'M',   longCm: '69-71', widthCm: '48-51', heightCm: '172-178', weightKg: '70-78' },
  { size: 'L',   longCm: '71-73', widthCm: '51-54', heightCm: '178-184', weightKg: '70-78' },
  { size: 'XL',  longCm: '73-75', widthCm: '54-57', heightCm: '184-190', weightKg: '78-86' },
  { size: '2XL', longCm: '75-77', widthCm: '57-60', heightCm: '190-198', weightKg: '94-104' },
] as const

/** D-12: Retro uses the Fan table — shown as an explicit note, never inferred silently. */
export const RETRO_USES_FAN_TABLE = true
```

```ts
/** Anomaly #1: the join form offers XXXL, but Player's table stops at 2XL. */
export function isSizeUnavailableForKit(kit: KitType, size: Size): boolean {
  return kit === 'Player' && size === 'XXXL'
}

/** Anomaly #2: Player M and L carry an identical weight range (70-78) in the spec. */
export function hasAmbiguousWeight(kit: KitType, size: Size): boolean {
  return kit === 'Player' && (size === 'M' || size === 'L')
}
```

**Constraints:** D-12 (`01-CONTEXT.md:36`) and `01-RESEARCH.md:757` — the anomalies are **rendered literally and flagged, never corrected**. `isSizeUnavailableForKit` drives a *non-blocking* notice only: never `disabled` on the submit button, never a mutation of the selected size. The values are quoted verbatim from `PROJECT.md:47-50` (reproduced at `01-RESEARCH.md:693-698`).

#### `src/domain/prices.ts` — utility / static data
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`** (copies `sizeGuide.ts`'s `as const` + named-export shape).
**Canonical source:** `01-RESEARCH.md:729-738`:

```ts
export type KitType = 'Fan' | 'Player' | 'Retro'

export const PRICES: Record<KitType, number> = { Fan: 11, Player: 16, Retro: 15 }

export function formatPrice(kit: KitType): string {
  return `${PRICES[kit]}$`
}
```

#### `src/domain/derangement.ts` — service / pure transform
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern` for the "pure algorithm + colocated property test" idiom.** Downstream copier: `exportOrders.ts`.
**Canonical source:** `01-RESEARCH.md:951-978`:

```ts
/**
 * Returns giver -> recipient for a single circular cycle of at least 3 participants.
 * Construction guarantees, with no rejection sampling:
 *   - bijection: every uid is a key exactly once and a value exactly once
 *   - no fixed points: recipient is always the NEXT element after a shuffle, never itself
 *   - exactly one cycle: chaining index i -> i+1 mod n visits all n and returns to start
 *   - no 2-cycles (mutual pairs): impossible for n >= 3 under a +1 offset, and this is
 *     precisely WHY the minimum is 3 — at n = 2 the only cycle IS a mutual pair.
 */
export function buildDerangement(participantUids: string[]): Map<string, string> {
  const n = participantUids.length
  if (n < 3) throw new Error('Se necesitan al menos 3 participantes para poder sortear')

  // Fisher–Yates over a COPY (never mutate the caller's array).
  const order = [...participantUids]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  // Offset +1 closes the cycle by construction.
  const pairs = new Map<string, string>()
  for (let i = 0; i < n; i++) pairs.set(order[i], order[(i + 1) % n])
  return pairs
}
```

**Constraints:** D-08 (`01-CONTEXT.md:30`) — Fisher–Yates **plus offset +1**; **no rejection sampling**; signature is `buildDerangement(participantUids): Map<string,string>` and it **throws for n < 3** (`01-RESEARCH.md:529` — ROADMAP names the signature, so use the map form, not the earlier project research's `DrawPair[]`).

#### `src/domain/derangement.test.ts` — test
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern` for the test conventions** (explicit `vitest` imports, prop-style assertions, inline expectations).
**Canonical source:** `01-RESEARCH.md:980-1024`. The four assertions that are the real contract: `n < 3` throws; bijection (same key set and value set as input); no fixed points; exactly one cycle of length n.
**Constraints:** `01-RESEARCH.md:1026` — the determinism test's expected `Map` is **illustrative**, not spec-mandated (Assumption A8, `:1335`). Confirm it against the implemented loop during execution; do not treat it as a locked expectation.

#### `src/domain/exportOrders.ts` — service / pure serialiser
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`** for the SEC-02 structural-guarantee idiom: the *parameter type itself* excludes the pairing.
**Canonical source:** `01-RESEARCH.md:1118-1160`:

```ts
// This module must NOT import anything from src/lib/ — that is what makes the
// structural guarantee of SEC-02 real rather than aspirational.
import type { KitType, Size } from './types'

/** The export's parameter type. It has no giver/recipient/name field, by construction. */
export type ExportedOrder = {
  opaqueId: string   // opaque: NEVER the giverUid (D-20)
  type: KitType
  team: string
  season: string
  printedName: string
  number: string     // string, to preserve "09"
  size: Size
}

export const EXPORT_HEADERS = [
  'ID de pedido', 'Tipo', 'Equipo', 'Temporada', 'Nombre serigrafiado', 'Dorsal', 'Talla',
] as const

const SEP = ';'
const EOL = '\r\n'
const BOM = '\uFEFF'

/** RFC 4180: quote when the cell contains the separator, a quote, CR or LF; double the quotes. */
export function escapeCsvCell(value: string): string {
  // Spreadsheet formula injection guard (Pitfall 20e): neutralise a leading = + - @
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  const mustQuote = safe.includes(SEP) || safe.includes('"') || safe.includes('\r') || safe.includes('\n')
  return mustQuote ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildOrdersExport(orders: ExportedOrder[]): string {
  const rows = [
    EXPORT_HEADERS.join(SEP),
    ...orders.map((o) =>
      [o.opaqueId, o.type, o.team, o.season, o.printedName, o.number, o.size]
        .map(escapeCsvCell).join(SEP)),
  ]
  return BOM + rows.join(EOL) + EOL
}
```

**Constraints:** D-20 (`01-CONTEXT.md:48`) — seven columns exactly as in `EXPORT_HEADERS`, **no participant identity, no price column**. `01-RESEARCH.md:535` records that dropping the `Precio` column is a deliberate divergence from `.planning/research/ARCHITECTURE.md`. The formula-injection guard at `:1146` is Assumption A2 (`:1329`), a documented deviation — if the user rejects it, it is a one-line removal.

#### `src/domain/exportOrders.test.ts` — test
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-RESEARCH.md:1162-1204` — five tests: BOM + exact header + `;` + CRLF; leading-zero dorsals (`09`, `100`); quote/semicolon escaping and accents; formula neutralisation; and the negative assertion that `giverUid`/`recipientUid`/`Precio` never appear.
**Constraints:** expectations are **inline template literals**, not a committed `.csv` fixture (Pitfall 16, `01-RESEARCH.md:488-492`).

### Cluster D — `lib/` Firebase boundary (ROADMAP sub-steps 3, 5, 6, 7)

> **Directory contract:** `01-RESEARCH.md:345` and `01-UI-SPEC.md:169` — **`src/lib/` is the only directory allowed to import from `firebase/*`.** A reviewer must be able to see every query the app can issue by reading one directory.

#### `src/lib/firebase.ts` — config / client init
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`** for every other `lib/` file: they import `db`/`auth` from here, never from `firebase/*`.
**Canonical source:** `01-RESEARCH.md:621-662`:

```ts
// The ONLY module in the app allowed to import from firebase/app|auth|firestore (except tests).
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously, type User } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const required = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (import.meta.env.DEV) {
  // Fail loudly and *named*, instead of letting Firebase report "invalid-api-key" (Pitfall 17).
  const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => `VITE_FIREBASE_${k}`)
  if (missing.length) throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`)
}

export const app = initializeApp(required)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Idempotent + dev-only (Pitfall 6): HMR re-evaluates this module.
let emulatorsConnected = false
if (import.meta.env.DEV && !emulatorsConnected) {
  emulatorsConnected = true
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')
}

// Anonymous Auth, silent and idempotent (D-01, EVENT-03; Pitfall 7).
export async function ensureSignedIn(): Promise<User> {
  if (auth.currentUser) return auth.currentUser
  const { user } = await signInAnonymously(auth)
  return user
}
```

**Constraints:** the `emulatorsConnected` module-scope guard is not optional — Pitfall 6 (`01-RESEARCH.md:428-432`) is exactly the HMR re-evaluation error. `ensureSignedIn` must check `auth.currentUser` first — Pitfall 7 (`:434-438`) is StrictMode double-invocation creating two anonymous users.

#### `src/lib/session.ts` — utility / localStorage persistence
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`** for the `domain/types` + `localStorage` bridge.
**Canonical source:** `01-RESEARCH.md:664-682` — `loadIdentity` / `saveIdentity` / `clearIdentity` around the key `'secretkit.identity'`, typed `StoredIdentity = { uid: string; name: string }`.

#### `src/lib/joinEvent.ts` — service / transactional CRUD
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`** for the two-phase transaction idiom. Downstream copier: `draw.ts`.
**Canonical source:** `01-RESEARCH.md:851-923` — the three-step shape: pre-check `getDocs` equality query → `runTransaction` (read `events/main` first → throw if `drawn` → create-as-Admin or update count → `set` own participant doc) → post-commit re-check that `deleteDoc`s on collision.

```ts
export async function joinEvent(
  uid: string,
  name: string,
  prefs: { size: Size; likedTeams: string; forbiddenTeams: string },
): Promise<JoinResult> {
  const nameNormalized = normalizeName(name)

  // ── Step 1: duplicate-name pre-check, OUTSIDE the transaction.
  // A transaction can read only named documents — Transaction.get() has no Query overload —
  // so this check cannot live inside it (Pitfall 3). It is permitted because the rules
  // allow `list` on participants.
  const dupe = await getDocs(query(
    collection(db, 'events', 'main', 'participants'),
    where('nameNormalized', '==', nameNormalized),
    limit(1),
  ))
  if (!dupe.empty) throw new Error('Ese nombre ya está en uso en el evento. Prueba con otro.')

  const eventRef = doc(db, 'events/main')
  const meRef = doc(db, 'events', 'main', 'participants', uid)

  // ── Step 2: transactional bootstrap-or-join (D-02). Reads BEFORE writes.
  const role = await runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef)

    if (eventSnap.exists() && eventSnap.data().status === 'drawn') {
      throw new Error('El sorteo ya se ha realizado: el grupo está cerrado.')  // D-10: roster frozen
    }

    const isFirstUser = !eventSnap.exists()
    const count = isFirstUser ? 0 : (eventSnap.data().participantCount ?? 0)

    if (isFirstUser) {
      tx.set(eventRef, {
        adminUid: uid, status: 'lobby', createdAt: serverTimestamp(), participantCount: 1,
      })
    } else {
      tx.update(eventRef, { participantCount: count + 1 })
    }
    tx.set(meRef, {
      name, nameNormalized, size: prefs.size,
      likedTeams: prefs.likedTeams, forbiddenTeams: prefs.forbiddenTeams,
      joinedAt: serverTimestamp(), hasOrder: false,
    })
    return isFirstUser ? 'admin' : 'participant'
  })

  // ── Step 3: close the TOCTOU window.
  const after = await getDocs(query(
    collection(db, 'events', 'main', 'participants'),
    where('nameNormalized', '==', nameNormalized),
  ))
  if (after.size > 1) {
    await deleteDoc(meRef)
    throw new Error('Ese nombre acaba de ser usado por otra persona. Prueba con otro.')
  }

  return { role }
}
```

**Constraints — this is the phase's single most subtle function:** Pitfall 3 (`01-RESEARCH.md:410-414`) is that `Transaction.get()` accepts a `DocumentReference` only — there is **no `Query` overload** — so the duplicate-name check **cannot** live inside the transaction. The residual ~200 ms TOCTOU window is an **accepted, documented limitation** (Open Question 1, `:1341-1344`). The two error strings are reused verbatim by the UI copy deck (`01-UI-SPEC.md:468`) so copy and thrown errors cannot drift. The participant `delete` rule exists specifically to allow this rollback (Assumption A3, `:1330`).

#### `src/lib/lobby.ts` — service / streaming subscription
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern` for returning the unsubscribe from the subscription factory.**
**Canonical source:** `01-RESEARCH.md:927-947` — `subscribeParticipants(cb)` returning `() => void` via `onSnapshot`, and `subscribeEvent(cb)`.
**Constraints:** order by **`nameNormalized`, never `joinedAt`** (`01-RESEARCH.md:933-934`, Pitfall 10 at `:452-456`) — `serverTimestamp()` is `null` in local snapshots and would mis-sort the just-joined row on that client. Both factory functions must pass an error callback (`:939`) because the S8 taxonomy needs the `err.code`.

#### `src/lib/draw.ts` — service / transactional CRUD
**Analog:** — (greenfield). **`first-of-kind`** (copies `joinEvent.ts`'s transaction shape).
**Canonical source:** `01-RESEARCH.md:1030-1055`:

```ts
export async function runDraw(participantUids: string[]): Promise<void> {
  if (participantUids.length < 3) throw new Error('Se necesitan al menos 3 participantes')

  // Algorithm stays pure and outside the transaction; transactions may re-run on conflict,
  // and re-randomising inside one would make the retry non-deterministic (bad for debugging).
  const pairs = buildDerangement(participantUids)
  const eventRef = doc(db, 'events/main')

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(eventRef)          // reads before writes
    if (!snap.exists()) throw new Error('El evento no existe todavía')
    if (snap.data().status === 'drawn') return   // idempotent: a double click is a no-op (D-09)

    for (const [giver, recipient] of pairs) {
      tx.set(doc(db, 'events', 'main', 'assignments', giver), { recipientUid: recipient })
    }
    tx.update(eventRef, { status: 'drawn' })
  })
}
```

**Constraints:** D-09 (`01-CONTEXT.md:31`) — idempotent early-return on `status === 'drawn'`; never persist seed or full permutation. `buildDerangement` is called **outside** the transaction (`01-RESEARCH.md:1039-1040`) because transactions may re-run on conflict. N+1 writes + the status flip must be atomic — D-09's whole point.

#### `src/lib/assignment.ts` — service / by-id read
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern` for the "by-id, never a query" read.**
**Canonical source:** `01-RESEARCH.md:1059-1072`:

```ts
/**
 * getDoc BY DOCUMENT ID. Never a query: the rules deny `list` on assignments, so any
 * query here fails with permission-denied for everyone, the Admin included (Pitfall 4).
 */
export async function getMyAssignment(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'events', 'main', 'assignments', uid))
  return snap.exists() ? (snap.data().recipientUid as string) : null
}
```

**Constraints:** Pitfall 4 (`01-RESEARCH.md:416-420`) — security rules are **not filters**; a collection query on `assignments` is denied for *everyone*, because the rule is evaluated against the whole potential result set. `01-UI-SPEC.md:334` elevates this to a hard rule: **no query over `assignments` may exist anywhere in the app.** The header comment must be preserved so a future reader does not "optimise" it into a query.

#### `src/lib/orders.ts` — service / batch write + admin list
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-RESEARCH.md:1076-1110`:

```ts
export type OrderInput = {
  type: KitType; team: string; season: string
  printedName: string; number: string   // D-15: STRING, preserves leading zeros ("09")
  size: Size
}

/** Idempotent by construction: deterministic document id = giverUid (D-18). */
export async function submitOrder(uid: string, input: OrderInput): Promise<void> {
  const orderRef = doc(db, 'events', 'main', 'orders', uid)
  const meRef = doc(db, 'events', 'main', 'participants', uid)
  const batch = writeBatch(db)

  batch.set(orderRef, {
    ...input,
    opaqueId: crypto.randomUUID(),      // D-25: no `uuid` dependency
    submittedAt: serverTimestamp(),
    // Deliberately NO recipientUid / recipientName / giverUid field (ORDER-04).
  })
  batch.update(meRef, { hasOrder: true })   // same batch: progress can never disagree (Pitfall 11)

  await batch.commit()
}

/** Admin-only list (rules: `list: if isAdmin()`). Excludes the pairing by projection. */
export async function listOrdersAdmin() {
  const snap = await getDocs(collection(db, 'events', 'main', 'orders'))
  return snap.docs.map((d) => d.data() as Order)
}
```

**Constraints:** the `hasOrder` flip is in the **same batch** as the order write — Pitfall 11 (`01-RESEARCH.md:458-462`) is precisely the two-documents-without-a-transaction disagreement. `crypto.randomUUID()` requires a secure context — Pitfall 18 (`:500-504`): `localhost` counts, a LAN IP over plain HTTP does not. `listOrdersAdmin` projects `d.data()` through the `Order` type, which has no recipient field — the pairing is excluded by the *type*, matching the export's structural guarantee.

#### `src/lib/download.ts` — utility / file output
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-RESEARCH.md:1206-1219` — `Blob` + `URL.createObjectURL` + `a.download` + **`URL.revokeObjectURL`**.
**Constraints:** D-25 (`01-CONTEXT.md:57`) forbids `file-saver`. `01-RESEARCH.md:390` warns the `revokeObjectURL` is easy to forget and leaks the blob for the page's lifetime. The filename is `` `pedidos-${new Date().toISOString().slice(0,10)}.csv` `` — **not** `toLocaleDateString` (`01-RESEARCH.md:394`, locale ambiguity leaks into the filename the vendedor receives).

### Cluster E — Session context and hooks (ROADMAP sub-step 3)

#### `src/session/SessionProvider.tsx` — provider / context
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern` for the only Context in the app.**
**Canonical source:** structure at `01-RESEARCH.md:315-323`; the state contract at `01-RESEARCH.md:1251` (`const { loading, uid, hasPreferences, eventStatus } = useSession()`) and `01-UI-SPEC.md:401-415` (the redirect-by-state table).

**Constraints — the consumed surface is already fixed by `App.tsx`'s excerpt, so the provider must export exactly:**
- `loading` — true until identity resolves (drives `FullScreenSpinner`).
- `uid` — `null` when unauthenticated.
- `hasPreferences` — whether a `participants/{uid}` document exists. This is the `!hasPreferences → /preferences` branch, and `01-UI-SPEC.md:406` notes it is "correct by construction" for the entered-name-but-abandoned case.
- `eventStatus` — `'lobby' | 'drawn' | null`, sourced from `subscribeEvent` so a status flip pushes every connected client to `/reveal` (`01-UI-SPEC.md:296`) with no polling.
- D-23 (`01-CONTEXT.md:53`) — Context + hooks over `onSnapshot`; **no Redux/Zustand/React Query.**
- Pitfall 7 (`01-RESEARCH.md:437`) — drive identity from `onAuthStateChanged(auth, …)`, not from the promise of the sign-in call, so StrictMode's double effect still yields one source of truth.
- Pitfall 8 (`:440-444`) — every subscription returns its unsubscribe from the `useEffect`.

#### `src/hooks/useMyAssignment.ts` — hook / request-response
**Analog:** — (greenfield). **`first-of-kind — establishes the hook return-triple pattern.** Downstream copier: `useOrdersAdmin.ts`.
**Canonical source:** data source `01-RESEARCH.md:1057-1072`; the required states at `01-UI-SPEC.md:332` (loading / error / **assignment-missing** — a third state beyond the usual two).
**Constraints:** calls `getMyAssignment` only; the "assignment-missing" state is its own branch with its own copy (`01-UI-SPEC.md:332`). No query over `assignments`, ever.

#### `src/hooks/useOrdersAdmin.ts` — hook / streaming + CRUD
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:379-393` (progress derived from `participants.filter(p => p.hasOrder).length`) and `01-RESEARCH.md:1105-1110` (`listOrdersAdmin`).
**Constraints:** D-19 (`01-CONTEXT.md:47`) + `01-UI-SPEC.md:391` — this hook is mounted **only** on `/admin`, and it must **not** open a second subscription to learn progress; progress comes from the `participants` list the lobby already subscribes to. `/admin` **never** reads `assignments`. No `orders` scan for progress either — `hasOrder` on `participants` is the aggregate (Pitfall 11, `01-UI-SPEC.md:100`).

### Cluster F — Component primitives (ROADMAP sub-steps 4, 5, 6, 7)

All of `src/components/*` primitives carry **`first-of-kind — establishes the pattern`**. There is no component library (D-25, `01-UI-SPEC.md:28`), and the UI-SPEC's Component Contracts table is the binding specification. The planner should copy the contract row verbatim into the plan action rather than paraphrasing it.

#### `src/components/Button.tsx` — component / request-response
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`** for every other primitive (the `h-11` / `rounded-lg` / variant-lookup / focus-ring idioms).
**Canonical source:** `01-UI-SPEC.md:143`, quoted verbatim:

> Props: `variant: 'primary' | 'secondary' | 'danger' | 'ghost'`, `loading?: boolean`, plus native button props. Single size: `h-11` (44px), `px-4`, `rounded-lg`, 16px label, `font-semibold` for `primary` and 400 for the rest. `primary` = solid indigo-600 / white text (the only indigo button). `secondary` = white / slate-300 border / slate-900 text. `danger` = solid red-600 / white — used **only** inside `DrawConfirmDialog`. `ghost` = transparent / slate-700 text, used for `Cambiar nombre` and `Volver a entrar`. `loading` renders the inline 16px spinner, sets `aria-busy="true"` and `disabled`.

**Constraints:** `01-UI-SPEC.md:127` — secondary buttons are explicitly **NOT** accent. `01-UI-SPEC.md:113` — `disabled` always paired with `aria-disabled`. `01-UI-SPEC.md:171` — **no Tailwind class built from a string**; implement the variant map as a literal lookup object.

#### `src/components/Field.tsx` — component / request-response
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:144`, verbatim:

> Wraps label + control + helper + error. Label is 14px slate-900 with a `for`. Helper is 14px slate-600. Error is 14px red-700 with `role="alert"` and an `id` referenced by the control's `aria-describedby`. `required` renders `*` plus an `sr-only` `obligatorio`.

**Constraints:** `01-UI-SPEC.md:439` — `role="alert"` is reserved **exclusively** for field-level validation errors; every other live region is `role="status"`.

#### `src/components/Input.tsx` / `Select.tsx` — component / request-response
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:145-146`, verbatim:

> `Input` / `Textarea`: `h-11`, `w-full`, `rounded-lg`, 1px slate-300 border, 16px text, `focus-visible:ring-2 ring-indigo-600`. `aria-invalid` + `aria-describedby` when errored.
>
> `Select`: Native `<select>` styled identically to `Input`. Options come from `domain/sizeGuide.ts` (`SIZES`) or `domain/prices.ts` (`KitType`) — **never a free-text field, never a hardcoded option list inside a component**. Renders a visible placeholder option (`Elige una talla` / `Elige el tipo`) that is `disabled` and `value=""`.

**Constraints:** `01-UI-SPEC.md:90`, `:435` — controls render at **16px** (`text-base`) even though the label is 14px, to prevent iOS zoom-on-focus. The label is a separate element, never a placeholder substitute.

#### `src/components/Card.tsx` / `Badge.tsx` / `Notice.tsx` / `Modal.tsx` / `Screen.tsx` / `FullScreenSpinner.tsx` / `ErrorBoundary.tsx` — components
**Analog:** — (greenfield). **`first-of-kind`** each.
**Canonical source:** `01-UI-SPEC.md:147-153`, one contract row each. The binding details that are easy to lose:
- `Card` — **no shadow**; borders carry elevation in this phase (`:147`).
- `Badge` — instances are `Admin`, `Pendiente`, `Guardado`; **never indigo** (`:148`).
- `Notice` — `tone: 'warning' | 'error' | 'info' | 'success'`; renders `role="status"`, never `alert`, because the D-16 notice must not interrupt typing or steal focus (`:149`).
- `Modal` — thin wrapper over native `<dialog>` + `showModal()`; `max-h-[85vh] overflow-y-auto`; sticky close button `h-11 w-11` with `aria-label="Cerrar"`; returns focus to the trigger (`:150`). The research (`01-RESEARCH.md:177`, `:392`) is explicit that native `<dialog>` is chosen *because* focus trap + `Esc` + inert background are browser behaviours — do not hand-roll them.
- `Screen` — `<main>` + `mx-auto max-w-md px-4 sm:px-6 py-8` + `pb-24` when a sticky CTA is present; owns the single `<h1>` per screen (`:151`, `:438`).
- `FullScreenSpinner` — used **only** while session identity resolves (`:152`).
- `ErrorBoundary` — top-level, around `<App/>`; `Algo ha ido mal.` + `Recargar` (`:153`, `:425`).

#### `src/components/icons.tsx` — component / asset
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:165`, `:29` — **exactly two** inline SVGs: `CloseIcon`, `SpinnerIcon`. Nothing else; there is no icon library (D-25).

### Cluster G — Domain components (ROADMAP sub-steps 4, 5, 6, 7)

#### `src/components/SizeGuideModal.tsx` — component / event-driven
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern`** for domain dialogs. Downstream copier: `DrawConfirmDialog.tsx`.
**Canonical source:** `01-UI-SPEC.md:246-269`, verbatim structure:

- Title (locked): `Guía de Tallas`.
- Body order fixed: **Fan table → Player table → three amber `Notice` rows**.
- The three notices, exact copy (`01-UI-SPEC.md:257-259`): `La camiseta Retro usa la tabla de la Versión Fan.` / `En la Versión Player, la tabla del proveedor llega hasta 2XL; no hay equivalencia para XXXL.` / `En la Versión Player, M y L comparten el mismo rango de peso en los datos del proveedor.`
- Responsive: below `sm` → one card per size as a `<dl>`; at `≥ sm` → a real `<table>` with `<caption>` and `<th scope="col">` (`:263-267`).

**Constraints:** D-12 (`01-CONTEXT.md:36`) — anomalies **rendered literally and flagged, never corrected**. No value may be edited, normalised, or hidden to make the table look consistent. This is static reference content: **no loading, empty or error state** (`01-UI-SPEC.md:269`).

#### `src/components/SizeGuideTable.tsx` — component / transform
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:160` — one component, two data props (`FAN_GUIDE` / `PLAYER_GUIDE`), never a horizontally scrolling table below `sm`.
**Constraints:** `01-UI-SPEC.md:589` — every cell is a short range or equivalence, longest value 5 characters; no truncation or wrapping logic is needed or wanted for static data.

#### `src/components/PriceTable.tsx` — component
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:161`, `:351` — three `tabular-nums` rows, values read from `domain/prices.ts`, heading `Precios de referencia`, rendered as aligned rows not cards.

#### `src/components/ParticipantRow.tsx` — component
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:162` — name (`break-words`) + `(tú)` suffix on the own row + optional `Admin` badge + optional `Pendiente` badge; minimum row height 44px.
**Constraints:** `01-UI-SPEC.md:92` — **`truncate` is forbidden on user data**; a truncated recipient name in a gift app is a correctness bug, not a style choice.

#### `src/components/JerseyOrderForm.tsx` — component / CRUD
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern` for a form component** (controlled fields, unified validation copy, post-success recap swap).
**Canonical source:** `01-UI-SPEC.md:338-369`. Six fields in a contracted order; the option labels carry their price at the point of choice (`Fan · 11$`, `Player · 16$`, `Retro · 15$`); the Dorsal field is **`type="text"` with `inputMode="numeric"` and `pattern="[0-9]*"`, `maxLength={3}` — never `type="number"`, which strips the leading zero** (`:348`); the Talla select is pre-filled from the recipient's preference and editable (`:349`).

**Constraints — the D-16 non-blocking notice (`01-UI-SPEC.md:353-357`):** when `type === 'Player'` **and** `size === 'XXXL'`, render an amber `Notice` with `role="status"` **directly above the submit button**. The submit button **stays enabled**, the selected size is **never mutated**, nothing is auto-corrected. D-16 and `REQUIREMENTS.md:88` both forbid correcting the spec's data.

**Constraints — the submit contract (`01-UI-SPEC.md:359-369`):** required = Tipo, Equipo, Talla with the unified copy `Este campo es obligatorio.`; the submit button is **not disabled while invalid** — pressing it is what reveals the field errors. After a successful save the form is replaced by a **read-only recap** with a `Guardado` badge; editing after save is SCOPE-02 and deferred, so Phase 1 exposes **no** edit affordance and no re-submit button. Empty optional fields render `—` in the recap, never a collapsed row.

#### `src/components/DrawConfirmDialog.tsx` — component / event-driven
**Analog:** — (greenfield). **`first-of-kind`** — the phase's **only destructive confirmation** (`01-UI-SPEC.md:455`).
**Canonical source:** `01-UI-SPEC.md:300-309`, verbatim:

> | Title | `Empezar Sorteo` |
> | Body | `Se sorteará entre {n} participantes. Nadie verá quién regala a quién y no se puede deshacer.` |
> | Confirm | `Empezar el sorteo` (`danger` variant) |
> | Cancel | `Cancelar` (`secondary`, initial focus) |

**Constraints:** D-10 (`01-CONTEXT.md:28`) — the body **must name the participant count**. Initial focus goes to `Cancelar` so a mis-tap on the lobby button cannot cost an accidental irreversible draw. While the transaction is in flight the confirm button is `loading` and both buttons are disabled — the only UI defence against a double-tap, on top of the transaction's own idempotency. Never `window.confirm` (`01-UI-SPEC.md:297`).

### Cluster H — Pages (ROADMAP sub-steps 3, 4, 5, 6, 7)

Every page carries **`first-of-kind — establishes the pattern`**. `src/pages/EntryPage.tsx` is the pattern-setter for the family: `Screen` shell + one `<h1>` + explicit loading/empty/error branches + `navigate()` on success.

#### `src/pages/EntryPage.tsx` — page / request-response
**Analog:** — (greenfield). **`first-of-kind — establishes the pattern` for pages.**
**Canonical source:** `01-UI-SPEC.md:179-203`; full copy deck at `:474-481`.
**Constraints — the non-obvious contract (`01-UI-SPEC.md:201`), quoted:** *"**No `participants` document is created here.** The rules assert `size in ['S','M','L','XL','XXL','XXXL']` on `create`, so a participant document cannot exist without a size — which is why the join happens on S2 and why a half-joined participant is impossible by construction. This is a contract, not an implementation detail: the executor must not 'fix' it by writing an early document."*
Also: wrapped in a real `<form>` so Enter submits; empty ⇒ inline error, focus stays in the input; duplicate pre-check renders in the form's error slot — **never auto-suffix, never append a number** (D-02).

#### `src/pages/PreferencesPage.tsx` — page / request-response
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:207-242`; copy deck at `:482-494`.
**Constraints:** the page performs the actual join via `joinEvent(uid, name, prefs)`; the CTA is **never disabled for validation** — only while submitting (`:229`). Four distinguishable failure states, each with its own copy (`:235-240`): duplicate pre-check, duplicate post-commit race, event already drawn, network/unknown.

#### `src/pages/LobbyPage.tsx` — page / streaming
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:273-311`; copy deck at `:503-517`.
**Constraints:** `onSnapshot` on `participants` ordered by `nameNormalized` (`:295`); on the status flip to `drawn` **every connected client is redirected to `/reveal`** from the session's `eventStatus` push, with **no copy anywhere saying "recarga la página"** (`:296`); `Empezar Sorteo` visible only when `uid === event.adminUid` and `disabled` while `n < 3`, with the adjacent minimum-3 notice as the explanation (`:289`). Slug: the count line uses `aria-live="polite" aria-atomic="true"` (`:283`).

#### `src/pages/RevealPage.tsx` — page / request-response
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:315-334`; copy deck at `:518-524`.
**Constraints:** the **locked literal** headline `Te ha tocado regalar a {Nombre}` (`01-CONTEXT.md:107`, `01-UI-SPEC.md:463`) — `{Nombre}` at 28px/600 inside the `<strong>`, wraps to ≤3 lines at 320px, **never truncated**. An empty preference renders `Sin indicar` — never a blank or hidden row. The privacy line is precise and deliberately not overclaiming: `Solo tú puedes ver a quién regalas. Nadie más, tampoco el Admin.` The only reads are `getMyAssignment(uid)` then `getDoc(participants/{recipientUid})` — **no query over `assignments`** (`:334`).

#### `src/pages/AdminPage.tsx` — page / streaming + file-I/O
**Analog:** — (greenfield). **`first-of-kind`.**
**Canonical source:** `01-UI-SPEC.md:373-393`; copy deck at `:540-551`.
**Constraints:** progress derived from the `participants` documents the lobby already subscribes to (`participants.filter(p => p.hasOrder).length`); D-19 forbids a separate submissions collection and a second subscription (`:391`). The download builds the CSV through `buildOrdersExport(orders)` and hands it to `downloadCsv(filename, csv)`. **`/admin` never reads `assignments`.** Progress bar carries the full `role="progressbar"` + `aria-valuemin`/`max`/`now`/`valuetext` set (`:383`). Download CTA `disabled` while `filled === 0` with the adjacent helper.

---

## Shared Patterns

These are cross-cutting concerns that apply to many files. In a greenfield phase they are the closest thing to an existing convention, and they should be stated once in the plan rather than repeated per file.

### 1. Firebase access boundary (the auditability contract)
**Source:** `01-RESEARCH.md:345`, `01-UI-SPEC.md:169`.
**Apply to:** every file in `src/lib/` and nothing else.

> **`src/lib/` is the only directory allowed to import from `firebase/*`.** A reviewer must be able to see every query the app can issue by reading one directory.

This is the single rule that makes the privacy contract reviewable: the rules file and the call sites are reviewed as one unit (`01-RESEARCH.md:82`). Any import of `firebase/*` outside `src/lib/` is a defect.

### 2. Pure-domain boundary (the SEC-02 structural guarantee)
**Source:** `01-RESEARCH.md:345`, `01-UI-SPEC.md:170`.
**Apply to:** every file in `src/domain/`.

> **`src/domain/exportOrders.ts` must not import anything from `src/lib/`.** That is what makes the SEC-02 structural guarantee real.

Extend it to the whole directory: no `firebase/*` import, no React import, no I/O in `src/domain/`. `buildOrdersExport`'s parameter type (`ExportedOrder`) has no giver/recipient/name field — *the type is the guarantee* (`01-RESEARCH.md:135`).

### 3. Test conventions
**Source:** `01-RESEARCH.md:476-480` (Pitfall 14), `:488-492` (Pitfall 16), `:543-558`.
**Apply to:** every `*.test.ts`.

- Import explicitly: `import { describe, it, expect } from 'vitest'` — `globals: false`.
- `environment: 'node'` globally; all mandatory Phase-1 tests are pure functions (`01-RESEARCH.md:553`).
- Expectations live **inline in the test file**, never as a committed `.csv` fixture (this machine has `core.autocrlf=true`).
- Tests must be named `*.test.ts` / `*.spec.ts` or Vitest will not collect them.
- The mandatory suite is: `buildDerangement` property tests (D-08), `buildOrdersExport` + CSV edge cases (D-20), and the literal spec-value tests (D-13). Anything else is planner discretion (`01-CONTEXT.md:62`).
- `vitest` is a **dev** dependency; `@firebase/rules-unit-testing` is **Phase 2** and must not be installed in Phase 1 (`01-RESEARCH.md:167`) — but the config must not accidentally block it.

### 4. Firestore error taxonomy → user copy
**Source:** `01-UI-SPEC.md:416-425`.
**Apply to:** every surface that can fail (S1, S2, S4, S5, S6, S7).

| Error code | Copy | Retry |
|-----------|------|-------|
| `permission-denied` | `No tienes permiso para ver esto.` | none |
| `unavailable` (offline) | `Sin conexión. Vuelve a intentarlo cuando recuperes la red.` | `Reintentar` |
| `resource-exhausted` (quota) | `Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde.` | none |
| `unavailable` during a write | `Sin conexión. El pedido no se ha guardado.` | `Reintentar` |
| `deadline-exceeded` / unknown | `Algo ha ido mal.` | `Reintentar` |
| Unhandled render error | `Algo ha ido mal.` + `Recargar` | `ErrorBoundary` |

Render as an error `Notice` in the affected surface's slot. This is why every `lib/` subscription factory passes an error callback that surfaces `err.code` (`01-RESEARCH.md:939`).

### 5. Route guards are UX, not access control
**Source:** `01-RESEARCH.md:103`, `:373`, `:1270`; `01-UI-SPEC.md:375`.
**Apply to:** `App.tsx` and every page.

A `Navigate` away from `/admin` is UX. The **enforcement** is that the rules deny every read an impostor would need. The plan's verification step must therefore assert the **rules**, not the redirect — `01-RESEARCH.md:1270` states this explicitly: *"The plan's verification step must therefore assert the rules, not the redirect."*

### 6. Realtime subscription lifecycle
**Source:** `01-RESEARCH.md:440-444` (Pitfall 8), `:933-934` (Pitfall 10).
**Apply to:** `lobby.ts`, `SessionProvider.tsx`, `useOrdersAdmin.ts`.

- Every hook returns the unsubscribe from its `useEffect` — `return () => unsubscribe()`.
- Never order by `joinedAt`; order by `nameNormalized` or the document id, because `serverTimestamp()` is `null` in local snapshots and would mis-sort the just-joined row on that client.
- No polling, and no copy that says "recarga la página" (`01-UI-SPEC.md:296`, `:600`).

### 7. Tailwind v4 discipline
**Source:** `01-RESEARCH.md:404-408` (Pitfall 2), `:482-486` (Pitfall 15); `01-UI-SPEC.md:31-32`, `:171`.
**Apply to:** every `.tsx` file.

- **No `tailwind.config.js`, no `postcss.config.js`, no `content` array.** Two things only: `tailwindcss()` in `vite.config.ts`, `@import "tailwindcss";` as line 1 of `src/index.css`.
- **No class built from a string** (`bg-${x}-500`). Map conditions to complete literal class names via a lookup object.
- Every colour is a named token in the `@theme { }` block; no component hardcodes a hex.
- Dark mode is **out of scope and not partially implemented** (`01-UI-SPEC.md:131`, `:442`) — no `dark:` variants anywhere.

### 8. Accessibility & responsive contract
**Source:** `01-UI-SPEC.md:431-443`, `:56-62`, `:66-93`.
**Apply to:** every `.tsx` file.

- Mobile-first; the **only** breakpoint used in Phase 1 is `sm` (640px). Must not require horizontal scroll at 320px.
- Every interactive target ≥ **44×44px** (`h-11`, `min-w-11`), with ≥8px between adjacent tappable rows.
- Form controls render at **16px**; labels are separate 14px elements, never placeholder-only. **No text smaller than 14px anywhere.**
- Exactly one `<h1>` per screen. Real `<form>` + `<label for>` + `<button type="submit">`; Enter submits.
- Visible focus ring on every focusable element: `focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2`.
- `role="status"` for the D-16 notice, submit success, download success and the lobby count; `role="alert"` **only** for field-level validation errors.
- Exactly one animation exists in the phase (the skeleton `animate-pulse`), always with `motion-reduce:animate-none`.
- `break-words` on every element rendering user-supplied text; **`truncate` is forbidden on user data.**
- Two font weights only: 400 and 600. 500/700/800 are forbidden in this phase.
- `<html lang="es">`.
- Indigo-600 is reserved for the five enumerated primary CTAs, the progress-bar fill, the selected size chip, and the focus ring — **nothing else** (`01-UI-SPEC.md:119-127`).

### 9. Copy and language conventions
**Source:** `01-UI-SPEC.md:17`, `:447-558`.
**Apply to:** every user-facing string.

- User-facing copy is **Spanish (es-ES)**; technical names, props, tokens and file names stay **English**.
- Four strings are **locked literals** and must appear exactly as written (`01-UI-SPEC.md:457-466`): `Te ha tocado regalar a {Nombre}`, `Empezar Sorteo`, `Guía de Tallas`, and the price strings `Camiseta Fan 11$` / `Camiseta Player 16$` / `Camiseta Retro 15$`.
- Three further strings are reused verbatim from the research's thrown errors so copy and errors cannot drift (`01-UI-SPEC.md:468`): `Ese nombre ya está en uso en el evento. Prueba con otro.`, `Ese nombre acaba de ser usado por otra persona. Prueba con otro.`, `El sorteo ya se ha realizado: el grupo está cerrado.`
- Tone: tú-form, present tense, no exclamation marks, no "¡Ups!", never blame the user, always name the next action. Never say "recarga la página".
- The full copy deck is `01-UI-SPEC.md:470-556` — implement from it verbatim rather than paraphrasing.
- **One primary CTA per screen, and no screen has two** (`01-UI-SPEC.md:451`).

### 10. Naming and file organisation
**Source:** `01-RESEARCH.md:302-343` (the layout is already fixed).
**Apply to:** all new files.

The directory layout in `01-RESEARCH.md:304-343` is prescriptive, not a suggestion. Two structural rules from it are load-bearing (see § 1 and § 2 above). Component/hook names are planner discretion per `01-CONTEXT.md:60`, but the ones the UI-SPEC already uses (`SessionProvider`, `useMyAssignment`, `useOrdersAdmin`, `SizeGuideModal`, `JerseyOrderForm`, `DrawConfirmDialog`, `SizeGuideTable`, `PriceTable`, `ParticipantRow`, `Screen`, `Notice`, `Badge`, `Card`, `Field`, `Select`, `Button`, `Modal`, `FullScreenSpinner`, `ErrorBoundary`, `icons`) should be treated as settled — the UI-SPEC's Component Contracts table depends on them.

---

## No Analog Found

**Every file in this phase has no analog.** Rather than list all 54 rows with the same reason, here is the reason once, plus the files where the absence is most consequential for planning.

**Reason (applies to 54 / 54):** the repository is greenfield — `git ls-files` returns 28 paths, all `.planning/` documents plus `AGENTS.md` and `LICENSE`. There is no `package.json`, no `src/`, and no `firestore.rules`.

**Files where the absent analog is highest-stakes** (the planner should give these the most detailed plan actions, because nothing in the repo will catch a mistake):

| File | Role | Data Flow | Why the absence matters |
|------|------|-----------|-------------------------|
| `firestore.rules` | config (access control) | request-response | The **only** enforcement point for the phase's core value (`01-RESEARCH.md:97`). No prior rules file exists to copy a house style from, and a `list`-allowed `assignments` rule silently destroys the product. |
| `src/lib/joinEvent.ts` | service | CRUD (transactional) | Contains the phase's subtlest constraint (Pitfall 3: `Transaction.get()` has no `Query` overload). A naive implementation that puts the duplicate-name check inside the transaction **will not compile**. |
| `src/lib/assignment.ts` | service | request-response | The "by-id, never a query" rule is counter-intuitive and fails for everyone including the Admin if violated (Pitfall 4). Nothing in the repo establishes the convention. |
| `src/domain/exportOrders.ts` | service | transform (pure) | Carries the SEC-02 structural guarantee via its *type signature*. There is no precedent for "the parameter type is the guarantee". |
| `src/domain/derangement.ts` | service | transform (pure) | Uses `Map<string,string>` per `01-RESEARCH.md:529`, which **overrides** `.planning/research/ARCHITECTURE.md`'s `DrawPair[]` sketch — an executor reading the older research would implement the wrong signature. |
| `src/session/SessionProvider.tsx` | provider | pub-sub | Its consumed surface (`{loading, uid, hasPreferences, eventStatus}`) is already fixed by `App.tsx`'s excerpt, but the provider itself has no template. |
| `src/main.tsx` | provider | request-response | The `react-router` vs `react-router-dom` import is the #1 way to break this build (Pitfall 1) and every tutorial online gets it wrong. |

---

## Gaps

Items the planner must resolve that this map cannot, because neither CONTEXT.md nor RESEARCH.md nor UI-SPEC.md specifies them:

1. **Test filenames for the D-13 literal-data assertions.** D-13 (`01-CONTEXT.md:37`) requires a test that the size-guide and price values are exactly the spec's. The research has no excerpt for it and no filename. **Planner discretion** (`01-CONTEXT.md:62`) — proposed: `src/domain/sizeGuide.test.ts` and `src/domain/prices.test.ts`, or one combined `src/domain/specData.test.ts`.
2. **`src/domain/types.ts` full field list.** The research names the type set (`Size, KitType, Participant, Order, EventDoc, ExportedOrder`) and the field shapes come from D-05 + the delta table at `01-RESEARCH.md:518-535`, but no complete type declaration is quoted anywhere. The planner should write the type file as an explicit plan action, not as "create types as needed".
3. **Whether `getMyOrder` is a separate export in `orders.ts`.** ORDER-05 needs the user's own order status, and `01-RESEARCH.md:1076-1110` only shows `submitOrder` and `listOrdersAdmin`. The UI-SPEC (`:363-367`) makes `hasOrder` the visible badge source, so a dedicated own-order read may be unnecessary — the planner should decide explicitly rather than leave it implicit.
4. **Whether the rules use the literal `match /events/main`** (Open Question 4, `01-RESEARCH.md:1356-1359`). The research recommends adopting it; it is a strict tightening with no downside identified, but it changes the rule file's shape from the quoted excerpt.
5. **`README.md`.** ROADMAP Phase-2 criterion 5 assigns the trust-contract README to Phase 2, so it is **not** a Phase-1 deliverable. Listed here so the planner does not accidentally add it.

## Metadata

**Analog search scope:** the entire repository (`E:/Proyectos Github/SecreTifo`), enumerated by `git ls-files` (28 tracked paths) and by reading the repository root (4 entries: `.git/`, `.planning/`, `AGENTS.md`, `LICENSE`).
**Files scanned:** 28 tracked + 4 root entries — 100% of the repository. There is nothing left unscanned; the repository contains no source code.
**Analogs found:** 0 — greenfield confirmed by direct enumeration, not by inference.
**Canonical sources used in place of analogs:** `.planning/phases/01-flujo-completo-del-amigo-invisible/01-RESEARCH.md` (Code Examples §Build configuration, §Firebase initialisation, §The pure domain functions, §Security rules, §Bootstrap-or-join transaction, §Lobby subscription, §buildDerangement, §The draw transaction, §Reading one's own assignment, §Order submission, §CSV export, §Routing shell); `.planning/phases/01-flujo-completo-del-amigo-invisible/01-UI-SPEC.md` (Component Contracts, Surface & Interaction Contracts S1–S8, Accessibility & Responsive Rules, Copywriting Contract); `.planning/phases/01-flujo-completo-del-amigo-invisible/01-CONTEXT.md` (D-01…D-25); `.planning/ROADMAP.md:38-45` (the 7-step build order that produced the intra-phase precedent ordering).
**Tracked-source gate (#3645):** satisfied vacuously — no analog path is named in this document, so no gitignored install/runtime mirror can be propagated. All cited sources are `.planning/` documents confirmed tracked by `git ls-files`.
**Pattern extraction date:** 2026-10-17
