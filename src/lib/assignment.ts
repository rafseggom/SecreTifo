/**
 * DRAW-05 / D-07 — reading one's own assignment.
 *
 * This is the ONLY module in the project that reads the `assignments` table,
 * and it reads it in exactly one way: a row read by id. It is NEVER a query.
 *
 * The RLS policy for this table grants the read to the giver alone and denies
 * the enumeration to everyone — the Admin included. So a query here is not "less safe":
 * it is broken code that would fail with `permission-denied` for every user. This
 * comment exists so no later executor "optimises" this into a query.
 *
 * CHANGED: Assignment rows are now keyed by giver's nameNormalized (stable identity).
 * The recipient is stored by their nameNormalized as well.
 */
import { supabase } from './supabase'

/**
 * Reads the signed-in giver's own target, by row id (giver's nameNormalized), and nothing else.
 * Returns the recipient's nameNormalized, or `null` when no assignment is readable yet.
 */
export async function getMyAssignment(nameNormalized: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('assignments')
    .select('recipient_name_normalized')
    .eq('giver_name_normalized', nameNormalized)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data.recipient_name_normalized ?? null
}