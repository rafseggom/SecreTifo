/**
 * Button primitive (01-UI-SPEC §Component Contracts).
 *
 * One size only: `h-11` (44px) — the phase's minimum interactive target —
 * `px-4`, `rounded-lg`, 16px label. Four variants:
 *
 *  - `primary`   solid indigo-600 / white text. The ONLY indigo button of the
 *                phase, and the single primary CTA of each screen.
 *  - `secondary` white / slate-300 border / slate-900 text. Used by the size
 *                guide trigger and the S8 "come back in" action.
 *  - `danger`    solid red-600 / white. Reserved for the draw confirmation
 *                dialog (wave 4) — never the inline error surface.
 *  - `ghost`     transparent / slate-700 text, for `Cambiar nombre`.
 *
 * Variants resolve through a lookup object holding COMPLETE literal class names.
 * A Tailwind class is never composed by filtering a colour step into the name:
 * Tailwind v4 only generates the literals it can read (01-RESEARCH §Pitfall 15).
 *
 * `loading` renders the shared 16px `SpinnerIcon`, sets `aria-busy="true"` and
 * disables the button. Every `disabled` is mirrored by `aria-disabled`.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { SpinnerIcon } from './icons'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'default' | 'sm'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white font-semibold',
  secondary: 'border border-slate-300 bg-white text-slate-900 font-normal',
  danger: 'bg-red-600 text-white font-semibold',
  ghost: 'bg-transparent text-slate-700 font-normal',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: 'h-11 min-w-11 px-4 text-base',
  sm: 'h-9 min-w-9 px-3 text-label',
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant,
  size = 'default',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || loading

  return (
    <button
      type={type}
      {...rest}
      disabled={isDisabled}
      aria-disabled={isDisabled ? true : undefined}
      aria-busy={loading ? true : undefined}
      className={`${BASE_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]}${className ? ` ${className}` : ''}`}
    >
      {loading ? <SpinnerIcon className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}
