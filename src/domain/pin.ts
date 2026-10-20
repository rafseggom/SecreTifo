/**
 * PIN de acceso (local convenience lock).
 *
 * El PIN protege la identidad guardada en ESTE navegador: la app pide el PIN cada
 * vez que se abre una pestaña nueva y no deja renderizar ninguna ruta hasta que el
 * hash coincide. No es autenticación de servidor: Firestore sigue autorizando por
 * `request.auth.uid`, así que un PIN no puede abrir el perfil de un `uid` distinto.
 *
 * El hash se guarda en `participants/{uid}.pinHash` usando PBKDF2-SHA256 con salt
 * aleatorio. Un PIN de 4–6 dígitos no tiene entropía suficiente para resistir un
 * ataque offline dedicado; las iteraciones encarecen el intento casual. No lo uses
 * como contraseña de una cuenta real.
 */

export const PIN_MIN_LENGTH = 4
export const PIN_MAX_LENGTH = 6

const ALGORITHM = 'pbkdf2-sha256'
const ITERATIONS = 120_000
const SALT_BYTES = 16
const KEY_BITS = 256

/** Deja solo dígitos y recorta al máximo permitido. */
export function sanitizePin(value: string): string {
  return value.replace(/\D/g, '').slice(0, PIN_MAX_LENGTH)
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin)
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function subtle(): SubtleCrypto {
  const implementation = globalThis.crypto?.subtle
  if (!implementation) {
    throw new Error(
      'Este navegador no puede proteger el PIN. Abre SecretKit en un contexto seguro (HTTPS o localhost).',
    )
  }
  return implementation
}

async function derive(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await subtle().importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  )
  return new Uint8Array(bits)
}

/** Crea un hash nuevo con salt aleatorio: dos PIN iguales producen hashes distintos. */
export async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) {
    throw new Error(`El PIN debe tener entre ${PIN_MIN_LENGTH} y ${PIN_MAX_LENGTH} dígitos.`)
  }

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const derived = await derive(pin, salt, ITERATIONS)
  return `${ALGORITHM}$${ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`
}

/**
 * Compara en tiempo constante. Un hash vacío, con formato desconocido o con una
 * iteración no numérica se rechaza sin lanzar: el formulario solo necesita saber
 * que el PIN no vale.
 */
export async function verifyPin(pin: string, storedHash: string | undefined): Promise<boolean> {
  if (!storedHash || !isValidPin(pin)) return false

  const parts = storedHash.split('$')
  if (parts.length !== 4) return false

  const [algorithm, rawIterations, rawSalt, rawHash] = parts
  if (algorithm !== ALGORITHM) return false

  const iterations = Number.parseInt(rawIterations, 10)
  if (!Number.isFinite(iterations) || iterations <= 0 || iterations > 1_000_000) return false

  try {
    const salt = fromBase64(rawSalt)
    const expected = fromBase64(rawHash)
    const actual = await derive(pin, salt, iterations)

    if (expected.length !== actual.length) return false

    let difference = 0
    for (let index = 0; index < expected.length; index += 1) {
      difference |= expected[index] ^ actual[index]
    }
    return difference === 0
  } catch {
    return false
  }
}
