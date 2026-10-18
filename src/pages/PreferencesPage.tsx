/**
 * S2, thin version (01-01 Task 5). The required size plus the optional team
 * preferences, and the actual join through `joinEvent`.
 *
 * The pending name comes from the identity stored by S1 (`loadIdentity()`); the
 * session's own `name` is the fallback for a participant whose document already
 * exists on another device. 01-03 replaces this file with the full S2 (identity
 * recap, size-guide trigger, the four distinguishable failure copies and the
 * shared `isNameTaken` pre-check).
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { useSession } from '../session/SessionProvider'
import { loadIdentity } from '../lib/session'
import { joinEvent } from '../lib/joinEvent'
import type { Size } from '../domain/types'

/**
 * The size enum offered to participants. 01-02 supersedes this with the single
 * source of truth in `src/domain/sizeGuide.ts` (`SIZES`) when the size-guide
 * tables land; until then the list lives here so this screen has no hand-written
 * option literal inside its markup.
 */
const SIZES: readonly Size[] = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']

export default function PreferencesPage() {
  const navigate = useNavigate()
  const { uid, name: sessionName } = useSession()

  const stored = loadIdentity()
  const name = stored?.name ?? sessionName

  const [size, setSize] = useState<Size | ''>('')
  const [likedTeams, setLikedTeams] = useState('')
  const [forbiddenTeams, setForbiddenTeams] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Never disabled for validation: pressing the CTA is what reveals the error.
    if (!size) {
      setError('Elige tu talla para continuar.')
      selectRef.current?.focus()
      return
    }

    if (!uid) return

    setError('')
    setSubmitting(true)

    try {
      await joinEvent(uid, name, { size, likedTeams, forbiddenTeams })
      navigate('/lobby')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No hemos podido unirte al evento.')
      setSubmitting(false)
    }
  }

  return (
    <Screen title="Tus preferencias">
      <Card className="mt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="talla" className="text-label text-slate-900">
              Tu talla
            </label>
            <select
              id="talla"
              ref={selectRef}
              value={size}
              onChange={(event) => setSize(event.target.value as Size | '')}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'form-error' : undefined}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <option value="" disabled>
                Elige una talla
              </option>
              {SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="equipos-gustan" className="text-label text-slate-900">
              Equipos que te gustan
            </label>
            <input
              id="equipos-gustan"
              type="text"
              maxLength={200}
              value={likedTeams}
              onChange={(event) => setLikedTeams(event.target.value)}
              aria-describedby="equipos-gustan-helper"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            />
            <p id="equipos-gustan-helper" className="text-label text-slate-600">
              Opcional. Escríbelos separados por comas.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="equipos-prohibidos" className="text-label text-slate-900">
              Equipos que NO quieres
            </label>
            <input
              id="equipos-prohibidos"
              type="text"
              maxLength={200}
              value={forbiddenTeams}
              onChange={(event) => setForbiddenTeams(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            />
          </div>

          {error ? (
            <p id="form-error" role="alert" className="text-label text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            aria-busy={submitting ? true : undefined}
            disabled={submitting}
            className="h-11 w-full rounded-lg bg-indigo-600 px-4 text-base font-semibold text-white focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {submitting ? 'Uniéndome…' : 'Unirme al evento'}
          </button>
        </form>
      </Card>
    </Screen>
  )
}
