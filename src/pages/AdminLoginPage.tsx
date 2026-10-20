/**
 * Admin Login Page — validates the shared admin password ("admin123") and sets the localStorage flag.
 *
 * Flow: validate password → setAdminSecretValidated() → redirect to /admin
 * Any browser with the password may enter.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { setAdminSecretValidated } from '../lib/session'

const ADMIN_PASSWORD = 'admin123'
const INVALID_SECRET_COPY = 'Contraseña incorrecta. Inténtalo de nuevo.'

export default function AdminLoginPage() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = password.trim()
    setFieldError('')

    if (!trimmed) {
      setFieldError('Escribe la contraseña.')
      inputRef.current?.focus()
      return
    }

    // Validate password
    if (trimmed !== ADMIN_PASSWORD) {
      setFieldError(INVALID_SECRET_COPY)
      inputRef.current?.focus()
      return
    }

    setSubmitting(true)

    // Valid password on any browser: persist the gate and enter.
    setAdminSecretValidated()
    navigate('/admin', { replace: true })
  }

  return (
    <Screen title="Acceso Admin" titleRole="display">
      <p className="mt-2 text-body text-slate-600">
        Introduce la contraseña de administrador para ver el panel de pedidos.
      </p>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <Field
            label="Contraseña"
            error={fieldError || undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                ref={inputRef}
                type="password"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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