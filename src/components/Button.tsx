/**
 * Button primitive (01-UI-SPEC §Component Contracts).
 *
 * One size only: `h-12` (48px) — a comfortable touch target — `px-5`, `rounded-xl`,
 * 16px label. Four variants:
 *
 *  - `primary`   solid pitch green / white text. The single primary CTA of a screen.
 *  - `secondary` surface / border / ink text, for the quieter actions.
 *  - `danger`    solid red. Reserved for the draw confirmation dialog.
 *  - `ghost`     transparent, for inline secondary actions.
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
  primary:
    'bg-accent text-accent-foreground font-semibold shadow-sm hover:bg-accent-strong active:bg-accent-strong',
  secondary:
    'border border-border bg-surface text-foreground font-normal hover:border-accent/40 hover:bg-dominant',
  danger: 'bg-destructive text-white font-semibold hover:bg-destructive/90',
  ghost: 'bg-transparent text-muted-foreground font-normal hover:bg-dominant hover:text-foreground',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: 'h-12 min-w-12 px-5 text-base',
  sm: 'h-9 min-w-9 px-3 text-label',
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-xl transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dominant disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground disabled:shadow-none disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100'

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
