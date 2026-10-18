/**
 * Used ONLY while the session identity resolves (UI-SPEC §Component Contracts).
 * Centred spinner + `Preparando…`; the rotation is paired with
 * `motion-reduce:animate-none` (the phase's motion rule).
 */
export function FullScreenSpinner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dominant"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 motion-reduce:animate-none"
      />
      <p className="text-body text-slate-600">Preparando…</p>
    </div>
  )
}
