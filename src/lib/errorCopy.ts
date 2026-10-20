/**
 * Error copy mapping for Supabase/PostgREST error codes.
 * Centralised so every screen uses the same wording.
 */

export function errorCopy(code: string): { message: string; canRetry: boolean } {
  switch (code) {
    case 'permission-denied':
    case '42501': // Postgres insufficient privilege
      return { message: 'No tienes permiso para esta acción.', canRetry: false }
    case 'unavailable':
    case '57P01': // Admin shutdown
    case '57P02': // Crash shutdown
    case '57P03': // Cannot connect now
      return { message: 'Sin conexión. Vuelve a intentarlo cuando recuperes la red.', canRetry: true }
    case 'resource-exhausted':
    case '53200': // Out of memory
    case '53201': // Disk full
    case '53202': // Too many connections
      return { message: 'Hemos alcanzado el límite de consultas. Inténtalo más tarde.', canRetry: true }
    case 'PGRST116': // No rows found
      return { message: 'No se encuentra el registro.', canRetry: false }
    case '23505': // Unique violation
      return { message: 'Ese nombre ya está en uso.', canRetry: false }
    default:
      return { message: 'Algo ha ido mal. Inténtalo de nuevo.', canRetry: true }
  }
}

export function downloadErrorCopy(code: string): { message: string; canRetry: boolean } {
  switch (code) {
    case 'permission-denied':
    case '42501':
      return { message: 'No tienes permiso para descargar los pedidos.', canRetry: false }
    case 'unavailable':
    case '57P01':
    case '57P02':
    case '57P03':
      return { message: 'Sin conexión. Vuelve a intentarlo cuando recuperes la red.', canRetry: true }
    default:
      return { message: 'No se ha podido preparar la descarga.', canRetry: true }
  }
}