/**
 * JerseyOrderForm — the structured order (quick task 261030).
 *
 * The Supabase-backed modules are mocked: the test proves which fields the form
 * collects, what it validates and what it hands to `submitOrder`; it does not
 * need PostgREST or Storage.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JerseyOrderForm } from '../JerseyOrderForm'
import { getMyOrder, submitOrder } from '../../lib/orders'
import { resolveOrderPhoto } from '../../lib/photo'
import type { Order } from '../../domain/types'

vi.mock('../../lib/orders', () => ({
  getMyOrder: vi.fn(),
  submitOrder: vi.fn(),
}))

vi.mock('../../lib/photo', () => ({
  PHOTO_ACCEPT: 'image/jpeg,image/png,image/webp,image/avif',
  PHOTO_MAX_BYTES: 8 * 1024 * 1024,
  PhotoError: class PhotoError extends Error {},
  resolveOrderPhoto: vi.fn(),
}))

const savedOrder: Order = {
  opaqueId: 'opaque-1',
  submittedAt: '2026-10-30T10:00:00.000Z',
  orderText: 'Fan · Real Madrid · 25/26 · XXL · MOLTEN 5 · Sin parches',
  size: 'XXL',
  version: 'Fan',
  printedName: 'MOLTEN',
  number: '5',
  patches: '',
  team: 'Real Madrid',
  season: '25/26',
  notes: '',
  photoUrl: undefined,
}

function renderForm(defaultSize?: Order['size']) {
  return render(
    <JerseyOrderForm giverNameNormalized="ana" defaultSize={defaultSize ?? undefined} />,
  )
}

beforeEach(() => {
  vi.mocked(getMyOrder).mockResolvedValue(null)
  vi.mocked(resolveOrderPhoto).mockResolvedValue({ photoUrl: null, warning: null })
  vi.mocked(submitOrder).mockResolvedValue({
    ...savedOrder,
    photoUrl: undefined,
    orderText: undefined,
  })
})

describe('JerseyOrderForm — formulario estructurado', () => {
  it('recoge talla, versión, nombre, dorsal, equipo, temporada, parches y notas', async () => {
    const user = userEvent.setup()
    renderForm('XXL')

    await user.selectOptions(await screen.findByLabelText(/^Versión/), 'Fan')
    await user.type(screen.getByLabelText(/^Nombre en la camiseta/), 'MOLTEN')
    await user.type(screen.getByLabelText(/^Dorsal/), '5')
    await user.type(screen.getByLabelText(/^Equipo/), 'Real Madrid')
    await user.type(screen.getByLabelText(/^Temporada/), '25/26')
    await user.type(screen.getByLabelText(/^Parches/), 'FIFA WORLD CHAMPIONS 2026')
    await user.type(screen.getByLabelText(/^Notas para el vendedor/), 'Manga corta')
    await user.click(screen.getByRole('button', { name: 'Guardar pedido' }))

    await waitFor(() => expect(submitOrder).toHaveBeenCalledTimes(1))
    // photoUrl es null ya que no hay archivo seleccionado (solo archivos locales)
    expect(submitOrder).toHaveBeenCalledWith('ana', expect.objectContaining({
      size: 'XXL',
      version: 'Fan',
      printedName: 'MOLTEN',
      number: '5',
      patches: 'FIFA WORLD CHAMPIONS 2026',
      team: 'Real Madrid',
      season: '25/26',
      notes: 'Manga corta',
    }))
  })

  it('prerrellena la talla con la del destinatario', async () => {
    const user = userEvent.setup()
    renderForm('L')

    await waitFor(() => expect(screen.getByLabelText(/^Talla/)).toHaveValue('L'))
    await user.selectOptions(screen.getByLabelText(/^Versión/), 'Retro')
    await user.click(screen.getByRole('button', { name: 'Guardar pedido' }))

    await waitFor(() =>
      expect(submitOrder).toHaveBeenCalledWith('ana', expect.objectContaining({ size: 'L', version: 'Retro' })),
    )
  })

  it('exige talla y versión antes de guardar', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(await screen.findByRole('button', { name: 'Guardar pedido' }))

    expect(await screen.findAllByText('Este campo es obligatorio.')).toHaveLength(2)
    expect(submitOrder).not.toHaveBeenCalled()
  })

  it('muestra el pedido guardado con su foto y sus datos', async () => {
    vi.mocked(getMyOrder).mockResolvedValue({
      ...savedOrder,
      photoUrl: 'https://example.test/jerseys/abc.jpg',
    })
    renderForm()

    expect(await screen.findByRole('img', { name: 'Foto de la camiseta pedida' })).toBeInTheDocument()
    expect(screen.getByText('XXL')).toBeInTheDocument()
    expect(screen.getByText('MOLTEN 5')).toBeInTheDocument()
    expect(screen.getByText('Sin parches')).toBeInTheDocument()
  })

  it('avisa de un pedido antiguo y deja migrarlo editándolo', async () => {
    vi.mocked(getMyOrder).mockResolvedValue({
      ...savedOrder,
      size: null,
      version: null,
      orderText: 'Retro Real Madrid 25/26 XXL 7 / Raul',
    })
    const user = userEvent.setup()
    renderForm()

    expect(
      await screen.findByText(/Este pedido se guardó con el formulario antiguo/),
    ).toBeInTheDocument()
    expect(screen.getByText('Retro Real Madrid 25/26 XXL 7 / Raul')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar pedido' }))
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
  })
})
