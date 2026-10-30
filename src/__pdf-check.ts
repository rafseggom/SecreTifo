import { buildOrdersPdf } from './lib/ordersPdf'
import type { ExportedOrder } from './domain/types'

const photoUrl = new URL('/__jersey-sample.jpg', window.location.href).href

const orders: ExportedOrder[] = [
  {
    opaqueId: 'a',
    size: 'XXL',
    version: 'Fan',
    printedName: 'MOLTEN',
    number: '5',
    patches: 'FIFA WORLD CHAMPIONS 2026',
    team: 'Real Madrid',
    season: '25/26',
    notes: 'Manga corta, escudo bordado y nombre en la espalda.',
    photoUrl,
  },
  {
    opaqueId: 'b',
    size: 'M',
    version: 'Retro',
    printedName: 'RAUL',
    number: '7',
    patches: '',
    team: 'Real Madrid',
    season: '1998',
    notes: '',
    photoUrl: null,
  },
]

document.querySelector('#go')?.addEventListener('click', async () => {
  const { blob } = await buildOrdersPdf(orders)
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.src = url
  frame.style.width = '100%'
  frame.style.height = '1050px'
  frame.style.border = '0'
  document.querySelector('#out')?.appendChild(frame)
})
