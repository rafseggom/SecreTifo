/**
 * Bootstrap-or-join (D-02, D-09, EVENT-01/02/04).
 *
 * Three steps in a fixed order:
 *  1. duplicate-name pre-check OUTSIDE the transaction (Transaction.get() has no Query
 *     overload — Pitfall 3),
 *  2. transactional bootstrap-or-join, reads before writes,
 *  3. post-commit rollback that closes the TOCTOU window between two friends typing the
 *     same name within the same ~200 ms.
 *
 * Firestore members are reached through a namespace import so the transaction call site
 * is the single, unambiguous one.
 */
import * as firestore from 'firebase/firestore'
import { db } from './firebase'
import { normalizeName } from '../domain/normalizeName'
import type { Role, Size } from '../domain/types'

export type JoinResult = { role: Role }

/**
 * The three error copies the UI renders, exported so the copy shown and the error
 * thrown cannot drift apart (01-UI-SPEC §Copywriting Contract reuses exactly these
 * three literals). `src/pages/EntryPage.tsx` and the preferences form consume them
 * rather than re-spelling them.
 */
export const ERR_NAME_TAKEN = 'Ese nombre ya está en uso en el evento. Prueba con otro.'
export const ERR_NAME_RACE = 'Ese nombre acaba de ser usado por otra persona. Prueba con otro.'
export const ERR_EVENT_CLOSED = 'El sorteo ya se ha realizado: el grupo está cerrado.'

/**
 * The duplicate-name pre-check, shared by S1's form and this file's step 1 so the
 * two can never diverge. It is the step-1 query exactly: one document matching the
 * NORMALISED name, `limit(1)`. The comparison is always on the normalised form —
 * never the original text — and accents are NOT folded (the contract's stated
 * limit). Permitted outside a transaction because the rules allow `list` on
 * participants.
 */
export async function isNameTaken(name: string): Promise<boolean> {
  const dupe = await firestore.getDocs(
    firestore.query(
      firestore.collection(db, 'events', 'main', 'participants'),
      firestore.where('nameNormalized', '==', normalizeName(name)),
      firestore.limit(1),
    ),
  )
  return !dupe.empty
}

export async function joinEvent(
  uid: string,
  name: string,
  prefs: { size: Size; likedTeams: string; forbiddenTeams: string },
): Promise<JoinResult> {
  const nameNormalized = normalizeName(name)

  // ── Step 1: duplicate-name pre-check, OUTSIDE the transaction, through the
  // shared helper. Permitted because the rules allow `list` on participants.
  if (await isNameTaken(name)) {
    throw new Error(ERR_NAME_TAKEN)
  }

  const eventRef = firestore.doc(db, 'events/main')
  const meRef = firestore.doc(db, 'events', 'main', 'participants', uid)

  // ── Step 2: transactional bootstrap-or-join. The transaction re-executes on a
  // concurrency conflict, which is what guarantees that only ONE user writes adminUid
  // (EVENT-02); the loser re-reads the document and joins as a non-Admin participant.
  const role = await firestore.runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef)

    if (eventSnap.exists() && eventSnap.data().status === 'drawn') {
      // D-10: the roster is frozen once the draw has run.
      throw new Error(ERR_EVENT_CLOSED)
    }

    const isFirstUser = !eventSnap.exists()

    if (isFirstUser) {
      // Bootstrap only. `participantCount` is written EXACTLY ONCE, here, and never
      // incremented afterwards (CR-01 + IN-02): `events/main` is Admin-only for
      // every other writer, so a non-Admin joiner must never update it. The lobby
      // derives the count from `participants.length` (LobbyPage), so the counter is
      // schema fidelity only and cannot drift on the collision rollback.
      tx.set(eventRef, {
        adminUid: uid,
        status: 'lobby',
        createdAt: firestore.serverTimestamp(),
        participantCount: 1,
      })
    }
    // Non-Admins write NOTHING to `events/main`: the rule grants `update` to the
    // Admin alone, and the draw is the only other writer (it flips `status`).

    tx.set(meRef, {
      name,
      nameNormalized,
      size: prefs.size,
      // Stored as an empty string when the user types nothing — never null/undefined.
      likedTeams: prefs.likedTeams,
      forbiddenTeams: prefs.forbiddenTeams,
      joinedAt: firestore.serverTimestamp(),
      hasOrder: false,
    })

    return isFirstUser ? 'admin' : 'participant'
  })

  // ── Step 3: close the TOCTOU window. The second committer rolls itself back and is
  // asked for another name — never auto-suffixed, never merged (D-02).
  const after = await firestore.getDocs(
    firestore.query(
      firestore.collection(db, 'events', 'main', 'participants'),
      firestore.where('nameNormalized', '==', nameNormalized),
    ),
  )
  if (after.size > 1) {
    await firestore.deleteDoc(meRef)
    throw new Error(ERR_NAME_RACE)
  }

  return { role }
}
