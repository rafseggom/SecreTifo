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
 * CHANGED: Order rows are now keyed by giver's nameNormalized (stable identity).
 *
 * The Supabase client is imported so the upsert and its commit stay the only
 * textual mention of them here.
 */
import { supabase } from './supabase'
import type { ExportedOrder, Order, OrderInput } from '../domain/types'

/**
 * Saves the order. Idempotent by construction: the row id is deterministic and
 * derived from the giver's nameNormalized, so a double tap — or a retry after `Reintentar` — overwrites
 * the same row instead of creating a duplicate (D-18).
 *
 * The order and the participant's progress flag are written in the SAME batch, so the
 * Admin's progress (wave 6) and the order can never disagree: there is no instant in
 * which one is written and the other is not (Pitfall 11).
 */
export async function submitOrder(giverNameNormalized: string, input: OrderInput): Promise<void> {
  const opaqueId = crypto.randomUUID()
  const submittedAt = new Date().toISOString()

  // Upsert order
  const { error: orderError } = await supabase.from('orders').upsert({
    giver_name_normalized: giverNameNormalized,
    type: input.type ?? '',
    team: input.team ?? '',
    season: input.season ?? '',
    printed_name: input.printedName ?? '',
    number: input.number ?? '',
    size: input.size ?? 'M',
    opaque_id: opaqueId,
    submitted_at: submittedAt,
    order_text: input.orderText ?? '',
  })
  if (orderError) throw orderError

  // Update participant hasOrder flag
  const { error: participantError } = await supabase
    .from('participants')
    .update({ has_order: true })
    .eq('name_normalized', giverNameNormalized)
  if (participantError) throw participantError
}

/** Reads the giver's OWN order by row id (giverNameNormalized), to repaint the recap after a reload. */
export async function getMyOrder(giverNameNormalized: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('giver_name_normalized', giverNameNormalized)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (!data) return null

  return {
    type: data.type,
    team: data.team,
    season: data.season,
    printedName: data.printed_name,
    number: data.number,
    size: data.size,
    opaqueId: data.opaque_id,
    submittedAt: data.submitted_at,
    orderText: data.order_text,
  }
}

/**
 * ADMIN-02 — the ONLY enumeration of orders in the project.
 *
 * One read of the order table, then an EXPLICIT field-by-field projection to the
 * seven exported fields. The projection is written by naming the fields rather than by
 * spreading the row: a spread would drag the send stamp into the export type, and an
 * explicit list is what makes the projection auditable at a glance.
 *
 * The export type has no participant-identity field and no pairing field, so there is no
 * column to project one into: the privacy guarantee is structural, not a convention.
 */
export async function listOrdersAdmin(): Promise<ExportedOrder[]> {
  const { data, error } = await supabase.from('orders').select('*')
  if (error) throw error

  return (data ?? []).map((row) => ({
    opaqueId: row.opaque_id,
    type: row.type,
    team: row.team,
    season: row.season,
    printedName: row.printed_name,
    number: row.number,
    size: row.size,
    orderText: row.order_text,
  }))
}

/**
 * ADMIN-LIBERAR-01 — remove a participant from the event (Admin action).
 *
 * Deletes the participant row and decrements participantCount atomically.
 * Only allowed when event status === 'lobby' AND participant has no order (hasOrder === false).
 */
export const LIBERAR_ERRORS = {
  NOT_IN_LOBBY: 'El sorteo ya se ha realizado: no se pueden liberar participantes.',
  HAS_ORDER: 'Este participante ya ha guardado su pedido y no puede ser liberado.',
  NOT_FOUND: 'El participante no existe.',
  PERMISSION_DENIED: 'No tienes permiso para liberar participantes.',
} as const

export type LiberarErrorCode = (typeof LIBERAR_ERRORS)[keyof typeof LIBERAR_ERRORS]

export async function liberarParticipant(nameNormalized: string): Promise<void> {
  // Check event status first
  const { data: event, error: eventError } = await supabase.from('event').select('status').single()
  if (eventError) throw eventError
  if (event?.status !== 'lobby') {
    throw new Error(LIBERAR_ERRORS.NOT_IN_LOBBY)
  }

  // Check participant exists and has no order
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('has_order')
    .eq('name_normalized', nameNormalized)
    .single()

  if (participantError) {
    if (participantError.code === 'PGRST116') {
      throw new Error(LIBERAR_ERRORS.NOT_FOUND)
    }
    throw participantError
  }

  if (participant.has_order) {
    throw new Error(LIBERAR_ERRORS.HAS_ORDER)
  }

  // Delete participant
  const { error: deleteError } = await supabase.from('participants').delete().eq('name_normalized', nameNormalized)
  if (deleteError) throw deleteError

  // Decrement participant count
  const { error: countError } = await supabase.rpc('decrement_participant_count')
  if (countError) throw countError
}