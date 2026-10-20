/**
 * S1 — Entrada (01-UI-SPEC §S1).
 *
 * Captures the name, a 4–6 digit PIN and nothing else. **No participant document is
 * created here**: the `create` rule asserts the size enum, so a participant cannot
 * exist without a size. That is why the join happens on S2, and why a half-joined
 * participant is impossible by construction.
 *
 * The PIN is hashed here and travels in the local identity until `joinEvent` writes
 * it into `participants/{uid}`. It is a lock for this browser, not a server
 * credential: Firestore still authorises by `request.auth.uid`.
 *
 * The duplicate pre-check calls the SAME `isNameTaken` the join transaction calls,
 * so the two can never diverge. A taken name is answered in the form's error slot
 * and the focus returns to the input — the name is never auto-suffixed.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { useSession } from '../session/SessionProvider'
import { markUnlocked, saveIdentity } from '../lib/session'
import { listParticipants } from '../lib/lobby'
import { ERR_NAME_TAKEN, isNameTaken } from '../lib/joinEvent'
import { normalizeName } from '../domain/normalizeName'
import { hashPin, isValidPin, sanitizePin } from '../domain/pin'
import type { Participant } from '../domain/types'

const PIN_HELPER = 'De 4 a 6 dígitos. Te lo pediremos la próxima vez que entres.'

export default function EntryPage() {
  const navigate = useNavigate()
  const { uid } = useSession()

  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [nameError, setNameError] = useState('')
  const [pinError, setPinError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [participants, setParticipants] = useState<Participant[] | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  // A gentle "who is already in" hint. It is never a login selector: the real
  // returning-user path is the unlock screen, where the per-browser uid is known.
  useEffect(() => {
    if (!uid) return
    let cancelled = false

    void listParticipants()
      .then((list) => {
        if (!cancelled) setParticipants(list)
      })
      .catch(() => {
        if (!cancelled) setParticipants(null)
      })

    return () => {
      cancelled = true
    }
  }, [uid])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = name.trim()
    const nextNameError = !trimmed || !normalizeName(trimmed) ? 'Escribe tu nombre para entrar.' : ''
    const nextPinError = !isValidPin(pin) ? 'Elige un PIN de 4 a 6 dígitos.' : ''
    const nextConfirmError = confirmPin !== pin ? 'Los PIN no coinciden.' : ''

    setNameError(nextNameError)
    setPinError(nextPinError)
    setConfirmError(nextConfirmError)
    setFormError('')

    if (nextNameError) {
      nameRef.current?.focus()
      return
    }
    if (nextPinError) {
      pinRef.current?.focus()
      return
    }
    if (nextConfirmError) {
      confirmRef.current?.focus()
      return
    }

    if (!uid) {
      setFormError('No hemos podido unirte al evento.')
      return
    }

    setSubmitting(true)

    try {
      if (await isNameTaken(trimmed, uid)) {
        setNameError(ERR_NAME_TAKEN)
        setSubmitting(false)
        nameRef.current?.focus()
        return
      }

      const pinHash = await hashPin(pin)

      // The pending name + PIN hash are what `/preferences` reads back through
      // loadIdentity(). The document itself is created on S2, when the size exists.
      saveIdentity({ uid, name: trimmed, pinHash })
      markUnlocked(uid)
      navigate('/preferences')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      setFormError(
        message.includes('PIN') || message.includes('navegador')
          ? message
          : 'No hemos podido unirte al evento.',
      )
      setSubmitting(false)
    }
  }

  const registeredNames = (participants ?? []).map((participant) => participant.name)

  return (
    <Screen title="Amigo invisible" titleRole="display">
      <p className="mt-3 max-w-[36ch] text-body text-pretty text-muted-foreground">
        Camisetas, sorteo y cero spoilers. Entra con tu nombre y un PIN para que nadie
        pueda usar tu perfil.
      </p>

      <Card className="mt-8">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <Field
            label="Tu nombre"
            helper="Así te verán los demás."
            error={nameError || undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                ref={nameRef}
                type="text"
                autoComplete="name"
                autoFocus
                maxLength={40}
                enterKeyHint="next"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </Field>

          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="flex-1">
              <Field label="PIN de acceso" helper={PIN_HELPER} error={pinError || undefined}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    ref={pinRef}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={6}
                    enterKeyHint="next"
                    value={pin}
                    onChange={(event) => setPin(sanitizePin(event.target.value))}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    className="text-center tracking-[0.45em]"
                  />
                )}
              </Field>
            </div>

            <div className="flex-1">
              <Field
                label="Repite el PIN"
                helper="Para asegurarnos de que no hay erratas."
                error={confirmError || undefined}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    ref={confirmRef}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={6}
                    enterKeyHint="go"
                    value={confirmPin}
                    onChange={(event) => setConfirmPin(sanitizePin(event.target.value))}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    className="text-center tracking-[0.45em]"
                  />
                )}
              </Field>
            </div>
          </div>

          {formError ? (
            <Notice
              tone="error"
              action={
                <Button type="submit" variant="secondary" loading={submitting}>
                  Reintentar
                </Button>
              }
            >
              {formError}
            </Notice>
          ) : null}

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card>

      {registeredNames.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-border/80 bg-surface/60 p-4">
          <p className="text-label font-medium text-foreground">Ya están dentro</p>
          <p className="mt-1 text-label text-pretty text-muted-foreground">
            {registeredNames.join(' · ')}
          </p>
          <p className="mt-2 text-label text-muted-foreground">
            ¿Ya te uniste? Abre SecretKit en el mismo dispositivo donde entraste y te pedirá tu
            PIN.
          </p>
        </div>
      ) : null}
    </Screen>
  )
}
