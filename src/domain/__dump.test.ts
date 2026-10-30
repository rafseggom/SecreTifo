import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { buildOrdersPdf } from '../lib/ordersPdf'
import type { ExportedOrder } from './types'

it('dump sample pdf', async () => {
  const order: ExportedOrder = {
    opaqueId: 'opaque-1',
    size: 'XXL',
    version: 'Fan',
    printedName: 'MOLTEN',
    number: '5',
    patches: 'FIFA WORLD CHAMPIONS 2026',
    team: 'Real Madrid',
    season: '25/26',
    notes: 'Manga corta, escudo bordado y nombre en la espalda.',
    photoUrl: null,
  }
  const { blob } = await buildOrdersPdf([order, { ...order, version: 'Retro', notes: '' }])
  const buffer = Buffer.from(await blob.arrayBuffer())
  writeFileSync('C:/Users/Dekker/AppData/Local/Temp/opencode/sample-pedidos.pdf', buffer)
})
