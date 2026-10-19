/**
 * Firestore Security Rules Test Suite (SEC-03, ADMIN-03).
 *
 * These 9 assertions verify the privacy and access-control guarantees of the
 * SecretKit app. Each test uses a fresh authenticated context via
 * initializeTestEnvironment and cleans up Firestore data between tests.
 *
 * The rules under test are in firestore.rules (source of truth). This test
 * file must be run via `npm run test:rules` which starts the Firestore Emulator.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, updateDoc } from 'firebase/firestore'

let testEnv: RulesTestEnvironment
const PROJECT_ID = 'demo-secretkit'

const PARTICIPANT_UID = 'participantuid'
const OTHER_UID = 'otheruid'
const ADMIN_UID = 'adminuid'

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080 },
    auth: { host: '127.0.0.1', port: 9099 },
  })
})

afterEach(async () => {
  await testEnv.clearFirestore()
})

/**
 * Helper to create the events/main document with the admin UID and status.
 * Uses the admin authenticated context (following rules) to ensure
 * cross-document reads in rules can see the document.
 * For 'drawn' status, creates as 'lobby' then updates (forward-only transition).
 */
async function seedEventMain(status: 'lobby' | 'drawn' = 'lobby'): Promise<void> {
  const adminDb = testEnv.authenticatedContext(ADMIN_UID).firestore()
  const eventRef = doc(adminDb, 'events', 'main')
  await setDoc(eventRef, { adminUid: ADMIN_UID, status: 'lobby' })
  if (status === 'drawn') {
    await updateDoc(eventRef, { status: 'drawn' })
  }
}

/**
 * Helper to create a participant document.
 * Uses security-rules-disabled context for seeding (participant create rule
 * requires lobby status which we ensure via seedEventMain).
 */
async function seedParticipant(uid: string, overrides: Record<string, unknown> = {}): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'participants', uid), {
      name: 'Test User',
      nameNormalized: 'test user',
      size: 'M',
      likedTeams: '',
      forbiddenTeams: '',
      hasOrder: false,
      ...overrides,
    })
  })
}

/**
 * Helper to create an assignment document.
 * Uses security-rules-disabled context for seeding.
 */
async function seedAssignment(giverUid: string, recipientUid: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'assignments', giverUid), { recipientUid })
  })
}

/**
 * Helper to create an order document.
 * Uses security-rules-disabled context for seeding.
 */
async function seedOrder(giverUid: string, overrides: Record<string, unknown> = {}): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'orders', giverUid), {
      opaqueId: 'opaque-' + giverUid,
      type: 'Fan',
      team: 'Real Madrid',
      season: '2024',
      printedName: 'Test',
      number: '10',
      size: 'M',
      ...overrides,
    })
  })
}

