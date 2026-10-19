/**
 * DrawConfirmDialog (01-UI-SPEC §S4, §Copywriting Contract). The phase's ONLY destructive
 * confirmation, and the only consumer of the `danger` Button variant.
 *
 * It presents; it does not run the draw: the caller owns the count, the in-flight flag and
 * the confirm handler. Initial focus goes to «Cancelar» so a mis-tap on the lobby button
 * cannot cost an irreversible draw; while the transaction is in flight the confirm button
 * is in its loading state and BOTH buttons are disabled — the UI's only defence against a
 * double tap, on top of the transaction's own idempotence.
 */
import { Modal } from './Modal'
import { Button } from './Button'

type DrawConfirmDialogProps = {
  open: boolean
  count: number
  submitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DrawConfirmDialog({
  open,
  count,
  submitting,
  onConfirm,
  onCancel,
}: DrawConfirmDialogProps) {
  return (
    <Modal title="Empezar Sorteo" open={open} onClose={onCancel}>
      <p className="text-body text-slate-900">
        {`Se sorteará entre ${count} participantes. Nadie verá quién regala a quién y no se puede deshacer.`}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" autoFocus disabled={submitting} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" variant="danger" loading={submitting} disabled={submitting} onClick={onConfirm}>
          Empezar el sorteo
        </Button>
      </div>
    </Modal>
  )
}
