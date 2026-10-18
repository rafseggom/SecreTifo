/**
 * Global session state (D-23: React Context + hooks, no Redux/Zustand/React Query).
 *
 * `useEffect` on mount:
 *  1. resolves the silent anonymous identity (ensureSignedIn),
 *  2. reads `participants/{uid}` to know whether this uid has already joined,
 *  3. subscribes to `events/main` for the live event status.
 *
 * EVENT-03 ordering: no Firestore read is issued until `uid !== null`, so no query
 * is ever emitted with `request.auth == null`.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { ensureSignedIn, loadIdentity } from '../lib/session'
import { subscribeEvent } from '../lib/lobby'
import type { EventDoc, EventStatus, Role } from '../domain/types'

export type SessionState = {
  loading: boolean
  uid: string | null
  name: string
  role: Role
  hasPreferences: boolean
  eventStatus: EventStatus
}

const SessionContext = createContext<SessionState | null>(null)

const INITIAL_STATE: SessionState = {
  loading: true,
  uid: null,
  name: '',
  role: 'participant',
  hasPreferences: false,
  eventStatus: 'lobby',
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(INITIAL_STATE)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    async function resolveIdentity() {
      try {
        const uid = await ensureSignedIn()
        if (cancelled) return

        // Only now is a Firestore read safe: uid is non-null, so request.auth is set.
        const stored = loadIdentity()
        const participantSnap = await getDoc(doc(db, 'events', 'main', 'participants', uid))
        if (cancelled) return

        const hasPreferences = participantSnap.exists()
        const storedName = stored && stored.uid === uid ? stored.name : ''
        const name = hasPreferences ? (participantSnap.data().name as string) : storedName

        setSession((prev) => ({ ...prev, loading: false, uid, name, hasPreferences }))

        // The event subscription is mounted only after the identity resolved.
        unsubscribe = subscribeEvent((event: EventDoc | null) => {
          setSession((prev) => ({
            ...prev,
            eventStatus: event ? event.status : 'lobby',
            role: event && event.adminUid === uid ? 'admin' : 'participant',
          }))
        })
      } catch {
        if (cancelled) return
        // Bound the spinner: a failed identity resolution must not spin forever.
        setSession((prev) => ({ ...prev, loading: false }))
      }
    }

    void resolveIdentity()

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
  }, [])

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return ctx
}
