import { defineConfig } from 'vitest/config'

/**
 * Dedicated config for the Firestore Security Rules tests.
 *
 * These tests need the Firebase emulators, so they are deliberately excluded from
 * `npm test` (which must run without emulators). Run them with:
 *
 *   npm run test:rules
 *
 * The emulators:exec wrapper loads `firestore.rules` before Vitest starts.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/__tests__/rules.test.ts'],
    globals: false,
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
})
