import { describe, it, expect } from 'vitest'
import {
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  hashPin,
  isValidPin,
  sanitizePin,
  verifyPin,
} from './pin'

/**
 * El PIN es un candado local, no autenticación de servidor: su contrato es
 * (1) solo acepta 4–6 dígitos, (2) nunca guarda el PIN en claro y (3) dos hashes
 * del mismo PIN difieren porque el salt es aleatorio. `verifyPin` debe rechazar
 * cualquier hash corrupto sin lanzar, porque el formulario solo necesita saber
 * que el PIN no vale.
 */
describe('sanitizePin', () => {
  it('deja solo dígitos', () => {
    expect(sanitizePin('12a3-4 5')).toBe('12345')
  })

  it('recorta al máximo permitido', () => {
    expect(sanitizePin('1234567890')).toBe('123456')
    expect(sanitizePin('1234567890')).toHaveLength(PIN_MAX_LENGTH)
  })

  it('devuelve cadena vacía si no hay dígitos', () => {
    expect(sanitizePin('abc')).toBe('')
  })
})

describe('isValidPin', () => {
  it('acepta entre el mínimo y el máximo de dígitos', () => {
    expect(isValidPin('1'.repeat(PIN_MIN_LENGTH))).toBe(true)
    expect(isValidPin('1'.repeat(PIN_MAX_LENGTH))).toBe(true)
  })

  it('rechaza longitudes fuera de rango', () => {
    expect(isValidPin('1'.repeat(PIN_MIN_LENGTH - 1))).toBe(false)
    expect(isValidPin('1'.repeat(PIN_MAX_LENGTH + 1))).toBe(false)
    expect(isValidPin('')).toBe(false)
  })

  it('rechaza caracteres que no son dígitos', () => {
    expect(isValidPin('12a4')).toBe(false)
    expect(isValidPin(' 1234')).toBe(false)
    expect(isValidPin('1234 ')).toBe(false)
  })
})

describe('hashPin + verifyPin', () => {
  it('genera el formato pbkdf2-sha256$iteraciones$salt$hash', async () => {
    const stored = await hashPin('1234')
    const parts = stored.split('$')

    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('pbkdf2-sha256')
    expect(Number.parseInt(parts[1], 10)).toBeGreaterThan(0)
    expect(parts[2]).not.toBe('')
    expect(parts[3]).not.toBe('')
  })

  it('no guarda el PIN en claro', async () => {
    const stored = await hashPin('4321')
    expect(stored).not.toContain('4321')
  })

  it('usa un salt aleatorio: el mismo PIN produce hashes distintos', async () => {
    const [first, second] = await Promise.all([hashPin('1234'), hashPin('1234')])
    expect(first).not.toBe(second)
  })

  it('acepta el PIN correcto', async () => {
    const stored = await hashPin('123456')
    await expect(verifyPin('123456', stored)).resolves.toBe(true)
  })

  it('rechaza un PIN incorrecto', async () => {
    const stored = await hashPin('1234')
    await expect(verifyPin('4321', stored)).resolves.toBe(false)
  })

  it('rechaza sin hash guardado', async () => {
    await expect(verifyPin('1234', undefined)).resolves.toBe(false)
    await expect(verifyPin('1234', '')).resolves.toBe(false)
  })

  it('rechaza un formato desconocido sin lanzar', async () => {
    await expect(verifyPin('1234', 'plain$1234')).resolves.toBe(false)
    await expect(verifyPin('1234', 'bcrypt$1$abc$def')).resolves.toBe(false)
    await expect(verifyPin('1234', 'pbkdf2-sha256$no-numero$abc$def')).resolves.toBe(false)
    await expect(verifyPin('1234', 'pbkdf2-sha256$120000$%%%$%%%')).resolves.toBe(false)
  })

  it('rechaza un PIN con formato inválido antes de tocar el hash', async () => {
    const stored = await hashPin('1234')
    await expect(verifyPin('12', stored)).resolves.toBe(false)
    await expect(verifyPin('abcd', stored)).resolves.toBe(false)
  })

  it('hashPin rechaza un PIN inválido', async () => {
    await expect(hashPin('12')).rejects.toThrow()
    await expect(hashPin('1234567')).rejects.toThrow()
    await expect(hashPin('abcd')).rejects.toThrow()
  })
})
