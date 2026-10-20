/**
 * Realtime reads for the lobby. Ordered by `nameNormalized`.
 *
 * Uses Supabase realtime subscriptions with unique channel names to avoid
 * "cannot add callbacks after subscribe" errors.
 */
import { supabase } from './supabase'
import type { EventDoc, Participant } from '../domain/types'

function toParticipant(row: Record<string, unknown>): Participant {
  return {
    name: row.name as string,
    nameNormalized: row.name_normalized as string,
    size: row.size as Participant['size'],
    likedTeams: row.liked_teams as string,
    forbiddenTeams: row.forbidden_teams as string,
    joinedAt: row.joined_at as string,
    hasOrder: row.has_order as boolean,
    pinHash: row.pin_hash as string | undefined,
  }
}

function toEvent(row: Record<string, unknown>): EventDoc {
  return {
    adminSecretValidated: row.admin_secret_validated as boolean,
    status: row.status as EventDoc['status'],
    createdAt: row.created_at as string,
    participantCount: row.participant_count as number,
  }
}

// Unique channel names per subscription to avoid conflicts
function channelName(base: string): string {
  return `${base}_${Math.random().toString(36).slice(2, 9)}`
}

export function subscribeParticipants(
  cb: (list: Participant[]) => void,
  onFailure?: (code: string) => void,
): () => void {
  const channel = supabase.channel(channelName('participants'))

  // Add ALL callbacks BEFORE subscribe
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'participants' },
    () => {
      fetchParticipants().then(cb).catch((err) => onFailure?.(err.code ?? 'unknown'))
    },
  )

  channel.subscribe()

  // Initial fetch
  fetchParticipants().then(cb).catch((err) => onFailure?.(err.code ?? 'unknown'))

  return () => {
    supabase.removeChannel(channel)
  }
}

async function fetchParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('name_normalized')

  if (error) throw error
  return (data ?? []).map(toParticipant)
}

export function subscribeEvent(
  cb: (event: EventDoc | null) => void,
  onFailure?: (code: string) => void,
): () => void {
  const channel = supabase.channel(channelName('event'))

  // Add ALL callbacks BEFORE subscribe
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'event' },
    (payload) => {
      if (payload.new) {
        cb(toEvent(payload.new as Record<string, unknown>))
      } else {
        cb(null)
      }
    },
  )

  channel.subscribe()

  // Initial fetch
  fetchEvent().then(cb).catch((err) => onFailure?.(err.code ?? 'unknown'))

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function getEvent(): Promise<EventDoc | null> {
  return fetchEvent()
}

async function fetchEvent(): Promise<EventDoc | null> {
  const { data, error } = await supabase.from('event').select('*').single()
  if (error) {
    if (error.code === 'PGRST116') return null // No rows found
    throw error
  }
  return toEvent(data)
}

export async function getParticipant(nameNormalized: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('name_normalized', nameNormalized)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return toParticipant(data)
}

export function subscribeParticipant(
  nameNormalized: string,
  cb: (participant: Participant | null) => void,
  onFailure?: (code: string) => void,
): () => void {
  const channel = supabase.channel(channelName(`participant_${nameNormalized}`))

  // Add ALL callbacks BEFORE subscribe
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'participants', filter: `name_normalized=eq.${nameNormalized}` },
    (payload) => {
      if (payload.new) {
        cb(toParticipant(payload.new as Record<string, unknown>))
      } else {
        cb(null)
      }
    },
  )

  channel.subscribe()

  // Initial fetch
  getParticipant(nameNormalized).then(cb).catch((err) => onFailure?.(err.code ?? 'unknown'))

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * One-shot roster read used by the login screen to show existing participants.
 */
export async function listParticipants(): Promise<Participant[]> {
  return fetchParticipants()
}