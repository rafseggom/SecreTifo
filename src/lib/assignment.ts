/**
 * DRAW-05 / D-07 — reading one's own assignment.
 *
 * This is the ONLY module in the project that reads the `assignments` collection,
 * and it reads it in exactly one way: a document read by id. It is NEVER a query.
 *
 * The security rule for this collection grants the read to the giver alone and denies
 * the enumeration to everyone — the Admin included. So a query here is not "less safe":
 * it is broken code that would fail with `permission-denied` for every user. This
 * comment exists so no later executor "optimises" this into a query.
 *
 * The Firestore SDK is imported as a namespace so the single read is the only textual
 * occurrence of it in the module.
 */
import * as firestore from 'firebase/firestore'
import { db } from './firebase'

/**
 * Reads the signed-in giver's own target, by document id, and nothing else.
 * Returns the recipient's uid, or `null` when no assignment is readable yet.
 */
export async function getMyAssignment(uid: string): Promise<string | null> {
  const snap = await firestore.getDoc(firestore.doc(db, 'events', 'main', 'assignments', uid))
  if (!snap.exists()) return null
  return (snap.data().recipientUid as string | undefined) ?? null
}
