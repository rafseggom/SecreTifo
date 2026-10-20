/**
 * Admin Setup Page — creates the event if it doesn't exist.
 * This is a fallback for when the Admin wants to create the event before anyone joins.
 * In normal flow, the event is created when the first participant registers.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { useSession } from '../session/SessionProvider'
import { setAdminSecretValidated } from '../lib/session'
import { supabase } from '../lib/supabase'

const INVALID_SECRET_COPY = 'Clave secreta inválida. Inténtalo de nuevo.'
const CREATE_ERROR_COPY = 'No se ha podido crear el evento.'

function errorCopy(code: string): { message: string; canRetry: boolean } {
  if (code === 'permission-denied' || code === '42501') {
    return { message: 'No tienes permiso para crear el evento.', canRetry: false }
  }
  if (code === 'unavailable' || code === '57P01' || code === '57P02' || code === '57P03') {
    return { message: 'Sin conexión. Vuelve a intentarlo cuando recuperes la red.', canRetry: true }
  }
  if (code === 'resource-exhausted' || code === '53200' || code === '53201' || code === '53202') {
    return { message: 'Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde.', canRetry: false }
  }
  return { message: CREATE_ERROR_COPY, canRetry: true }
}

export default function AdminSetupPage() {
  const navigate = useNavigate()
  const { eventStatus } = useSession()

  const [secret, setSecret] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // An existing event must not be re-created. The route guard renders this page in
  // that state when the local admin flag is missing, so point the user at the login
  // instead of showing a form whose `insert` would write to a live event.
  if (eventStatus !== null && !submitting) {
    return (
      <Screen title="El evento ya existe" titleRole="display">
        <p className="mt-2 text-body text-slate-600">
          Ya hay un evento creado. Introduce la contraseña de administrador para entrar al panel.
        </p>

        <Card className="mt-6">
          <Button variant="primary" className="w-full" onClick={() => navigate('/admin/login')}>
            Entrar al panel
          </Button>
        </Card>
      </Screen>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = secret.trim()
    setFieldError('')
    setFormError('')

    if (!trimmed) {
      setFieldError('Escribe la clave secreta.')
      inputRef.current?.focus()
      return
    }

    // Validate secret against VITE_ADMIN_SECRET
    if (trimmed !== import.meta.env.VITE_ADMIN_SECRET) {
      setFieldError(INVALID_SECRET_COPY)
      inputRef.current?.focus()
      return
    }

    setSubmitting(true)

    try {
      // Create events/main row
      const { error } = await supabase.from('event').insert({
        id: 'main',
        admin_secret_validated: true,
        status: 'lobby',
        created_at: new Date().toISOString(),
        participant_count: 0,
      })
      if (error) throw error

      // Success: persist the admin gate now
      setAdminSecretValidated()
    } catch (thrown) {
      const code =
        thrown instanceof Error && 'code' in thrown
          ? String((thrown as { code: unknown }).code)
          : 'unknown'
      const { message, canRetry } = errorCopy(code)
      setFormError(message)
      if (canRetry) {
        // The form error will show with a Reintentar button
      }
      setSubmitting(false)
    }
  }

  return (
    <Screen title="Crear evento SecreTifo" titleRole="display">
      <p className="mt-2 text-body text-slate-600">
        Eres el organizador. Define la clave del evento y crea la sala para que tus amigos se unan.
      </p>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <Field
            label="Clave secreta del Admin"
            error={fieldError || undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                ref={inputRef}
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                aria-describedby={describedBy}
                invalid={invalid}
                enterKeyHint="go"
              />
            )}
          </Field>

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
            {submitting ? 'Creando evento…' : 'Crear evento'}
          </Button>
        </form>
      </Card>
    </Screen>
  )
}