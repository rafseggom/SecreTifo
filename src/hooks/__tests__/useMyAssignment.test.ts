/**
 * Unit tests for useMyAssignment hook.
 *
 * Tests the loading/error/assignment/missing state machine.
 * Uses vitest with mocked getMyAssignment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock environment and Firebase before importing the hook
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key')
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com')
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project')
vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test.appspot.com')
vi.stubEnv('VITE_FIREBASE_APP_ID', '1:1234567890:web:abcdef')
vi.stubEnv('VITE_ADMIN_SECRET', 'test-admin-secret')

vi.mock('../../lib/firebase', () => ({
  app: {},
  auth: {},
  db: {},
}))

vi.mock('../../lib/assignment', () => ({
  getMyAssignment: vi.fn(),
}))

import { useMyAssignment } from '../useMyAssignment'
import { getMyAssignment } from '../../lib/assignment'

vi.mock('../../lib/assignment')

const mockGetMyAssignment = vi.mocked(getMyAssignment)

describe('useMyAssignment', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns loading=true initially when uid provided', () => {
    mockGetMyAssignment.mockResolvedValue('recipient-uid')

    const { result } = renderHook(() => useMyAssignment('user-uid'))

    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.assignment).toBeNull()
    expect(result.current.missing).toBe(false)
  })

  it('returns loading=false, error=null, assignment=uid when resolved', async () => {
    mockGetMyAssignment.mockResolvedValue('recipient-uid')

    const { result } = renderHook(() => useMyAssignment('user-uid'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.assignment).toBe('recipient-uid')
    expect(result.current.missing).toBe(false)
  })

  it('returns missing=true when assignment doc does not exist', async () => {
    mockGetMyAssignment.mockResolvedValue(null)

    const { result } = renderHook(() => useMyAssignment('user-uid'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.assignment).toBeNull()
    expect(result.current.missing).toBe(true)
  })

  it('returns error code when getMyAssignment throws', async () => {
    const firestoreError = new Error('permission-denied') as Error & { code: string }
    firestoreError.code = 'permission-denied'
    mockGetMyAssignment.mockRejectedValue(firestoreError)

    const { result } = renderHook(() => useMyAssignment('user-uid'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('permission-denied')
    expect(result.current.assignment).toBeNull()
    expect(result.current.missing).toBe(false)
  })

  it('returns error="unknown" when thrown value has no code', async () => {
    mockGetMyAssignment.mockRejectedValue(new Error('generic error'))

    const { result } = renderHook(() => useMyAssignment('user-uid'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('unknown')
  })

  it('returns all null/false when uid is null', () => {
    const { result } = renderHook(() => useMyAssignment(null))

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.assignment).toBeNull()
    expect(result.current.missing).toBe(false)
  })

  it('cleans up on unmount', async () => {
    let resolveFn: (value: string | null) => void
    const promise = new Promise<string | null>((resolve) => {
      resolveFn = resolve
    })
    mockGetMyAssignment.mockReturnValue(promise)

    const { result, unmount } = renderHook(() => useMyAssignment('user-uid'))

    expect(result.current.loading).toBe(true)

    unmount()
    resolveFn!('recipient-uid')

    // Should not throw or update state after unmount
    await promise
  })

  it('ignores stale responses when uid changes', async () => {
    mockGetMyAssignment
      .mockResolvedValueOnce('recipient-1')
      .mockResolvedValueOnce('recipient-2')

    const { result, rerender } = renderHook(
      ({ uid }) => useMyAssignment(uid),
      { initialProps: { uid: 'user-1' } }
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.assignment).toBe('recipient-1')

    rerender({ uid: 'user-2' })

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.assignment).toBe('recipient-2')
  })
})