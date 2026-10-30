/**
 * SecretKit data contract (D-05).
 *
 * The shape of these documents is one-way: `assignments` holds one sealed target
 * per giver and NOTHING anywhere holds the full giver→recipient map (D-07, SEC-01).
 * No type below carries a `giverUid` / `recipientUid` / `recipientName` field.
 *
 * DOCUMENT IDS ARE NORMALIZED NAMES (nameNormalized), not Firebase Auth uids.
 * This allows users to log in from any device/browser using their name + PIN.
 */

export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'

export type KitType = 'Fan' | 'Player' | 'Retro'

export type EventStatus = 'lobby' | 'drawn'

export type Role = 'admin' | 'participant'

export type Participant = {
  /** Document ID is nameNormalized (stable identity). */
  name: string
  nameNormalized: string
  size: Size
  likedTeams: string
  forbiddenTeams: string
  joinedAt: string
  hasOrder: boolean
  /**
   * PBKDF2 hash of the participant's access PIN (`pbkdf2-sha256$iterations$salt$hash`).
   */
  pinHash?: string
}

export type EventDoc = {
  adminSecretValidated: boolean
  status: EventStatus
  createdAt: string
  participantCount: number
}

/**
 * The structured jersey order (quick task 261030). The vendor needs four things
 * per shirt — size, version, printed name/number and patches — plus the photo.
 *
 * These fields describe the SHIRT, never the person ordering it: no field here
 * can identify the giver or the recipient.
 */
export type OrderInput = {
  size: Size
  version: KitType
  /** Nombre impreso en la camiseta (puede ir vacío). */
  printedName: string
  /** Dorsal impreso (puede ir vacío). */
  number: string
  /** Parches; vacío significa «sin parches». */
  patches: string
  team: string
  season: string
  notes: string
  /** URL pública de la foto de referencia, o null si no hay. */
  photoUrl: string | null
}

export type Order = {
  opaqueId: string
  submittedAt: string
  /**
   * Resumen legible generado a partir de los campos estructurados. Se conserva
   * porque el CSV y el TXT anónimo lo usan, y porque los pedidos anteriores a
   * este cambio solo tienen este campo.
   */
  orderText: string
  /** null en pedidos guardados antes del formulario estructurado. */
  size: Size | null
  /** null en pedidos guardados antes del formulario estructurado. */
  version: KitType | null
  printedName: string
  number: string
  patches: string
  team: string
  season: string
  notes: string
  photoUrl: string | null
}

/**
 * Local identity stored in localStorage.
 * Stores nameNormalized (stable) and PIN hash for unlock screen.
 */
export type StoredIdentity = {
  name: string
  nameNormalized: string
  pinHash?: string
}

/**
 * SEC-02 by construction: the export projection has no identity field and no
 * pairing field — it is impossible to leak the giver→recipient relation here.
 *
 * The structured fields were added for the PDF the vendor receives, and they
 * describe the shirt only. `photoUrl` is a random UUID path in a public bucket.
 */
export type ExportedOrder = {
  opaqueId: string
  /** Resumen legible; único campo en pedidos anteriores al formulario. */
  orderText?: string
  size?: Size | null
  version?: KitType | null
  printedName?: string
  number?: string
  patches?: string
  team?: string
  season?: string
  notes?: string
  photoUrl?: string | null
}