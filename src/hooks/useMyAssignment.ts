/**
 * ORDER-01 / DRAW-05 — the first hook of the project, and the one that fixes the
 * three-branch return shape that `useOrdersAdmin` will copy in wave 6.
 *
 * It never touches Firestore itself: it calls `getMyAssignment`, the module whose
 * single `getDoc` by document id is the only legal read of the `assignments`
 * collection (a query there would fail with `permission-denied` for everyone).
 *
 * The three branches are explicit and never inferred by the caller:
 *  - `loading`  — the read is still in flight,
 *  - `error`    — the read failed; the Firestore code is propagated so the screen can
 *                 pick the S8 copy (never a bare `console.error` as the only treatment),
 *  - `missing`  — the read resolved with no document, the "drawn but nothing readable"
 *                 state of S5. This is a branch of its own with its own copy, not a
 *                 `null` the page has to guess at.
 *
 * This is a one-shot read: no subscription is opened here, because this screen has no
 * realtime push. The effect clears a cancellation flag so an unmount never leaves a
 * `setState` in flight (Pitfall 8).
 */
import { useEffect, useState } from 'react'
import { getMyAssignment } from '../lib/assignment'

export type UseMyAssignmentResult = {
  loading: boolean
  error: string | null
  assignment: string | null
  missing: boolean
}

type Resolved = {
  uid: string
  assignment: string | null
  error: string | null
}

export function useMyAssignment(uid: string | null): UseMyAssignmentResult {
  const [state, setState] = useState<Resolved | null>(null)

  useEffect(() => {
    if (!uid) return
    let cancelled = false

    void (async () => {
      try {
        const assignment = await getMyAssignment(uid)
        if (cancelled) return
        setState({ uid, assignment, error: null })
      } catch (thrown) {
        if (cancelled) return
        const code =
          thrown instanceof Error && 'code' in thrown
            ? String((thrown as { code: unknown }).code)
            : 'unknown'
        setState({ uid, assignment: null, error: code })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [uid])

  const resolved = uid !== null && state !== null && state.uid === uid
  const loading = uid !== null && !resolved
  const error = resolved ? state.error : null
  const assignment = resolved ? state.assignment : null
  const missing = resolved && state.error === null && state.assignment === null

  return { loading, error, assignment, missing }
}
