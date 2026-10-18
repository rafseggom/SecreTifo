/**
 * Screen shell (UI-SPEC §Component Contracts, §Accessibility & Responsive Rules).
 *
 * Every route renders inside it: the single `<main>` landmark, the mobile-first
 * content shell (`max-w-md`) and the page gutter (16px on `<sm`, 24px at `≥sm`).
 * With a sticky bottom CTA the shell reserves `pb-24` so the last row is never
 * covered by the action.
 *
 * It owns the screen's single `<h1>`; `title` accepts a ReactNode so a page can
 * nest a `<strong>` (S5's reveal headline) without losing the heading level.
 * Display (28px) is reserved for exactly two places in the phase — the app name
 * on `/` and the reveal headline — hence `titleRole`, which defaults to Heading.
 */
import type { ReactNode } from 'react'

type ScreenProps = {
  /** The screen's one `<h1>`. */
  title: ReactNode
  /**
   * `heading` (20px/600) is the default for every screen title. `display`
   * (28px/600) is only for `/`'s app name and `/reveal`'s headline.
   */
  titleRole?: 'heading' | 'display'
  /** Set when the screen renders a sticky bottom CTA, to reserve its clearance. */
  stickyCta?: boolean
  children?: ReactNode
}

export function Screen({ title, titleRole = 'heading', stickyCta = false, children }: ScreenProps) {
  const titleSize = titleRole === 'display' ? 'text-display' : 'text-heading'

  return (
    <main className={`mx-auto max-w-md px-4 py-8 sm:px-6${stickyCta ? ' pb-24' : ''}`}>
      <h1 className={`${titleSize} font-semibold text-slate-900`}>{title}</h1>
      {children}
    </main>
  )
}
