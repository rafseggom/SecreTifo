/**
 * jsdom setup for the component tests: jest-dom matchers and cleanup between
 * tests, identical to the pages project.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
