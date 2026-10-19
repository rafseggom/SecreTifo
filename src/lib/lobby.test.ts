import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * CR-02 / IN-01 — the participant document is OBSERVED, and the observation lives
 * behind the `src/lib/` module boundary (no `firebase/*` import escapes it).
 *
 * The SDK is mocked; what is asserted is the mapping the session depends on: a
 * present document yields the participant, an absent one yields `null` (which the
 * session reads as "not joined yet" and never as "un-joined").
 */
const mocks = vi.hoisted(() => ({
  onSnapshot: vi.fn(),
  doc: vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') })),
  getDoc: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => ({ path: args.slice(1).join('/') }),
  doc: (...args: unknown[]) => mocks.doc(...args),
  getDoc: (...args: unknown[]) => mocks.getDoc(...args),
  onSnapshot: (...args: unknown[]) => mocks.onSnapshot(...args),
  orderBy: () => ({}),
  query: (ref: unknown) => ref,
}))

vi.mock('./firebase', () => ({ db: {} }))

import { getParticipant, subscribeParticipant } from './lobby'

beforeEach(() => {
  mocks.onSnapshot.mockReset()
  mocks.getDoc.mockReset()
})

describe('subscribeParticipant (CR-02)', () => {
  it('lee el documento por id — nunca enumera la colección', () => {
    mocks.onSnapshot.mockReturnValue(() => {})

    const unsubscribe = subscribeParticipant('uid-a', () => {})

    expect(mocks.doc).toHaveBeenCalledWith({}, 'events', 'main', 'participants', 'uid-a')
    expect(typeof unsubscribe).toBe('function')
  })

  it('entrega el participante cuando el documento existe', () => {
    mocks.onSnapshot.mockImplementation(
      (_ref: unknown, next: (snap: unknown) => void) => {
        next({ id: 'uid-a', exists: () => true, data: () => ({ name: 'Ana', hasOrder: false }) })
        return () => {}
      },
    )

    const seen: unknown[] = []
    subscribeParticipant('uid-a', (participant) => seen.push(participant))

    expect(seen).toEqual([{ uid: 'uid-a', name: 'Ana', hasOrder: false }])
  })

  it('entrega null cuando el documento no existe (el sorteo aún no lo ha escrito)', () => {
    mocks.onSnapshot.mockImplementation(
      (_ref: unknown, next: (snap: unknown) => void) => {
        next({ id: 'uid-a', exists: () => false, data: () => undefined })
        return () => {}
      },
    )

    const seen: unknown[] = []
    subscribeParticipant('uid-a', (participant) => seen.push(participant))

    expect(seen).toEqual([null])
  })
})

describe('getParticipant (lectura puntual del arranque)', () => {
  it('devuelve null cuando no existe y el participante cuando existe', async () => {
    mocks.getDoc.mockResolvedValueOnce({ id: 'uid-a', exists: () => false })
    expect(await getParticipant('uid-a')).toBeNull()

    mocks.getDoc.mockResolvedValueOnce({
      id: 'uid-a',
      exists: () => true,
      data: () => ({ name: 'Ana' }),
    })
    expect(await getParticipant('uid-a')).toEqual({ uid: 'uid-a', name: 'Ana' })
  })
})
