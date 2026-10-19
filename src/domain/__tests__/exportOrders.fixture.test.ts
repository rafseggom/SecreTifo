/**
 * Export Fixture Test (SEC-04) — verifies the CSV export cannot leak the
 * giver→recipient pairing. Uses 4 hardcoded participants with edge cases
 * covering accents, commas, quotes, zero-padded dorsals, and all three kit types.
 *
 * Pure unit test: no Firebase, no emulator. Runs with `vitest run`.
 */
import { describe, it, expect } from 'vitest'
import { buildOrdersExport, EXPORT_HEADERS, escapeCsvCell } from '../exportOrders'
import type { ExportedOrder } from '../types'

const FIXTURE_ORDERS: ExportedOrder[] = [
  { opaqueId: 'opaque-1', type: 'Fan', team: 'Real Madrid', season: '2024', printedName: 'José', number: '9', size: 'M' },
  { opaqueId: 'opaque-2', type: 'Player', team: 'Atlético, SA', season: '2023', printedName: 'María', number: '09', size: 'L' },
  { opaqueId: 'opaque-3', type: 'Retro', team: 'Barça "Fan"', season: '2025', printedName: "O'Connor", number: '100', size: 'S' },
  { opaqueId: 'opaque-4', type: 'Fan', team: 'Valencia CF', season: '2024', printedName: 'Juan Pérez', number: '007', size: 'XXL' },
]

/**
 * Full participant names (giver identities) that must NOT appear in the export.
 * The export only contains the recipient's `printedName` (first name only),
 * not the giver's full name.
 */
const PARTICIPANT_FULL_NAMES = [
  'José García',
  'María González',
  "O'Connor Smith",
  'Juan Pérez González',
]

describe('buildOrdersExport — fixture test (SEC-04, D-04/D-05)', () => {
  it('1. header exact match with ; separator and CRLF', () => {
    const csv = buildOrdersExport(FIXTURE_ORDERS)
    const expectedHeader = '\uFEFF' + EXPORT_HEADERS.join(';') + '\r\n'
    expect(csv.startsWith(expectedHeader)).toBe(true)
  })

  it('2. no participant full names (giver identities) appear in any cell', () => {
    const csv = buildOrdersExport(FIXTURE_ORDERS)
    const lines = csv.split('\r\n')
    // Skip header (index 0) and final empty line (last)
    const dataLines = lines.slice(1, -1)
    for (const line of dataLines) {
      const cells = line.split(';')
      for (const cell of cells) {
        for (const fullName of PARTICIPANT_FULL_NAMES) {
          expect(cell).not.toContain(fullName)
        }
      }
    }
  })

  it('3. dorsals preserve leading zeros as strings', () => {
    const csv = buildOrdersExport(FIXTURE_ORDERS)
    // Row 2 (index 1 in data lines) should have 09
    expect(csv).toContain(';09;')
    // Row 3 should have 100
    expect(csv).toContain(';100;')
    // Row 4 should have 007
    expect(csv).toContain(';007;')
  })

  it('4. UTF-8 BOM present at start of output', () => {
    const csv = buildOrdersExport(FIXTURE_ORDERS)
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
  })

  it('5. separator is ; and line endings are CRLF', () => {
    const csv = buildOrdersExport(FIXTURE_ORDERS)
    // All line endings should be CRLF
    expect(csv.endsWith('\r\n')).toBe(true)
    // No bare LF or CR
    const withoutCRLF = csv.replace(/\r\n/g, '')
    expect(withoutCRLF).not.toContain('\n')
    expect(withoutCRLF).not.toContain('\r')
    // Separators are semicolons
    const dataPart = csv.slice(1).replace(/\r\n/g, '\n') // skip BOM
    const lines = dataPart.split('\n').filter(l => l)
    for (const line of lines) {
      expect(line.split(';').length).toBe(7)
    }
  })

  it('6. round-trip parse returns expected data', () => {
    const csv = buildOrdersExport(FIXTURE_ORDERS)
    // Simple parse: split by CRLF, then by semicolon (handles quoted cells with commas)
    const lines = csv.split('\r\n').filter(l => l)
    const parsedHeaders = lines[0].replace('\uFEFF', '').split(';')
    expect(parsedHeaders).toEqual(EXPORT_HEADERS)

    const parsedRows = lines.slice(1).map(l => {
      // Handle quoted cells: split by ; but respect quotes
      const cells: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < l.length; i++) {
        const char = l[i]
        if (char === '"') {
          if (inQuotes && l[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ';' && !inQuotes) {
          cells.push(current)
          current = ''
        } else {
          current += char
        }
      }
      cells.push(current)
      // Remove surrounding quotes if present
      return cells.map(c => (c.startsWith('"') && c.endsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c))
    })
    expect(parsedRows).toHaveLength(4)

    for (let i = 0; i < 4; i++) {
      const row = parsedRows[i]
      const fixture = FIXTURE_ORDERS[i]
      expect(row[0]).toBe(fixture.opaqueId)
      expect(row[1]).toBe(fixture.type)
      expect(row[2]).toBe(fixture.team)
      expect(row[3]).toBe(fixture.season)
      expect(row[4]).toBe(fixture.printedName)
      expect(row[5]).toBe(fixture.number)
      expect(row[6]).toBe(fixture.size)
    }
  })
})

describe('escapeCsvCell — RFC 4180 + comma/quote escaping (D-05 items 5,6)', () => {
  it('5. comma escaping: Atlético, SA → "Atlético, SA"', () => {
    // D-05 item 5 explicitly requires comma quoting for es-ES Excel compatibility
    expect(escapeCsvCell('Atlético, SA')).toBe('"Atlético, SA"')
  })

  it('6. quote escaping: Barça "Fan" → "Barça ""Fan"""', () => {
    expect(escapeCsvCell('Barça "Fan"')).toBe('"Barça ""Fan"""')
  })
})