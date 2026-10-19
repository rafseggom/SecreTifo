/**
 * IN-03: `ordersCsvFilename` must name the file after the LOCAL calendar date, not the
 * UTC instant. The dates below are constructed with the local-time constructor
 * (`new Date(y, m, d)`) and read back with the local getters, so every assertion is
 * deterministic in any timezone — a version that used `toISOString()` would still be
 * caught on any host whose local day differs from the UTC day at that instant.
 */
import { describe, expect, it } from 'vitest'
import { ordersCsvFilename } from './download'

describe('ordersCsvFilename', () => {
  it('renders the local calendar date, zero-padded', () => {
    expect(ordersCsvFilename(new Date(2026, 0, 5))).toBe('pedidos-2026-01-05.csv')
  })

  it('keeps the local day just after local midnight (the UTC rollover case)', () => {
    // 00:30 local. Anywhere east of UTC this is still the previous UTC day, so a
    // UTC-derived name would say 2026-06-01 while the organiser's calendar says 06-02.
    expect(ordersCsvFilename(new Date(2026, 5, 2, 0, 30))).toBe('pedidos-2026-06-02.csv')
  })

  it('does not double-pad a two-digit month or day', () => {
    expect(ordersCsvFilename(new Date(2026, 10, 30))).toBe('pedidos-2026-11-30.csv')
  })

  it('defaults to the current moment', () => {
    expect(ordersCsvFilename()).toMatch(/^pedidos-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
