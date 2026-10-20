/**
 * Badge primitive (01-UI-SPEC §Component Contracts).
 *
 * 14px, `px-2 py-1`, `rounded-full`, slate-100 background / slate-700 text.
 * The three instances of the phase are `Admin`, `Pendiente` and `Guardado`
 * — the text is the caller's, and there is deliberately no tone system:
 * every badge in the phase looks the same, and none of them is indigo.
 *
 * Added `variant` prop for semantic colors (success/amber/warning) used in
 * AdminPage Estado badges and SizeGuideTable anomaly badges.
 */
import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger'

type BadgeProps = {
  children: ReactNode
  className?: string
  variant?: BadgeVariant
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-dominant text-foreground border border-border',
  success: 'bg-success-surface text-success border border-success-border',
  warning: 'bg-warning-surface text-warning border border-warning-border',
  danger: 'bg-error-surface text-error border border-error-border',
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-label ${VARIANT_CLASSES[variant]}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}
