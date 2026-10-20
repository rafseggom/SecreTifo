/**
 * Notice primitive (01-UI-SPEC §Component Contracts, §Color).
 *
 * The shared live status surface for every non-field message of the phase: the
 * three amber size-guide notes (S3), the minimum-3 lobby notice (S4), the
 * non-blocking Player/XXXL order notice (S5/S6) and the Firestore error taxonomy
 * (S8) — hence its shape is fixed here and never re-decided later.
 *
 * It announces with the status attribute and NEVER with the alert attribute:
 * none of these messages interrupts, and the Player/XXXL notice has to be able to
 * appear while the person keeps typing without having the focus stolen.
 * Field-level validation errors are the only alert live region, and they live in
 * `Field`.
 *
 * Tone → colours is a lookup object of complete literal class names:
 *  - `warning` amber-700 on amber-50 with an amber-300 border (D-12 / D-16 only)
 *  - `error`   red-800 on red-50 with a red-200 border — deliberately distinct
 *              from the solid destructive button so "this failed" never reads as
 *              "press this to destroy"
 *  - `success` emerald-800 on emerald-50 with an emerald-300 border
 *  - `info`    the neutral pair
 */
import type { ReactNode } from 'react'

export type NoticeTone = 'warning' | 'error' | 'info' | 'success'

const TONE_CLASSES: Record<NoticeTone, string> = {
  warning: 'border-warning-border bg-warning-surface text-warning',
  error: 'border-error-border bg-error-surface text-error',
  info: 'border-border bg-dominant text-muted-foreground',
  success: 'border-success-border bg-success-surface text-success',
}

type NoticeProps = {
  tone: NoticeTone
  /**
   * The live-region role. `status` is the phase default and the only value allowed:
   * the alert live region lives exclusively in `Field`. Call-sites that must be
   * explicit about the role (the D-16 order notice) pass it verbatim.
   */
  role?: 'status'
  /** Optional recovery affordance, e.g. the `Reintentar` button. */
  action?: ReactNode
  children: ReactNode
}

export function Notice({ tone, role = 'status', action, children }: NoticeProps) {
  return (
    <div
      role={role}
      className={`flex flex-col gap-2 rounded-lg border px-4 py-3 text-label ${TONE_CLASSES[tone]}`}
    >
      <p>{children}</p>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
