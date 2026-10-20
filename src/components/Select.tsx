/**
 * Select primitive (01-UI-SPEC §Component Contracts).
 *
 * A native `<select>` styled identically to `Input`. Options are always passed in
 * from the outside and never transcribed inside a component: the default is the
 * size enum `SIZES` (`src/domain/sizeGuide.ts`), and callers that need the kit
 * types pass the `KitType` keys. There is no free-text fallback.
 *
 * The first option is a visible, `disabled` placeholder carrying `value=""`, so
 * the bound value reads as "nothing chosen yet" without being removable.
 */
import type { ComponentPropsWithRef } from 'react'
import { SIZES } from '../domain/sizeGuide'

type SelectProps = ComponentPropsWithRef<'select'> & {
  /** Options come from a domain module; never a literal list inside the markup. */
  options?: readonly string[]
  /**
   * Optional visible label per option, keyed by its value. The `value` stays
   * verbatim while the label may carry extra context — D-17 needs the type option
   * to read `Fan · 11$` without the stored value becoming that string.
   */
  optionLabels?: Partial<Record<string, string>>
  placeholder: string
  invalid?: boolean
}

const SELECT_CLASSES =
  'h-12 w-full appearance-none rounded-xl border border-border bg-surface px-4 pr-10 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors hover:border-border focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 aria-invalid:border-red-400 aria-invalid:focus-visible:ring-red-200'

export function Select({
  options = SIZES,
  optionLabels,
  placeholder,
  invalid = false,
  className,
  ...rest
}: SelectProps) {
  return (
    <select
      {...rest}
      aria-invalid={invalid ? true : undefined}
      className={`${SELECT_CLASSES}${className ? ` ${className}` : ''}`}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option} value={option}>
          {optionLabels?.[option] ?? option}
        </option>
      ))}
    </select>
  )
}
