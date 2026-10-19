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
import { SizeGuideModal } from '../components/SizeGuideModal'
import { useSession } from '../session/SessionProvider'
import { clearIdentity, loadIdentity } from '../lib/session'
import { ERR_EVENT_CLOSED, ERR_NAME_RACE, ERR_NAME_TAKEN, joinEvent } from '../lib/joinEvent'
import type { Size } from '../domain/types'

export default function PreferencesPage() {
  const navigate = useNavigate()
  const { uid, name: sessionName } = useSession()

  const stored = loadIdentity()
  const name = stored?.name ?? sessionName

  const [size, setSize] = useState<Size | ''>('')
  const [likedTeams, setLikedTeams] = useState('')
  const [forbiddenTeams, setForbiddenTeams] = useState('')
  const [sizeError, setSizeError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  function handleChangeName() {
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
      await joinEvent(uid, name, { size, likedTeams, forbiddenTeams })
      navigate('/lobby')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      const known =
        message === ERR_NAME_TAKEN || message === ERR_NAME_RACE || message === ERR_EVENT_CLOSED
      setFormError(known ? message : 'No hemos podido unirte al evento.')
      setSubmitting(false)
    }
  }

  return (
    <Screen title="Tus preferencias" stickyCta>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-slate-600">
        <span className="break-words">Entrarás como {name}</span>
        <Button type="button" variant="ghost" onClick={handleChangeName}>
          Cambiar nombre
        </Button>
      </p>

      <Card className="mt-6">
        <form id="prefs-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
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

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setGuideOpen(true)}
          >
            Guía de Tallas
          </Button>
        </form>
      </Card>

      {formError ? (
        <div className="mt-4">
          <Notice
            tone="error"
            action={
              <Button type="submit" form="prefs-form" variant="secondary" loading={submitting}>
                Reintentar
              </Button>
            }
          >
            {formError}
          </Notice>
        </div>
      ) : null}

      <div className="sticky bottom-0 mt-6 bg-dominant pt-4 sm:static sm:bg-transparent sm:pt-0">
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

      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </Screen>
  )
}
