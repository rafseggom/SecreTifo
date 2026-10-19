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
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { getFirestore, clearFirestoreData } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'

let testEnv: RulesTestEnvironment | null = null
let emulatorApp: ReturnType<typeof initializeApp> | null = null
let emulatorDb: ReturnType<typeof getFirestore> | null = null

/**
 * Initializes the test environment against the running Firestore Emulator.
 * Called once in the global test setup.
 */
export async function initTestEnvironment(): Promise<RulesTestEnvironment> {
  if (testEnv) return testEnv

  testEnv = await initializeTestEnvironment({
    projectId: 'secretkit-test',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
    },
    auth: {
      host: '127.0.0.1',
      port: 9099,
    },
  })

  // Create a plain app for direct emulator operations (e.g., seeding events/main)
  const firebaseConfig = {
    apiKey: 'test-api-key',
    authDomain: 'secretkit-test.firebaseapp.com',
    projectId: 'secretkit-test',
    storageBucket: 'secretkit-test.appspot.com',
    appId: '1:1234567890:web:abcdef123456',
  }
  emulatorApp = initializeApp(firebaseConfig, 'test-emulator')
  emulatorDb = getFirestore(emulatorApp)

  return testEnv
}

/**
 * Returns the initialized test environment. Throws if not initialized.
 */
export function getTestEnv(): RulesTestEnvironment {
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
  await clearFirestoreData(env.firestore())
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
 */
export async function seedEventMain(adminUid: string, status: 'lobby' | 'drawn' = 'lobby'): Promise<void> {
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