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
import { describe, it, beforeAll, afterEach } from 'vitest'

// Increase timeout for emulator tests (emulator operations are slow)
const TEST_TIMEOUT = 60000

import {
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { collection, getDocs, getDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import {
  initTestEnvironment,
  clearFirestoreData,
  seedEventMain,
  seedParticipant,
  seedAssignment,
  seedOrder,
  adminContext,
  authContext,
} from './emulator-setup'

const PARTICIPANT_UID = 'participantuid'
const OTHER_UID = 'otheruid'
const ADMIN_UID = 'adminuid'

beforeAll(async () => {
  await initTestEnvironment()
})

afterEach(async () => {
  await clearFirestoreData()
})

describe('Firestore Security Rules — Privacy Assertions (SEC-03, ADMIN-03)', () => {
  // 1. getDocs(assignments) denied for participant
  it('denies getDocs(assignments) for participant', { timeout: TEST_TIMEOUT }, async () => {
    await seedEventMain()
    await seedAssignment(PARTICIPANT_UID, OTHER_UID)

    const participantDb = authContext(PARTICIPANT_UID).firestore()
    const assignmentsCol = collection(participantDb, 'assignments')

    await assertFails(getDocs(assignmentsCol))
  })

  // 2. getDocs(assignments) denied for admin
  it('denies getDocs(assignments) for admin', { timeout: TEST_TIMEOUT }, async () => {
    await seedEventMain()
    await seedAssignment(PARTICIPANT_UID, OTHER_UID)

    const adminDb = adminContext(ADMIN_UID).firestore()
    const assignmentsCol = collection(adminDb, 'assignments')

    await assertFails(getDocs(assignmentsCol))
  })

  // 3. getDoc(doc(assignments, ownUid)) allowed for participant
  it('allows getDoc own assignment for participant', { timeout: TEST_TIMEOUT }, async () => {
    await seedEventMain()
    await seedAssignment(PARTICIPANT_UID, OTHER_UID)

    const participantDb = authContext(PARTICIPANT_UID).firestore()
    const assignmentRef = doc(participantDb, 'assignments', PARTICIPANT_UID)

    await assertSucceeds(getDoc(assignmentRef))
  })

  // 4. getDoc(doc(assignments, otherUid)) denied for participant
  it('denies getDoc other participant assignment for participant', { timeout: TEST_TIMEOUT }, async () => {
    await seedEventMain()
    await seedAssignment(OTHER_UID, PARTICIPANT_UID)

    const participantDb = authContext(PARTICIPANT_UID).firestore()
    const assignmentRef = doc(participantDb, 'assignments', OTHER_UID)

    await assertFails(getDoc(assignmentRef))
  })

  // 5. getDocs(collection(orders)) allowed for admin
  it('allows getDocs(orders) for admin', { timeout: TEST_TIMEOUT }, async () => {
    await seedEventMain(undefined, undefined)
    await seedOrder(PARTICIPANT_UID)

    const adminDb = adminContext(ADMIN_UID).firestore()
    const ordersCol = collection(adminDb, 'orders')

    await assertSucceeds(getDocs(ordersCol))
  })

  // 6. getDocs(collection(orders)) denied for participant
  it('denies getDocs(orders) for participant', { timeout: TEST_TIMEOUT }, async () => {
    await seedEventMain(undefined, undefined)
    await seedOrder(PARTICIPANT_UID)

    const participantDb = authContext(PARTICIPANT_UID).firestore()
    const ordersCol = collection(participantDb, 'orders')

    await assertFails(getDocs(ordersCol))
  })

  // 7. create participant only in lobby, own UID
  describe('participant create rules', () => {
    it('allows create in lobby with own UID', { timeout: TEST_TIMEOUT }, async () => {
      await seedEventMain(undefined, 'lobby')

      const participantDb = authContext(PARTICIPANT_UID).firestore()
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

    it('denies create in drawn status', { timeout: TEST_TIMEOUT }, async () => {
      await seedEventMain(undefined, 'drawn')

      const participantDb = authContext(PARTICIPANT_UID).firestore()
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

    it('denies create with wrong UID', { timeout: TEST_TIMEOUT }, async () => {
      await seedEventMain(undefined, 'lobby')

      const participantDb = authContext(PARTICIPANT_UID).firestore()
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
    it('allows update hasOrder after draw', { timeout: TEST_TIMEOUT }, async () => {
      await seedEventMain(undefined, 'drawn')
      await seedParticipant(PARTICIPANT_UID)

      const participantDb = authContext(PARTICIPANT_UID).firestore()
      const participantRef = doc(participantDb, 'participants', PARTICIPANT_UID)

      await assertSucceeds(updateDoc(participantRef, { hasOrder: true }))
    })

    it('denies update before draw (lobby) without hasOrder change', { timeout: TEST_TIMEOUT }, async () => {
      await seedEventMain(undefined, 'lobby')
      await seedParticipant(PARTICIPANT_UID)

      const participantDb = authContext(PARTICIPANT_UID).firestore()
      const participantRef = doc(participantDb, 'participants', PARTICIPANT_UID)

      await assertFails(updateDoc(participantRef, { likedTeams: 'New Team' }))
    })

    it('denies update without hasOrder after draw', { timeout: TEST_TIMEOUT }, async () => {
      await seedEventMain(undefined, 'drawn')
      await seedParticipant(PARTICIPANT_UID)

      const participantDb = authContext(PARTICIPANT_UID).firestore()
      const participantRef = doc(participantDb, 'participants', PARTICIPANT_UID)

      await assertFails(updateDoc(participantRef, { likedTeams: 'New Team' }))
    })
  })

  // 9. update events/main only admin, status forward-only (lobby→drawn)
  describe('events/main update rules', () => {
    it('allows admin to update lobby to drawn', { timeout: TEST_TIMEOUT }, async () => {
      await seedEventMain(undefined, 'lobby')

      const adminDb = adminContext(ADMIN_UID).firestore()
      const eventRef = doc(adminDb, 'events', 'main')

      await assertSucceeds(updateDoc(eventRef, { status: 'drawn' }))
    })

    it('denies admin update drawn to lobby (forward-only)', { timeout: TEST_TIMEOUT }, async () => {
      await seedEventMain(undefined, 'drawn')

      const adminDb = adminContext(ADMIN_UID).firestore()
      const eventRef = doc(adminDb, 'events', 'main')

      await assertFails(updateDoc(eventRef, { status: 'lobby' }))
    })

    it('denies participant update events/main', { timeout: TEST_TIMEOUT }, async () => {
      await seedEventMain(undefined, 'lobby')

      const participantDb = authContext(PARTICIPANT_UID).firestore()
      const eventRef = doc(participantDb, 'events', 'main')

      await assertFails(updateDoc(eventRef, { status: 'drawn' }))
    })
  })
})