/**
 * SizeGuideTable (01-UI-SPEC §S3, §Component Contracts).
 *
 * ONE component with two data props, never two near-identical components. The
 * two configurations below are the only place the tables' shape is declared, and
 * both read their rows straight from the provider data exported by
 * `src/domain/sizeGuide.ts`. No row is transcribed here, no value is completed,
 * rounded, renamed or hidden — including the provider's largest row, which is
 * published exactly as the spec has it.
 *
 * Responsive contract: below `sm` each table becomes ONE card per size carrying a
 * `<dl>` of label/value pairs (zero horizontal scrolling at 320px); at `≥sm` it is
 * a real `<table>` with `<caption>` and `<th scope="col">`. Column headers are the
 * phase's single non-role use of weight 600.
 *
 * Anomaly badges (ámbar) rendered inline for Player XXXL (unavailable) and
 * Player M/L (ambiguous weight) per D-10.
 */
import { FAN_GUIDE, PLAYER_GUIDE, isSizeUnavailableForKit, hasAmbiguousWeight } from '../domain/sizeGuide'
import { Badge } from './Badge'

type GuideRow = {
  readonly size: string
  readonly longCm: string
  readonly heightCm: string
  readonly weightKg: string
  readonly equiv?: string
  readonly widthCm?: string
}

type GuideColumn = {
  readonly label: string
  readonly get: (row: GuideRow) => string
}

type SizeGuideTableProps = {
  readonly caption: string
  readonly columns: readonly GuideColumn[]
  readonly rows: readonly GuideRow[]
  readonly kitType?: 'Fan' | 'Player'
}

const FAN_COLUMNS: readonly GuideColumn[] = [
  { label: 'Talla', get: (row) => row.size },
  { label: 'Equivalencia', get: (row) => row.equiv ?? '' },
  { label: 'Largo (cm)', get: (row) => row.longCm },
  { label: 'Altura (cm)', get: (row) => row.heightCm },
  { label: 'Peso (kg)', get: (row) => row.weightKg },
]

const PLAYER_COLUMNS: readonly GuideColumn[] = [
  { label: 'Talla', get: (row) => row.size },
  { label: 'Largo (cm)', get: (row) => row.longCm },
  { label: 'Ancho (cm)', get: (row) => row.widthCm ?? '' },
  { label: 'Altura (cm)', get: (row) => row.heightCm },
  { label: 'Peso (kg)', get: (row) => row.weightKg },
]

export const FAN_TABLE: SizeGuideTableProps = {
  caption: 'Versión Fan',
  columns: FAN_COLUMNS,
  rows: FAN_GUIDE,
  kitType: 'Fan',
}

export const PLAYER_TABLE: SizeGuideTableProps = {
  caption: 'Versión Player',
  columns: PLAYER_COLUMNS,
  rows: PLAYER_GUIDE,
  kitType: 'Player',
}

function AnomalyBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="warning" className="ml-2 shrink-0">
      {children}
    </Badge>
  )
}

export function SizeGuideTable({ caption, columns, rows, kitType }: SizeGuideTableProps) {
  const isPlayer = kitType === 'Player'

  return (
    <div className="overflow-x-auto">
      <table className="hidden w-full text-left sm:table size-guide-table">
        <caption className="pb-2 text-label font-semibold text-slate-900">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className="border-b border-slate-200 py-3 pr-3 text-label font-semibold text-slate-900 sticky top-0 z-10 bg-white"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.size}>
              {columns.map((column) => (
                <td
                  key={column.label}
                  className="border-b border-slate-200 py-3 pr-3 align-top text-body text-slate-900"
                >
                  {column.get(row)}
                  {isPlayer && column.label === 'Talla' && (
                    <>
                      {isSizeUnavailableForKit('Player', row.size as any) && (
                        <AnomalyBadge>No disponible en Player</AnomalyBadge>
                      )}
                      {hasAmbiguousWeight('Player', row.size as any) && (
                        <AnomalyBadge>Rango de peso idéntico en datos del proveedor</AnomalyBadge>
                      )}
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Below `sm`: one card per size. Never a horizontally scrolling table. */}
      <ul className="flex flex-col gap-3 sm:hidden size-guide-cards">
        {rows.map((row) => (
          <li key={row.size}>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <p className="text-body font-semibold text-slate-900">{row.size}</p>
                {isPlayer && (
                  <>
                    {isSizeUnavailableForKit('Player', row.size as any) && (
                      <AnomalyBadge>No disponible en Player</AnomalyBadge>
                    )}
                    {hasAmbiguousWeight('Player', row.size as any) && (
                      <AnomalyBadge>Rango de peso idéntico en datos del proveedor</AnomalyBadge>
                    )}
                  </>
                )}
              </div>
              <dl className="mt-2 flex flex-col gap-1">
                {columns.slice(1).map((column) => (
                  <div key={column.label} className="flex justify-between gap-4">
                    <dt className="text-label text-slate-600">{column.label}</dt>
                    <dd className="text-label text-slate-900">{column.get(row)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
