/**
 * Bootstrap-or-join (D-02, D-09, EVENT-01/02/04).
 *
 * Three steps in a fixed order:
 *  1. duplicate-name pre-check OUTSIDE the transaction (Supabase has no transactional queries),
 *  2. insert participant row (or update for login),
 *  3. post-commit verification.
 *
 * CHANGED: Participant rows are now keyed by nameNormalized (stable identity).
 * No Firebase Auth uid - just name + PIN.
 */
import { supabase } from './supabase'
import { normalizeName } from '../domain/normalizeName'
import { hashPin, verifyPin } from '../domain/pin'
import type { Role, Size, Participant } from '../domain/types'

export type JoinResult = { role: Role; participant: Participant }

/**
 * The three error copies the UI renders, exported so the copy shown and the error
 * thrown cannot drift apart (01-UI-SPEC §Copywriting Contract reuses exactly these
 * three literals). `src/pages/EntryPage.tsx` and the preferences form consume them
 * rather than re-spelling them.
 */
export const ERR_NAME_TAKEN = 'Ese nombre ya está en uso en el evento. Prueba con otro.'
export const ERR_NAME_RACE = 'Ese nombre acaba de ser usado por otra persona. Prueba con otro.'
export const ERR_EVENT_CLOSED = 'El sorteo ya se ha realizado: el grupo está cerrado.'
export const ERR_WRONG_PIN = 'PIN incorrecto. Inténtalo de nuevo.'
export const ERR_PROFILE_CLAIMED = 'Este perfil ya tiene dueño. Si eres tú, usa tu PIN.'

/**
 * The duplicate-name pre-check, shared by S1's form and this file's step 1 so the
 * two can never diverge. It is the step-1 query exactly: rows matching the
 * NORMALISED name. The comparison is always on the normalised form — never the
 * original text — and accents are NOT folded (the contract's stated limit).
 */
export async function isNameTaken(name: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('participants')
    .select('name_normalized')
    .eq('name_normalized', normalizeName(name))
    .limit(2)

  if (error) throw error
  return (data ?? []).length > 0
}

/**
 * Checks if a participant exists with the given name and returns their data.
 * Used for login flow: if participant exists, verify PIN to claim ownership.
 */
export async function getParticipantByName(name: string): Promise<Participant | null> {
  const nameNormalized = normalizeName(name)
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('name_normalized', nameNormalized)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return {
    name: data.name,
    nameNormalized: data.name_normalized,
    size: data.size,
    likedTeams: data.liked_teams,
    forbiddenTeams: data.forbidden_teams,
    joinedAt: data.joined_at,
    hasOrder: data.has_order,
    pinHash: data.pin_hash,
  }
}

/**
 * Gets a participant by their nameNormalized (direct row read).
 * Used for login flow where user selects from a list.
 */
export async function getParticipantByNameNormalized(nameNormalized: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('name_normalized', nameNormalized)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return {
    name: data.name,
    nameNormalized: data.name_normalized,
    size: data.size,
    likedTeams: data.liked_teams,
    forbiddenTeams: data.forbidden_teams,
    joinedAt: data.joined_at,
    hasOrder: data.has_order,
    pinHash: data.pin_hash,
  }
}

/**
 * Attempts to log in to an existing participant profile by verifying the PIN.
 * Returns the participant if successful, throws if PIN is wrong or profile is claimed by another user.
 */
export async function loginParticipant(name: string, pin: string): Promise<Participant> {
  const participant = await getParticipantByName(name)
  if (!participant) {
    throw new Error(ERR_NAME_TAKEN)
  }
  return loginParticipantByParticipant(participant, pin)
}

/**
 * Attempts to log in using an already-fetched participant (by nameNormalized).
 * Used when the UI already has the participant data from the list.
 */
export async function loginParticipantByNameNormalized(
  nameNormalized: string,
  pin: string
): Promise<Participant> {
  const participant = await getParticipantByNameNormalized(nameNormalized)
  if (!participant) {
    throw new Error(ERR_NAME_TAKEN)
  }
  return loginParticipantByParticipant(participant, pin)
}

/**
 * Core login logic shared by both login methods.
 */
