/**
 * SecretKit data contract (D-05).
 *
 * The shape of these documents is one-way: `assignments` holds one sealed target
 * per giver and NOTHING anywhere holds the full giver→recipient map (D-07, SEC-01).
 * No type below carries a `giverUid` / `recipientUid` / `recipientName` field.
 */

export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'

export type KitType = 'Fan' | 'Player' | 'Retro'

export type EventStatus = 'lobby' | 'drawn'

export type Role = 'admin' | 'participant'

export type Participant = {
  uid: string
  name: string
  nameNormalized: string
  size: Size
  likedTeams: string
  forbiddenTeams: string
  joinedAt: unknown
  hasOrder: boolean
}

export type EventDoc = {
  adminUid: string
  status: EventStatus
  createdAt: unknown
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
  submittedAt: unknown
}

export type OrderInput = {
  type: KitType
  team: string
  season: string
  printedName: string
  number: string
  size: Size
}

export type StoredIdentity = {
  uid: string
  name: string
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
}
