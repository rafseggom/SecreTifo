/**
 * Test setup for hook tests - provides minimal Firebase config to avoid
 * initialization errors when importing modules that depend on firebase.ts
 */
import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock environment variables before any Firebase modules load
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key')
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com')
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project')
vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test.appspot.com')
vi.stubEnv('VITE_FIREBASE_APP_ID', '1:1234567890:web:abcdef')
vi.stubEnv('VITE_ADMIN_SECRET', 'test-admin-secret')

// Mock Firebase modules to avoid emulator connections in unit tests
vi.mock('../../lib/firebase', () => ({
  app: {},
  auth: {},
  db: {},
}))

vi.mock('../../lib/assignment', () => ({
  getMyAssignment: vi.fn(),
}))