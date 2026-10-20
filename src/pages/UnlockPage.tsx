/**
 * Pantalla de desbloqueo.
 *
 * Aparece cuando hay una identidad guardada con PIN y la pestaña todavía no se ha
 * desbloqueado. La lista de participantes da contexto ("quién está dentro") y
 * permite confirmar el perfil; el selector solo puede entrar con el `uid` anónimo
 * de este navegador, porque Firestore autoriza por `request.auth.uid`. El resto de
 * perfiles se muestran con una explicación honesta en vez de un error genérico.
 *
 * El PIN se comprueba contra el hash del documento (o el local si el documento aún
 * no existe). Un PIN incorrecto no navega ni marca la pestaña como desbloqueada.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { TextButton } from '../components/TextButton'
import { listParticipants } from '../lib/lobby'
import { markUnlocked } from '../lib/session'
import { isValidPin, sanitizePin, verifyPin } from '../domain/pin'
import type { Participant, StoredIdentity } from '../domain/types'

type UnlockPageProps = {
  stored: StoredIdentity & { pinHash: string }
  onUnlocked: () => void
  onSwitchUser: () => void
}

const OTHER_DEVICE_COPY =
  'Ese perfil se registró en otro dispositivo. Aquí solo puedes entrar con el perfil vinculado a este navegador.'

export default function UnlockPage({ stored, onUnlocked, onSwitchUser }: UnlockPageProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedUid, setSelectedUid] = useState(stored.uid)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false

    void listParticipants()
      .then((list) => {
        if (cancelled) return
        setParticipants(list)
        // Keep the stored profile selected even if the roster read came back empty.
        setSelectedUid((current) => (list.some((person) => person.uid === current) ? current : stored.uid))
      })
      .catch(() => {
        // The PIN still works from the local hash; the roster is only a label.
      })

    return () => {
      cancelled = true
    }
  }, [stored.uid])

  // The stored profile must always be selectable, even before the participant
  // document exists (the PIN is chosen on S1 and the document is created on S2).
  const options = participants.some((person) => person.uid === stored.uid)
    ? participants
    : [{ uid: stored.uid, name: stored.name }, ...participants]

  const selected = options.find((person) => person.uid === selectedUid) ?? options[0]
  const selectedIsStored = selected.uid === stored.uid
  const selectedInitial = selected.name.trim().charAt(0).toLocaleUpperCase('es') || '?'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPinError('')

    if (!selectedIsStored) return

    if (!isValidPin(pin)) {
      setPinError('Escribe tu PIN de 4 a 6 dígitos.')
      pinRef.current?.focus()
      return
    }

    setSubmitting(true)

    try {
      const rosterHash = participants.find((person) => person.uid === stored.uid)?.pinHash
      const valid = await verifyPin(pin, rosterHash ?? stored.pinHash)

      if (!valid) {
        setPinError('PIN incorrecto. Inténtalo de nuevo.')
        setPin('')
        setSubmitting(false)
        pinRef.current?.focus()
        return
      }

      markUnlocked(stored.uid)
      onUnlocked()
    } catch {
      setPinError('No hemos podido comprobar el PIN. Inténtalo de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <Screen title="Hola de nuevo" titleRole="display">
      <p className="mt-3 max-w-[36ch] text-body text-pretty text-muted-foreground">
        Elige tu perfil e introduce tu PIN para volver a entrar.
      </p>

      <Card className="mt-8">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/10 text-heading font-semibold text-accent"
          >
            {selectedInitial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-heading font-semibold text-foreground">{selected.name}</p>
            <p className="text-label text-muted-foreground">
              {selectedIsStored ? 'Tu perfil en este dispositivo' : 'Perfil de otro dispositivo'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
          <Field label="¿Quién eres?">
            {({ id, describedBy }) => (
              <Select
                id={id}
                options={options.map((person) => person.uid)}
                optionLabels={Object.fromEntries(
                  options.map((person) => [person.uid, person.name]),
                )}
                placeholder="Elige tu perfil"
                value={selectedUid}
                onChange={(event) => {
                  setSelectedUid(event.target.value)
                  setPin('')
                  setPinError('')
                }}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          {selectedIsStored ? (
            <>
              <Field
                label="PIN de acceso"
                helper="El que elegiste la primera vez."
                error={pinError || undefined}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    ref={pinRef}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={6}
                    autoFocus
                    enterKeyHint="go"
                    value={pin}
                    onChange={(event) => setPin(sanitizePin(event.target.value))}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    className="text-center tracking-[0.45em]"
                  />
                )}
              </Field>

              <Button type="submit" variant="primary" loading={submitting} className="w-full">
                {submitting ? 'Comprobando…' : 'Entrar'}
              </Button>
            </>
          ) : (
            <Notice
              tone="info"
              action={
                <Button type="button" variant="secondary" onClick={() => setSelectedUid(stored.uid)}>
                  {`Entrar como ${stored.name}`}
                </Button>
              }
            >
              {OTHER_DEVICE_COPY}
            </Notice>
          )}
        </form>
      </Card>

      <p className="mt-5 text-label text-muted-foreground">
        El PIN protege tu perfil en este navegador.{' '}
        <TextButton onClick={onSwitchUser}>{`No soy ${stored.name}`}</TextButton>
      </p>
    </Screen>
  )
}
