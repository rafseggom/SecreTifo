/**
 * SizeGuideModal (01-UI-SPEC §S3, §Component Contracts).
 *
 * The literal reference surface of the provider's spec. The body order is fixed:
 *
 *   1. the Fan table
 *   2. the Player table
 *   3. the three amber notes (exactly three)
 *
 * The title is locked to `Guía de Tallas`, and both the table rows and the three
 * notes are published exactly as they arrive. The provider's two anomalies are
 * FLAGGED, never corrected — which is precisely what D-12 requires and what the
 * spec asks the vendor to confirm (REQUIREMENTS.md:88).
 *
 * This is static content: there is no loading, empty or error state and no fetch
 * of any kind. The same component, title and content serve the preferences form
 * and the order form's size helper (wave 5).
 */
import { Modal } from './Modal'
import { Notice } from './Notice'
import { FAN_TABLE, PLAYER_TABLE, SizeGuideTable } from './SizeGuideTable'

type SizeGuideModalProps = {
  open: boolean
  onClose: () => void
}

export function SizeGuideModal({ open, onClose }: SizeGuideModalProps) {
  return (
    <Modal
      title="Guía de Tallas"
      open={open}
      onClose={onClose}
      className="size-guide-modal"
      maxHeight="max-h-[80vh]"
    >
      <div className="flex flex-col gap-6">
        <SizeGuideTable {...FAN_TABLE} />
        <SizeGuideTable {...PLAYER_TABLE} />

        <div className="flex flex-col gap-3">
          <Notice tone="warning">La camiseta Retro usa la tabla de la Versión Fan.</Notice>
          <Notice tone="warning">En la Versión Player, la tabla del proveedor llega hasta 2XL; no hay equivalencia para XXXL.</Notice>
          <Notice tone="warning">En la Versión Player, M y L comparten el mismo rango de peso en los datos del proveedor.</Notice>
        </div>
      </div>
    </Modal>
  )
}
