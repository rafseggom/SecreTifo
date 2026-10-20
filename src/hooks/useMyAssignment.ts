/**
 * ORDER-01 / DRAW-05 — the first hook of the project, and the one that fixes the
 * three-branch return shape that `useOrdersAdmin` will copy in wave 6.
 *
 * It never touches Supabase itself: it calls `getMyAssignment`, the module whose
 * single `select` by row id is the only legal read of the `assignments`
 * table (a query there would fail with `permission-denied` for everyone).
 *
 * The three branches are explicit and never inferred by the caller:
 *  - `loading`  — the read is still in flight,
 *  - `error`    — the read failed; the Supabase code is propagated so the screen can
 *                 pick the S8 copy (never a bare `console.error` as the only treatment),
 *  - `missing`  — the read resolved with no row, the "drawn but nothing readable"
 *                 state of S5. This is a branch of its own with its own copy, not a
 *                 `null` the page has to guess at.
 *
 * This is a one-shot read: no subscription is opened here, because this screen has no
 * realtime push. The effect clears a cancellation flag so an unmount never leaves a
 * `setState` in flight (Pitfall 8).
 *
 * CHANGED: Now uses nameNormalized (stable identity) instead of uid.
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
  nameNormalized: string
  assignment: string | null
  error: string | null
}

export function useMyAssignment(nameNormalized: string | null): UseMyAssignmentResult {
  const [state, setState] = useState<Resolved | null>(null)

  useEffect(() => {
    if (!nameNormalized) return
    let cancelled = false

    void (async () => {
      try {
        const assignment = await getMyAssignment(nameNormalized)
        if (cancelled) return
        setState({ nameNormalized, assignment, error: null })
      } catch (thrown) {
        if (cancelled) return
        const code =
          thrown instanceof Error && 'code' in thrown
            ? String((thrown as { code: unknown }).code)
            : 'unknown'
        setState({ nameNormalized, assignment: null, error: code })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [nameNormalized])

  const resolved = nameNormalized !== null && state !== null && state.nameNormalized === nameNormalized
  const loading = nameNormalized !== null && !resolved
  const error = resolved ? state.error : null
  const assignment = resolved ? state.assignment : null
  const missing = resolved && state.error === null && state.assignment === null

  return { loading, error, assignment, missing }
}