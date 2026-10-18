/**
 * The ONLY module in the app allowed to call initializeApp / getAuth / getFirestore,
 * and the only one that wires the Emulator Suite (T-01-07: no `firebase/*` import
 * escapes `src/lib/`, so rules and call-sites are audited as one unit).
 */
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

// Config comes only from import.meta.env.VITE_FIREBASE_* (no literal keys anywhere).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Fail loudly and *named* — never a silent `undefined` (Pitfall 17).
const missing = (
  [
    ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
    ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
    ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
    ['VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket],
    ['VITE_FIREBASE_APP_ID', firebaseConfig.appId],
  ] as const
)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missing.length > 0) {
  throw new Error(
    `Faltan variables de entorno de Firebase: ${missing.join(', ')}. ` +
      'Copia .env.example a .env.local y rellena los valores de la consola de Firebase.',
  )
}

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
// Memory cache by default (COVERAGE.md row 15): no initializeFirestore, no offline persistence.
export const db = getFirestore(app)

// Emulator wiring is dev-only AND idempotent: Vite HMR re-evaluates this module, and a
// second connect throws `failed-precondition` (Pitfall 6). The module-scope flag guards it.
let emulatorsConnected = false

if (import.meta.env.DEV && !emulatorsConnected) {
  emulatorsConnected = true
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
