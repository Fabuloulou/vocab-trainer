import { emptyProfile, type AppState } from '../domain/types'

export const SCHEMA_VERSION = 1

type RawState = Record<string, unknown>

const MIGRATIONS: Record<number, (state: RawState) => RawState> = {
  0: (state) => ({
    ...state,
    version: 1,
    profile: state.profile ?? emptyProfile(),
  }),
}

function normalizeV1(state: RawState): AppState {
  const s = state as unknown as AppState
  return {
    version: SCHEMA_VERSION,
    lists: Array.isArray(s.lists) ? s.lists : [],
    leitner: s.leitner && typeof s.leitner === 'object' ? s.leitner : {},
    profile: s.profile && typeof s.profile === 'object' ? { ...emptyProfile(), ...s.profile } : emptyProfile(),
  }
}

export function migrate(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return normalizeV1({ version: SCHEMA_VERSION })
  let state = raw as RawState
  let version = typeof state.version === 'number' ? state.version : 0
  while (version < SCHEMA_VERSION) {
    const migration = MIGRATIONS[version]
    if (!migration) break
    state = migration(state)
    version = typeof state.version === 'number' ? state.version : version + 1
  }
  return normalizeV1(state)
}
