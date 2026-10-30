/**
 * The page model of the vendor PDF (quick task 261030).
 *
 * Pure module: it only turns exported orders into printable labels and values.
 * The actual PDF is rendered in `src/lib/ordersPdf.ts`, so this contract can be
 * tested without a canvas, a browser or jsPDF.
 *
 * The vendor's format is fixed and lives here verbatim:
 *
 *     Size: XXL
 *     Version: Fan
 *     Name: MOLTEN 5
 *     Patches: FIFA WORLD CHAMPIONS 2026
 *
 * Team, Season, Notes and Price follow below — the first four lines must not be
 * reordered or relabelled.
 */
import { formatPrice } from './prices'
import type { ExportedOrder } from './types'

export type OrdersPdfLine = {
  label: string
  value: string
}

export type OrdersPdfPage = {
  lines: OrdersPdfLine[]
  /** Photo of the shirt, or null to render a placeholder box. */
  photoUrl: string | null
  pageNumber: number
  pageCount: number
}

const DASH = '—'
const NO_PATCHES = 'No patches'

function orDash(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? DASH : trimmed
}

/** `MOLTEN 5` from the two structured fields, or whichever one is present. */
export function printedName(order: ExportedOrder): string {
  const name = (order.printedName ?? '').trim()
  const number = (order.number ?? '').trim()
  if (name && number) return `${name} ${number}`
  return name || number || DASH
}

/**
 * A legacy order (saved before the structured form) has no size and no version:
 * it is rendered as its free text instead of a page full of dashes.
 */
function isLegacy(order: ExportedOrder): boolean {
  return !order.size && !order.version
}

function buildLines(order: ExportedOrder): OrdersPdfLine[] {
  if (isLegacy(order)) {
    return [{ label: 'Order', value: orDash(order.orderText) }]
  }

  const lines: OrdersPdfLine[] = [
    { label: 'Size', value: orDash(order.size) },
    { label: 'Version', value: orDash(order.version) },
    { label: 'Name', value: printedName(order) },
    { label: 'Patches', value: order.patches?.trim() || NO_PATCHES },
    { label: 'Team', value: orDash(order.team) },
    { label: 'Season', value: orDash(order.season) },
  ]

  const notes = (order.notes ?? '').trim()
  if (notes) lines.push({ label: 'Notes', value: notes })

  if (order.version) lines.push({ label: 'Price', value: formatPrice(order.version) })

  return lines
}

export function buildOrdersPdfPages(orders: ExportedOrder[]): OrdersPdfPage[] {
  return orders.map((order, index) => ({
    lines: buildLines(order),
    photoUrl: order.photoUrl?.trim() || null,
    pageNumber: index + 1,
    pageCount: orders.length,
  }))
}
