/**
 * D-20 / SEC-02 — the blind export serialiser.
 *
 * This is the only artefact that leaves the system for a third party (the
 * vendedor), and it is deliberately incapable of carrying the pairing:
 *
 *   - its parameter type (ExportedOrder, defined once in ./types) has NO
 *     participant-identity field and NO pairing field, so the compiler rejects a
 *     leak before any review round;
 *   - it imports nothing from src/lib/ — that is what makes the structural
 *     guarantee real rather than aspirational;
 *   - the header is exactly the seven columns D-20 fixes. Do not "improve" this
 *     by adding a useful column: crossing size plus team with the public lobby
 *     list is precisely how the giver -> recipient relation is reconstructed.
 *
 * Format: UTF-8 with a BOM, ';' as the separator, CRLF as the line ending, and a
 * closing newline so the file ends as a complete line.
 *
 * Pure module: no SDK import, no UI-framework import, no I/O.
 */
import type { ExportedOrder } from './types'

export const EXPORT_HEADERS = [
  'ID de pedido',
  'Tipo',
  'Equipo',
  'Temporada',
  'Nombre serigrafiado',
  'Dorsal',
  'Talla',
] as const

const SEP = ';'
const EOL = '\r\n'
const BOM = '\uFEFF'

/**
 * RFC 4180 quoting, plus a spreadsheet formula-injection guard (Assumption A2).
 *
 * A cell whose first significant character is =, +, - or @ is prefixed so the file
 * cannot execute a formula on the vendedor's machine. IN-10: whitespace and control
 * characters are skipped when locating that first character, because Excel and
 * LibreOffice trim them before parsing — a cell such as `"  =1+1"` or `"\t=cmd"` would
 * otherwise be evaluated. Then the cell is quoted when it contains the separator, a
 * quote, CR or LF, with internal quotes doubled.
 */
const FORMULA_LEAD = new Set(['=', '+', '-', '@'])

/**
 * The first character of `value` that is neither whitespace nor a control character, or
 * `''` when there is none. A scan rather than a control-character regex, so the guard
 * stays free of the `no-control-regex` lint warning.
 */
function firstSignificantChar(value: string): string {
  for (const char of value) {
    if (char.charCodeAt(0) <= 0x1f || /\s/.test(char)) continue
    return char
  }
  return ''
}

export function escapeCsvCell(value: string): string {
  const safe = FORMULA_LEAD.has(firstSignificantChar(value)) ? "'" + value : value
  const mustQuote =
    safe.includes(SEP) || safe.includes('"') || safe.includes('\r') || safe.includes('\n')
  return mustQuote ? '"' + safe.replace(/"/g, '""') + '"' : safe
}

/** BOM + header row + one row per order, joined by CRLF, closed with CRLF. */
export function buildOrdersExport(orders: ExportedOrder[]): string {
  const rows = [
    EXPORT_HEADERS.join(SEP),
    ...orders.map((o) =>
      [o.opaqueId, o.type, o.team, o.season, o.printedName, o.number, o.size]
        .map(escapeCsvCell)
        .join(SEP),
    ),
  ]
  return BOM + rows.join(EOL) + EOL
}
