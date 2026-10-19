/**
 * Silent anonymous identity (D-01, D-03, EVENT-03) plus localStorage persistence.
 *
 * The anonymous `uid` is the identity key held by `participants/{uid}`,
 * `assignments/{giverUid}` and `orders/{giverUid}`; the name lives in the participant
 * document, not in Auth.
 */
import * as firebaseAuth from 'firebase/auth'
import { auth } from './firebase'
import type { StoredIdentity } from '../domain/types'

const IDENTITY_KEY = 'secretkit.identity'

/**
 * Resolves the anonymous identity exactly once per session. Reuses
 * `auth.currentUser` when a session already exists so a reload never re-signs-in
 * (Pitfall 7). A failure surfaces as a readable error instead of a raw code.
 */
export async function ensureSignedIn(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid

  try {
    const { user } = await firebaseAuth.signInAnonymously(auth)
    return user.uid
  } catch (error) {
    const code = (error as { code?: string }).code
    throw new Error(
      code
        ? `No se pudo iniciar la sesión anónima (${code}).`
        : 'No se pudo iniciar la sesión anónima.',
    )
  }
}

export function loadIdentity(): StoredIdentity | null {
  const raw = localStorage.getItem(IDENTITY_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredIdentity> | null
    if (!parsed || typeof parsed.uid !== 'string' || typeof parsed.name !== 'string') {
      return null
    }
    return { uid: parsed.uid, name: parsed.name }
  } catch {
    // A corrupted JSON payload must not break startup — it reads as "no identity".
    return null
  }
}

export function saveIdentity(identity: StoredIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

export function clearIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY)
}

const ADMIN_SECRET_KEY = 'secretkit.adminSecretValidated'

export function isAdminSecretValidated(): boolean {
  return localStorage.getItem(ADMIN_SECRET_KEY) === 'true'
}

export function setAdminSecretValidated(): void {
  localStorage.setItem(ADMIN_SECRET_KEY, 'true')
}

export function clearAdminSecretValidated(): void {
  localStorage.removeItem(ADMIN_SECRET_KEY)
}
