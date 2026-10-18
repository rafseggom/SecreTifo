/**
 * Modal primitive (01-UI-SPEC §Component Contracts).
 *
 * A thin wrapper over the native `<dialog>`. It does NOT reimplement any of the
 * platform's behaviour: the focus trap, the `Esc` dismissal, the inert
 * background and the focus-return-to-trigger on close all come from the element
 * itself (01-RESEARCH §Alternatives is the reason `<dialog>` was chosen over a
 * hand-rolled or Radix primitive).
 *
 * The control is `open`/`onClose`: when `open` flips true the element is shown as
 * a modal, when it flips false it is closed. The `close` event turns the
 * platform's own dismissal (`Esc`) back into an `onClose` call, so the caller's
 * state never drifts out of sync with the element.
 *
 * Inner surface is `max-h-[85vh]` with `overflow-y-auto` so the sticky close
 * button (44×44, `aria-label="Cerrar"`) is never scrolled off a short phone.
 * The body is children, which is what lets the same component serve both the
 * size guide (here) and the draw confirmation dialog (wave 4).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons'

type ModalProps = {
  /** The dialog's heading. */
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, open, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={titleId}
      className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-0 text-slate-900 backdrop:bg-slate-900/40"
    >
      <div className="max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-4 bg-white pb-2">
          <h2 id={titleId} className="text-heading font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
