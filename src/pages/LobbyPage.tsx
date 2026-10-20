/**
 * S4, full version (01-04 Task 3). The realtime roster: the count line, the participant
 * list with its explicit loading/empty/error states, and — for a browser that has
 * validated the shared Admin secret — the one action that starts the draw.
 *
 * The order is whatever the query returns (`nameNormalized`) — never the join timestamp,
 * which is `null` in the local snapshot and would misplace the row the current client just
 * wrote (Pitfall 10).
 *
 * When the event turns `drawn`, the session's pushed status makes this page return a
 * declarative `<Navigate>` to the reveal: the page never navigates by hand and never
 * schedules the transition (D-22).
 */
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Notice } from '../components/Notice'
import { Button } from '../components/Button'
import { ParticipantRow } from '../components/ParticipantRow'
import { DrawConfirmDialog } from '../components/DrawConfirmDialog'
import { useSession } from '../session/SessionProvider'
import { runDraw } from '../lib/draw'
import { errorCopy } from '../lib/errorCopy'
import { isAdminSecretValidated } from '../lib/session'
// Namespace import keeps the two listener callsites the only textual mention of them.
import * as lobby from '../lib/lobby'
import type { Participant } from '../domain/types'

export default function LobbyPage() {
  const { uid, eventStatus } = useSession()
  const navigate = useNavigate()

  const [participants, setParticipants] = useState<Participant[] | null>(null)
  const [adminUid, setAdminUid] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Each subscription's own unsubscribe is returned, so unmounting closes both.
    const unsubscribeParticipants = lobby.subscribeParticipants(
      (list) => {
        // A fresh snapshot means any previous read error is gone.
        setErrorCode('')
        setParticipants(list)
      },
      (code) => setErrorCode(code),
    )
    const unsubscribeEvent = lobby.subscribeEvent(
      (event) => setAdminUid(event ? event.adminUid : null),
      (code) => setErrorCode(code),
    )
    return () => {
      unsubscribeParticipants()
      unsubscribeEvent()
    }
  }, [reloadKey])

  // The draw only flips the event status; the subscription push moves every client on.
  if (eventStatus === 'drawn') {
    return <Navigate to="/reveal" replace />
  }

  const count = participants?.length ?? 0
  const shortfall = 3 - count
  const error = errorCode ? errorCopy(errorCode) : null

  async function handleConfirmDraw() {
    setSubmitting(true)
    setErrorCode('')
    try {
      await runDraw((participants ?? []).map((participant) => participant.uid))
    } catch (thrown) {
      const code =
        thrown instanceof Error && 'code' in thrown
          ? String((thrown as { code: unknown }).code)
          : 'unknown'
      setErrorCode(code)
      setDialogOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen title="Sala de espera">
      <p aria-live="polite" aria-atomic="true" className="mt-2 text-label text-slate-600 tabular-nums">
        {count === 1 ? '1 participante' : `${count} participantes`}
      </p>
      <p className="mt-1 text-label text-slate-600">La lista se actualiza sola.</p>

      <div className="mt-6 flex flex-col gap-2">
        {participants === null ? (
          <>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100 motion-reduce:animate-none"
              />
            ))}
            <p className="text-body text-slate-600">Cargando participantes…</p>
          </>
        ) : error ? (
          <Notice
            tone="error"
            action={
              error.canRetry ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    // Back to the skeleton while the listeners are re-armed.
                    setParticipants(null)
                    setReloadKey((key) => key + 1)
                  }}
                >
                  Reintentar
                </Button>
              ) : undefined
            }
          >
            {error.message}
          </Notice>
        ) : count === 0 ? (
          <Card>
            <h2 className="text-heading font-semibold text-slate-900">
              Todavía no hay nadie en la lista.
            </h2>
            <p className="mt-2 text-body text-slate-600">En cuanto alguien entre, aparecerá aquí.</p>
          </Card>
        ) : (
          participants.map((participant) => (
            <ParticipantRow
              key={participant.uid}
              name={participant.name}
              isMe={participant.uid === uid}
              isAdmin={participant.uid === adminUid}
              isPending={!participant.hasOrder}
            />
          ))
        )}
      </div>

      {isAdminSecretValidated() ? (
        <div className="mt-6 flex flex-col gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={count < 3}
            onClick={() => setDialogOpen(true)}
          >
            Empezar Sorteo
          </Button>
          {count < 3 ? (
            <Notice tone="warning">
              {`Necesitas al menos 3 participantes para sortear. Faltan ${shortfall}.`}
            </Notice>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => navigate('/admin')}>
            Panel del Admin
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-body text-slate-600">
            Cuando el Admin empiece el sorteo, aparecerá aquí a quién regalas.
          </p>
          {count < 3 ? (
            <Notice tone="warning">
              {`El sorteo necesita al menos 3 participantes. Aún faltan ${shortfall}.`}
            </Notice>
          ) : null}
        </div>
      )}

      <DrawConfirmDialog
        open={dialogOpen}
        count={count}
        submitting={submitting}
        onConfirm={handleConfirmDraw}
        onCancel={() => setDialogOpen(false)}
      />
    </Screen>
  )
}
