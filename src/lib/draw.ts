/**
 * The draw (D-07, D-09, DRAW-03/04/05, SEC-01) — the ONLY module in the project that
 * writes the pairing.
 *
 * Two decisions here are load-bearing and cannot be bolted on later without migrating
 * the whole collection:
 *
 *  1. One document per giver. The transaction writes N documents, each holding exactly
 *     one scalar field, and NO document anywhere holds the full giver -> recipient map.
 *     This collection is the sole copy of the pairing, and this granularity is the only
 *     reason the security rules can keep it unreadable: a document is readable only by
 *     the giver it belongs to, and nobody may enumerate the collection.
 *  2. Idempotence lives in the transaction, not in the button. If the event is already
 *     drawn the closure returns WITHOUT writing anything, and the read happens before
 *     any write — so a Firestore re-run on conflict, or a double click, is a no-op and
 *     can never produce a second pairing.
 *
 * The derangement is computed ONCE, OUTSIDE the transaction: a transaction may re-run on
 * a concurrency conflict, and re-randomising inside the closure would make the retry
 * non-deterministic and impossible to reproduce while debugging.
 *
 * Firestore members are reached through a namespace import so the transaction callsite
 * stays the single, unambiguous one.
 */
import * as firestore from 'firebase/firestore'
import { db } from './firebase'
import * as derangement from '../domain/derangement'

export async function runDraw(participantUids: string[]): Promise<void> {
  // The same minimum guard the pure function holds; neither one replaces the other.
  if (participantUids.length < 3) throw new Error('Se necesitan al menos 3 participantes')

  // Pure and outside the transaction (see the header): captured once, before opening it.
  const pairs = derangement.buildDerangement(participantUids)
  const eventRef = firestore.doc(db, 'events/main')

  await firestore.runTransaction(db, async (tx) => {
    // Reads before writes (Firestore requires it, and the early return below depends on it).
    const snap = await tx.get(eventRef)
    if (!snap.exists()) throw new Error('El evento no existe todavía')
    // Idempotence: an already-drawn event writes nothing, so a double click is a no-op.
    if (snap.data().status === 'drawn') return

    for (const [giver, recipient] of pairs) {
      tx.set(firestore.doc(db, 'events', 'main', 'assignments', giver), { recipientUid: recipient })
    }
    tx.update(eventRef, { status: 'drawn' })
  })
}
