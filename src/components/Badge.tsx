/**
 * Badge primitive (01-UI-SPEC §Component Contracts).
 *
 * 14px, `px-2 py-1`, `rounded-full`, slate-100 background / slate-700 text.
 * The three instances of the phase are `Admin`, `Pendiente` and `Guardado`
 * — the text is the caller's, and there is deliberately no tone system:
 * every badge in the phase looks the same, and none of them is indigo.
 */
import type { ReactNode } from 'react'

type BadgeProps = {
  children: ReactNode
}

export function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-label text-slate-700">
      {children}
    </span>
  )
}