async function loginParticipantByParticipant(
  participant: Participant,
  pin: string
): Promise<Participant> {
  // If participant has no pinHash yet (legacy), allow claiming with PIN
  if (!participant.pinHash) {
    throw new Error(ERR_PROFILE_CLAIMED)
  }

  // Verify PIN
  const valid = await verifyPin(pin, participant.pinHash)
  if (!valid) {
    throw new Error(ERR_WRONG_PIN)
  }

  return participant
}

/**
 * Creates a new participant profile (registration).
 * Used when name doesn't exist yet.
 * 
 * @param pinHash - Optional pre-hashed PIN. If not provided, prefs.pin will be hashed.
 */
export async function createParticipant(
  name: string,
  prefs: { size: Size; likedTeams: string; forbiddenTeams: string; pin: string; pinHash?: string }
): Promise<JoinResult> {
  const nameNormalized = normalizeName(name)

  // Check if name is taken (outside transaction for better UX)
  if (await isNameTaken(name)) {
    throw new Error(ERR_NAME_TAKEN)
  }

  const pinHash = prefs.pinHash ?? await hashPin(prefs.pin)
  const joinedAt = new Date().toISOString()

  // Check event status
  const { data: event, error: eventError } = await supabase.from('event').select('status').single()
  if (eventError && eventError.code !== 'PGRST116') throw eventError
  if (event?.status === 'drawn') {
    throw new Error(ERR_EVENT_CLOSED)
  }

  const isFirstUser = !event

  // If first user, create event
  if (isFirstUser) {
    const { error: createEventError } = await supabase.from('event').insert({
      id: 'main',
      admin_secret_validated: false,
      status: 'lobby',
      created_at: joinedAt,
      participant_count: 0,
    })
    if (createEventError) throw createEventError
  }

  // Insert participant
  const { error: participantError } = await supabase.from('participants').insert({
    name,
    name_normalized: nameNormalized,
    size: prefs.size,
    liked_teams: prefs.likedTeams,
    forbidden_teams: prefs.forbiddenTeams,
    pin_hash: pinHash,
    joined_at: joinedAt,
    has_order: false,
  })
  if (participantError) throw participantError

  // Increment participant count
  const { error: countError } = await supabase.rpc('increment_participant_count')
  if (countError) throw countError

  // Post-commit TOCTOU check
  const { data: after, error: afterError } = await supabase
    .from('participants')
    .select('name_normalized')
    .eq('name_normalized', nameNormalized)

  if (afterError) throw afterError
  if ((after ?? []).length > 1) {
    await supabase.from('participants').delete().eq('name_normalized', nameNormalized)
    throw new Error(ERR_NAME_RACE)
  }

  const participant: Participant = {
    name,
    nameNormalized,
    size: prefs.size,
    likedTeams: prefs.likedTeams,
    forbiddenTeams: prefs.forbiddenTeams,
    joinedAt,
    hasOrder: false,
    pinHash,
  }

  return { role: isFirstUser ? 'admin' : 'participant', participant }
}

/**
 * Main join function: handles both new registration and login to existing profile.
 * Returns the participant data and role.
 * 
 * @param name - User's name
 * @param prefs - Preferences including raw PIN (will be hashed) or pinHash
 * @param isLogin - If true, attempt to log in to existing profile; if false, create new
 */
export async function joinEvent(
  name: string,
  prefs: { size: Size; likedTeams: string; forbiddenTeams: string; pin: string; pinHash?: string },
  isLogin: boolean
): Promise<JoinResult> {
  const existing = await getParticipantByName(name)

  if (existing) {
    if (isLogin) {
      // Attempt login to existing profile
      return { role: 'participant', participant: await loginParticipant(name, prefs.pin) }
    } else {
      // New user trying to register with taken name
      throw new Error(ERR_NAME_TAKEN)
    }
  } else {
    if (isLogin) {
      // Login attempted but name doesn't exist
      throw new Error(ERR_NAME_TAKEN)
    } else {
      // New registration
      return createParticipant(name, prefs)
    }
  }
}

/**
 * Updates an existing participant's preferences (size, likedTeams, forbiddenTeams).
 * Used by PreferencesPage after the participant document was created on EntryPage.
 */
export async function updateParticipantPrefs(
  nameNormalized: string,
  prefs: { size: Size; likedTeams: string; forbiddenTeams: string }
): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .update({
      size: prefs.size,
      liked_teams: prefs.likedTeams,
      forbidden_teams: prefs.forbiddenTeams,
    })
    .eq('name_normalized', nameNormalized)

  if (error) throw error
}