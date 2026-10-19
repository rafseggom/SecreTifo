/**
 * Realtime reads for the lobby (DRAW-01). Ordered by `nameNormalized`, NEVER by the
 * join timestamp: `serverTimestamp()` is null in local snapshots and would mis-sort
 * the just-joined row on that client (Pitfall 10).
 *
 * Both functions return the `onSnapshot` unsubscribe and accept the same optional
 * failure callback. Each propagates the Firestore code so the UI can apply the S8
 * error taxonomy — never a bare `console.error` as the only treatment, and never a
 * silent drop: a `permission-denied` on the event subscription would otherwise leave
 * the app with no session status and nothing on screen explaining it.
 */
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { EventDoc, Participant } from '../domain/types'

export function subscribeParticipants(
  cb: (list: Participant[]) => void,
  onFailure?: (code: string) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'events', 'main', 'participants'), orderBy('nameNormalized')),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Participant, 'uid'>) }))),
    (err) => {
      onFailure?.(err.code)
    },
  )
}

export function subscribeEvent(
  cb: (event: EventDoc | null) => void,
  onFailure?: (code: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'events/main'),
    (snap) => cb(snap.exists() ? (snap.data() as EventDoc) : null),
    (err) => {
      onFailure?.(err.code)
    },
  )
}
