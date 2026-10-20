/**
 * Input primitive (01-UI-SPEC §Component Contracts).
 *
 * `h-12`, `w-full`, `rounded-xl`, 1px warm border. The text is 16px
 * (`text-base`) even though the label beside it is 14px — that is what stops
 * iOS from zooming the viewport on focus.
 *
 * `invalid` renders `aria-invalid` and tints the border; the caller still passes
 * `aria-describedby` with the id `Field` handed it.
 */
import type { ComponentPropsWithRef } from 'react'

type InputProps = ComponentPropsWithRef<'input'> & {
  invalid?: boolean
}

const INPUT_CLASSES =
  'h-12 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors placeholder:text-muted-foreground/70 hover:border-border focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 aria-invalid:border-red-400 aria-invalid:focus-visible:ring-red-200'

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      {...rest}
      aria-invalid={invalid ? true : undefined}
      className={`${INPUT_CLASSES}${className ? ` ${className}` : ''}`}
    />
  )
}
