/**
 * Photo handling for the order form (quick task 261030).
 *
 * The vendor needs to SEE the shirt, so the order carries one reference photo.
 * Only a local file entry point is accepted:
 *
 *   - a local file, which is decoded, downscaled and re-encoded to JPEG in the
 *     browser before it is uploaded — a 6 MB phone photo becomes ~150 KB, which
 *     keeps both the bucket and the generated PDF small.
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
 * Precedence: a newly picked file wins over anything else; if no file is given,
 * the current photo URL is kept untouched.
 */
export async function resolveOrderPhoto(
  file: File | null,
  currentUrl: string | null,
): Promise<PhotoResolution> {
  if (file) {
    if (file.size > PHOTO_MAX_BYTES) {
      throw new PhotoError('La foto pesa demasiado (máximo 8 MB).')
    }
    return { photoUrl: await prepare(file), warning: null }
  }

  // No local file: keep the existing URL as-is (no external URL fetching)
  if (!currentUrl) return { photoUrl: null, warning: null }
  return { photoUrl: currentUrl, warning: null }
}
