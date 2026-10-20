/**
 * D-08 — the circular draw, pure and test-first.
 *
 * Returns giver -> recipient for a SINGLE circular cycle of at least three
 * participants. Construction guarantees, with no rejection sampling:
 *
 *   - bijection: every uid is a key exactly once and a value exactly once
 *   - no fixed points: the recipient is always the NEXT element of the shuffled
 *     order, never the giver itself
 *   - exactly one cycle: chaining i -> i + 1 (mod n) visits all n and returns to
 *     the start
 *   - no mutual pairs: impossible for n >= 3 under a +1 offset, and that is
 *     precisely WHY the minimum is three — at n = 2 the only cycle IS a mutual
 *     pair
 *
 * Forbidden here by D-08: rejection sampling, retry loops, a random comparator
 * passed to a native ordering call, and persisting a seed or a full permutation.
 *
 * The caller runs this OUTSIDE the transaction: a transaction may re-run on
 * conflict, and re-randomising inside one would make the retry
 * non-deterministic and the draw undebuggable.
 *
 * Pure module: no SDK import, no UI-framework import, no I/O.
 */
export function buildDerangement(participantNames: string[]): Map<string, string> {
  const n = participantNames.length
  if (n < 3) throw new Error('Se necesitan al menos 3 participantes para poder sortear')

  // Fisher-Yates over a COPY: the caller's array is never mutated.
  const order = [...participantNames]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  // Offset +1 closes the single cycle by construction.
  const pairs = new Map<string, string>()
  for (let i = 0; i < n; i++) pairs.set(order[i], order[(i + 1) % n])
  return pairs
}