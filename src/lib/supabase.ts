/**
 * Supabase client - ONLY module allowed to create the Supabase client.
 * Config comes only from import.meta.env.VITE_SUPABASE_* (no literal keys anywhere).
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missing = (
  [
    ['VITE_SUPABASE_URL', supabaseUrl],
    ['VITE_SUPABASE_ANON_KEY', supabaseAnonKey],
  ] as const
)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missing.length > 0) {
  throw new Error(
    `Faltan variables de entorno: ${missing.join(', ')}. ` +
      'Copia .env.example a .env.local y rellena los valores.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})