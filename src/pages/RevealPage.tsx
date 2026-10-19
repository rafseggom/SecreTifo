/**
 * S5 — Revelar (/reveal). The screen where the giver discovers whom they gift, with that
 * person's real preferences, plus the order form (S6).
 *
 * Access here is a route guard only (App.tsx redirects unless the event is drawn); the
 * Firestore rules are the authority (01-PATTERNS §5: guards are UX, not access control).
 *
 * The pairing is obtained in exactly one way: a document read by id. There is no
 * reference of the enumerating kind and no query here — the rules deny the enumeration to
 * everyone, the Admin included, so such a read would fail for every user.
 *
 * Two reads, chained and never concurrent: `useMyAssignment(uid)` yields the recipient id,
 * and only then is the recipient's document read (its id is unknown before that first read
 * resolves).
 *
 * Copy is contract, and so is this: user-supplied names and teams wrap, and the
 * single-line-clipping class is forbidden on them anywhere in the phase.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Notice } from '../components/Notice'
import { Button } from '../components/Button'
import { JerseyOrderForm } from '../components/JerseyOrderForm'
import { useSession } from '../session/SessionProvider'
import { useMyAssignment } from '../hooks/useMyAssignment'
import { getParticipant } from '../lib/lobby'
import { errorCopy } from '../lib/errorCopy'
import type { Participant } from '../domain/types'

/** Filler for a preference the recipient never declared (D-14): a row, never a gap. */
const UNSTATED = 'Sin indicar'

/**
 * WR-05: the recipient's document can legitimately be absent (a partial restore, an
 * operator delete, or the post-draw window WR-03 closes). `getParticipant` returns
 * `null` for that case instead of throwing, so it must be recorded as a terminal
 * state of its own — inferring it from `recipient === null` left the screen on
 * «Buscando a quién regalas…» forever.
 */
const RECIPIENT_NOT_FOUND = 'not-found'

export default function RevealPage() {
  const navigate = useNavigate()
  const { uid, role } = useSession()
  const [reloadKey, setReloadKey] = useState(0)

  if (!uid) return null

  return (
    <RevealBody
      key={reloadKey}
      uid={uid}
      isAdmin={role === 'admin'}
      onGoAdmin={() => navigate('/admin')}
      onRetry={() => setReloadKey((key) => key + 1)}
    />
  )
}

type RevealBodyProps = {
  uid: string
  isAdmin: boolean
  onGoAdmin: () => void
  onRetry: () => void
}

function RevealBody({ uid, isAdmin, onGoAdmin, onRetry }: RevealBodyProps) {
  const { loading, error, assignment, missing } = useMyAssignment(uid)
  const [recipient, setRecipient] = useState<Participant | null>(null)
  const [recipientError, setRecipientError] = useState('')
  // The second read is tracked EXPLICITLY (WR-05): `recipient === null` cannot tell
  // "still in flight" apart from "resolved with no document".
  const [recipientLoaded, setRecipientLoaded] = useState(false)

  useEffect(() => {
    if (!assignment) return
    let cancelled = false

    void (async () => {
      try {
        const person = await getParticipant(assignment)
        if (cancelled) return
        if (person === null) {
          setRecipientError(RECIPIENT_NOT_FOUND)
        } else {
          setRecipient(person)
          setRecipientError('')
        }
        setRecipientLoaded(true)
      } catch (thrown) {
        if (cancelled) return
        const code =
          thrown instanceof Error && 'code' in thrown
            ? String((thrown as { code: unknown }).code)
            : 'unknown'
        setRecipientError(code)
        setRecipientLoaded(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [assignment])

  const code =
    error ??
    (recipientError && recipientError !== RECIPIENT_NOT_FOUND ? recipientError : null)
  const failure = code ? errorCopy(code) : null
  const recipientMissing = recipientError === RECIPIENT_NOT_FOUND
  const pendingRead = loading || (assignment !== null && !recipientLoaded && !recipientError)

  if (pendingRead) return <RevealLoading />
  if (failure) return <RevealError message={failure.message} canRetry={failure.canRetry} onRetry={onRetry} />
  if (missing || recipientMissing) return <RevealMissing onRetry={onRetry} />
  if (!recipient) return <RevealMissing onRetry={onRetry} />

  return (
    <Screen
      title={
        <span className="block break-words">
          {'Te ha tocado regalar a '}
          <strong className="font-semibold break-words">{recipient.name}</strong>
        </span>
      }
      titleRole="display"
    >
      <p className="mt-2 text-label text-slate-600">
        Solo tú puedes ver a quién regalas. Nadie más, tampoco el Admin.
      </p>

      <Card className="mt-6 flex flex-col gap-4">
        <h2 className="text-heading font-semibold text-slate-900">Sus preferencias</h2>
        <PreferenceRow label="Talla" value={recipient.size} />
        <PreferenceRow label="Equipos que le gustan" value={recipient.likedTeams} />
        <PreferenceRow label="Equipos que NO quiere" value={recipient.forbiddenTeams} />
      </Card>

      <section className="mt-8 flex flex-col gap-4">
        <h2 className="text-heading font-semibold text-slate-900">Tu pedido</h2>
        <JerseyOrderForm
          recipientSize={recipient.size}
          recipientName={recipient.name}
          uid={uid}
        />
      </section>

      {isAdmin ? (
        <div className="mt-6">
          <Button type="button" variant="secondary" onClick={onGoAdmin}>
            Panel del Admin
          </Button>
        </div>
      ) : null}
    </Screen>
  )
}

function PreferenceRow({ label, value }: { label: string; value: string }) {
  const shown = value.trim() === '' ? UNSTATED : value

  return (
    <div className="flex flex-col gap-1">
      <span className="text-label text-slate-600">{label}</span>
      <span className="text-body break-words text-slate-900">{shown}</span>
    </div>
  )
}

function RevealLoading() {
  return (
    <Screen title="Buscando a quién regalas…" titleRole="display">
      <Card className="mt-6 h-24 animate-pulse bg-slate-100 motion-reduce:animate-none">{null}</Card>
    </Screen>
  )
}

function RevealError({
  message,
  canRetry,
  onRetry,
}: {
  message: string
  canRetry: boolean
  onRetry: () => void
}) {
  return (
    <Screen title="Tu revelación">
      <div className="mt-6">
        <Notice
          tone="error"
          action={
            canRetry ? (
              <Button type="button" variant="secondary" onClick={onRetry}>
                Reintentar
              </Button>
            ) : undefined
          }
        >
          {message}
        </Notice>
      </div>
    </Screen>
  )
}

/**
 * WR-07: this state is reachable only when the event is already `drawn` (App.tsx gates
 * `/reveal` on it) and `LobbyPage` immediately bounces a drawn event back to `/reveal`, so
 * the UI-SPEC's mandated «Ir a la sala de espera» action was a guaranteed no-op by
 * construction. The action is therefore «Reintentar» (the deck's S8 retry action, UI-SPEC
 * §556), and the explanatory line names the one step that actually helps. This is a
 * deliberate deviation from `01-UI-SPEC.md:524`; the notice itself is kept verbatim.
 */
function RevealMissing({ onRetry }: { onRetry: () => void }) {
  return (
    <Screen title="Tu revelación">
      <div className="mt-6">
        <Notice
          tone="error"
          action={
            <Button type="button" variant="secondary" onClick={onRetry}>
              Reintentar
            </Button>
          }
        >
          No encontramos tu asignación.
        </Notice>
        <p className="mt-3 text-body text-slate-600">
          Vuelve a intentarlo. Si el problema continúa, avisa al Admin.
        </p>
      </div>
    </Screen>
  )
}
