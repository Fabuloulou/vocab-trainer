import type { Box, LeitnerState } from './types'

export const BOX_COUNT = 4
export const WEAK_BOXES: Box[] = [1, 2]

export function initialLeitner(): LeitnerState {
  return { box: 1, lastSeenAt: null }
}

export function onSuccess(state: LeitnerState, now: string): LeitnerState {
  return { box: Math.min(BOX_COUNT, state.box + 1) as Box, lastSeenAt: now }
}

export function onFailure(state: LeitnerState, now: string): LeitnerState {
  return { box: Math.max(1, state.box - 1) as Box, lastSeenAt: now }
}

export function isWeak(state: LeitnerState | undefined): boolean {
  return WEAK_BOXES.includes(state?.box ?? 1)
}
