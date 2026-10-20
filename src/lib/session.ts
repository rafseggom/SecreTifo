/**
 * Local identity + Admin secret persistence (no Firebase Auth, no device memory).
 *
 * The participant's stable identity is their nameNormalized, stored in localStorage.
 * The PIN hash is also stored locally for the unlock screen.
 * Admin secret validation is a simple localStorage flag.
 */
import type { StoredIdentity } from '../domain/types'

const IDENTITY_KEY = 'secretkit.identity'
const ADMIN_SECRET_KEY = 'secretkit.adminSecretValidated'

export function loadIdentity(): StoredIdentity | null {
  const raw = localStorage.getItem(IDENTITY_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredIdentity> | null
    if (!parsed || typeof parsed.name !== 'string' || typeof parsed.nameNormalized !== 'string') {
      return null
    }
    const pinHash = typeof parsed.pinHash === 'string' ? parsed.pinHash : undefined
    return { name: parsed.name, nameNormalized: parsed.nameNormalized, ...(pinHash ? { pinHash } : {}) }
  } catch {
    return null
  }
}

export function saveIdentity(identity: StoredIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

export function clearIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY)
  clearUnlocked()
}

const UNLOCK_KEY_STORAGE = 'secretkit.unlockedName'

export function markUnlocked(nameNormalized: string): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY_STORAGE, nameNormalized)
  } catch {
    // Private mode / storage disabled: the in-memory state still unblocks this render.
  }
}

export function isUnlocked(nameNormalized: string): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY_STORAGE) === nameNormalized
  } catch {
    return false
  }
}

export function clearUnlocked(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY_STORAGE)
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

export function isAdminSecretValidated(): boolean {
  return localStorage.getItem(ADMIN_SECRET_KEY) === 'true'
}

export function setAdminSecretValidated(): void {
  localStorage.setItem(ADMIN_SECRET_KEY, 'true')
}

export function clearAdminSecretValidated(): void {
  localStorage.removeItem(ADMIN_SECRET_KEY)
}

/** Clears everything: identity, unlock, admin flag. For logout. */
export function clearAllSession(): void {
  clearIdentity()
  clearAdminSecretValidated()
}