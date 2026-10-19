/**
 * Shared S8 error taxonomy utility.
 *
 * Maps Firestore error codes to user-facing copy and retry guidance.
 * Single source of truth for all routes (PreferencesPage, LobbyPage, RevealPage, AdminPage).
 * Per UI-SPEC §S8 and D-14.
 */
export type ErrorCopyResult = {
  readonly message: string
  readonly canRetry: boolean
}

/**
 * Maps read/error codes to S8 copy for data fetching operations.
 *
 * - permission-denied: user lacks permission, retry won't help
 * - unavailable: network issue, retry may help
 * - resource-exhausted: quota exceeded, retry later
 * - default: generic error, retry may help
 */
export function errorCopy(code: string): ErrorCopyResult {
  if (code === 'permission-denied') {
    return { message: 'No tienes permiso para ver esto.', canRetry: false }
  }
  if (code === 'unavailable') {
    return { message: 'Sin conexión. Vuelve a intentarlo cuando recuperes la red.', canRetry: true }
  }
  if (code === 'resource-exhausted') {
    return { message: 'Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde.', canRetry: false }
  }
  return { message: 'Algo ha ido mal.', canRetry: true }
}

/**
 * Maps write/error codes to S8 copy for data mutation operations.
 *
 * - permission-denied: user lacks permission, retry won't help
 * - unavailable: network issue during write, retry may help (data not saved)
 * - resource-exhausted: quota exceeded, retry later
 * - default: generic error, retry may help
 */
export function downloadErrorCopy(code: string): ErrorCopyResult {
  if (code === 'permission-denied') {
    return { message: 'No tienes permiso para ver esto.', canRetry: false }
  }
  if (code === 'unavailable') {
    return { message: 'Sin conexión. El pedido no se ha guardado.', canRetry: true }
  }
  if (code === 'resource-exhausted') {
    return { message: 'Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde.', canRetry: false }
  }
  return { message: 'No hemos podido generar el archivo.', canRetry: true }
}