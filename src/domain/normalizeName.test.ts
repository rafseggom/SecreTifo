import { describe, it, expect } from 'vitest'
import { normalizeName } from './normalizeName'

/**
 * D-02 / EVENT-04: the normalised name is the event's ONLY uniqueness key and it
 * is compared as plain text, so its contract is what stops two spellings of one
 * person from becoming two participants.
 *
 * Contract: trim the extremes, collapse internal whitespace (`\s+` -> one space)
 * and lowercase.
 *
 * DECLARED LIMIT, not an oversight: accents and diacritics are NOT folded.
 * 'José' and 'Jose' are two distinct keys. Folding them would need a
 * normalize('NFD') plus a strip, which D-02 does not ask for, and applying it now
 * would change the comparison key of every document already written.
 */
describe('normalizeName', () => {
  it('recorta los extremos y baja a minúsculas', () => {
    expect(normalizeName('  Ana  ')).toBe('ana')
  })

  it('colapsa los espacios internos a uno solo', () => {
    expect(normalizeName('Pepe   Pérez')).toBe('pepe pérez')
  })

  it('devuelve cadena vacía para una entrada vacía o de solo espacios', () => {
    expect(normalizeName('')).toBe('')
    expect(normalizeName('   ')).toBe('')
  })

  it('NO pliega acentos: José y Jose son claves distintas (límite declarado)', () => {
    expect(normalizeName('José')).not.toBe(normalizeName('Jose'))
  })
})
