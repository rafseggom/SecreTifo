/**
 * ORDER-03 / D-17 — the reference price table (01-UI-SPEC §S6).
 *
 * Three aligned rows, never cards, `tabular-nums` so the figures line up. Every value
 * is read from `PRICES` through `formatPrice`: no price is transcribed here, so if the
 * literal in the domain module ever changes, the table changes with it.
 */
import { PRICES, formatPrice } from '../domain/prices'
import type { KitType } from '../domain/types'

/** The literal kit labels, in the spec's reference order (Fan · Player · Retro). */
const KIT_LABELS: Record<KitType, string> = {
  Fan: 'Camiseta Fan',
  Player: 'Camiseta Player',
  Retro: 'Camiseta Retro',
}

export function PriceTable() {
  const kits = Object.keys(PRICES) as KitType[]

  return (
    <div>
      <h2 className="text-heading font-semibold text-slate-900">Precios de referencia</h2>
      <dl className="mt-3 flex flex-col gap-2">
        {kits.map((kit) => (
          <div key={kit} className="flex items-center justify-between gap-4">
            <dt className="text-body text-slate-600">{KIT_LABELS[kit]}</dt>
            <dd className="text-body font-semibold text-slate-900 tabular-nums">
              {formatPrice(kit)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
