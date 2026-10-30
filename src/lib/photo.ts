/**
 * Photo handling for the order form (quick task 261030).
 *
 * The vendor needs to SEE the shirt, so the order carries one reference photo.
 * Two entry points are accepted:
 *
 *   - a local file, which is decoded, downscaled and re-encoded to JPEG in the
 *     browser before it is uploaded — a 6 MB phone photo becomes ~150 KB, which
 *     keeps both the bucket and the generated PDF small;
 *   - an external link, which is downloaded and mirrored into the same bucket so
 *     the PDF does not depend on a third-party host staying alive.
 *
 * If the browser cannot read the external image (CORS), the link is stored as-is
 * and the caller shows a warning: failing loudly here would block an otherwise
 * valid order.
 *
 * The object name is `crypto.randomUUID()`: it never contains the participant's
 * name, so a leaked bucket URL does not reveal who ordered what.
 */
import { supabase } from './supabase'
import { ImageError, prepareImage } from './image'

/** Bucket created by supabase-migration-photos.sql. */
export const PHOTO_BUCKET = 'jerseys'

/** Rejected before decoding: a 40 MB raw photo is never a jersey reference. */
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

export class PhotoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PhotoError'
  }
}

/** True for an absolute http(s) URL; `data:` and `javascript:` are rejected. */
export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function uploadJpeg(jpeg: Blob): Promise<string> {
  const path = `${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, jpeg, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) {
    throw new PhotoError('No hemos podido subir la foto. Inténtalo de nuevo en unos segundos.')
  }
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

async function prepare(blob: Blob): Promise<string> {
  try {
    const prepared = await prepareImage(blob)
    return await uploadJpeg(prepared.blob)
  } catch (thrown) {
    if (thrown instanceof ImageError) throw new PhotoError(thrown.message)
    throw thrown
  }
}

export type PhotoResolution = {
  /** The URL to persist with the order, or null when no photo was given. */
  photoUrl: string | null
  /** A non-blocking warning to show under the field. */
  warning: string | null
}

/**
 * Resolves what the form currently holds into the single URL stored in the row.
 *
 * Precedence: a newly picked file wins over a link; a link currently stored with
 * the order is kept untouched; a new link is mirrored into the bucket.
 */
export async function resolveOrderPhoto(
  file: File | null,
  url: string,
  currentUrl: string | null,
): Promise<PhotoResolution> {
  if (file) {
    if (file.size > PHOTO_MAX_BYTES) {
      throw new PhotoError('La foto pesa demasiado (máximo 8 MB).')
    }
    return { photoUrl: await prepare(file), warning: null }
  }

  const trimmed = url.trim()
  if (!trimmed) return { photoUrl: currentUrl, warning: null }
  if (!isHttpUrl(trimmed)) {
    throw new PhotoError('El enlace de la foto no es válido. Debe empezar por http:// o https://.')
  }
  if (currentUrl && trimmed === currentUrl) return { photoUrl: currentUrl, warning: null }

  try {
    const response = await fetch(trimmed, { mode: 'cors' })
    if (!response.ok) throw new Error(String(response.status))
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) throw new Error('not-an-image')
    return { photoUrl: await prepare(blob), warning: null }
  } catch {
    return {
      photoUrl: trimmed,
      warning:
        'No hemos podido copiar la imagen del enlace. Se guardará tal cual; si el PDF sale sin foto, descárgala y súbela como archivo.',
    }
  }
}
