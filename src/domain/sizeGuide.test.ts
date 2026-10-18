import { describe, it, expect } from 'vitest'
import {
  FAN_GUIDE,
  PLAYER_GUIDE,
  SIZES,
  RETRO_USES_FAN_TABLE,
  hasAmbiguousWeight,
  isSizeUnavailableForKit,
} from './sizeGuide'

/**
 * D-13 / PREF-04: these expectations are the literal spec values from
 * `.planning/PROJECT.md` §Constraints, copied character by character. Nothing
 * here is derived, rounded or "fixed": a changed, reordered or invented row
 * must break the suite.
 */
describe('FAN_GUIDE — datos literales del spec (D-13, PREF-04)', () => {
  it('tiene exactamente seis filas en el orden S, M, L, XL, XXL, XXXL', () => {
    expect(FAN_GUIDE).toHaveLength(6)
    expect(FAN_GUIDE.map((row) => row.size)).toEqual(['S', 'M', 'L', 'XL', 'XXL', 'XXXL'])
  })

  it('reproduce fila a fila largo, altura, peso y equivalencia del spec', () => {
    expect(FAN_GUIDE).toEqual([
      { size: 'S', equiv: 'P', longCm: '69-71', heightCm: '162-170', weightKg: '50-62' },
      { size: 'M', equiv: 'M', longCm: '71-73', heightCm: '170-176', weightKg: '62-78' },
      { size: 'L', equiv: 'G', longCm: '73-75', heightCm: '176-182', weightKg: '78-83' },
      { size: 'XL', equiv: 'GG', longCm: '75-78', heightCm: '182-190', weightKg: '83-90' },
      { size: 'XXL', equiv: 'XG', longCm: '78-81', heightCm: '190-195', weightKg: '90-97' },
      { size: 'XXXL', equiv: '2XG', longCm: '81-83', heightCm: '192-197', weightKg: '97-104' },
    ])
  })
})

describe('PLAYER_GUIDE — datos literales del spec, anomalía incluida (D-12, D-13)', () => {
  it('tiene exactamente cinco filas y su fila mayor es 2XL, no XXXL', () => {
    expect(PLAYER_GUIDE).toHaveLength(5)
    expect(PLAYER_GUIDE.map((row) => row.size)).toEqual(['S', 'M', 'L', 'XL', '2XL'])
    expect(PLAYER_GUIDE[PLAYER_GUIDE.length - 1].size).toBe('2XL')
  })

  it('reproduce fila a fila largo, ancho, altura y peso del spec', () => {
    expect(PLAYER_GUIDE).toEqual([
      { size: 'S', longCm: '67-69', widthCm: '45-48', heightCm: '165-172', weightKg: '60-70' },
      { size: 'M', longCm: '69-71', widthCm: '48-51', heightCm: '172-178', weightKg: '70-78' },
      { size: 'L', longCm: '71-73', widthCm: '51-54', heightCm: '178-184', weightKg: '70-78' },
      { size: 'XL', longCm: '73-75', widthCm: '54-57', heightCm: '184-190', weightKg: '78-86' },
      { size: '2XL', longCm: '75-77', widthCm: '57-60', heightCm: '190-198', weightKg: '94-104' },
    ])
    // Anomalía del proveedor: Player M y Player L comparten rango de peso (70-78).
    // Es literal y deliberada; el test la fija para que nadie la "corrija".
    expect(PLAYER_GUIDE[1].weightKg).toBe(PLAYER_GUIDE[2].weightKg)
  })
})

describe('SIZES y equivalencia de Retro (D-11, D-12)', () => {
  it('SIZES es exactamente S, M, L, XL, XXL, XXXL en ese orden', () => {
    expect(SIZES).toEqual(['S', 'M', 'L', 'XL', 'XXL', 'XXXL'])
  })

  it('Retro usa la tabla Fan, y se declara explícitamente', () => {
    expect(RETRO_USES_FAN_TABLE).toBe(true)
  })
})

describe('predicados de anomalía (D-12, D-16)', () => {
  const KITS = ['Fan', 'Player', 'Retro'] as const
  const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

  it('sólo Player + XXXL es una talla que el tipo no ofrece', () => {
    const flagged = KITS.flatMap((kit) =>
      ALL_SIZES.filter((size) => isSizeUnavailableForKit(kit, size)).map((size) => kit + '/' + size),
    )
    expect(flagged).toEqual(['Player/XXXL'])
  })

  it('sólo Player M y Player L tienen rango de peso ambiguo', () => {
    const flagged = KITS.flatMap((kit) =>
      ALL_SIZES.filter((size) => hasAmbiguousWeight(kit, size)).map((size) => kit + '/' + size),
    )
    expect(flagged).toEqual(['Player/M', 'Player/L'])
  })
})
