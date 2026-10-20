/**
 * The phase's ONLY two inline SVGs, and the only icons in the whole product:
 * there is no icon library (D-25 forbids the dependency).
 *
 * `IconProps.className` is the sizing hook so both the loading button (`h-4 w-4`)
 * and the modal header (`h-5 w-5`) reuse the same markup.
 *
 * `SpinnerIcon` carries the phase's only rotation. It is always paired with
 * `motion-reduce:animate-none` on the same class list (UI-SPEC §Accessibility).
 */
type IconProps = {
  className?: string
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  )
}

export function SpinnerIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={`h-4 w-4 animate-spin motion-reduce:animate-none${className ? ` ${className}` : ''}`}
    >
      <circle cx="12" cy="12" r="9" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" className="opacity-75" />
    </svg>
  )
}

/** Camiseta: la marca de SecretKit, sin dependencia de iconos. */
export function JerseyIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 3.5 5.5 5 3 9l2.5 2L7 10v10h10V10l1.5 1L21 9l-2.5-4L15 3.5a3 3 0 0 1-6 0Z" />
    </svg>
  )
}
