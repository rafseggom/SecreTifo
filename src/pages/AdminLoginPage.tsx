/**
 * Admin Login Page — validates the shared admin secret and sets the localStorage flag.
 *
 * Flow: validate secret → setAdminSecretValidated() → redirect to /admin
 * Any browser with the secret may enter; the browser's anonymous uid is irrelevant
 * under the shared-password model.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { setAdminSecretValidated } from '../lib/session'

const INVALID_SECRET_COPY = 'Clave secreta inválida. Inténtalo de nuevo.'

export default function AdminLoginPage() {
  const navigate = useNavigate()

  const [secret, setSecret] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = secret.trim()
    setFieldError('')

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

    // Valid secret on any browser: persist the gate and enter.
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

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            {submitting ? 'Accediendo…' : 'Acceder'}
          </Button>
        </form>
      </Card>
    </Screen>
  )
}