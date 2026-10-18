/**
 * D-17 / ORDER-03 — the three reference prices, literal spec data.
 *
 * PROJECT.md section Constraints fixes them: Fan 11$, Player 16$, Retro 15$.
 * formatPrice is the SINGLE place that renders a price, so no screen can compose
 * or round one of its own.
 *
 * Pure data module: it imports nothing from the Firebase SDK and nothing from a
 * UI framework, and it holds types only from the domain contract.
 */
import type { KitType } from './types'

export const PRICES: Record<KitType, number> = { Fan: 11, Player: 16, Retro: 15 }

/** Concatenation, not an interpolated template: the value plus the spec suffix. */
export function formatPrice(kit: KitType): string {
  return PRICES[kit] + '$'
}
