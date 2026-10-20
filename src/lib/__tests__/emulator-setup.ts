/**
 * Firestore Emulator test harness — single connection point for all rules tests.
 *
 * This module is loaded once via vitest.config.ts `setupFiles` and provides:
 *   - `testEnv`: the initialized RulesTestEnvironment (authenticated contexts created per test)
 *   - `clearFirestoreData()`: wipes all collections between tests for isolation
 *   - `createTestApp()`: helper to create a Firebase app bound to the emulator
 *
 * The emulator must be running at localhost:8080 (Firestore) and localhost:9099 (Auth)
 * when tests execute. The CI command `npm run test:rules` starts it via
 * `firebase emulators:exec --only firestore,auth`.
 */
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { getFirestore } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'

type RulesTestEnv = RulesTestEnvironment

let testEnv: RulesTestEnv | null = null
let emulatorApp: ReturnType<typeof initializeApp> | null = null
let emulatorDb: ReturnType<typeof getFirestore> | null = null

/**
 * Initializes the test environment against the running Firestore Emulator.
 * Called once in the global test setup.
 */
export async function initTestEnvironment(): Promise<RulesTestEnv> {
  if (testEnv) return testEnv

  testEnv = await initializeTestEnvironment({
    projectId: 'demo-secretkit',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
    },
  })

  // Create a plain app for direct emulator operations (e.g., seeding events/main)
  const firebaseConfig = {
    apiKey: 'test-api-key',
    authDomain: 'demo-secretkit.firebaseapp.com',
    projectId: 'demo-secretkit',
    storageBucket: 'demo-secretkit.appspot.com',
    appId: '1:1234567890:web:abcdef123456',
  }
  emulatorApp = initializeApp(firebaseConfig, 'test-emulator')
  emulatorDb = getFirestore(emulatorApp)

  return testEnv
}

/**
 * Returns the initialized test environment. Throws if not initialized.
 */
export function getTestEnv(): RulesTestEnv {
  if (!testEnv) {
    throw new Error('Test environment not initialized. Call initTestEnvironment() first.')
  }
  return testEnv
}

/**
 * Returns the emulator Firestore instance for direct writes (e.g., seeding events/main).
 */
export function getEmulatorDb() {
  if (!emulatorDb) {
    throw new Error('Emulator DB not initialized. Call initTestEnvironment() first.')
  }
  return emulatorDb
}

/**
 * Clears all Firestore data between tests for isolation.
 * Uses the RulesTestEnvironment's clearFirestoreData which is the most reliable method.
 */
export async function clearFirestoreData(): Promise<void> {
  const env = getTestEnv()
  await env.clearFirestore()
}

/**
 * Creates an authenticated context for a participant UID.
 * Use this for participant-scoped operations.
 */
export function authContext(uid: string) {
  const env = getTestEnv()
  return env.authenticatedContext(uid)
}

/**
 * Creates an authenticated context for the admin UID.
 */
export function adminContext(adminUid: string) {
  const env = getTestEnv()
  return env.authenticatedContext(adminUid)
}

/**
 * Creates an unauthenticated context (for testing rules that require auth).
 */
export function unauthContext() {
  const env = getTestEnv()
  return env.unauthenticatedContext()
}

/**
 * Seeds the events/main document with the given adminUid and status.
 * Used by tests that need the event document to exist.
 * Call as: seedEventMain(), seedEventMain('lobby'), seedEventMain('drawn'), or seedEventMain('adminuid', 'drawn')
 */
export async function seedEventMain(
  adminUidOrStatus?: string | 'lobby' | 'drawn',
  statusOrUndefined?: 'lobby' | 'drawn'
): Promise<void> {
  const adminUid = (adminUidOrStatus === 'lobby' || adminUidOrStatus === 'drawn' || adminUidOrStatus === undefined)
    ? 'adminuid'
    : adminUidOrStatus
  const status = (adminUidOrStatus === 'lobby' || adminUidOrStatus === 'drawn')
    ? adminUidOrStatus
    : (statusOrUndefined ?? 'lobby')

  const db = getEmulatorDb()
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'events', 'main'), { adminUid, status })
}

/**
 * Seeds a participant document.
 */
export async function seedParticipant(uid: string, data: Record<string, unknown>): Promise<void> {
  const db = getEmulatorDb()
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'participants', uid), data)
}

/**
 * Seeds an assignment document (giverUid -> recipientUid).
 */
export async function seedAssignment(giverUid: string, recipientUid: string): Promise<void> {
  const db = getEmulatorDb()
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'assignments', giverUid), { recipientUid })
}

/**
 * Seeds an order document.
 */
export async function seedOrder(giverUid: string, data: Record<string, unknown>): Promise<void> {
  const db = getEmulatorDb()
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'orders', giverUid), data)
}