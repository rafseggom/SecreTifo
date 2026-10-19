/**
 * Global session state (D-23: React Context + hooks, no Redux/Zustand/React Query).
 *
 * `useEffect` on mount:
 *  1. resolves the silent anonymous identity (ensureSignedIn),
 *  2. reads `participants/{uid}` to know whether this uid has already joined,
 *  3. OBSERVES `participants/{uid}` so a join made after that first read is
 *     reflected without a reload (CR-02),
 *  4. subscribes to `events/main` for the live event status.
 *
 * A failed resolution sets `error` (WR-01): the routes must not render, because
 * every route assumes a resolved identity. `retryIdentity()` re-runs the whole
 * resolution and is what the boot error screen's `Reintentar` calls.
 *
 * Every Firestore access goes through `src/lib/lobby.ts`: no `firebase/*` import
 * escapes `src/lib/` (T-01-07, IN-01).
 *
 * EVENT-03 ordering: no Firestore read is issued until `uid !== null`, so no query
 * is ever emitted with `request.auth == null`.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ensureSignedIn, loadIdentity } from '../lib/session'
import { getParticipant, subscribeEvent, subscribeParticipant } from '../lib/lobby'
import type { EventDoc, EventStatus, Role } from '../domain/types'

export type SessionState = {
  loading: boolean
  uid: string | null
  name: string
  role: Role
  hasPreferences: boolean
  eventStatus: EventStatus
  /**
   * WR-01: the identity could not be resolved (sign-in failure or a failed first
   * read). Non-null means NO route may render — the boot error screen owns the UI,
   * because every route assumes a resolved identity.
   */
  error: string | null
}

/** The context value: the state plus the one action that re-runs resolution. */
export type Session = SessionState & {
  /** Re-runs identity resolution from scratch; the boot error's `Reintentar`. */
  retryIdentity: () => void
}

const SessionContext = createContext<Session | null>(null)

const INITIAL_STATE: SessionState = {
  loading: true,
  uid: null,
  name: '',
  role: 'participant',
  hasPreferences: false,
  eventStatus: 'lobby',
  error: null,
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(INITIAL_STATE)
  // Bumping the attempt re-runs resolution from scratch (WR-01's `Reintentar`).
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let unsubscribeEvent: (() => void) | undefined
    let unsubscribeParticipant: (() => void) | undefined

    async function resolveIdentity() {
      try {
        const uid = await ensureSignedIn()
        if (cancelled) return

        // Only now is a Firestore read safe: uid is non-null, so request.auth is set.
        const stored = loadIdentity()
        const participant = await getParticipant(uid)
        if (cancelled) return

        const hasPreferences = participant !== null
        const storedName = stored && stored.uid === uid ? stored.name : ''
        const name = participant ? participant.name : storedName

        setSession((prev) => ({
          ...prev,
          loading: false,
          error: null,
          uid,
          name,
          hasPreferences,
        }))

        // CR-02: the join writes `participants/{uid}` AFTER this effect sampled it, so
        // the one-shot read above is not enough — a participant who just joined would
        // be bounced back to `/preferences` by the route guard. A delete (the collision
        // rollback) must not un-join the session, so only `true` is ever applied.
        unsubscribeParticipant = subscribeParticipant(
          uid,
          (observed) => {
            if (!observed) return
            setSession((prev) =>
              prev.uid === uid
                ? { ...prev, hasPreferences: true, name: observed.name }
                : prev,
            )
          },
          // The one-shot read already established a valid `hasPreferences`; a later
          // subscription failure leaves that last known-good value in place rather
          // than blanking a working session.
        )

        // The event subscription is mounted only after the identity resolved.
        unsubscribeEvent = subscribeEvent((event: EventDoc | null) => {
          setSession((prev) => ({
            ...prev,
            eventStatus: event ? event.status : 'lobby',
            role: event && event.adminUid === uid ? 'admin' : 'participant',
          }))
        })
      } catch (thrown) {
        if (cancelled) return
        // WR-01: bound the spinner AND surface the failure. Clearing `loading` alone
        // left `uid: null`, so the routes rendered and the entry form looked healthy
        // while every attempt silently could not work. The error is a code, never
        // data (no pairing value can reach it).
        const code =
          thrown instanceof Error && 'code' in thrown
            ? String((thrown as { code: unknown }).code)
            : 'unknown'
        setSession((prev) => ({ ...prev, loading: false, uid: null, error: code }))
      }
    }

    void resolveIdentity()

    return () => {
      cancelled = true
      if (unsubscribeParticipant) unsubscribeParticipant()
      if (unsubscribeEvent) unsubscribeEvent()
    }
  }, [attempt])

  const value = useMemo<Session>(
    () => ({
      ...session,
      retryIdentity: () => {
        // A retry starts from a clean, bounded state: spinner up, previous error gone.
        // Reset here, not inside the effect, so the effect only synchronises with an
        // external system (no setState-in-effect cascade) — the FIRST mount already
        // starts from INITIAL_STATE.
        setSession((prev) => ({ ...prev, loading: true, error: null }))
        setAttempt((current) => current + 1)
      },
    }),
    [session],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return ctx
}
