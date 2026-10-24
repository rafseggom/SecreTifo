/**
 * PreferencesPage — the two modes of the preferences screen.
 *
 * CREATE: the participant has no row yet (they just registered) → the form creates it.
 * EDIT:   the participant already has preferences → the form is prefilled and updates
 *         the existing row. This is the "poder editar cuando estés logeado" path.
 *
 * The Supabase-backed modules are mocked: the page only has to prove WHICH write it
 * performs and WHAT it shows, not that PostgREST works.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PreferencesPage from '../PreferencesPage'
import { useSession } from '../../session/SessionProvider'
import { joinEvent, updateParticipantPrefs } from '../../lib/joinEvent'
import { loadIdentity } from '../../lib/session'
import type { Participant, Session } from '../../session/SessionProvider'

vi.mock('../../session/SessionProvider', () => ({ useSession: vi.fn() }))
vi.mock('../../lib/joinEvent', () => ({
  joinEvent: vi.fn(),
  updateParticipantPrefs: vi.fn(),
  ERR_NAME_TAKEN: 'Ese nombre ya está en uso en el evento. Prueba con otro.',
  ERR_NAME_RACE: 'Ese nombre acaba de ser usado por otra persona. Prueba con otro.',
  ERR_EVENT_CLOSED: 'El sorteo ya se ha realizado: el grupo está cerrado.',
}))
vi.mock('../../lib/session', () => ({ loadIdentity: vi.fn(), clearIdentity: vi.fn() }))

const PARTICIPANT: Participant = {
  name: 'Ana',
  nameNormalized: 'ana',
  size: 'L',
  likedTeams: 'Real Madrid',
  forbiddenTeams: 'Barça',
  joinedAt: '2026-10-20T10:00:00.000Z',
  hasOrder: false,
}

function mockSession(overrides: Partial<Session> = {}): void {
  vi.mocked(useSession).mockReturnValue({
    loading: false,
    name: PARTICIPANT.name,
    nameNormalized: PARTICIPANT.nameNormalized,
    role: 'participant',
    hasPreferences: true,
    participant: PARTICIPANT,
    eventStatus: 'lobby',
    error: null,
    retryIdentity: vi.fn(),
    ...overrides,
  })
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <PreferencesPage />
    </MemoryRouter>,
  )
}

function sizeSelect(): HTMLSelectElement {
  return screen.getByLabelText(/Tu talla/) as HTMLSelectElement
}

function textField(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement
}

describe('PreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadIdentity).mockReturnValue({
      name: PARTICIPANT.name,
      nameNormalized: PARTICIPANT.nameNormalized,
    })
    mockSession()
  })

  it('prefills the form with the saved preferences when editing', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Editar tus preferencias' })).toBeInTheDocument()
    expect(sizeSelect().value).toBe('L')
    expect(textField('Preferencias').value).toBe('Real Madrid')
    expect(textField('Equipos que NO quieres').value).toBe('Barça')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  it('updates the existing row when the preferences change', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/Tu talla/), 'XL')
    await user.clear(textField('Preferencias'))
    await user.type(textField('Preferencias'), 'Atletico')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(updateParticipantPrefs).toHaveBeenCalledWith('ana', {
        size: 'XL',
        likedTeams: 'Atletico',
        forbiddenTeams: 'Barça',
      })
    })
    expect(joinEvent).not.toHaveBeenCalled()
  })

  it('creates the participant when there are no preferences yet', async () => {
    mockSession({ hasPreferences: false, participant: null })
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Tus preferencias' })).toBeInTheDocument()
    expect(sizeSelect().value).toBe('')

    await user.selectOptions(screen.getByLabelText(/Tu talla/), 'M')
    await user.click(screen.getByRole('button', { name: 'Guardar preferencias' }))

    await waitFor(() => {
      expect(joinEvent).toHaveBeenCalledWith(
        'Ana',
        { size: 'M', likedTeams: '', forbiddenTeams: '', pin: '', pinHash: undefined },
        false,
      )
    })
    expect(updateParticipantPrefs).not.toHaveBeenCalled()
  })

  it('never overwrites what the person is typing when the row changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <MemoryRouter>
        <PreferencesPage />
      </MemoryRouter>,
    )

    const field = await screen.findByLabelText('Preferencias')
    await user.clear(field)
    await user.type(field, 'Atletico')

    // The row changes underneath (a realtime push) — the form must keep the text.
    mockSession({
      participant: { ...PARTICIPANT, likedTeams: 'Real Madrid' },
    })
    rerender(
      <MemoryRouter>
        <PreferencesPage />
      </MemoryRouter>,
    )

    expect(textField('Preferencias').value).toBe('Atletico')
  })
})
