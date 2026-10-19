/**
 * ParticipantTableRow — tabular view of a participant for the Admin panel.
 *
 * Renders as a table row on ≥sm, stacked cards on <sm (responsive).
 * Includes Liberar button with Modal confirmation when eventStatus === 'lobby' && !hasOrder.
 */
import { useState } from 'react'
import { Badge } from './Badge'
import { Button } from './Button'
import { Modal } from './Modal'
import type { Participant } from '../domain/types'

interface ParticipantTableRowProps {
  participant: Participant & { uid: string }
  onLiberar: (uid: string, name: string) => void
  showLiberar: boolean
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}

export function ParticipantTableRow({
  participant,
  onLiberar,
  showLiberar,
}: ParticipantTableRowProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleLiberarClick = () => {
    setDialogOpen(true)
  }

  const handleConfirmLiberar = () => {
    onLiberar(participant.uid, participant.name)
    setDialogOpen(false)
  }

  const hasOrder = participant.hasOrder
  const estadoLabel = hasOrder ? '✓ Completado' : '✗ Pendiente'
  const estadoTone = hasOrder ? 'success' : 'warning'

  // Truncate teams for table view, full text in tooltip
  const MAX_TEAMS_LENGTH = 30
  const likedTeamsDisplay = participant.likedTeams ? truncate(participant.likedTeams, MAX_TEAMS_LENGTH) : '—'
  const forbiddenTeamsDisplay = participant.forbiddenTeams ? truncate(participant.forbiddenTeams, MAX_TEAMS_LENGTH) : '—'

  // Responsive: table row on ≥sm, stacked card on <sm
  return (
    <>
      {/* Table row (≥sm) */}
      <div className="hidden sm:table-row">
        <td className="px-3 py-2 text-body text-slate-900 break-words">{participant.name}</td>
        <td className="px-3 py-2 whitespace-nowrap"><Badge>{participant.size}</Badge></td>
        <td className="px-3 py-2 text-body text-slate-600 max-w-xs truncate" title={participant.likedTeams || '—'}>
          {likedTeamsDisplay}
        </td>
        <td className="px-3 py-2 text-body text-slate-600 max-w-xs truncate" title={participant.forbiddenTeams || '—'}>
          {forbiddenTeamsDisplay}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <Badge className={estadoTone === 'success' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}>
            {estadoLabel}
          </Badge>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          {showLiberar ? (
            <Button variant="danger" size="sm" onClick={handleLiberarClick}>
              Liberar
            </Button>
          ) : (
            <span className="text-label text-slate-400">—</span>
          )}
        </td>
      </div>

      {/* Stacked card (<sm) */}
      <div className="sm:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-label text-slate-500">Nombre</span>
              <p className="text-body text-slate-900 break-words">{participant.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-label text-slate-500">Talla</span>
              <Badge>{participant.size}</Badge>
            </div>
            <div>
              <span className="text-label text-slate-500">Pref.</span>
              <p className="text-body text-slate-600 break-words" title={participant.likedTeams || '—'}>
                {participant.likedTeams || '—'}
              </p>
            </div>
            <div>
              <span className="text-label text-slate-500">Proh.</span>
              <p className="text-body text-slate-600 break-words" title={participant.forbiddenTeams || '—'}>
                {participant.forbiddenTeams || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-label text-slate-500">Estado</span>
              <Badge className={estadoTone === 'success' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}>
                {estadoLabel}
              </Badge>
            </div>
            {showLiberar && (
              <Button variant="danger" className="w-full" onClick={handleLiberarClick}>
                Liberar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmation */}
      <Modal
        title="Liberar participante"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      >
        <p className="text-body text-slate-600">
          Esto eliminará a {participant.name} del evento. ¿Continuar?
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDialogOpen(false)} autoFocus>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmLiberar}>
            Liberar
          </Button>
        </div>
      </Modal>
    </>
  )
}