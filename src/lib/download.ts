/**
 * D-21 — the browser download utility for the unified order file.
 *
 * A platform utility, not a domain one: it receives a string and saves it. It declares no
 * imports at all, because it does not compose the file — the pure serialiser does that,
 * and this module never sees the orders.
 *
 * The object URL is created and released around the click. Retaining it would keep the
 * file's content alive in memory for as long as the page lives, which is exactly the
 * resource leak the ADMIN-02 concurrency edge requires be closed. No saving library is
 * used (D-25): the download attribute plus an object URL is universally supported, and
 * adding a dependency would be scope without a purpose.
 *
 * The orders file name is computed in this single place, because two consumers depend on
 * the same calculation — the anchor's download attribute and the screen's success line.
 * Duplicating the date expression in the page would let the announced name and the real
 * file diverge at the day boundary, the one instant where it matters.
 */

/** Saves `csv` as `filename`. One object URL per download, released right after the click. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * The orders file name, `pedidos-{AAAA-MM-DD}.csv`, from the ISO date portion of the
 * given moment. ISO and not a locale format: a locale date would leak an ambiguous
 * ordering into the name the vendedor receives.
 */
export function ordersCsvFilename(date = new Date()): string {
  return `pedidos-${date.toISOString().slice(0, 10)}.csv`
}
