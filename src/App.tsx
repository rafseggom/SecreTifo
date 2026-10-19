/**
 * Routing shell + redirect-by-state (D-22, D-23) and the S8 lost-identity
 * surface. Declarative mode (no data router).
 *
 * Route guards are UX, not access control — the Firestore rules are the authority.
 *
 * The lost-identity state is resolved BEFORE the routes. When the stored identity
 * no longer matches the signed-in anonymous account (losing the Auth session and
 * re-signing in silently hands out a NEW uid), rendering the routes would either
 * drop the person on an empty screen or re-join them under the fresh uid and
 * answer them with a duplicate-name error that says nothing true about their
 * problem. So no route renders until they take the one way back to S1.
 *
 * Nothing is added to SessionProvider: no field, no subscription, no write. The
 * comparison is `loadIdentity()` against the session uid, and the only effect is
 * discarding the stored identity.
 */
import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import * as session from './lib/session'
import { useSession } from './session/SessionProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FullScreenSpinner } from './components/FullScreenSpinner'
import { Screen } from './components/Screen'
import { Notice } from './components/Notice'
import { Button } from './components/Button'
import EntryPage from './pages/EntryPage'
import PreferencesPage from './pages/PreferencesPage'
import LobbyPage from './pages/LobbyPage'
import RevealPage from './pages/RevealPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  const { loading, uid, hasPreferences, eventStatus } = useSession()
  const [identityCleared, setIdentityCleared] = useState(false)

  // Never a blank screen before the first server response.
  if (loading) return <FullScreenSpinner />

  const stored = session.loadIdentity()
  const identityLost = stored !== null && uid !== null && stored.uid !== uid
  const identityPresent = stored !== null && uid !== null && stored.uid === uid

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
              Vuelve a entrar con tu nombre. Si ya estabas dentro, avisa al Admin.
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
                  session.clearIdentity()
                  setIdentityCleared(true)
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

  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/"
          element={identityPresent ? <Navigate to={joinedHome} replace /> : <EntryPage />}
        />
        <Route
          path="/preferences"
          element={
            identityPresent ? (
              // CR-02: never render the join form for a participant whose document
              // already exists — the join would answer with a duplicate-name error
              // about their own name. A joined participant is forwarded by state.
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
          path="/admin"
          element={
            identityPresent && hasPreferences ? <AdminPage /> : <Navigate to={home} replace />
          }
        />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
