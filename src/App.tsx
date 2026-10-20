/**
 * Routing shell + redirect-by-state and the lost-identity surface.
 * Declarative mode (no data router).
 *
 * Route guards are UX, not access control — the Supabase RLS policies are the authority.
 *
 * The lost-identity state is resolved BEFORE the routes. When the stored identity
 * no longer matches the session (e.g., user cleared localStorage), rendering the routes
 * would either drop the person on an empty screen or re-join them incorrectly.
 * So no route renders until they take the one way back to the entry page.
 */
import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { loadIdentity, isAdminSecretValidated, clearIdentity, isUnlocked, markUnlocked } from './lib/session'
import { useSession } from './session/SessionProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FullScreenSpinner } from './components/FullScreenSpinner'
import { Screen } from './components/Screen'
import { Notice } from './components/Notice'
import { Button } from './components/Button'
import { sanitizePin, isValidPin, verifyPin } from './domain/pin'
import EntryPage from './pages/EntryPage'
import PreferencesPage from './pages/PreferencesPage'
import LobbyPage from './pages/LobbyPage'
import RevealPage from './pages/RevealPage'
import AdminPage from './pages/AdminPage'
import AdminSetupPage from './pages/AdminSetupPage'
import AdminLoginPage from './pages/AdminLoginPage'

