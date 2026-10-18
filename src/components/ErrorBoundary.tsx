/**
 * Top-level boundary around <App/> (UI-SPEC §Component Contracts, S8).
 * Renders `Algo ha ido mal.` + a `Recargar` button on an unhandled render error.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary capturó un error de render:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center sm:px-6">
          <p className="text-body text-slate-900">Algo ha ido mal.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 min-w-11 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            Recargar
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
