/**
 * Image decoding and downscaling (quick task 261030).
 *
 * Kept free of Supabase imports so the PDF renderer can reuse it: the module is
 * only about turning an image blob into a bounded JPEG, which is exactly what
 * both the upload path and the PDF path need.
 */

/** Longest edge kept in the stored image; enough to identify a shirt in print. */
export const IMAGE_MAX_EDGE = 1400

/** JPEG quality for the stored image and for the PDF copy. */
export const IMAGE_JPEG_QUALITY = 0.82

export class ImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageError'
  }
}

export type PreparedImage = {
  blob: Blob
  /** `data:image/jpeg;base64,...` ready for jsPDF. */
  dataUrl: string
  width: number
  height: number
}

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new ImageError('No hemos podido leer la imagen. Prueba con un JPG o un PNG.'))
    }
    image.src = objectUrl
  })
}

/**
 * Decodes any accepted image, bounds its longest edge and re-encodes it as JPEG.
 * A white background is painted first so a transparent PNG does not turn black.
 */
export async function prepareImage(blob: Blob): Promise<PreparedImage> {
  const image = await loadImageElement(blob)
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = longestEdge > IMAGE_MAX_EDGE ? IMAGE_MAX_EDGE / longestEdge : 1
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new ImageError('Tu navegador no permite procesar la imagen.')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY)
  const jpeg = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', IMAGE_JPEG_QUALITY)
  })
  if (!jpeg) throw new ImageError('No hemos podido preparar la imagen.')

  return { blob: jpeg, dataUrl, width, height }
}
