/**
 * Global session state (D-23: React Context + hooks, no Redux/Zustand/React Query).
 *
 * `useEffect` on mount:
 *  1. loads identity from localStorage,
 *  2. reads `participants/{nameNormalized}` to know whether this name has already joined,
 *  3. reads `event/main` once so the first render already knows whether an event
 *     exists and its status (no transient `null` gap),
 *  4. OBSERVES `participants/{nameNormalized}` so a join made after that first read is
 *     reflected without a reload (CR-02),
 *  5. subscribes to `event` for the live event status.
 *
 * A failed resolution sets `error` (WR-01): the routes must not render, because
 * every route assumes a resolved identity. `retryIdentity()` re-runs the whole
 * resolution and is what the boot error screen's `Reintentar` calls.
 *
 * Every Supabase access goes through `src/lib/lobby.ts`: no `@supabase/*` import
 * escapes `src/lib/` (T-01-07, IN-01).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadIdentity } from '../lib/session'
import { getEvent, getParticipant, subscribeEvent, subscribeParticipant } from '../lib/lobby'
import type { EventDoc, EventStatus, Role } from '../domain/types'

export type SessionState = {
  loading: boolean
  name: string
  nameNormalized: string
  role: Role
  hasPreferences: boolean
  /**
   * `null` means there is no `event/main` row yet. `App` uses that to decide
   * whether `/admin/setup` is the only Admin entry point; collapsing "no event"
   * into `'lobby'` made the setup route unreachable.
   */
  eventStatus: EventStatus | null
  /**
   * WR-01: the identity could not be resolved (first read failure).
   * Non-null means NO route may render — the boot error screen owns the UI,
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
  name: '',
  nameNormalized: '',
  role: 'participant',
  hasPreferences: false,
  eventStatus: null,
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
        const stored = loadIdentity()
        if (!stored) {
          // No stored identity - user needs to enter name
          if (cancelled) return
          setSession((prev) => ({ ...prev, loading: false, error: null }))
          return
        }

        // Resolve the event in the same pass. If the session became ready before the
        // subscription's first snapshot, every event-dependent guard would briefly see
        // `eventStatus === null` and redirect (notably the Admin routes).
        const [participant, event] = await Promise.all([
          stored ? getParticipant(stored.nameNormalized) : Promise.resolve(null),
          getEvent(),
        ])
        if (cancelled) return

        const hasPreferences = participant !== null
        const name = participant ? participant.name : stored.name
        const nameNormalized = participant ? participant.nameNormalized : stored.nameNormalized

        setSession((prev) => ({
          ...prev,
          loading: false,
          error: null,
          name,
          nameNormalized,
          hasPreferences,
          // `null` means no event yet, a real state the setup route depends on.
          eventStatus: event ? event.status : null,
          role: event && event.adminSecretValidated ? 'admin' : 'participant',
        }))

        // CR-02: the join writes `participants/{nameNormalized}` AFTER this effect sampled it, so
        // the one-shot read above is not enough — a participant who just joined would
        // be bounced back to `/preferences` by the route guard. A delete (the collision
        // rollback) must not un-join the session, so only `true` is ever applied.
        if (nameNormalized) {
          unsubscribeParticipant = subscribeParticipant(
            nameNormalized,
            (observed) => {
              if (!observed) return
              setSession((prev) =>
                prev.nameNormalized === nameNormalized
                  ? { ...prev, hasPreferences: true, name: observed.name }
                  : prev,
              )
            },
            // The one-shot read already established a valid `hasPreferences`; a later
            // subscription failure leaves that last known-good value in place rather
            // than blanking a working session.
          )
        }

        // The event subscription is mounted only after the identity resolved.
        unsubscribeEvent = subscribeEvent((event: EventDoc | null) => {
          setSession((prev) => ({
            ...prev,
            // `null` is a real state: the event has not been created yet (setup).
            eventStatus: event ? event.status : null,
            role: event && event.adminSecretValidated ? 'admin' : 'participant',
          }))
        })
      } catch (thrown) {
        if (cancelled) return
        // WR-01: bound the spinner AND surface the failure. Clearing `loading` alone
        // left the routes rendering and the entry form looked healthy while every
        // attempt silently could not work. The error is a code, never data.
        const code =
          thrown instanceof Error && 'code' in thrown
            ? String((thrown as { code: unknown }).code)
            : 'unknown'
        setSession((prev) => ({ ...prev, loading: false, error: code }))
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