describe('Firestore Security Rules — Privacy Assertions (SEC-03, ADMIN-03)', () => {
  // 1. getDocs(assignments) denied for participant
  it('denies getDocs(assignments) for participant', async () => {
    await seedEventMain()
    await seedAssignment(PARTICIPANT_UID, OTHER_UID)

    const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
    const assignmentsCol = collection(participantDb, 'assignments')

    await assertFails(getDocs(assignmentsCol))
  })

  // 2. getDocs(assignments) denied for admin
  it('denies getDocs(assignments) for admin', async () => {
    await seedEventMain()
    await seedAssignment(PARTICIPANT_UID, OTHER_UID)

    const adminDb = testEnv.authenticatedContext(ADMIN_UID).firestore()
    const assignmentsCol = collection(adminDb, 'assignments')

    await assertFails(getDocs(assignmentsCol))
  })

  // 3. getDoc(doc(assignments, ownUid)) allowed for participant
  it('allows getDoc own assignment for participant', async () => {
    await seedEventMain()
    await seedAssignment(PARTICIPANT_UID, OTHER_UID)

    const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
    const assignmentRef = doc(participantDb, 'assignments', PARTICIPANT_UID)

    await assertSucceeds(getDoc(assignmentRef))
  })

  // 4. getDoc(doc(assignments, otherUid)) denied for participant
  it('denies getDoc other participant assignment for participant', async () => {
    await seedEventMain()
    await seedAssignment(OTHER_UID, PARTICIPANT_UID)

    const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
    const assignmentRef = doc(participantDb, 'assignments', OTHER_UID)

    await assertFails(getDoc(assignmentRef))
  })

  // 5. getDocs(collection(orders)) allowed for admin
  it('allows getDocs(orders) for admin', async () => {
    await seedEventMain()
    await seedOrder(PARTICIPANT_UID)

    const adminDb = testEnv.authenticatedContext(ADMIN_UID).firestore()
    const ordersCol = collection(adminDb, 'orders')

    await assertSucceeds(getDocs(ordersCol))
  })

  // 6. getDocs(collection(orders)) denied for participant
  it('denies getDocs(orders) for participant', async () => {
    await seedEventMain()
    await seedOrder(PARTICIPANT_UID)

    const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
    const ordersCol = collection(participantDb, 'orders')

    await assertFails(getDocs(ordersCol))
  })

  // 7. create participant only in lobby, own UID
  describe('participant create rules', () => {
    it('allows create in lobby with own UID', async () => {
      await seedEventMain('lobby')

      const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
      const participantRef = doc(participantDb, 'participants', PARTICIPANT_UID)

      await assertSucceeds(setDoc(participantRef, {
        name: 'Test User',
        nameNormalized: 'test user',
        size: 'M',
        likedTeams: '',
        forbiddenTeams: '',
        hasOrder: false,
      }))
    })

    it('denies create in drawn status', async () => {
      await seedEventMain('drawn')

      const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
      const participantRef = doc(participantDb, 'participants', PARTICIPANT_UID)

      await assertFails(setDoc(participantRef, {
        name: 'Test User',
        nameNormalized: 'test user',
        size: 'M',
        likedTeams: '',
        forbiddenTeams: '',
        hasOrder: false,
      }))
    })

    it('denies create with wrong UID', async () => {
      await seedEventMain('lobby')

      const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
      const participantRef = doc(participantDb, 'participants', OTHER_UID)

      await assertFails(setDoc(participantRef, {
        name: 'Test User',
        nameNormalized: 'test user',
        size: 'M',
        likedTeams: '',
        forbiddenTeams: '',
        hasOrder: false,
      }))
    })
  })

  // 8. update participant only hasOrder after draw
  describe('participant update rules', () => {
    it('allows update hasOrder after draw', async () => {
      await seedEventMain('drawn')
      await seedParticipant(PARTICIPANT_UID)

      const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
      const participantRef = doc(participantDb, 'participants', PARTICIPANT_UID)

      await assertSucceeds(updateDoc(participantRef, { hasOrder: true }))
    })

    it('denies update before draw (lobby) without hasOrder change', async () => {
      await seedEventMain('lobby')
      await seedParticipant(PARTICIPANT_UID)

      const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
      const participantRef = doc(participantDb, 'participants', PARTICIPANT_UID)

      await assertFails(updateDoc(participantRef, { likedTeams: 'New Team' }))
    })

    it('denies update without hasOrder after draw', async () => {
      await seedEventMain('drawn')
      await seedParticipant(PARTICIPANT_UID)

      const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
      const participantRef = doc(participantDb, 'participants', PARTICIPANT_UID)

      await assertFails(updateDoc(participantRef, { likedTeams: 'New Team' }))
    })
  })

  // 9. update events/main only admin, status forward-only (lobby→drawn)
  describe('events/main update rules', () => {
    it('allows admin to update lobby to drawn', async () => {
      await seedEventMain('lobby')

      const adminDb = testEnv.authenticatedContext(ADMIN_UID).firestore()
      const eventRef = doc(adminDb, 'events', 'main')

      await assertSucceeds(updateDoc(eventRef, { status: 'drawn' }))
    })

    it('denies admin update drawn to lobby (forward-only)', async () => {
      await seedEventMain('drawn')

      const adminDb = testEnv.authenticatedContext(ADMIN_UID).firestore()
      const eventRef = doc(adminDb, 'events', 'main')

      await assertFails(updateDoc(eventRef, { status: 'lobby' }))
    })

    it('denies participant update events/main', async () => {
      await seedEventMain('lobby')

      const participantDb = testEnv.authenticatedContext(PARTICIPANT_UID).firestore()
      const eventRef = doc(participantDb, 'events', 'main')

      await assertFails(updateDoc(eventRef, { status: 'drawn' }))
    })
  })
})