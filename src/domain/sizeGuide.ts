/**
 * D-12 / D-13 — the provider's literal reference data.
 *
 * Every value below is copied character by character from the Constraints
 * section of .planning/PROJECT.md, the source of truth for the size guide. The two
 * source anomalies are the PROVIDER'S and are published literally, never
 * normalised, completed or reordered:
 *
 *   1. Player's largest published row is 2XL, while the join form's size enum
 *      (SIZES) goes up to XXXL. The mismatch is exposed as a predicate
 *      (isSizeUnavailableForKit) so the UI can raise a non-blocking notice.
 *   2. Player M and Player L carry an identical weight range (70-78). Exposed as
 *      a predicate too (hasAmbiguousWeight).
 *
 * Retro has no table of its own: it uses the Fan table, and that is declared
 * explicitly (RETRO_USES_FAN_TABLE) rather than inferred by a consumer.
 *
 * Pure data module: it imports nothing from the Firebase SDK and nothing from
 * a UI framework, and it holds types only from the domain contract.
 */
import type { KitType, Size } from './types'

/** D-11: the size enum offered by the join form, exactly in spec order. */
export const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

/** Versión Fan — equivalencias S=P, M=M, L=G, XL=GG, XXL=XG, XXXL=2XG. */
export const FAN_GUIDE = [
  { size: 'S', equiv: 'P', longCm: '69-71', heightCm: '162-170', weightKg: '50-62' },
  { size: 'M', equiv: 'M', longCm: '71-73', heightCm: '170-176', weightKg: '62-78' },
  { size: 'L', equiv: 'G', longCm: '73-75', heightCm: '176-182', weightKg: '78-83' },
  { size: 'XL', equiv: 'GG', longCm: '75-78', heightCm: '182-190', weightKg: '83-90' },
  { size: 'XXL', equiv: 'XG', longCm: '78-81', heightCm: '190-195', weightKg: '90-97' },
  { size: 'XXXL', equiv: '2XG', longCm: '81-83', heightCm: '192-197', weightKg: '97-104' },
] as const

/**
 * Versión Player — the provider publishes no equivalence letter and stops at
 * 2XL. That maximum is deliberate spec fidelity (anomaly 1), not a typo.
 */
export const PLAYER_GUIDE = [
  { size: 'S', longCm: '67-69', widthCm: '45-48', heightCm: '165-172', weightKg: '60-70' },
  { size: 'M', longCm: '69-71', widthCm: '48-51', heightCm: '172-178', weightKg: '70-78' },
  { size: 'L', longCm: '71-73', widthCm: '51-54', heightCm: '178-184', weightKg: '70-78' },
  { size: 'XL', longCm: '73-75', widthCm: '54-57', heightCm: '184-190', weightKg: '78-86' },
  { size: '2XL', longCm: '75-77', widthCm: '57-60', heightCm: '190-198', weightKg: '94-104' },
] as const

/** D-12: Retro uses the Fan table. Shown as an explicit note, never guessed. */
export const RETRO_USES_FAN_TABLE = true

/** Anomaly 1: the join form offers XXXL, but Player stops at its largest row. */
export function isSizeUnavailableForKit(kit: KitType, size: Size): boolean {
  return kit === 'Player' && size === 'XXXL'
}

/** Anomaly 2: Player M and Player L carry an identical weight range in the spec. */
export function hasAmbiguousWeight(kit: KitType, size: Size): boolean {
  return kit === 'Player' && (size === 'M' || size === 'L')
}
