/**
 * The vendor PDF renderer (quick task 261030).
 *
 * `jsPDF` is imported on demand: it is only needed when the Admin presses the
 * download button, so the participants' bundle does not pay for it.
 *
 * Layout: one A4 page per order, photo centred at the top and the label/value
 * block underneath. Every image is a failure-tolerant step — an unreachable or
 * CORS-blocked photo draws a placeholder and is counted, so the rest of the PDF
 * is still delivered.
 *
 * The content comes exclusively from `buildOrdersPdfPages`, which is pure and
 * has no identity field: this module can only draw what that model contains.
 */
import { buildOrdersPdfPages, type OrdersPdfPage } from '../domain/ordersPdf'
import { prepareImage } from './image'
import type { ExportedOrder } from '../domain/types'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 15
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const PHOTO_TOP = 20
const PHOTO_MAX_HEIGHT = 155
const PLACEHOLDER_HEIGHT = 90
const PHOTO_GAP = 14
const LABEL_WIDTH = 30
const LINE_HEIGHT = 6.4
const LINE_GAP = 2.2
const MAX_VALUE_LINES = 4

type LoadedPhoto = {
  dataUrl: string
  width: number
  height: number
}

export type OrdersPdfResult = {
  blob: Blob
  pageCount: number
  /** Orders whose photo could not be embedded (drawn as a placeholder instead). */
  missingPhotos: number
}

async function loadPhoto(url: string): Promise<LoadedPhoto | null> {
  try {
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return null
    const prepared = await prepareImage(blob)
    return { dataUrl: prepared.dataUrl, width: prepared.width, height: prepared.height }
  } catch {
    return null
  }
}

type JsPdf = import('jspdf').jsPDF

/** Draws the photo (or its placeholder) and returns the y where the text starts. */
function drawPhoto(pdf: JsPdf, photo: LoadedPhoto | null, hadPhotoUrl: boolean): number {
  if (!photo) {
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(203, 213, 225)
    pdf.roundedRect(MARGIN, PHOTO_TOP, CONTENT_WIDTH, PLACEHOLDER_HEIGHT, 3, 3, 'FD')
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(12)
    pdf.setTextColor(100, 116, 139)
    pdf.text(
      hadPhotoUrl ? 'Photo could not be loaded' : 'No photo',
      PAGE_WIDTH / 2,
      PHOTO_TOP + PLACEHOLDER_HEIGHT / 2,
      { align: 'center', baseline: 'middle' },
    )
    return PHOTO_TOP + PLACEHOLDER_HEIGHT + PHOTO_GAP
  }

  const ratio = photo.width / photo.height
  let width = CONTENT_WIDTH
  let height = width / ratio
  if (height > PHOTO_MAX_HEIGHT) {
    height = PHOTO_MAX_HEIGHT
    width = height * ratio
  }
  const x = (PAGE_WIDTH - width) / 2

  pdf.addImage(photo.dataUrl, 'JPEG', x, PHOTO_TOP, width, height, undefined, 'FAST')
  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.2)
  pdf.rect(x, PHOTO_TOP, width, height)

  return PHOTO_TOP + height + PHOTO_GAP
}

/** Wraps a value and truncates with an ellipsis once it would overflow the page. */
function wrapValue(pdf: JsPdf, value: string, maxWidth: number): string[] {
  const wrapped = pdf.splitTextToSize(value, maxWidth) as string[]
  if (wrapped.length <= MAX_VALUE_LINES) return wrapped
  const kept = wrapped.slice(0, MAX_VALUE_LINES)
  kept[MAX_VALUE_LINES - 1] = `${kept[MAX_VALUE_LINES - 1].replace(/\s+\S*$/, '')}…`
  return kept
}

function drawLines(pdf: JsPdf, page: OrdersPdfPage, startY: number): void {
  let y = startY
  const valueWidth = CONTENT_WIDTH - LABEL_WIDTH
  const valueX = MARGIN + LABEL_WIDTH

  for (const line of page.lines) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    pdf.text(`${line.label}:`, MARGIN, y)

    pdf.setFont('helvetica', 'normal')
    const wrapped = wrapValue(pdf, line.value, valueWidth)
    pdf.text(wrapped, valueX, y)

    y += wrapped.length * LINE_HEIGHT + LINE_GAP
  }
}

function drawFooter(pdf: JsPdf, page: OrdersPdfPage): void {
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(148, 163, 184)
  pdf.text(`${page.pageNumber} / ${page.pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, {
    align: 'center',
  })
}

/** Builds the whole PDF in memory; the caller downloads the blob. */
export async function buildOrdersPdf(orders: ExportedOrder[]): Promise<OrdersPdfResult> {
  if (orders.length === 0) {
    throw new Error('No hay pedidos que exportar.')
  }

  const pages = buildOrdersPdfPages(orders)
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  let missingPhotos = 0

  for (const [index, page] of pages.entries()) {
    if (index > 0) pdf.addPage()

    const photo = page.photoUrl ? await loadPhoto(page.photoUrl) : null
    if (page.photoUrl && !photo) missingPhotos += 1

    const textTop = drawPhoto(pdf, photo, page.photoUrl !== null)
    drawLines(pdf, page, textTop)
    drawFooter(pdf, page)
  }

  const buffer = pdf.output('arraybuffer') as ArrayBuffer
  return {
    blob: new Blob([buffer], { type: 'application/pdf' }),
    pageCount: pages.length,
    missingPhotos,
  }
}
