/**
 * Admin Setup Page — creates the event with the organiser's anonymous uid as adminUid.
 *
 * Flow: validate secret → ensureSignedIn() → create events/main (adminUid, status=lobby, participantCount=0)
 * Redirects to /admin/login on success. No participant document is created for the admin (D-03).
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { ensureSignedIn } from '../lib/session'
import { db } from '../lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const INVALID_SECRET_COPY = 'Clave secreta inválida. Inténtalo de nuevo.'
const CREATE_ERROR_COPY = 'No se ha podido crear el evento.'
const PERMISSION_COPY = 'No tienes permiso para crear el evento.'

function errorCopy(code: string): { message: string; canRetry: boolean } {
  if (code === 'permission-denied') {
    return { message: PERMISSION_COPY, canRetry: false }
  }
  if (code === 'unavailable') {
    return { message: 'Sin conexión. Vuelve a intentarlo cuando recuperes la red.', canRetry: true }
  }
  if (code === 'resource-exhausted') {
    return { message: 'Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde.', canRetry: false }
  }
  return { message: CREATE_ERROR_COPY, canRetry: true }
}

export default function AdminSetupPage() {
  const navigate = useNavigate()

  const [secret, setSecret] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

    // Validate secret against VITE_ADMIN_SECRET (D-01, D-04)
    if (trimmed !== import.meta.env.VITE_ADMIN_SECRET) {
      setFieldError(INVALID_SECRET_COPY)
      inputRef.current?.focus()
      return
    }

    setSubmitting(true)

    try {
      // Get anonymous uid (D-02)
      const uid = await ensureSignedIn()

      // Create events/main document (D-06) - admin is NOT a participant (D-03)
      await setDoc(doc(db, 'events/main'), {
        adminUid: uid,
        status: 'lobby',
        createdAt: serverTimestamp(),
        participantCount: 0,
      })

      // Success: redirect to /admin/login (D-02 step 2)
      navigate('/admin/login')
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
    <Screen title="Crear evento SecretKit" titleRole="display">
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