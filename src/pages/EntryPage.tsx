/**
 * S1 — Entrada (01-UI-SPEC §S1).
 *
 * Captures the name and nothing else. **No document is created here**: the
 * `create` rule asserts `size in ['S','M','L','XL','XXL','XXXL']`, so a participant
 * document cannot exist without a size. That is why the join happens on S2, and
 * why a half-joined participant is impossible by construction. It is a contract,
 * not an implementation detail, and this screen must not "fix" it by writing an
 * early document.
 *
 * The duplicate pre-check calls the SAME `isNameTaken` the join transaction
 * calls, so the two can never diverge. A taken name is answered in the form's
 * error slot and the focus returns to the input — the name is never auto-suffixed,
 * never numbered and never merged (D-02).
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
import { saveIdentity } from '../lib/session'
import { ERR_NAME_TAKEN, isNameTaken } from '../lib/joinEvent'
import { normalizeName } from '../domain/normalizeName'

export default function EntryPage() {
  const navigate = useNavigate()
  const { uid } = useSession()

  const [name, setName] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = name.trim()

    // Empty — and a name that normalises to the empty string — is the empty case.
    if (!trimmed || !normalizeName(trimmed)) {
      setFormError('')
      setFieldError('Escribe tu nombre para entrar.')
      inputRef.current?.focus()
      return
    }

    setFieldError('')
    setFormError('')

    // WR-01: without a uid there is nothing to join and nothing to persist. The old
    // `uid ?? ''` wrote a placeholder identity into localStorage, which every later
    // render read as "not signed in" — a form that looked like it worked.
    if (!uid) {
      setFormError('No hemos podido unirte al evento.')
      return
    }

    setSubmitting(true)

    try {
      if (await isNameTaken(trimmed, uid)) {
        setFieldError(ERR_NAME_TAKEN)
        setSubmitting(false)
        inputRef.current?.focus()
        return
      }

      // The pending name is what `/preferences` reads back through loadIdentity().
      saveIdentity({ uid, name: trimmed })
      navigate('/preferences')
    } catch {
      setFormError('No hemos podido unirte al evento.')
      setSubmitting(false)
    }
  }

  return (
    <Screen title="SecretKit" titleRole="display">
      <p className="mt-2 text-body text-slate-600">
        Amigo invisible entre amigos. Solo necesitas tu nombre.
      </p>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <Field
            label="Tu nombre"
            helper="Solo necesitas tu nombre. Sin contraseñas."
            error={fieldError || undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                ref={inputRef}
                type="text"
                autoComplete="name"
                autoFocus
                maxLength={40}
                enterKeyHint="go"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-describedby={describedBy}
                invalid={invalid}
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
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </Screen>
  )
}
