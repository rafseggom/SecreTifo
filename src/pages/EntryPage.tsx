/**
 * S1 — Login/Registro (01-UI-SPEC §S1).
 *
 * Dos modos:
 * - Usuario Nuevo: nombre + PIN (doble) → preferencias
 * - Login: lista de usuarios existentes → click en tu nombre → PIN → acceso
 *
 * El PIN se hashea y guarda en localStorage hasta que se crea el documento en PreferencesPage.
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
import { loginParticipantByNameNormalized, ERR_WRONG_PIN, ERR_PROFILE_CLAIMED } from '../lib/joinEvent'
import { normalizeName } from '../domain/normalizeName'
import { isValidPin, sanitizePin, hashPin } from '../domain/pin'
import type { Participant } from '../domain/types'

const PIN_HELPER = 'De 4 a 6 dígitos. Te lo pediremos la próxima vez que entres.'

export default function EntryPage() {
  const navigate = useNavigate()
  const { eventStatus, retryIdentity } = useSession()

  // Modo principal: 'choice' | 'register' | 'login-select' | 'login-pin'
  const [mode, setMode] = useState<'choice' | 'register' | 'login-select' | 'login-pin'>('choice')

  // Registro
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  // Login - selección de usuario
  const [participants, setParticipants] = useState<Participant[] | null>(null)
  const [selectedNameNormalized, setSelectedNameNormalized] = useState('')

  // Login - PIN
  const [loginPin, setLoginPin] = useState('')

  // Errores
  const [nameError, setNameError] = useState('')
  const [pinError, setPinError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [loginPinError, setLoginPinError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const loginPinRef = useRef<HTMLInputElement>(null)

  // Cargar participantes para la lista de login
  useEffect(() => {
    // No need for uid anymore - we just need the list
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
  }, [])

  // Helpers de navegación entre modos
  function goRegister() {
    setMode('register')
    setName('')
    setPin('')
    setConfirmPin('')
    clearErrors()
  }

  function goLoginSelect() {
    setMode('login-select')
    clearErrors()
  }

  function goLoginPin(nameNormalized: string) {
    setSelectedNameNormalized(nameNormalized)
    setMode('login-pin')
    setLoginPin('')
    setLoginPinError('')
  }

  function goBackToChoice() {
    setMode('choice')
    clearErrors()
  }

  function clearErrors() {
    setNameError('')
    setPinError('')
    setConfirmError('')
    setLoginPinError('')
    setFormError('')
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = name.trim()
    const nextNameError = !trimmed || !normalizeName(trimmed) ? 'Escribe tu nombre para entrar.' : ''
    const nextPinError = !isValidPin(pin) ? 'Elige un PIN de 4 a 6 dígitos.' : ''
    const nextConfirmError = confirmPin !== pin ? 'Los PIN no coinciden.' : ''

    setNameError(nextNameError)
    setPinError(nextPinError)
    setConfirmError(nextConfirmError)
    setFormError('')

    if (nextNameError) { nameRef.current?.focus(); return }
    if (nextPinError) { pinRef.current?.focus(); return }
    if (nextConfirmError) { confirmRef.current?.focus(); return }

    setSubmitting(true)

    try {
      // Hash del PIN y guardado en localStorage
      const pinHash = await hashPin(pin)
      const nameNormalized = normalizeName(trimmed)
      saveIdentity({ name: trimmed, nameNormalized, pinHash })
      markUnlocked(nameNormalized)
      // Refresh session to pick up the new identity
      retryIdentity()
      navigate('/preferences')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      if (message.includes('PIN') || message.includes('navegador')) {
        setFormError(message)
      } else {
        setFormError('No hemos podido unirte al evento.')
      }
      setSubmitting(false)
    }
  }

  async function handleLoginPinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginPinError('')

    if (!isValidPin(loginPin)) {
      setLoginPinError('Escribe tu PIN de 4 a 6 dígitos.')
      loginPinRef.current?.focus()
      return
    }

    if (!selectedNameNormalized) return

    setSubmitting(true)

    try {
      const participant = await loginParticipantByNameNormalized(selectedNameNormalized, loginPin)

      // Save identity with PIN hash for future unlocks
      saveIdentity({
        name: participant.name,
        nameNormalized: participant.nameNormalized,
        pinHash: participant.pinHash,
      })
      markUnlocked(participant.nameNormalized)

      // Navigate based on event status
      if (eventStatus === 'drawn') {
        navigate('/reveal')
      } else {
        navigate('/lobby')
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      if (message === ERR_WRONG_PIN) {
        setLoginPinError('PIN incorrecto. Inténtalo de nuevo.')
        setLoginPin('')
        loginPinRef.current?.focus()
      } else if (message === ERR_PROFILE_CLAIMED) {
        setFormError('Este perfil ya tiene dueño. Contacta al Admin si crees que es un error.')
      } else if (message.includes('PIN') || message.includes('navegador')) {
        setLoginPinError(message)
      } else {
        setFormError('No hemos podido entrar. Inténtalo de nuevo.')
      }
      setSubmitting(false)
    }
  }

  // Render según modo
  if (mode === 'choice') {
    return (
      <Screen title="Amigo invisible" titleRole="display">
        <p className="mt-3 max-w-[36ch] text-body text-pretty text-muted-foreground">
          Camisetas, sorteo y cero spoilers. Entra con tu nombre y PIN.
        </p>

        <Card className="mt-8 flex flex-col gap-4">
          <Button
            type="button"
            variant="primary"
            className="w-full py-4 text-lg"
            onClick={goRegister}
          >
            Usuario Nuevo
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full py-4 text-lg"
            onClick={goLoginSelect}
            disabled={!participants || participants.length === 0}
          >
            Login
          </Button>
        </Card>

        {participants && participants.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border/80 bg-surface/60 p-4">
            <p className="text-label font-medium text-foreground">Ya están dentro</p>
            <p className="mt-1 text-label text-pretty text-muted-foreground">
              {participants.map(p => p.name).join(' · ')}
            </p>
          </div>
        )}
      </Screen>
    )
  }

  if (mode === 'register') {
    return (
      <Screen title="Nuevo usuario" titleRole="display">
        <p className="mt-3 max-w-[36ch] text-body text-pretty text-muted-foreground">
          Escribe tu nombre y elige un PIN para crear tu perfil.
        </p>

        <Card className="mt-8">
          <form onSubmit={handleRegisterSubmit} noValidate className="flex flex-col gap-5">
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
              <Notice tone="error">
                {formError}
              </Notice>
            ) : null}

            <div className="flex flex-col gap-3">
              <Button type="submit" variant="primary" loading={submitting} className="w-full">
                {submitting ? 'Creando…' : 'Continuar a preferencias'}
              </Button>
              <Button type="button" variant="ghost" onClick={goBackToChoice} className="w-full">
                Volver
              </Button>
            </div>
          </form>
        </Card>
      </Screen>
    )
  }

  if (mode === 'login-select') {
    const userList = participants ?? []

    return (
      <Screen title="Login" titleRole="display">
        <p className="mt-3 max-w-[36ch] text-body text-pretty text-muted-foreground">
          Selecciona tu perfil e introduce tu PIN.
        </p>

        <Card className="mt-8">
          <div className="flex flex-col gap-3">
            {userList.length === 0 ? (
              <p className="text-body text-slate-600 text-center py-4">
                No hay participantes en este evento.
              </p>
            ) : (
              userList.map((participant) => (
                <Button
                  key={participant.nameNormalized}
                  type="button"
                  variant="secondary"
                  className="w-full justify-start py-3 text-left gap-3"
                  onClick={() => goLoginPin(participant.nameNormalized)}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-heading font-semibold text-accent"
                  >
                    {participant.name.trim().charAt(0).toLocaleUpperCase('es') || '?'}
                  </span>
                  <span className="text-body font-medium text-foreground truncate">{participant.name}</span>
                </Button>
              ))
            )}

            <div className="pt-2">
              <Button type="button" variant="ghost" onClick={goBackToChoice} className="w-full">
                Volver
              </Button>
            </div>
          </div>
        </Card>
      </Screen>
    )
  }

  // mode === 'login-pin'
  const selectedParticipant = participants?.find(p => p.nameNormalized === selectedNameNormalized)
  const selectedName = selectedParticipant?.name ?? 'Usuario'
  const selectedInitial = selectedName.trim().charAt(0).toLocaleUpperCase('es') || '?'

  return (
    <Screen title="Login" titleRole="display">
      <p className="mt-3 max-w-[36ch] text-body text-pretty text-muted-foreground">
        Introduce tu PIN para acceder como <strong>{selectedName}</strong>.
      </p>

      <Card className="mt-8">
        <div className="flex items-center gap-3 mb-6">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/10 text-heading font-semibold text-accent"
          >
            {selectedInitial}
          </span>
          <p className="text-heading font-semibold text-foreground">{selectedName}</p>
        </div>

        <form onSubmit={handleLoginPinSubmit} noValidate className="flex flex-col gap-5">
          <Field
            label="PIN de acceso"
            helper="El que usaste al registrarte."
            error={loginPinError || undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                ref={loginPinRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={6}
                autoFocus
                enterKeyHint="go"
                value={loginPin}
                onChange={(event) => setLoginPin(sanitizePin(event.target.value))}
                aria-describedby={describedBy}
                invalid={invalid}
                className="text-center tracking-[0.45em]"
              />
            )}
          </Field>

          {formError ? (
            <Notice tone="error">
              {formError}
            </Notice>
          ) : null}

          <div className="flex flex-col gap-3">
            <Button type="submit" variant="primary" loading={submitting} className="w-full">
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
            <Button type="button" variant="ghost" onClick={goLoginSelect} className="w-full">
              Cambiar de usuario
            </Button>
          </div>
        </form>
      </Card>
    </Screen>
  )
}