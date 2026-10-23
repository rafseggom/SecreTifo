/**
 * jsdom setup for the page tests: the jest-dom matchers and the automatic cleanup
 * between tests. The components project carries the same contract.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
