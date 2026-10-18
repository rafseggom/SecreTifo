/**
 * Input primitive (01-UI-SPEC §Component Contracts).
 *
 * `h-11`, `w-full`, `rounded-lg`, 1px slate-300 border. The text is 16px
 * (`text-base`) even though the label beside it is 14px — that is what stops
 * iOS from zooming the viewport on focus.
 *
 * `invalid` renders `aria-invalid`; the caller still passes `aria-describedby`
 * with the id `Field` handed it. The colo(u)rs come from the theme tokens, never
 * from a literal hex value.
 */
import type { ComponentPropsWithRef } from 'react'

type InputProps = ComponentPropsWithRef<'input'> & {
  invalid?: boolean
}

const INPUT_CLASSES =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2'

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      {...rest}
      aria-invalid={invalid ? true : undefined}
      className={`${INPUT_CLASSES}${className ? ` ${className}` : ''}`}
    />
  )
}
