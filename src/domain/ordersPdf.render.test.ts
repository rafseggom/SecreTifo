import { describe, it, expect } from 'vitest'
import { buildOrdersPdf } from '../lib/ordersPdf'
import type { ExportedOrder } from './types'

const order: ExportedOrder = {
  opaqueId: 'opaque-1',
  orderText: 'Fan · Real Madrid · 25/26 · XXL · MOLTEN 5',
  size: 'XXL',
  version: 'Fan',
  printedName: 'MOLTEN',
  number: '5',
  patches: 'FIFA WORLD CHAMPIONS 2026',
  team: 'Real Madrid',
  season: '25/26',
  notes: '',
  photoUrl: null,
}

describe('buildOrdersPdf — render real con jsPDF', () => {
  it('produce un PDF válido, una página por pedido', async () => {
    const { blob, pageCount, missingPhotos } = await buildOrdersPdf([order, order])

    expect(pageCount).toBe(2)
    expect(missingPhotos).toBe(0)
    expect(blob.type).toBe('application/pdf')

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const header = String.fromCharCode(...bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('cuenta como foto ausente una URL que no se puede leer', async () => {
    const { missingPhotos } = await buildOrdersPdf([
      { ...order, photoUrl: 'https://example.invalid/jersey.jpg' },
    ])
    expect(missingPhotos).toBe(1)
  })

  it('rechaza una exportación vacía', async () => {
    await expect(buildOrdersPdf([])).rejects.toThrow('No hay pedidos que exportar.')
  })
})
