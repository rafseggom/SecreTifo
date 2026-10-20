/**
 * Screen shell (UI-SPEC §Component Contracts, §Accessibility & Responsive Rules).
 *
 * Every route renders inside it: the single `<main>` landmark, the mobile-first
 * content shell (`max-w-lg`) and the page gutter. The brand lockup gives the app a
 * consistent top edge without adding navigation the product does not need.
 *
 * With a sticky bottom CTA the shell reserves `pb-32` so the last row is never
 * covered by the action.
 *
 * It owns the screen's single `<h1>`; `title` accepts a ReactNode so a page can
 * nest a `<strong>` (S5's reveal headline) without losing the heading level.
 * Display (32px) is reserved for the two hero moments — the entry screen and the
 * reveal headline — hence `titleRole`, which defaults to Heading.
 */
import type { ReactNode } from 'react'
import { Brand } from './Brand'

type ScreenProps = {
  /** The screen's one `<h1>`. */
  title: ReactNode
  /**
   * `heading` (20px/600) is the default for every screen title. `display`
   * (32px/600) is only for `/`'s hero and `/reveal`'s headline.
   */
  titleRole?: 'heading' | 'display'
  /** Set when the screen renders a sticky bottom CTA, to reserve its clearance. */
  stickyCta?: boolean
  children?: ReactNode
}

export function Screen({ title, titleRole = 'heading', stickyCta = false, children }: ScreenProps) {
  const titleClasses =
    titleRole === 'display'
      ? 'text-display font-semibold tracking-[-0.03em] leading-[1.1] text-balance'
      : 'text-heading font-semibold tracking-[-0.015em] text-balance'

  return (
    <main
      className={`mx-auto w-full max-w-lg px-4 pt-6 sm:px-6 sm:pt-10${
        stickyCta ? ' pb-32' : ' pb-10'
      }`}
    >
      <Brand />
      <h1 className={`mt-8 text-foreground ${titleClasses}`}>{title}</h1>
      {children}
    </main>
  )
}
