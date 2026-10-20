/**
 * Firestore Emulator test harness — single connection point for all rules tests.
 *
 * This module is loaded once via the rules-test config and provides:
 *   - `testEnv`: the initialized RulesTestEnvironment (authenticated contexts per test)
 *   - `clearFirestoreData()`: wipes all data between tests for isolation
 *   - seed helpers that write through `withSecurityRulesDisabled`
 *
 * The emulator must be running at 127.0.0.1:8080 (Firestore) when tests execute.
 * The CI command `npm run test:rules` starts it via
 * `firebase emulators:exec --only firestore,auth`.
 */
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'

type RulesTestEnv = RulesTestEnvironment

let testEnv: RulesTestEnv | null = null

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
 * Creates an authenticated context for a participant UID acting as the Admin.
 * Kept as a named helper for test readability; authorization is no longer UID-based
 * under the shared-password model.
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
 * Seeds a document with rules disabled. Seeding is a test fixture operation, not
 * something the app can do: the rules would reject most of these writes.
 */
async function seedDoc(path: string[], data: Record<string, unknown>): Promise<void> {
  const env = getTestEnv()
  await env.withSecurityRulesDisabled(async (context) => {
    // `RulesTestContext.firestore()` returns a compat instance; the modular helper
    // types do not overlap cleanly with it, so use the compat `doc().set()` here.
    await context.firestore().doc(path.join('/')).set(data)
  })
}

/**
 * Seeds the events/main document with the given adminUid and status.
 * Used by tests that need the event document to exist.
 * Call as: seedEventMain(), seedEventMain('lobby'), seedEventMain('drawn'), or
 * seedEventMain('adminuid', 'drawn')
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

  await seedDoc(['events', 'main'], { adminUid, status })
}

const DEFAULT_PARTICIPANT = {
  name: 'Test User',
  nameNormalized: 'test user',
  size: 'M',
  likedTeams: '',
  forbiddenTeams: '',
  hasOrder: false,
}

/**
 * Seeds a participant document under events/main/participants.
 */
export async function seedParticipant(
  uid: string,
  data: Record<string, unknown> = DEFAULT_PARTICIPANT
): Promise<void> {
  await seedDoc(['events', 'main', 'participants', uid], data)
}

/**
 * Seeds an assignment document (giverUid -> recipientUid) under events/main/assignments.
 */
export async function seedAssignment(giverUid: string, recipientUid: string): Promise<void> {
  await seedDoc(['events', 'main', 'assignments', giverUid], { recipientUid })
}

/**
 * Seeds an order document under events/main/orders.
 */
export async function seedOrder(
  giverUid: string,
  data: Record<string, unknown> = { number: '10' }
): Promise<void> {
  await seedDoc(['events', 'main', 'orders', giverUid], data)
}
