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
  /**
   * PBKDF2 hash of the participant's access PIN (`pbkdf2-sha256$iterations$salt$hash`).
   *
   * It is optional because participants created before the PIN feature exist, and an
   * old document must keep working. The hash is readable by every signed-in member
   * (the roster is public within the event), so the PIN is a casual access lock —
   * not a replacement for Firebase Authentication.
   */
  pinHash?: string
}

export type EventDoc = {
  adminUid: string
  status: EventStatus
  /** Write-only audit field: no UI reads it. */
  createdAt: unknown
  /**
   * Written ONCE, by the bootstrap `create`, and never incremented (CR-01/IN-02:
   * `events/main` is Admin-only for every later writer, so a non-Admin joiner may
   * not bump it). Never read by the UI either — the lobby counts
   * `participants.length`. Kept for schema fidelity, not for logic.
   */
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
  /**
   * Local copy of the participant's PIN hash. It lets the unlock screen work before
   * the participant document exists (the PIN is chosen on S1, the document is created
   * on S2) and keeps the lock available if the roster read fails.
   */
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
}
