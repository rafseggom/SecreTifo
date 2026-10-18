/**
 * Card surface (UI-SPEC §Component Contracts, §Color).
 *
 * White surface, 1px slate-200 border, `rounded-xl`, `p-4` on `<sm` and `p-6` at
 * `≥sm`. **No shadow** — borders carry elevation in this phase (crisper on mobile
 * and cheaper to render than a blurred shadow).
 */
import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 sm:p-6${
        className ? ` ${className}` : ''
      }`}
    >
      {children}
    </div>
  )
}
