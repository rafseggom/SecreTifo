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
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { EventDoc, Participant } from '../domain/types'

function toParticipant(snapshot: {
  id: string
  data: () => unknown
}): Participant {
  return { uid: snapshot.id, ...(snapshot.data() as Omit<Participant, 'uid'>) }
}

export function subscribeParticipants(
  cb: (list: Participant[]) => void,
  onFailure?: (code: string) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'events', 'main', 'participants'), orderBy('nameNormalized')),
    (snap) => cb(snap.docs.map(toParticipant)),
    (err) => {
      onFailure?.(err.code)
    },
  )
}

/**
 * One-shot roster read used by the unlock screen. It never subscribes: the list is
 * only needed to label the participant selector, and the PIN check happens against
 * the document read by id.
 */
export async function listParticipants(): Promise<Participant[]> {
  const snap = await getDocs(
    query(collection(db, 'events', 'main', 'participants'), orderBy('nameNormalized')),
  )
  return snap.docs.map(toParticipant)
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

/**
 * One-shot read of `events/main` used during session resolution.
 *
 * Without it the session finished loading before the subscription's first snapshot,
 * so the routes rendered with `eventStatus === null` for a moment and the Admin
 * guards (`/admin`, `/admin/login`) redirected a legitimate Admin home. Reading the
 * event first makes the very first render authoritative; the subscription then keeps
 * it live.
 */
export async function getEvent(): Promise<EventDoc | null> {
  const snap = await getDoc(doc(db, 'events/main'))
  return snap.exists() ? (snap.data() as EventDoc) : null
}

/**
 * Reads ONE participant by document id (01-05 Task 3).
 *
 * Enumeration on this collection IS legal for an authenticated member, but the reveal
 * needs a single, known person — one concrete individual, not a list. A query would be
 * extra work and a subscription would be a connection the screen does not need, so this
 * is the same document-by-id shape as `getMyAssignment`.
 *
 * The two subscriptions above and their error callbacks are untouched: this delta adds
 * no subscription and does not re-define the existing ones (01-04 already wired them).
 */
export async function getParticipant(uid: string): Promise<Participant | null> {
  const snap = await getDoc(doc(db, 'events', 'main', 'participants', uid))
  if (!snap.exists()) return null
  return toParticipant(snap)
}

/**
 * OBSERVES one participant document (CR-02), the subscription counterpart of
 * `getParticipant`. The session needs this because joining writes
 * `participants/{uid}` *after* the session has already sampled it: without a live
 * view, a participant who just joined is bounced back to `/preferences` by the
 * route guard.
 *
 * `cb` receives `null` when the document does not exist — including after a delete,
 * which the collision rollback performs. The caller decides what that means; the
 * session only ever flips `hasPreferences` to `true`.
 *
 * It lives here, not in `SessionProvider`, so no `firebase/*` import escapes
 * `src/lib/` (T-01-07, IN-01): the rules and every call-site stay auditable as one
 * unit.
 */
export function subscribeParticipant(
  uid: string,
  cb: (participant: Participant | null) => void,
  onFailure?: (code: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'events', 'main', 'participants', uid),
    (snap) => cb(snap.exists() ? toParticipant(snap) : null),
    (err) => {
      onFailure?.(err.code)
    },
  )
}
