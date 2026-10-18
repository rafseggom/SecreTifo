/**
 * S1, thin version (01-01 Task 5). Captures the name and nothing else.
 *
 * **No Firestore write happens on this screen.** The `create` rule asserts
 * `size in ['S','M','L','XL','XXL','XXXL']`, so a participant document cannot exist
 * without a size — which is why the join happens on `/preferences` and why a
 * half-joined participant is impossible by construction. This is a contract, not
 * an implementation detail.
 *
 * 01-03 replaces this file with the full S1 (the shared `isNameTaken` pre-check,
 * the submit states and the S8 identity states).
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { useSession } from '../session/SessionProvider'
import { saveIdentity } from '../lib/session'

export default function EntryPage() {
  const navigate = useNavigate()
  const { uid } = useSession()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Escribe tu nombre para entrar.')
      inputRef.current?.focus()
      return
    }

    setError('')
    // The pending name is what `/preferences` reads back through loadIdentity().
    saveIdentity({ uid: uid ?? '', name: trimmed })
    navigate('/preferences')
  }

  return (
    <Screen title="SecretKit" titleRole="display">
      <p className="mt-2 text-body text-slate-600">
        Amigo invisible entre amigos. Solo necesitas tu nombre.
      </p>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="nombre" className="text-label text-slate-900">
              Tu nombre
            </label>
            <input
              id="nombre"
              ref={inputRef}
              type="text"
              autoComplete="name"
              autoFocus
              maxLength={40}
              enterKeyHint="go"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'nombre-error' : 'nombre-helper'}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            />
            <p id="nombre-helper" className="text-label text-slate-600">
              Solo necesitas tu nombre. Sin contraseñas.
            </p>
            {error ? (
              <p id="nombre-error" role="alert" className="text-label text-red-700">
                {error}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-indigo-600 px-4 text-base font-semibold text-white focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            Entrar
          </button>
        </form>
      </Card>
    </Screen>
  )
}
