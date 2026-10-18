/**
 * Realtime reads for the lobby (DRAW-01). Ordered by `nameNormalized`, NEVER by the
 * join timestamp: `serverTimestamp()` is null in local snapshots and would mis-sort
 * the just-joined row on that client (Pitfall 10).
 *
 * Both functions return the `onSnapshot` unsubscribe; the optional error callback
 * propagates `err.code` so the UI can apply the S8 error taxonomy (never a bare
 * `console.error` as the only treatment).
 */
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { EventDoc, Participant } from '../domain/types'

export function subscribeParticipants(
  cb: (list: Participant[]) => void,
  onError?: (code: string) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'events', 'main', 'participants'), orderBy('nameNormalized')),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Participant, 'uid'>) }))),
    (err) => {
      onError?.(err.code)
    },
  )
}

export function subscribeEvent(cb: (event: EventDoc | null) => void): () => void {
  return onSnapshot(doc(db, 'events/main'), (snap) =>
    cb(snap.exists() ? (snap.data() as EventDoc) : null),
  )
}
