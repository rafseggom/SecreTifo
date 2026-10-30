/**
 * D-21 — the browser download utility for the unified order file.
 *
 * A platform utility, not a domain one: it receives a string and saves it. It declares no
 * imports at all, because it does not compose the file — the pure serialiser does that,
 * and this module never sees the orders.
 *
 * The object URL is created and released around the click, and the release is deferred by
 * one task (IN-04): revoking in the SAME task as the click can cancel an in-flight
 * download in engines where the navigation to the blob URL has not been committed yet,
 * while a single-task delay still bounds the leak — what the ADMIN-02 concurrency edge
 * requires be closed is retaining the URL for the page's lifetime. No saving library is
 * used (D-25): the download attribute plus an object URL is universally supported, and
 * adding a dependency would be scope without a purpose.
 *
 * The orders file name is computed in this single place, because two consumers depend on
 * the same calculation — the anchor's download attribute and the screen's success line.
 * Duplicating the date expression in the page would let the announced name and the real
 * file diverge at the day boundary, the one instant where it matters.
 */

/** Saves `blob` as `filename`. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  // IN-04: defer by one task so the browser has committed the navigation to the blob URL;
  // revoking synchronously cancels the download in some engines (notably Firefox/Safari).
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Saves `text` as `filename` with given MIME type. */
export function downloadText(filename: string, text: string, mimeType = 'text/plain;charset=utf-8'): void {
  downloadBlob(filename, new Blob([text], { type: mimeType }))
}

/** Saves `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
  downloadText(filename, csv, 'text/csv;charset=utf-8')
}

/** The LOCAL calendar date as `AAAA-MM-DD`, computed in one place. */
function localDateStamp(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * The orders file name, `pedidos-{AAAA-MM-DD}.csv`, from the LOCAL calendar date.
 */
export function ordersCsvFilename(date = new Date()): string {
  return `pedidos-${localDateStamp(date)}.csv`
}

/** The vendor PDF file name, `pedidos-{AAAA-MM-DD}.pdf`, from the LOCAL calendar date. */
export function ordersPdfFilename(date = new Date()): string {
  return `pedidos-${localDateStamp(date)}.pdf`
}

/**
 * The gift list file name, `regalos-{AAAA-MM-DD}.txt`, from the LOCAL calendar date.
 * Shown only when all participants have submitted their orders.
 */
export function giftsTxtFilename(date = new Date()): string {
  return `regalos-${localDateStamp(date)}.txt`
}