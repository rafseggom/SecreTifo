import { describe, it, expect } from 'vitest'
import { buildOrdersPdfPages, printedName } from './ordersPdf'
import type { ExportedOrder } from './types'

const structured: ExportedOrder = {
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
  photoUrl: 'https://example.test/jerseys/abc.jpg',
}

describe('buildOrdersPdfPages — el formato que pide el vendedor', () => {
  it('pone Size, Version, Name y Patches en ese orden y con esas etiquetas', () => {
    const [page] = buildOrdersPdfPages([structured])
    expect(page.lines.slice(0, 4)).toEqual([
      { label: 'Size', value: 'XXL' },
      { label: 'Version', value: 'Fan' },
      { label: 'Name', value: 'MOLTEN 5' },
      { label: 'Patches', value: 'FIFA WORLD CHAMPIONS 2026' },
    ])
  })

  it('añade equipo, temporada y precio detrás de las cuatro líneas fijas', () => {
    const [page] = buildOrdersPdfPages([structured])
    expect(page.lines).toContainEqual({ label: 'Team', value: 'Real Madrid' })
    expect(page.lines).toContainEqual({ label: 'Season', value: '25/26' })
    expect(page.lines).toContainEqual({ label: 'Price', value: '11$' })
  })

  it('escribe «No patches» cuando el campo está vacío', () => {
    const [page] = buildOrdersPdfPages([{ ...structured, patches: '  ' }])
    expect(page.lines).toContainEqual({ label: 'Patches', value: 'No patches' })
  })

  it('omite Notes cuando no hay y la incluye cuando hay', () => {
    const [without] = buildOrdersPdfPages([structured])
    expect(without.lines.some((line) => line.label === 'Notes')).toBe(false)

    const [withNotes] = buildOrdersPdfPages([{ ...structured, notes: 'Manga corta' }])
    expect(withNotes.lines).toContainEqual({ label: 'Notes', value: 'Manga corta' })
  })

  it('numera las páginas y conserva la foto', () => {
    const pages = buildOrdersPdfPages([
      structured,
      { ...structured, opaqueId: 'opaque-2', photoUrl: null },
    ])
    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({ pageNumber: 1, pageCount: 2 })
    expect(pages[1]).toMatchObject({ pageNumber: 2, pageCount: 2, photoUrl: null })
    expect(pages[0].photoUrl).toBe('https://example.test/jerseys/abc.jpg')
  })
})

describe('pedidos anteriores al formulario estructurado', () => {
  it('se imprimen como su texto libre, sin una página llena de guiones', () => {
    const legacy: ExportedOrder = {
      opaqueId: 'opaque-old',
      orderText: 'Retro Real Madrid 25/26 XXL 7 / Raul',
    }
    const [page] = buildOrdersPdfPages([legacy])
    expect(page.lines).toEqual([
      { label: 'Order', value: 'Retro Real Madrid 25/26 XXL 7 / Raul' },
    ])
  })

  it('usa guiones cuando tampoco hay texto libre', () => {
    const [page] = buildOrdersPdfPages([{ opaqueId: 'opaque-empty' }])
    expect(page.lines).toEqual([{ label: 'Order', value: '—' }])
  })
})

describe('printedName — nombre y dorsal', () => {
  it('une los dos campos, o devuelve el que exista', () => {
    expect(printedName({ opaqueId: 'a', printedName: 'MOLTEN', number: '5' })).toBe('MOLTEN 5')
    expect(printedName({ opaqueId: 'a', printedName: 'MOLTEN' })).toBe('MOLTEN')
    expect(printedName({ opaqueId: 'a', number: '5' })).toBe('5')
    expect(printedName({ opaqueId: 'a' })).toBe('—')
  })
})

describe('la exportación sigue siendo ciega (SEC-02)', () => {
  it('el modelo de páginas no tiene ningún campo de identidad ni emparejamiento', () => {
    const [page] = buildOrdersPdfPages([structured])
    const serialised = JSON.stringify(page)
    expect(serialised).not.toContain('giver')
    expect(serialised).not.toContain('recipient')
    expect(Object.keys(page).sort()).toEqual(
      ['lines', 'pageCount', 'pageNumber', 'photoUrl'].sort(),
    )
  })
})
