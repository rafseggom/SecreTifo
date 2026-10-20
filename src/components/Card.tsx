/**
 * Card surface (UI-SPEC §Component Contracts, §Color).
 *
 * Warm surface, hairline border, `rounded-2xl` and a very soft shadow. Elevation
 * is barely there on purpose: on a cream background a heavy SaaS shadow reads as
 * a template, while a hint of depth separates the form from the paper.
 */
import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6${
        className ? ` ${className}` : ''
      }`}
    >
      {children}
    </div>
  )
}
