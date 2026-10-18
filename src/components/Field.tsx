/**
 * Field primitive (01-UI-SPEC §Component Contracts).
 *
 * Wraps label + control + helper + error and owns the wiring between them: the
 * `id` the control must carry, the `aria-describedby` it must reference, and the
 * `invalid` flag that becomes `aria-invalid` on the control.
 *
 * The control is a render prop so the page keeps ownership of its own `ref`
 * (the contract requires focus to stay in the name input on a rejected submit).
 *
 * The alert live-region attribute lives HERE and only here in the phase: a live
 * region that announces a field-level validation error. Every other live notice
 * in the phase uses the status attribute (`Notice`), because none of them
 * interrupts.
 */
import { useId, type ReactNode } from 'react'

export type FieldControl = {
  /** The `id` the control element must carry. */
  id: string
  /** What the control must pass to `aria-describedby` (error id, else helper id). */
  describedBy: string | undefined
  /** Whether the control should render `aria-invalid`. */
  invalid: boolean
}

type FieldProps = {
  label: string
  helper?: string
  error?: string
  required?: boolean
  children: (control: FieldControl) => ReactNode
}

export function Field({ label, helper, error, required = false, children }: FieldProps) {
  const id = useId()
  const helperId = `${id}-helper`
  const errorId = `${id}-error`
  const describedBy = error ? errorId : helper ? helperId : undefined

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-slate-900">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
        {required ? <span className="sr-only"> obligatorio</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {helper ? (
        <p id={helperId} className="text-label text-slate-600">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-label text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
