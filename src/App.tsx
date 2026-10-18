/**
 * Routing shell + redirect-by-status (D-22, D-23), declarative mode (no data router).
 * Route guards are UX, not access control — the Firestore rules are the authority.
 */
import { Navigate, Route, Routes } from 'react-router'
import { useSession } from './session/SessionProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FullScreenSpinner } from './components/FullScreenSpinner'
import EntryPage from './pages/EntryPage'
import PreferencesPage from './pages/PreferencesPage'
import LobbyPage from './pages/LobbyPage'
import RevealPage from './pages/RevealPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  const { loading, uid, hasPreferences, eventStatus } = useSession()

  // Never a blank screen before the first server response.
  if (loading) return <FullScreenSpinner />

  const home = !uid ? '/' : !hasPreferences ? '/preferences' : eventStatus === 'drawn' ? '/reveal' : '/lobby'

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={uid ? <Navigate to={home} replace /> : <EntryPage />} />
        <Route path="/preferences" element={uid ? <PreferencesPage /> : <Navigate to="/" replace />} />
        <Route path="/lobby" element={uid ? <LobbyPage /> : <Navigate to="/" replace />} />
        <Route
          path="/reveal"
          element={eventStatus === 'drawn' ? <RevealPage /> : <Navigate to={home} replace />}
        />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
