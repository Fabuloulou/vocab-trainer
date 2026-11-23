import { newId } from './ids'
import { DEFAULT_PROFILE_EMOJI, emptyProgress, type AppState, type UserProfile } from '../domain/types'

export const SCHEMA_VERSION = 2

type RawState = Record<string, unknown>
type WordListArray = UserProfile['lists']

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function normalizeProgress(raw: unknown): UserProfile['progress'] {
  const p = asRecord(raw)
  const streak = asRecord(p.streak)
  return {
    points: typeof p.points === 'number' ? p.points : 0,
    streak: {
      lastDate: typeof streak.lastDate === 'string' ? streak.lastDate : null,
      count: typeof streak.count === 'number' ? streak.count : 0,
    },
    history: Array.isArray(p.history) ? (p.history as UserProfile['progress']['history']) : [],
  }
}

function normalizeUserProfile(raw: unknown): UserProfile {
  const p = asRecord(raw)
  return {
    id: typeof p.id === 'string' && p.id ? p.id : newId('profile'),
    name: typeof p.name === 'string' && p.name.trim() ? p.name : 'Moi',
    emoji: typeof p.emoji === 'string' && p.emoji ? p.emoji : DEFAULT_PROFILE_EMOJI,
    lists: Array.isArray(p.lists) ? (p.lists as WordListArray) : [],
    leitner: asRecord(p.leitner) as UserProfile['leitner'],
    progress: normalizeProgress(p.progress),
  }
}

const MIGRATIONS: Record<number, (state: RawState) => RawState> = {
  0: (state) => ({
    ...state,
    version: 1,
    profile: state.profile ?? emptyProgress(),
  }),
  1: (state) => {
    const s = asRecord(state)
    const id = newId('profile')
    const profile: UserProfile = {
      id,
      name: 'Moi',
      emoji: DEFAULT_PROFILE_EMOJI,
      lists: Array.isArray(s.lists) ? (s.lists as WordListArray) : [],
      leitner: asRecord(s.leitner) as UserProfile['leitner'],
      progress: normalizeProgress(s.profile ?? emptyProgress()),
    }
    return { version: 2, profiles: [profile], activeProfileId: id }
  },
}

function normalizeV2(state: RawState): AppState {
  const s = asRecord(state)
  const profiles = Array.isArray(s.profiles) ? s.profiles.map(normalizeUserProfile) : []
  const activeProfileId =
    typeof s.activeProfileId === 'string' && profiles.some((p) => p.id === s.activeProfileId)
      ? s.activeProfileId
      : (profiles[0]?.id ?? null)
  return { version: SCHEMA_VERSION, profiles, activeProfileId }
}

export function migrate(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return normalizeV2({ version: 0 })
  let state = raw as RawState
  let version = typeof state.version === 'number' ? state.version : 0
  while (version < SCHEMA_VERSION) {
    const migration = MIGRATIONS[version]
    if (!migration) break
    state = migration(state)
    version = typeof state.version === 'number' ? state.version : version + 1
  }
  return normalizeV2(state)
}
