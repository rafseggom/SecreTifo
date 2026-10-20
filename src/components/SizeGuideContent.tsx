/**
 * SizeGuideContent (01-UI-SPEC §S3, §Component Contracts).
 *
 * The literal reference surface of the provider's spec. The body order is fixed:
 *
 *   1. the Fan table
 *   2. the Player table
 *   3. the amber notes (exactly three)
 *
 * It is shared by the inline preferences guide and (if a future screen needs it)
 * any dialog. The title belongs to the host section, so this component only owns
 * the content.
 */
import { Notice } from './Notice'
import { FAN_TABLE, PLAYER_TABLE, SizeGuideTable } from './SizeGuideTable'

export function SizeGuideContent() {
  return (
    <div className="flex flex-col gap-8">
      <SizeGuideTable {...FAN_TABLE} />
      <SizeGuideTable {...PLAYER_TABLE} />

      <div className="flex flex-col gap-3">
        <Notice tone="warning">La camiseta Retro usa la tabla de la Versión Fan.</Notice>
        <Notice tone="warning">
          En la Versión Player, la tabla del proveedor llega hasta 2XL; no hay equivalencia para
          XXXL.
        </Notice>
        <Notice tone="warning">
          En la Versión Player, M y L comparten el mismo rango de peso en los datos del proveedor.
        </Notice>
      </div>
    </div>
  )
}
