---
phase: "04"
plan: "02"
subsystem: "domain-export"
tags:
  - "csv-export"
  - "privacy"
  - "fixture-testing"
  - "security"
dependency_graph:
  requires: []
  provides:
    - "export-fixture-test"
    - "csv-escaping-fix"
  affects:
    - "src/domain/exportOrders.ts"
    - "src/domain/__tests__/"
tech_stack:
  added: []
  patterns:
    - "Pure function CSV serialiser (no Firebase/UI deps)"
    - "Inline fixture test with edge cases"
    - "RFC 4180 + comma quoting for es-ES Excel"
key_files:
  created:
    - "src/domain/__tests__/exportOrders.fixture.test.ts"
  modified:
    - "src/domain/exportOrders.ts"
decisions:
  - "Added comma quoting to escapeCsvCell for es-ES Excel compatibility (D-05 item 5)"
  - "Fixture test uses 4 participants covering accents, commas, quotes, zero-padded dorsals, all 3 kit types"
  - "PARTICIPANT_FULL_NAMES used for no-leak verification (not printedName tokens)"
metrics:
  duration_seconds: 120
  tasks_completed: 2
  commits: 1
  test_files: 1
  test_cases: 8
  passing_assertions: 8
actuals:
  tokens: 30000
  tasks: 2
  commits: 1
  plan_head_before: "e5b94ee"
  plan_head_after: "37cfd19"
status: complete
---

# Phase 04 Plan 02: Export Fixture Test (SEC-04) Summary

## One-liner
CSV export fixture test with 4-participant edge cases; comma/quote escaping fixed for es-ES Excel

## What Was Built

### Fixture Test (`src/domain/__tests__/exportOrders.fixture.test.ts`)
8 assertions covering D-04/D-05 requirements with 4 hardcoded participants:
1. **Header exact match**: `ID de pedido;Tipo;Equipo;Temporada;Nombre serigrafiado;Dorsal;Talla\r\n`
2. **No giver identity leak**: Full participant names (José García, María González, etc.) absent from all cells
3. **Zero-padded dorsals preserved**: `09`, `100`, `007` as strings
4. **UTF-8 BOM present**: `\uFEFF` at start
5. **Separator `;` and CRLF `\r\n`**: All line endings CRLF, columns semicolon-separated
6. **Round-trip parse**: Custom parser handles quoted cells with commas/quotes
7. **Comma escaping**: `Atlético, SA` → `"Atlético, SA"` (es-ES Excel)
8. **Quote escaping**: `Barça "Fan"` → `"Barça ""Fan"""` (RFC 4180)

### Export Function Fix (`src/domain/exportOrders.ts`)
Modified `escapeCsvCell` to quote on comma for es-ES Excel compatibility:
```typescript
const mustQuote = safe.includes(SEP) || safe.includes(',') || safe.includes('"') || safe.includes('\r') || safe.includes('\n')
```

### Existing Tests
All 7 existing `exportOrders.test.ts` cases continue to pass (no regression).

## Fixture Data (4 Participants)
| opaqueId | Type | Team | Season | PrintedName | Number | Size |
|----------|------|------|--------|-------------|--------|------|
| opaque-1 | Fan | Real Madrid | 2024 | José | 9 | M |
| opaque-2 | Player | Atlético, SA | 2023 | María | 09 | L |
| opaque-3 | Retro | Barça "Fan" | 2025 | O'Connor | 100 | S |
| opaque-4 | Fan | Valencia CF | 2024 | Juan Pérez | 007 | XXL |

Edge cases covered: accents (José, María, O'Connor, Pérez), comma in team (Atlético, SA), quotes in team (Barça "Fan"), zero-padded dorsals (09, 007), all 3 kit types (Fan/Player/Retro).

## Privacy Guarantee Verified
The export output is **structurally incapable** of revealing giver→recipient pairing:
- No participant identity fields (only `opaqueId`)
- `printedName` contains only recipient's chosen shirt name (first name)
- Full participant names never appear in output
- Cross-referencing size+team with public lobby list yields many matches (not unique)

## Deviations from Plan
None - plan executed exactly as written. The comma quoting addition to `escapeCsvCell` was required by locked decision D-05 item 5.

## Files Changed
- Created: `src/domain/__tests__/exportOrders.fixture.test.ts`
- Modified: `src/domain/exportOrders.ts` (comma quoting)