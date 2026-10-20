/**
 * D-02 name normalisation.
 *
 * Trim, collapse internal whitespace, lowercase. Collapsing internal spaces is an
 * explicit acceptance requirement, not an extra: "Pepe  Pérez" and "Pepe Pérez"
 * must resolve to the same name (and therefore the same uniqueness check).
 *
 * Pure module: no React import, no Supabase import.
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}