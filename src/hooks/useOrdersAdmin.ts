/**
 * ADMIN-01 — the Admin panel hook, and the second consumer of the three-branch return
 * shape that `useMyAssignment` fixed in wave 5.
 *
 * It opens exactly ONE subscription, and to one thing: the participants of the event. The
 * progress is DERIVED from those documents (`hasOrder`), which are the aggregate the draw
 * and the order write already keep — there is no separate submissions collection and no
 * second subscription (D-19 forbids both). The hook never reads the orders: that is a
 * one-shot action the page fires when the Admin downloads, and it lives in `orders.ts`.
 * Mixing the full order read into the progress indicator would make the panel read every
 * order just to paint a counter.
 *
 * The unsubscribe is returned from the effect's cleanup: without it, leaving the panel
 * would leave the connection alive (Pitfall 8). The Firestore code is propagated as-is, so
 * the page can pick the S8 copy — never a `console.error` as the only treatment.
 *
 * The SDK is reached through the lobby module (namespace import) so this file's single
 * subscription call site stays the only textual mention of it here.
 */
import { useEffect, useState } from 'react'
import * as lobby from '../lib/lobby'
import type { Participant } from '../domain/types'

export type UseOrdersAdminResult = {
  /** True until the first participants snapshot arrives and nothing has failed. */
  loading: boolean
  /** The Firestore code of the failed subscription, or null. */
  error: string | null
  /** How many people have already saved their order. */
  filled: number
  /** How many people are in the event. */
  total: number
  /** The people whose progress flag is not set yet, for the missing list. */
  pending: Participant[]
  /** All participants sorted: pending first (by joinedAt), then completed (by joinedAt). */
  allParticipants: Participant[]
}

export function useOrdersAdmin(): UseOrdersAdminResult {
  const [participants, setParticipants] = useState<Participant[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const unsubscribe = lobby.subscribeParticipants(
      (list) => {
        if (cancelled) return
        // A fresh snapshot means any previous read error is gone.
        setError(null)
        setParticipants(list)
      },
      (code) => {
        if (cancelled) return
        setError(code)
      },
    )

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const list = participants ?? []
  const filled = list.filter((person) => person.hasOrder).length
  const total = list.length
  const pending = list.filter((person) => !person.hasOrder)

  // Sort: pending first (by joinedAt), then completed (by joinedAt)
  const allParticipants = [
    ...pending.sort((a, b) => {
      const aTime = a.joinedAt && typeof a.joinedAt === 'object' && 'toMillis' in a.joinedAt ? (a.joinedAt as { toMillis: () => number }).toMillis() : 0
      const bTime = b.joinedAt && typeof b.joinedAt === 'object' && 'toMillis' in b.joinedAt ? (b.joinedAt as { toMillis: () => number }).toMillis() : 0
      return aTime - bTime
    }),
    ...list.filter((person) => person.hasOrder).sort((a, b) => {
      const aTime = a.joinedAt && typeof a.joinedAt === 'object' && 'toMillis' in a.joinedAt ? (a.joinedAt as { toMillis: () => number }).toMillis() : 0
      const bTime = b.joinedAt && typeof b.joinedAt === 'object' && 'toMillis' in b.joinedAt ? (b.joinedAt as { toMillis: () => number }).toMillis() : 0
      return aTime - bTime
    }),
  ]

  return { loading: participants === null && error === null, error, filled, total, pending, allParticipants }
}
