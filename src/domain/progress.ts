import { onFailure, onSuccess, initialLeitner } from './leitner'
import type { AppState, LeitnerState, Profile, SessionMode, SessionRecord, Streak } from './types'

export const PARIS_TZ = 'Europe/Paris'

export function dateKeyInParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

export function updateStreak(streak: Streak, today: string): Streak {
  if (streak.lastDate === today) return streak
  if (streak.lastDate !== null && addDays(streak.lastDate, 1) === today) {
    return { lastDate: today, count: streak.count + 1 }
  }
  return { lastDate: today, count: 1 }
}

export const POINTS_PER_SUCCESS = 10
export const CHALLENGE_BONUS = 5
export const HISTORY_LIMIT = 10

export function pointsFor(success: boolean, mode: SessionMode): number {
  if (!success) return 0
  return mode === 'challenge' ? POINTS_PER_SUCCESS + CHALLENGE_BONUS : POINTS_PER_SUCCESS
}

export function applyItemResult(
  leitner: Record<string, LeitnerState>,
  itemId: string,
  success: boolean,
  now: string,
): Record<string, LeitnerState> {
  const current = leitner[itemId] ?? initialLeitner()
  return { ...leitner, [itemId]: success ? onSuccess(current, now) : onFailure(current, now) }
}

export function recordSession(
  profile: Profile,
  record: Omit<SessionRecord, 'id'>,
  now: Date = new Date(),
): Profile {
  const today = dateKeyInParis(now)
  const full: SessionRecord = { ...record, id: `s-${now.getTime()}-${Math.floor(Math.random() * 1e6)}` }
  return {
    points: profile.points + full.pointsEarned,
    streak: updateStreak(profile.streak, today),
    history: [full, ...profile.history].slice(0, HISTORY_LIMIT),
  }
}

export function masteryPercent(list: { items: Record<string, unknown>; unclassifiedItemIds: string[]; subLists: { itemIds: string[] }[] }, leitner: Record<string, LeitnerState>): number {
  const ids = [...list.unclassifiedItemIds, ...list.subLists.flatMap((s) => s.itemIds)]
  if (ids.length === 0) return 0
  const total = ids.reduce((acc, id) => acc + ((leitner[id]?.box ?? 1) - 1), 0)
  return Math.round((total / (ids.length * 3)) * 100)
}

export function globalMastery(state: AppState): number {
  const all = state.lists.flatMap((l) => masteryPercent(l, state.leitner))
  if (state.lists.length === 0) return 0
  return Math.round(all.reduce((a, b) => a + b, 0) / state.lists.length)
}

export function applyResultToState(
  state: AppState,
  itemId: string,
  success: boolean,
  now: string,
): AppState {
  return { ...state, leitner: applyItemResult(state.leitner, itemId, success, now) }
}
