import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildDerangement } from './derangement'

/**
 * D-08 / DRAW-03 / DRAW-04: the draw must be a single circular cycle. These
 * property assertions — bijection, no fixed points, exactly one cycle, and the
 * minimum of three participants — are the real contract of the algorithm; any
 * change that breaks one of them has broken the draw.
 */
const ids = (n: number) => Array.from({ length: n }, (_, i) => 'u' + i)

describe('buildDerangement', () => {
  it('exige al menos tres participantes', () => {
    expect(() => buildDerangement([])).toThrow()
    expect(() => buildDerangement(['a'])).toThrow()
    expect(() => buildDerangement(['a', 'b'])).toThrow()
    expect(() => buildDerangement(['a', 'b'])).toThrow(/al menos 3/)
  })

  for (const n of [3, 4, 6, 12]) {
    it('produce un ciclo único, sin puntos fijos y biyectivo para n=' + n, () => {
      const input = ids(n)
      const pairs = buildDerangement(input)

      // Bijection: the same key set and the same value set as the input.
      expect([...pairs.keys()].sort()).toEqual([...input].sort())
      expect([...pairs.values()].sort()).toEqual([...input].sort())

      // Nobody gives to themselves.
      for (const [giver, recipient] of pairs) expect(recipient).not.toBe(giver)

      // Exactly ONE cycle: chaining from any node visits all n and returns home.
      const start = input[0]
      const seen = new Set<string>()
      let cursor = start
      do {
        seen.add(cursor)
        cursor = pairs.get(cursor)!
      } while (cursor !== start)
      expect(seen.size).toBe(n)
    })
  }

  it('no muta el array que recibe el llamante', () => {
    const input = ['a', 'b', 'c', 'd']
    const snapshot = [...input]
    buildDerangement(input)
    expect(input).toEqual(snapshot)
  })

  it('es determinista dado un generador aleatorio fijo', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)

    // The concrete map below is illustrative (Assumption A8): it is confirmed
    // against the implemented Fisher-Yates loop, NOT mandated by the spec. The
    // property assertions above are the contract; this asserts that the same
    // input plus the same generator produce the same cycle and the same write
    // order.
    expect([...buildDerangement(['a', 'b', 'c'])]).toEqual([
      ['b', 'c'],
      ['c', 'a'],
      ['a', 'b'],
    ])
    expect([...buildDerangement(['a', 'b', 'c'])]).toEqual([...buildDerangement(['a', 'b', 'c'])])

    spy.mockRestore()
  })

  afterEach(() => vi.restoreAllMocks())
})
