/**
 * Admin Login Page — validates the secret and sets localStorage flag for persistence.
 *
 * Flow: validate secret → setAdminSecretValidated() → redirect to /admin
 * The anonymous uid from /admin/setup persists in Firebase Auth (IndexedDB).
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { isAdminSecretValidated, setAdminSecretValidated } from '../lib/session'

const INVALID_SECRET_COPY = 'Clave secreta inválida. Inténtalo de nuevo.'

export default function AdminLoginPage() {
  const navigate = useNavigate()

  // If already validated, redirect immediately to /admin (avoid showing login again)
  if (isAdminSecretValidated()) {
    navigate('/admin', { replace: true })
    return null
  }

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

    // Valid secret: set localStorage flag and redirect to /admin
    setAdminSecretValidated()
    navigate('/admin', { replace: true })
  }

  return (
    <Screen title="Acceso Admin" titleRole="display">
      <p className="mt-2 text-body text-slate-600">
        Introduce la clave secreta para ver el panel de pedidos.
      </p>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <Field
            label="Clave secreta"
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
            {submitting ? 'Accediendo…' : 'Acceder'}
          </Button>
        </form>
      </Card>
    </Screen>
  )
}