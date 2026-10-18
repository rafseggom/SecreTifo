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

export async function joinEvent(
  uid: string,
  name: string,
  prefs: { size: Size; likedTeams: string; forbiddenTeams: string },
): Promise<JoinResult> {
  const nameNormalized = normalizeName(name)

  // ── Step 1: duplicate-name pre-check, OUTSIDE the transaction.
  // Permitted because the rules allow `list` on participants.
  const dupe = await firestore.getDocs(
    firestore.query(
      firestore.collection(db, 'events', 'main', 'participants'),
      firestore.where('nameNormalized', '==', nameNormalized),
      firestore.limit(1),
    ),
  )
  if (!dupe.empty) {
    throw new Error('Ese nombre ya está en uso en el evento. Prueba con otro.')
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
      throw new Error('El sorteo ya se ha realizado: el grupo está cerrado.')
    }

    const isFirstUser = !eventSnap.exists()
    const count = isFirstUser ? 0 : (eventSnap.data().participantCount ?? 0)

    if (isFirstUser) {
      tx.set(eventRef, {
        adminUid: uid,
        status: 'lobby',
        createdAt: firestore.serverTimestamp(),
        participantCount: 1,
      })
    } else {
      tx.update(eventRef, { participantCount: count + 1 })
    }

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
    throw new Error('Ese nombre acaba de ser usado por otra persona. Prueba con otro.')
  }

  return { role }
}