export default function App() {
  const { loading, nameNormalized, hasPreferences, eventStatus, error: sessionError, retryIdentity } =
    useSession()
  const [identityCleared, setIdentityCleared] = useState(false)
  // Bumped after a successful unlock so the gate re-renders without a reload.
  const [unlockTick, setUnlockTick] = useState(0)
  // App reads localStorage during render, and <Routes> alone does not
  // re-render App on navigation. Without this, "/" and "/preferences" kept the
  // `element` computed with the identity from BEFORE the form saved it, so the
  // user stayed on the name input (and «Cambiar nombre» bounced back).
  const location = useLocation()
  void unlockTick

  // Never a blank screen before the first server response.
  if (loading) return <FullScreenSpinner />

  // WR-01 (binding must-have of 01-01): a failed identity resolution renders NO route.
  // The entry form would otherwise look healthy while every attempt silently could not
  // work, and submitting it persisted `{ nameNormalized: '' }`.
  if (sessionError) {
    return (
      <ErrorBoundary>
        <Screen title="SecreTifo">
          <div className="mt-6">
            <Notice
              tone="error"
              action={
                <Button type="button" variant="secondary" onClick={retryIdentity}>
                  Reintentar
                </Button>
              }
            >
              Algo ha ido mal.
            </Notice>
          </div>
        </Screen>
      </ErrorBoundary>
    )
  }

  const stored = loadIdentity()
  const identityLost = stored !== null && nameNormalized !== '' && stored.nameNormalized !== nameNormalized
  const identityPresent = stored !== null && nameNormalized !== '' && stored.nameNormalized === nameNormalized

  const joinedHome = !hasPreferences
    ? '/preferences'
    : eventStatus === 'drawn'
      ? '/reveal'
      : '/lobby'
  const home = identityPresent ? joinedHome : '/'

  if (identityLost && !identityCleared) {
    return (
      <ErrorBoundary>
        <Screen title="No encontramos tu identidad en este evento.">
          <div className="mt-6">
            <Notice tone="error">
              Vuelve a entrar con tu nombre. Si ya está en uso, avisa al Admin para que lo libere.
            </Notice>
          </div>
          {eventStatus === 'drawn' ? (
            <p className="mt-4 text-body text-slate-600">
              El sorteo ya se ha realizado; no se puede volver a entrar.
            </p>
          ) : (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  clearIdentity()
                  setIdentityCleared(true)
                  setUnlockTick((tick) => tick + 1)
                }}
              >
                Volver a entrar
              </Button>
            </div>
          )}
        </Screen>
      </ErrorBoundary>
    )
  }

  // A stored identity with a PIN stays locked until the tab is unlocked. This runs
  // BEFORE the routes: no page may render its data behind an unverified PIN.
  const lockedIdentity =
    stored && stored.pinHash
      ? { name: stored.name, nameNormalized: stored.nameNormalized, pinHash: stored.pinHash }
      : null

  if (identityPresent && lockedIdentity && !isUnlocked(lockedIdentity.nameNormalized)) {
    return (
      <ErrorBoundary>
        <Screen title="Introduce tu PIN para continuar">
          <p className="mt-2 text-body text-slate-600">
            Para acceder como <strong>{lockedIdentity.name}</strong>, introduce tu PIN.
          </p>
          <UnlockPage
            stored={lockedIdentity}
            onUnlocked={() => setUnlockTick((tick) => tick + 1)}
            onSwitchUser={() => {
              clearIdentity()
              setIdentityCleared(true)
              setUnlockTick((tick) => tick + 1)
            }}
          />
        </Screen>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <Routes location={location}>
        <Route
          path="/"
          element={identityPresent ? <Navigate to={joinedHome} replace /> : <EntryPage />}
        />
        <Route
          path="/preferences"
          element={
            identityPresent ? (
              hasPreferences ? (
                <Navigate to={joinedHome} replace />
              ) : (
                <PreferencesPage />
              )
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/lobby"
          element={
            identityPresent && hasPreferences ? <LobbyPage /> : <Navigate to={home} replace />
          }
        />
        <Route
          path="/reveal"
          element={
            identityPresent && eventStatus === 'drawn' ? (
              <RevealPage />
            ) : (
              <Navigate to={home} replace />
            )
          }
        />
        <Route
          path="/admin/setup"
          element={
            /*
              Admin setup: accessible while no event exists, and also while the Admin
              secret has not been validated yet.
            */
            eventStatus === null || !isAdminSecretValidated() ? (
              <AdminSetupPage />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />
        <Route
          path="/admin/login"
          element={
            /*
              Admin login: accessible whenever the event exists and the local panel
              flag is missing. The shared password is the only requirement.
              Allow access even if user has participant identity (they can be both).
            */
            eventStatus !== null && !isAdminSecretValidated() ? (
              <AdminLoginPage />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            /*
              IN-05: the panel is the Admin's surface (UI-SPEC S7). The guard is the
              shared-password flag, not the uid: any browser that entered the secret
              may open it. RLS authorizes the panel operations, so this guard is UX, not the authority.
              Pairing privacy is enforced by the assignments RLS and is unchanged.
            */
            eventStatus !== null && isAdminSecretValidated() ? (
              <AdminPage />
            ) : (
              <Navigate to={home} replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

/**
 * Simple inline UnlockPage component - no separate file needed.
 */
function UnlockPage({
  stored,
  onUnlocked,
  onSwitchUser,
}: {
  stored: { name: string; nameNormalized: string; pinHash: string }
  onUnlocked: () => void
  onSwitchUser: () => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!isValidPin(pin)) {
      setError('Escribe tu PIN de 4 a 6 dígitos.')
      inputRef.current?.focus()
      return
    }

    setSubmitting(true)

    try {
      const valid = await verifyPin(pin, stored.pinHash)
      if (!valid) {
        setError('PIN incorrecto. Inténtalo de nuevo.')
        setPin('')
        inputRef.current?.focus()
        setSubmitting(false)
        return
      }

      // Valid PIN
      markUnlocked(stored.nameNormalized)
      onUnlocked()
    } catch {
      setError('Error al verificar el PIN.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5 max-w-sm">
      <div>
        <label htmlFor="unlock-pin" className="block text-label font-medium text-foreground mb-1">
          PIN de acceso
        </label>
        <input
          ref={inputRef}
          id="unlock-pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={6}
          enterKeyHint="go"
          value={pin}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(sanitizePin(e.target.value))}
          className="w-full px-3 py-2 border border-border rounded-lg text-center tracking-[0.45em] focus:outline-none focus:ring-2 focus:ring-accent"
          disabled={submitting}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Verificando…' : 'Desbloquear'}
        </button>
        <button
          type="button"
          onClick={onSwitchUser}
          className="w-full py-2.5 px-4 text-slate-600 font-medium rounded-lg hover:bg-slate-100"
        >
          Cambiar de usuario
        </button>
      </div>
    </form>
  )
}