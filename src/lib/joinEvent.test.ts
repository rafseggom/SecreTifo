import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * CR-01 / IN-02 — the security rules grant `update` on `events/main` to the Admin
 * ALONE, so a non-Admin join must never issue one. The counter write that used to
 * run on every join is what made "only the first participant can ever join" true.
 *
 * The SDK is mocked (there is no emulator in this suite): what is asserted is the
 * call shape of the transaction, which is exactly the property the rules deny.
 */
const mocks = vi.hoisted(() => ({
  tx: {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  },
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  runTransaction: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => ({ path: args.slice(1).join('/') }),
  collection: (...args: unknown[]) => ({ path: args.slice(1).join('/') }),
  query: (ref: unknown) => ref,
  where: () => ({}),
  limit: () => ({}),
  serverTimestamp: () => 'SERVER_TS',
  deleteDoc: (...args: unknown[]) => mocks.deleteDoc(...args),
  getDocs: (...args: unknown[]) => mocks.getDocs(...args),
  runTransaction: (...args: unknown[]) => mocks.runTransaction(...args),
}))

vi.mock('./firebase', () => ({ db: {} }))

import { ERR_EVENT_CLOSED, isNameTaken, joinEvent } from './joinEvent'

const PREFS = { size: 'M' as const, likedTeams: '', forbiddenTeams: '' }

beforeEach(() => {
  mocks.tx.get.mockReset()
  mocks.tx.set.mockReset()
  mocks.tx.update.mockReset()
  mocks.getDocs.mockReset()
  mocks.deleteDoc.mockReset()
  mocks.runTransaction.mockReset()
  mocks.runTransaction.mockImplementation(async (_db: unknown, cb: (tx: unknown) => unknown) =>
    cb(mocks.tx),
  )
})

describe('joinEvent — escritura de events/main (CR-01, IN-02)', () => {
  it('un segundo participante NO escribe events/main (la regla es Admin-only)', async () => {
    // Pre-check: no duplicate. Race check: still no duplicate.
    mocks.getDocs
      .mockResolvedValueOnce({ empty: true, size: 0, docs: [] })
      .mockResolvedValueOnce({ empty: false, size: 1, docs: [{ id: 'uid-b' }] })
    mocks.tx.get.mockResolvedValue({
      exists: () => true,
      data: () => ({ adminUid: 'uid-a', status: 'lobby', participantCount: 1 }),
    })

    const result = await joinEvent('uid-b', 'Bea', PREFS)

    expect(result).toEqual({ role: 'participant' })
    // The exact denial of CR-01: no update at all, and the only write is the joiner's
    // own participant document.
    expect(mocks.tx.update).not.toHaveBeenCalled()
    expect(mocks.tx.set.mock.calls.map((call) => (call[0] as { path: string }).path)).toEqual([
      'events/main/participants/uid-b',
    ])
  })

  it('el primer usuario solo puede crear events/main (nunca actualizarlo)', async () => {
    mocks.getDocs
      .mockResolvedValueOnce({ empty: true, size: 0, docs: [] })
      .mockResolvedValueOnce({ empty: false, size: 1, docs: [{ id: 'uid-a' }] })
    mocks.tx.get.mockResolvedValue({ exists: () => false, data: () => undefined })

    const result = await joinEvent('uid-a', 'Ana', PREFS)

    expect(result).toEqual({ role: 'admin' })
    expect(mocks.tx.update).not.toHaveBeenCalled()
    expect(mocks.tx.set.mock.calls.map((call) => (call[0] as { path: string }).path)).toEqual([
      'events/main',
      'events/main/participants/uid-a',
    ])
    expect(mocks.tx.set.mock.calls[0][1]).toMatchObject({
      adminUid: 'uid-a',
      status: 'lobby',
      participantCount: 1,
    })
  })

  it('rechaza la incorporación cuando el sorteo ya se ha realizado (D-10)', async () => {
    mocks.getDocs.mockResolvedValueOnce({ empty: true, size: 0, docs: [] })
    mocks.tx.get.mockResolvedValue({
      exists: () => true,
      data: () => ({ adminUid: 'uid-a', status: 'drawn', participantCount: 1 }),
    })

    await expect(joinEvent('uid-b', 'Bea', PREFS)).rejects.toThrow(ERR_EVENT_CLOSED)
    expect(mocks.tx.set).not.toHaveBeenCalled()
    expect(mocks.tx.update).not.toHaveBeenCalled()
  })
})

describe('isNameTaken — la propia identidad no bloquea (CR-02)', () => {
  it('ignora el documento del propio uid y solo denuncia a otro', async () => {
    mocks.getDocs.mockResolvedValue({ empty: false, size: 1, docs: [{ id: 'uid-a' }] })

    expect(await isNameTaken('Ana', 'uid-a')).toBe(false)
    expect(await isNameTaken('Ana', 'uid-b')).toBe(true)
  })

  it('sin excluir a nadie sigue denunciando cualquier coincidencia (S1)', async () => {
    mocks.getDocs.mockResolvedValue({ empty: false, size: 1, docs: [{ id: 'uid-a' }] })

    expect(await isNameTaken('Ana')).toBe(true)
  })
})
