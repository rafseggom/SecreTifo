/**
 * ParticipantRow (01-UI-SPEC §Component Contracts, §S4). One person in the lobby list.
 *
 * It renders a person and nothing else: no ordering and no grouping — the list is already
 * in query order (`nameNormalized`). The name WRAPS (`break-words`) and is never clipped to
 * a single line: the ellipsis-truncation class is forbidden on a person's name anywhere in
 * the phase. The row is at least 44px tall (the phase's minimum interactive target), so a
 * row that also carries badges stays tap-safe.
 *
 * The badges are the shared `Badge` primitive, never hand-painted: `Admin` marks the row
 * whose uid is the event's adminUid, `Pendiente` marks a row with no saved order yet (the
 * Admin panel reuses the same two in wave 6).
 */
import { Card } from './Card'
import { Badge } from './Badge'

type ParticipantRowProps = {
  name: string
  /** The current user's own row — suffixed `(tú)` so they can find themselves. */
  isMe?: boolean
  /** This row is the event's Admin. */
  isAdmin?: boolean
  /** This row has not saved an order yet. */
  isPending?: boolean
}

export function ParticipantRow({
  name,
  isMe = false,
  isAdmin = false,
  isPending = false,
}: ParticipantRowProps) {
  return (
    <Card className="flex min-h-11 items-center justify-between gap-4">
      <span className="text-body break-words text-slate-900">
        {name}
        {isMe ? ' (tú)' : ''}
      </span>
      {isAdmin || isPending ? (
        <span className="flex shrink-0 items-center gap-2">
          {isAdmin ? <Badge>Admin</Badge> : null}
          {isPending ? <Badge>Pendiente</Badge> : null}
        </span>
      ) : null}
    </Card>
  )
}
