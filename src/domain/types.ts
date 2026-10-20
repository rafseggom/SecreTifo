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

export type Order = {
  type: KitType
  team: string
  season: string
  printedName: string
  /** D-15: a STRING, so leading zeros survive ("09" stays "09"). */
  number: string
  size: Size
  opaqueId: string
  submittedAt: string
  /** Texto libre del pedido (plantilla rellenada por el usuario) */
  orderText?: string
}

export type OrderInput = {
  type?: KitType
  team?: string
  season?: string
  printedName?: string
  number?: string
  size?: Size
  /** Texto libre del pedido (plantilla rellenada por el usuario) */
  orderText?: string
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
 */
export type ExportedOrder = {
  opaqueId: string
  type: KitType
  team: string
  season: string
  printedName: string
  number: string
  size: Size
  /** Texto libre del pedido (plantilla rellenada por el usuario) */
  orderText?: string
}