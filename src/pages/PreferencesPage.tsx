/**
 * S2 — Preferencias (01-UI-SPEC §S2).
 *
 * The one screen that creates the participant document, and therefore the only
 * place the size is required: the `create` rule asserts the size enum, so a
 * participant without a size is impossible by construction.
 *
 * The size options come from `SIZES` (`src/domain/sizeGuide.ts`) through `Select`
 * — no option list is written in this file. The two team fields are optional free
 * text: they are stored literally (an empty field is the empty string, never
 * `null`/`undefined`), they are never parsed as a delimited list, and they are
 * rendered wrapped wherever they appear.
 *
 * The four distinguishable failures render in the form's error slot with the
 * fields still editable. The three thrown copies are consumed as the constants
 * `joinEvent.ts` exports, so the copy shown and the error thrown cannot drift.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { SizeGuideContent } from '../components/SizeGuideContent'
import { TextButton } from '../components/TextButton'
import { useSession } from '../session/SessionProvider'
import { clearIdentity, loadIdentity } from '../lib/session'
import { ERR_EVENT_CLOSED, ERR_NAME_RACE, ERR_NAME_TAKEN, joinEvent } from '../lib/joinEvent'
import { errorCopy } from '../lib/errorCopy'
import type { Size } from '../domain/types'

export default function PreferencesPage() {
  const navigate = useNavigate()
  const { uid, name: sessionName, loading: sessionLoading } = useSession()

  const stored = loadIdentity()
  const name = stored?.name ?? sessionName

  const [size, setSize] = useState<Size | ''>('')
  const [likedTeams, setLikedTeams] = useState('')
  const [forbiddenTeams, setForbiddenTeams] = useState('')
  const [sizeError, setSizeError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  function handleChangeName() {
    // clearIdentity also clears the per-tab unlock flag, so the next identity
    // cannot inherit this tab's unlocked state.
    clearIdentity()
    navigate('/')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Never disabled for validation: pressing the CTA is what reveals the error.
    if (!size) {
      setFormError('')
      setSizeError('Elige tu talla para continuar.')
      selectRef.current?.focus()
      return
    }

    if (!uid) return

    setSizeError('')
    setFormError('')
    setSubmitting(true)

    try {
      await joinEvent(uid, name, {
        size,
        likedTeams,
        forbiddenTeams,
        pinHash: stored?.pinHash,
      })
      navigate('/lobby')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      const known =
        message === ERR_NAME_TAKEN || message === ERR_NAME_RACE || message === ERR_EVENT_CLOSED
      if (known) {
        setFormError(message)
      } else {
        const code =
          cause instanceof Error && 'code' in cause
            ? String((cause as { code: unknown }).code)
            : 'unknown'
        const { message: errMessage } = errorCopy(code)
        setFormError(errMessage)
        // If retryable, the Notice action will handle re-submit
      }
      setSubmitting(false)
    }
  }

  return (
    <Screen title="Tus preferencias">
      {sessionLoading ? (
        // Loading skeleton while session resolves
        <Card className="mt-6 animate-pulse">
          <div className="flex flex-col gap-6">
            <div className="h-10 w-3/4 rounded bg-border motion-reduce:animate-none" />
            <div className="h-10 w-1/2 rounded bg-border motion-reduce:animate-none" />
            <div className="h-10 w-1/4 rounded bg-border motion-reduce:animate-none" />
            <div className="h-12 w-full rounded bg-border motion-reduce:animate-none" />
          </div>
        </Card>
      ) : (
        <>
          <p className="mt-3 text-body text-pretty text-muted-foreground">
            Cuéntanos qué camiseta te gustaría. Quien te regale lo verá, pero nunca sabrás quién es
            hasta que llegue el momento.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-border bg-surface/70 px-4 py-3">
            <p className="text-label text-muted-foreground">
              Entrarás como{' '}
              <span className="break-words font-semibold text-foreground">{name}</span>
            </p>
            <TextButton onClick={handleChangeName}>Cambiar nombre</TextButton>
          </div>

          <Card className="mt-5">
            <form id="prefs-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <Field label="Tu talla" required error={sizeError || undefined}>
                {({ id, describedBy, invalid }) => (
                  <Select
                    id={id}
                    ref={selectRef}
                    placeholder="Elige una talla"
                    value={size}
                    onChange={(event) => setSize(event.target.value as Size | '')}
                    aria-describedby={describedBy}
                    invalid={invalid}
                  />
                )}
              </Field>

              <Field
                label="Equipos que te gustan"
                helper="Opcional. Escríbelos separados por comas."
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="text"
                    maxLength={200}
                    value={likedTeams}
                    onChange={(event) => setLikedTeams(event.target.value)}
                    aria-describedby={describedBy}
                    invalid={invalid}
                  />
                )}
              </Field>

              <Field
                label="Equipos que NO quieres"
                helper="Opcional. Quien te regale evitará estos equipos."
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="text"
                    maxLength={200}
                    value={forbiddenTeams}
                    onChange={(event) => setForbiddenTeams(event.target.value)}
                    aria-describedby={describedBy}
                    invalid={invalid}
                  />
                )}
              </Field>
            </form>
          </Card>

          {formError ? (
            <div className="mt-4">
              <Notice
                tone="error"
                action={
                  <Button
                    type="submit"
                    form="prefs-form"
                    variant="secondary"
                    loading={submitting}
                  >
                    Reintentar
                  </Button>
                }
              >
                {formError}
              </Notice>
            </div>
          ) : null}

          <div className="mt-5">
            <Button
              type="submit"
              form="prefs-form"
              variant="primary"
              loading={submitting}
              className="w-full"
            >
              {submitting ? 'Uniéndome…' : 'Unirme al evento'}
            </Button>
          </div>

          {/* #6: the guide is no longer a modal behind a button — it is always here,
              so the size decision and its reference live on the same screen. */}
          <section className="mt-12" aria-labelledby="size-guide-title">
            <h2
              id="size-guide-title"
              className="text-heading font-semibold tracking-[-0.015em] text-foreground"
            >
              Guía de tallas
            </h2>
            <p className="mt-2 text-label text-pretty text-muted-foreground">
              Medidas del proveedor, tal cual nos las pasó. La versión Retro usa la tabla Fan.
            </p>
            <div className="mt-5">
              <SizeGuideContent />
            </div>
          </section>
        </>
      )}
    </Screen>
  )
}
