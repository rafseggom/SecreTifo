/**
 * ORDER-02 / ORDER-04 / ORDER-05 — the order write path.
 *
 * Simplified: only order_text + opaque_id + submitted_at + giver_name_normalized.
 * No structured fields, no CHECK constraints.
 */
import { supabase } from './supabase'
import { buildOrderSummary } from '../domain/exportOrders'
import type { ExportedOrder, KitType, Order, OrderInput, Size } from '../domain/types'

/**
 * The physical shape of a row. Kept in one place so both the "my order" read and
 * the Admin enumeration project it identically, field by field.
 *
 * Legacy rows (written before the structured form) have nulls in every column
 * except the four original ones; the mappers below normalise those nulls.
 */
type OrderRow = {
  opaque_id: string
  submitted_at: string
  order_text: string | null
  size: Size | null
  version: KitType | null
  printed_name: string | null
  number: string | null
  patches: string | null
  team: string | null
  season: string | null
  notes: string | null
  photo_url: string | null
}

function toOrder(row: OrderRow): Order {
  return {
    opaqueId: row.opaque_id,
    submittedAt: row.submitted_at,
    orderText: row.order_text ?? '',
    size: row.size ?? null,
    version: row.version ?? null,
    printedName: row.printed_name ?? '',
    number: row.number ?? '',
    patches: row.patches ?? '',
    team: row.team ?? '',
    season: row.season ?? '',
    notes: row.notes ?? '',
    photoUrl: row.photo_url ?? null,
  }
}

function toExportedOrder(row: OrderRow): ExportedOrder {
  return {
    opaqueId: row.opaque_id,
    orderText: row.order_text ?? '',
    size: row.size ?? null,
    version: row.version ?? null,
    printedName: row.printed_name ?? '',
    number: row.number ?? '',
    patches: row.patches ?? '',
    team: row.team ?? '',
    season: row.season ?? '',
    notes: row.notes ?? '',
    photoUrl: row.photo_url ?? null,
  }
}

/**
 * Saves the order. Idempotent by construction: the row id is deterministic and
 * derived from the giver's nameNormalized.
 *
 * `order_text` is recomputed here from the structured fields with a pure
 * function, so the CSV/TXT and the columns can never disagree.
 */
export async function submitOrder(giverNameNormalized: string, input: OrderInput): Promise<Order> {
  const opaqueId = crypto.randomUUID()
  const submittedAt = new Date().toISOString()
  const orderText = buildOrderSummary(input)

  // Upsert order - structured columns + the legacy summary.
  const { error: orderError } = await supabase.from('orders').upsert({
    giver_name_normalized: giverNameNormalized,
    opaque_id: opaqueId,
    submitted_at: submittedAt,
    order_text: orderText,
    size: input.size,
    version: input.version,
    printed_name: input.printedName,
    number: input.number,
    patches: input.patches,
    team: input.team,
    season: input.season,
    notes: input.notes,
    photo_url: input.photoUrl,
  })
  if (orderError) throw orderError

  // Update participant hasOrder flag
  const { error: participantError } = await supabase
    .from('participants')
    .update({ has_order: true })
    .eq('name_normalized', giverNameNormalized)
  if (participantError) throw participantError

  return { opaqueId, submittedAt, orderText, ...input }
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

  return toOrder(data as OrderRow)
}

/**
 * ADMIN-02 — the ONLY enumeration of orders in the project.
 *
 * One read of the order table, then projection to exported fields.
 * The export type has no participant-identity field and no pairing field.
 */
export async function listOrdersAdmin(): Promise<ExportedOrder[]> {
  const { data, error } = await supabase.from('orders').select('*')
  if (error) throw error

  return (data ?? []).map((row) => toExportedOrder(row as OrderRow))
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