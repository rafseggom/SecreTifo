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
import type { ExportedOrder, Order, OrderInput } from '../domain/types'

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

/**
 * ADMIN-02 — the ONLY enumeration of orders in the project.
 *
 * One read of the order collection, then an EXPLICIT field-by-field projection to the
 * seven exported fields. The projection is written by naming the fields rather than by
 * spreading the document: a spread would drag the send stamp into the export type, and an
 * explicit list is what makes the projection auditable at a glance.
 *
 * Under the shared-password model the server rule grants `list` on this collection to any
 * authenticated member (rules cannot see the UI password), so a participant with devtools
 * can enumerate the orders. The enumeration of the pairing collection remains nobody's:
 * no `list` for anyone and `get` only for the giver.
 *
 * The export type has no participant-identity field and no pairing field, so there is no
 * column to project one into: the privacy guarantee is structural, not a convention.
 */
export async function listOrdersAdmin(): Promise<ExportedOrder[]> {
  const snap = await firestore.getDocs(firestore.collection(db, 'events', 'main', 'orders'))

  return snap.docs.map((document) => {
    const data = document.data() as Order
    return {
      opaqueId: data.opaqueId,
      type: data.type,
      team: data.team,
      season: data.season,
      printedName: data.printedName,
      number: data.number,
      size: data.size,
    }
  })
}

/**
 * ADMIN-LIBERAR-01 — remove a participant from the event (Admin action).
 *
 * Deletes the participant document and decrements participantCount atomically.
 * Only allowed when event status === 'lobby' AND participant has no order (hasOrder === false).
 * Uses a transaction to ensure atomicity.
 */
export const LIBERAR_ERRORS = {
  NOT_IN_LOBBY: 'El sorteo ya se ha realizado: no se pueden liberar participantes.',
  HAS_ORDER: 'Este participante ya ha guardado su pedido y no puede ser liberado.',
  NOT_FOUND: 'El participante no existe.',
  PERMISSION_DENIED: 'No tienes permiso para liberar participantes.',
} as const

export type LiberarErrorCode = (typeof LIBERAR_ERRORS)[keyof typeof LIBERAR_ERRORS]

export async function liberarParticipant(participantUid: string): Promise<void> {
  await firestore.runTransaction(db, async (tx) => {
    const eventRef = firestore.doc(db, 'events/main')
    const participantRef = firestore.doc(db, 'events', 'main', 'participants', participantUid)

    const eventSnap = await tx.get(eventRef)
    if (!eventSnap.exists()) {
      throw new Error(LIBERAR_ERRORS.NOT_FOUND)
    }
    const eventData = eventSnap.data()
    if (eventData.status !== 'lobby') {
      throw new Error(LIBERAR_ERRORS.NOT_IN_LOBBY)
    }

    const participantSnap = await tx.get(participantRef)
    if (!participantSnap.exists()) {
      throw new Error(LIBERAR_ERRORS.NOT_FOUND)
    }
    const participantData = participantSnap.data()
    if (participantData.hasOrder) {
      throw new Error(LIBERAR_ERRORS.HAS_ORDER)
    }

    tx.delete(participantRef)
    tx.update(eventRef, { participantCount: firestore.increment(-1) })
  })
}
