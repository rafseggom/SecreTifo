/**
 * ORDER-02 / ORDER-04 / ORDER-05 — the order write path.
 *
 * ORDER-04 is STRUCTURAL, not a writing convention: the document is composed of the
 * form's input plus the opaque id and the send stamp, and nothing else. The input
 * type has nowhere to put the giver's or the recipient's identity, and neither does
 * the exported projection — so no later executor can "complete" the document without
 * breaking a type. That absence is what makes the order incapable of revealing the
 * pairing, not an omission to be filled in.
 *
 * The SDK is imported as a namespace so the batch and its commit stay the only
 * textual mention of them here.
 */
import * as firestore from 'firebase/firestore'
import { db } from './firebase'
import type { Order, OrderInput } from '../domain/types'

/**
 * Saves the order. Idempotent by construction: the document id is deterministic and
 * derived from the giver, so a double tap — or a retry after `Reintentar` — overwrites
 * the same document instead of creating a duplicate (D-18).
 *
 * The order and the participant's progress flag are written in the SAME batch, so the
 * Admin's progress (wave 6) and the order can never disagree: there is no instant in
 * which one is written and the other is not (Pitfall 11).
 */
export async function submitOrder(uid: string, input: OrderInput): Promise<void> {
  const batch = firestore.writeBatch(db)

  batch.set(firestore.doc(db, 'events', 'main', 'orders', uid), {
    type: input.type,
    team: input.team,
    season: input.season,
    printedName: input.printedName,
    number: input.number,
    size: input.size,
    opaqueId: crypto.randomUUID(),
    submittedAt: firestore.serverTimestamp(),
  })

  batch.update(firestore.doc(db, 'events', 'main', 'participants', uid), { hasOrder: true })

  await batch.commit()
}

/** Reads the giver's OWN order by document id, to repaint the recap after a reload. */
export async function getMyOrder(uid: string): Promise<Order | null> {
  const snap = await firestore.getDoc(firestore.doc(db, 'events', 'main', 'orders', uid))
  return snap.exists() ? (snap.data() as Order) : null
}
