/**
 * Responsive tests for SizeGuideTable.
 *
 * Verifies card view (<640px) and table view (≥640px) rendering,
 * anomaly badges, and accessibility attributes.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SizeGuideTable, FAN_TABLE, PLAYER_TABLE } from '../SizeGuideTable'
import '@testing-library/jest-dom'

// Mock environment for jsdom
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key')
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com')
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project')
vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test.appspot.com')
vi.stubEnv('VITE_FIREBASE_APP_ID', '1:1234567890:web:abcdef')
vi.stubEnv('VITE_ADMIN_SECRET', 'test-admin-secret')

vi.mock('../../lib/firebase', () => ({
  app: {},
  auth: {},
  db: {},
}))

describe('SizeGuideTable responsive rendering', () => {
  it('renders table with caption, thead, th scope="col" for desktop', () => {
    render(<SizeGuideTable {...FAN_TABLE} />)

    // Caption
    const caption = screen.getByText('Versión Fan')
    expect(caption).toBeInTheDocument()

    // Table
    const table = caption.closest('table')
    expect(table).toBeInTheDocument()

    // Headers with scope="col"
    const headers = screen.getAllByRole('columnheader')
    expect(headers.length).toBeGreaterThan(0)
    headers.forEach((header) => {
      expect(header).toHaveAttribute('scope', 'col')
    })
  })

  it('renders card list for mobile (ul with li per size) for each table', () => {
    render(<SizeGuideTable {...FAN_TABLE} />)

    // Card lists should exist (one per table)
    const cardLists = screen.getAllByRole('list')
    expect(cardLists.length).toBe(1) // Only FAN_TABLE rendered

    // Each size has a card (6 sizes for Fan)
    const sizeCards = screen.getAllByRole('listitem')
    expect(sizeCards.length).toBe(FAN_TABLE.rows.length)

    // Each card has size as heading and dl with measurements
    sizeCards.forEach((card) => {
      const sizeHeading = card.querySelector('p.font-semibold')
      expect(sizeHeading).toBeInTheDocument()

      const dl = card.querySelector('dl')
      expect(dl).toBeInTheDocument()

      const dts = dl?.querySelectorAll('dt')
      const dds = dl?.querySelectorAll('dd')
      expect(dts?.length).toBeGreaterThan(0)
      expect(dts?.length).toBe(dds?.length)
    })
  })

  it('renders anomaly badges for Player M, L (ambiguous weight)', () => {
    render(<SizeGuideTable {...PLAYER_TABLE} />)

    // M and L ambiguous weight badges (same text, appears twice - once in table view, once in card view)
    const ambiguousBadges = screen.getAllByText('Rango de peso idéntico en datos del proveedor')
    expect(ambiguousBadges.length).toBe(4) // M and L × 2 views (table + card)

    // XXXL unavailable badge is NOT rendered inline (no XXXL row in Player data)
    // It appears as a separate notice in the modal instead
    const unavailableBadges = screen.queryAllByText('No disponible en Player')
    expect(unavailableBadges.length).toBe(0)
  })

  it('renders Fan table without anomaly badges', () => {
    render(<SizeGuideTable {...FAN_TABLE} />)

    const unavailableBadges = screen.queryAllByText('No disponible en Player')
    expect(unavailableBadges.length).toBe(0)

    const ambiguousBadges = screen.queryAllByText('Rango de peso idéntico en datos del proveedor')
    expect(ambiguousBadges.length).toBe(0)
  })

  it('table headers have sticky positioning class', () => {
    render(<SizeGuideTable {...FAN_TABLE} />)

    const caption = screen.getByText('Versión Fan')
    const table = caption.closest('table')
    expect(table).toBeInTheDocument()

    const headers = table?.querySelectorAll('thead th')
    expect(headers).toBeTruthy()

    headers?.forEach((header) => {
      expect(header).toHaveClass('sticky')
      expect(header).toHaveClass('top-0')
      expect(header).toHaveClass('z-10')
      expect(header).toHaveClass('bg-white')
    })
  })

  it('card view uses dl/dt/dd semantics', () => {
    render(<SizeGuideTable {...FAN_TABLE} />)

    const firstCard = screen.getAllByRole('listitem')[0]
    const dl = firstCard.querySelector('dl')
    expect(dl).toBeInTheDocument()

    const dts = dl?.querySelectorAll('dt')
    const dds = dl?.querySelectorAll('dd')
    expect(dts?.length).toBe(4) // Equivalencia, Largo, Altura, Peso
    expect(dds?.length).toBe(4)
  })
})