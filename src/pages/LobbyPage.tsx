/**
 * S4, thin version (01-01 Task 5). The live roster: the count line plus one row per
 * participant, refreshed by the participants listener.
 *
 * The order is whatever the query returns (`nameNormalized`) — never the join
 * timestamp, which is `null` in the local snapshot and would misplace the row the
 * current client just wrote (Pitfall 10).
 *
 * 01-04 replaces this file with the full S4 (empty/loading/error states, the
 * `Pendiente` badge, the minimum-of-3 notice, the draw block and the exit to
 * `/reveal` when the event turns `drawn`).
 */
import { useEffect, useState } from 'react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { useSession } from '../session/SessionProvider'
// Namespace import keeps the single listener callsite the only textual mention of it.
import * as lobby from '../lib/lobby'
import type { Participant } from '../domain/types'

export default function LobbyPage() {
  const { uid, role } = useSession()
  const [participants, setParticipants] = useState<Participant[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // The listener's own unsubscribe is returned, so unmounting closes it.
    const unsubscribe = lobby.subscribeParticipants((list) => setParticipants(list), () => {
      setError('No hemos podido cargar el grupo.')
    })
    return unsubscribe
  }, [])

  const count = participants?.length ?? 0

  return (
    <Screen title="Sala de espera">
      <p aria-live="polite" aria-atomic="true" className="mt-2 text-label text-slate-600 tabular-nums">
        {count === 1 ? '1 participante' : `${count} participantes`}
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {participants === null ? (
          <p className="text-body text-slate-600">Cargando participantes…</p>
        ) : null}

        {error ? (
          <p role="status" className="text-body text-red-800">
            {error}
          </p>
        ) : null}

        {participants?.map((participant) => {
          const isMe = participant.uid === uid
          // `role` is derived from `event.adminUid === uid`, so `isMe && role === 'admin'`
          // is exactly "this row's uid is the event's adminUid" with the frozen session shape.
          const isAdmin = isMe && role === 'admin'

          return (
            <Card key={participant.uid} className="flex items-center justify-between gap-4">
              <span className="text-body text-slate-900 break-words">
                {participant.name}
                {isMe ? ' (tú)' : ''}
              </span>
              {isAdmin ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-label text-slate-700">
                  Admin
                </span>
              ) : null}
            </Card>
          )
        })}
      </div>
    </Screen>
  )
}
