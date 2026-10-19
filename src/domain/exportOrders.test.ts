import { describe, it, expect } from 'vitest'
import { buildOrdersExport, EXPORT_HEADERS, escapeCsvCell } from './exportOrders'
import type { ExportedOrder } from './types'

/**
 * D-20 / SEC-02: expectations are inline literals, never a committed .csv file —
 * this machine has core.autocrlf=true, so a fixture on disk would come back with
 * rewritten line endings and the test would be asserting the checkout, not the
 * serialiser.
 */
const base: ExportedOrder = {
  opaqueId: 'a1b2',
  type: 'Fan',
  team: 'Real Betis',
  season: '2024/25',
  printedName: 'García',
  number: '09',
  size: 'L',
}

describe('buildOrdersExport — el formato del archivo (D-20, D-21)', () => {
  it('empieza por BOM, escribe la cabecera exacta con ; y cierra en CRLF', () => {
    const csv = buildOrdersExport([base])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv.split('\r\n')[0]).toBe('\uFEFF' + EXPORT_HEADERS.join(';'))
    expect(csv.split('\r\n')[0]).toBe(
      '\uFEFF' + 'ID de pedido;Tipo;Equipo;Temporada;Nombre serigrafiado;Dorsal;Talla',
    )
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(EXPORT_HEADERS).toEqual([
      'ID de pedido',
      'Tipo',
      'Equipo',
      'Temporada',
      'Nombre serigrafiado',
      'Dorsal',
      'Talla',
    ])
  })

  it('preserva los dorsales con ceros a la izquierda (D-15)', () => {
    expect(buildOrdersExport([{ ...base, number: '09' }])).toContain(';09;')
    expect(buildOrdersExport([{ ...base, number: '100' }])).toContain(';100;')
  })
})

describe('escapeCsvCell — RFC 4180 (ORDER-02)', () => {
  it('cita una celda que contiene el separador y duplica las comillas internas', () => {
    expect(escapeCsvCell('a;b')).toBe('"a;b"')
    expect(escapeCsvCell('dijo "hola"')).toBe('"dijo ""hola"""')
  })

  it('respeta los acentos y deja intacto un valor normal', () => {
    expect(escapeCsvCell('Peña')).toBe('Peña')
    expect(buildOrdersExport([{ ...base, team: 'Peña;FC' }])).toContain('"Peña;FC"')
  })

  it('neutraliza una celda que empiece por =, +, - o @ (A2)', () => {
    expect(escapeCsvCell('=1+1')).toBe("'=1+1")
    expect(escapeCsvCell('@cmd')).toBe("'@cmd")
    expect(escapeCsvCell('+1')).toBe("'+1")
    expect(escapeCsvCell('-5')).toBe("'-5")
    expect(escapeCsvCell('Real Betis')).toBe('Real Betis')
  })

  it('neutraliza una fórmula tras espacios o caracteres de control (IN-10)', () => {
    // Excel/LibreOffice trim before parsing, so these are live formulas elsewhere.
    expect(escapeCsvCell('  =1+1')).toBe("'  =1+1")
    expect(escapeCsvCell('\t=cmd')).toBe("'\t=cmd")
    // CR/LF carry both the guard prefix and the RFC-4180 quoting.
    expect(escapeCsvCell('\r\n@SUM(A1)')).toBe('"\'\r\n@SUM(A1)"')
    // A leading space before ordinary text is untouched.
    expect(escapeCsvCell(' Real Betis')).toBe(' Real Betis')
  })
})

describe('la exportación es ciega (SEC-02, ORDER-04, D-20)', () => {
  it('tiene siete columnas y ninguna de identidad ni de precio', () => {
    expect(EXPORT_HEADERS).toHaveLength(7)
    const csv = buildOrdersExport([base, { ...base, opaqueId: 'c3d4', type: 'Retro' }])
    expect(csv).not.toContain('giverUid')
    expect(csv).not.toContain('recipientUid')
    expect(csv).not.toContain('Precio')
  })
})
