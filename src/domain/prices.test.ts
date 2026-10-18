import { describe, it, expect } from 'vitest'
import { PRICES, formatPrice } from './prices'

/**
 * D-13 / D-17 / ORDER-03: the three reference prices are literal spec data from
 * `.planning/PROJECT.md` §Constraints. `formatPrice` is the single place that
 * renders them, so the UI can never compose a price of its own.
 */
describe('PRICES — precios de referencia literales (D-17, ORDER-03, D-13)', () => {
  it('es exactamente Fan 11, Player 16 y Retro 15', () => {
    expect(PRICES).toEqual({ Fan: 11, Player: 16, Retro: 15 })
  })

  it('formatPrice devuelve el valor con el sufijo del spec', () => {
    expect(formatPrice('Fan')).toBe('11$')
    expect(formatPrice('Player')).toBe('16$')
    expect(formatPrice('Retro')).toBe('15$')
  })

  it('no redondea ni multiplica el precio de referencia', () => {
    expect(Object.values(PRICES)).toEqual([11, 16, 15])
  })
})
