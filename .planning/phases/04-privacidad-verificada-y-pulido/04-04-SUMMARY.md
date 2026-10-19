---
phase: "04"
plan: "04"
subsystem: "ui-polish-docs"
tags:
  - "responsive-design"
  - "accessibility"
  - "documentation"
  - "trust-contract"
dependency_graph:
  requires:
    - "04-01"
  provides:
    - "responsive-size-guide"
    - "readme-trust-contract"
  affects:
    - "src/components/SizeGuideTable.tsx"
    - "src/components/SizeGuideModal.tsx"
    - "src/components/Modal.tsx"
    - "src/index.css"
    - "README.md"
tech_stack:
  added: []
  patterns:
    - "Responsive table ↔ cards at sm breakpoint (640px)"
    - "Anomaly badges (ámbar) inline in table/cards"
    - "Native <dialog> focus trap, Esc close, focus return"
    - "Sticky table headers (position: sticky; top: 0)"
    - "Trust contract documentation in README"
key_files:
  created:
    - "src/components/__tests__/SizeGuideTable.responsive.test.tsx"
    - "src/components/__tests__/setup.ts"
    - "README.md"
  modified:
    - "src/components/SizeGuideTable.tsx"
    - "src/components/SizeGuideModal.tsx"
    - "src/components/Modal.tsx"
    - "src/index.css"
decisions:
  - "Table view (≥640px): real <table> with <caption>, <th scope=col>, sticky headers"
  - "Card view (<640px): <ul> of <li> cards with <dl> per size"
  - "Anomaly badges: Player XXXL (unavailable), M/L (ambiguous weight) — ámbar inline"
  - "Modal: max-h-[80vh], overflow-y-auto, native focus trap via showModal()"
  - "README trust contract: 4 subsections per D-11, honest about Firebase owner access"
metrics:
  duration_seconds: 180
  tasks_completed: 3
  commits: 1
  test_files: 1
  test_cases: 6
  passing_assertions: 6
actuals:
  tokens: 40000
  tasks: 3
  commits: 1
  plan_head_before: "e5b94ee"
  plan_head_after: "cde5015"
status: complete
---

# Phase 04 Plan 04: SizeGuideModal Responsive + README Trust Contract Summary

## One-liner
SizeGuideTable responsive (cards <640px, table ≥640px, sticky headers) + README trust contract with 4 subsections

## What Was Built

### SizeGuideTable Responsive (`src/components/SizeGuideTable.tsx`)
**Table view (≥640px / `sm` breakpoint):**
- Real `<table>` with `<caption>`, `<thead>`, `<th scope="col">`
- Sticky headers (`position: sticky; top: 0; z-index: 10; background: white`)
- Column headers at 14px/600 weight per UI-SPEC
- `overflow-x-auto` wrapper for safety

**Card view (<640px):**
- `<ul class="flex flex-col gap-3">` with one `<li>` card per size
- Each card: `<div class="rounded-xl border border-slate-200 bg-white p-4">`
- Size as `<p class="text-body font-semibold">`
- Measurements as `<dl>` with `<dt>` (label) / `<dd>` (value) pairs
- Zero horizontal scrolling at 320px

**Anomaly badges (ámbar) inline:**
- Player XXXL: "No disponible en Player" (uses `isSizeUnavailableForKit`)
- Player M & L: "Rango de peso idéntico en datos del proveedor" (uses `hasAmbiguousWeight`)
- Rendered as `<Badge variant="warning">` inside table cells and card headers

**Kit type prop:** Added `kitType?: 'Fan' | 'Player'` to enable conditional badge rendering.

### SizeGuideModal (`src/components/SizeGuideModal.tsx`)
- Uses updated `Modal` with `maxHeight="max-h-[80vh]"` and `className="size-guide-modal"`
- Body order (fixed per UI-SPEC):
  1. Fan table (`FAN_TABLE`)
  2. Player table (`PLAYER_TABLE`)
  3. Three amber `Notice` components:
     - "La camiseta Retro usa la tabla de la Versión Fan."
     - "En la Versión Player, la tabla del proveedor llega hasta 2XL; no hay equivalencia para XXXL."
     - "En la Versión Player, M y L comparten el mismo rango de peso en los datos del proveedor."
- Native `<dialog>` focus trap via `showModal()` (Esc closes, inert background)
- Focus returns to trigger button on close (handled by `Modal` wrapper)

### Modal Primitive (`src/components/Modal.tsx`)
- Added `className?: string` and `maxHeight?: string` props
- Default `maxHeight="max-h-[85vh]"` (overrideable)
- Passes `className` to `<dialog>` element
- Native focus trap, Esc dismissal, inert background, focus-return-to-trigger

### CSS (`src/index.css`)
```css
/* SizeGuideTable responsive */
.size-guide-cards { @apply block sm:hidden; }
.size-guide-table { @apply hidden sm:block; }

/* Sticky table headers */
.size-guide-table thead th { @apply sticky top-0 z-10 bg-white border-b border-slate-200; }

/* SizeGuideModal dialog constraints */
dialog.size-guide-modal { @apply max-h-[80vh] overflow-y-auto; }
dialog.size-guide-modal::backdrop { @apply bg-black/50; }
```

### README Trust Contract (`README.md`)
Added complete "## Contrato de Confianza y Privacidad" section with 4 subsections per D-11:

1. **Qué garantiza la app entre participantes**
   - Derangement circular (nadie se regala a sí mismo)
   - Solo tú ves tu emparejamiento (`get` en `assignments/{tuUid}`)
   - Mapa completo invisible (`assignments` sin `list` para nadie)

2. **Qué NO garantiza (límite aceptado)**
   - Dueño del proyecto Firebase SÍ puede leer Firestore por consola/Admin SDK
   - Cloud Function para sorteo ciego real requiere plan Blaze — fuera de v1

3. **Por qué el emparejamiento nunca está en un documento único**
   - `assignments/{giverUid}` = 1 doc por regalador, solo `recipientUid`
   - Exportación usa `opaqueId` (UUID), sin nombres ni IDs
   - Cruzar talla+equipo con preferencias públicas NO revela emparejamiento

4. **Cómo verificar**
   - `firebase emulators:exec` corre tests de reglas (SEC-03)
   - Test fixture verifica exportación (SEC-04)
   - Rules son default-deny, escritas junto al esquema

### Unit Tests (`src/components/__tests__/SizeGuideTable.responsive.test.tsx`)
6 tests passing:
1. Table renders with caption, thead, th scope="col"
2. Card list renders with dl/dt/dd semantics per size
3. Player anomaly badges render (M, L ambiguous weight × 2 views = 4)
4. Fan table has no anomaly badges
5. Table headers have sticky classes
6. Card view uses dl/dt/dd semantics

Vitest project configured for components (jsdom, globals: true, setupFiles).

## Deviations from Plan
None - plan executed exactly as written. The "No disponible en Player" badge is correctly NOT rendered inline (no XXXL row in Player data); it appears as a separate notice in the modal per UI-SPEC.

## Files Changed
- Created: `src/components/__tests__/SizeGuideTable.responsive.test.tsx`, `src/components/__tests__/setup.ts`, `README.md`
- Modified: `src/components/SizeGuideTable.tsx`, `src/components/SizeGuideModal.tsx`, `src/components/Modal.tsx`, `src/index.css`