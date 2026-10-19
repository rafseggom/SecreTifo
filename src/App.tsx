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
import AdminSetupPage from './pages/AdminSetupPage'

export default function App() {
  const { loading, uid, role, hasPreferences, eventStatus, error: sessionError, retryIdentity } =
    useSession()
  const [identityCleared, setIdentityCleared] = useState(false)

  // Never a blank screen before the first server response.
  if (loading) return <FullScreenSpinner />

  // WR-01 (binding must-have of 01-01): a failed identity resolution renders NO route.
  // The entry form would otherwise look healthy while every attempt silently could not
  // work, and submitting it persisted `{ uid: '' }`.
  if (sessionError) {
    return (
      <ErrorBoundary>
        <Screen title="SecretKit">
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
            {/*
              WR-08: the UI-SPEC's body copy (`01-UI-SPEC.md:553`, "Si ya estabas
              dentro, avisa al Admin") treats "you were already inside" as the benign
              case, but it is precisely the DEAD END: the orphaned
              `participants/{oldUid}` still holds the name, so re-entering is answered
              by the shared pre-check with a duplicate-name error, and no in-app path
              frees it (the rules grant `delete` to the document's own uid only, and
              the Admin holds no such grant). The body therefore names the one action
              that actually resolves it. Deliberate deviation from UI-SPEC §553; the
              title and the «Volver a entrar» action are kept verbatim.
            */}
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
          path="/admin/setup"
          element={
            /*
              Admin setup: only accessible when NO event exists (eventStatus === null).
              The page itself validates the VITE_ADMIN_SECRET against user input.
              On success, creates events/main with adminUid = anonymous uid and redirects to /admin/login.
            */
            eventStatus === null ? <AdminSetupPage /> : <Navigate to={home} replace />
          }
        />
        <Route
          path="/admin"
          element={
            /*
              IN-05: the panel is the Admin's surface (UI-SPEC S7). Without the role in
              the guard, a non-Admin who typed /admin saw the whole panel chrome —
              progress, the "who is missing" list and a download button that could only
              fail with permission-denied. No pairing was exposed, but the wrong surface
              was. The rules remain the authority; this is the matching UX guard.
            */
            identityPresent && hasPreferences && role === 'admin' ? (
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
