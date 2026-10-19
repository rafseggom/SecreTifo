/**
 * Unit tests for errorCopy utility (S8 taxonomy).
 */
import { describe, it, expect } from 'vitest'
import { errorCopy, downloadErrorCopy } from '../errorCopy'

describe('errorCopy — S8 read taxonomy', () => {
  it('permission-denied → no permission, no retry', () => {
    expect(errorCopy('permission-denied')).toEqual({
      message: 'No tienes permiso para ver esto.',
      canRetry: false,
    })
  })

  it('unavailable → network issue, can retry', () => {
    expect(errorCopy('unavailable')).toEqual({
      message: 'Sin conexión. Vuelve a intentarlo cuando recuperes la red.',
      canRetry: true,
    })
  })

  it('resource-exhausted → quota exceeded, no retry', () => {
    expect(errorCopy('resource-exhausted')).toEqual({
      message: 'Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde.',
      canRetry: false,
    })
  })

  it('unknown code → generic error, can retry', () => {
    expect(errorCopy('unknown-code')).toEqual({
      message: 'Algo ha ido mal.',
      canRetry: true,
    })
  })

  it('empty code → generic error, can retry', () => {
    expect(errorCopy('')).toEqual({
      message: 'Algo ha ido mal.',
      canRetry: true,
    })
  })
})

describe('downloadErrorCopy — S8 write taxonomy', () => {
  it('permission-denied → no permission, no retry', () => {
    expect(downloadErrorCopy('permission-denied')).toEqual({
      message: 'No tienes permiso para ver esto.',
      canRetry: false,
    })
  })

  it('unavailable → network issue during write, can retry', () => {
    expect(downloadErrorCopy('unavailable')).toEqual({
      message: 'Sin conexión. El pedido no se ha guardado.',
      canRetry: true,
    })
  })

  it('resource-exhausted → quota exceeded, no retry', () => {
    expect(downloadErrorCopy('resource-exhausted')).toEqual({
      message: 'Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde.',
      canRetry: false,
    })
  })

  it('unknown code → generic download error, can retry', () => {
    expect(downloadErrorCopy('unknown')).toEqual({
      message: 'No hemos podido generar el archivo.',
      canRetry: true,
    })
  })
})