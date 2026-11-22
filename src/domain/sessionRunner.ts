import { challengeSeconds, type Exercise } from './sessionEngine'
import type { SessionMode } from './types'

export type RunnerPhase = 'ask' | 'revealed' | 'feedback'

export interface RunnerState {
  index: number
  results: boolean[]
  phase: RunnerPhase
  verdict: { ok: boolean; expected: string[] } | null
  finished: boolean
  timeLeft: number | null
}

export type RunnerAction =
  | { type: 'reveal' }
  | { type: 'answer'; ok: boolean }
  | { type: 'submit'; ok: boolean; expected: string[] }
  | { type: 'next' }
  | { type: 'tick' }

export function createRunner(exercises: Exercise[], mode: SessionMode): RunnerState {
  return {
    index: 0,
    results: [],
    phase: 'ask',
    verdict: null,
    finished: false,
    timeLeft: mode === 'challenge' ? challengeSeconds(exercises.length) : null,
  }
}

export function runnerReducer(exercises: Exercise[], state: RunnerState, action: RunnerAction): RunnerState {
  if (state.finished) return state
  const exercise = exercises[state.index]
  const isLast = state.index + 1 >= exercises.length

  switch (action.type) {
    case 'reveal':
      if (state.phase !== 'ask' || !exercise || exercise.kind !== 'flashcard') return state
      return { ...state, phase: 'revealed' }
    case 'answer': {
      if (state.phase !== 'revealed' || !exercise || exercise.kind !== 'flashcard') return state
      const results = [...state.results, action.ok]
      if (isLast) return { ...state, results, finished: true }
      return { ...state, results, index: state.index + 1, phase: 'ask', verdict: null }
    }
    case 'submit': {
      if (state.phase !== 'ask' || !exercise || exercise.kind === 'flashcard') return state
      const results = [...state.results, action.ok]
      return {
        ...state,
        results,
        verdict: { ok: action.ok, expected: action.expected },
        phase: 'feedback',
        finished: isLast,
      }
    }
    case 'next':
      if (state.phase !== 'feedback') return state
      if (isLast) return { ...state, finished: true }
      return { ...state, index: state.index + 1, phase: 'ask', verdict: null }
    case 'tick': {
      if (state.timeLeft === null) return state
      if (state.timeLeft <= 1) return { ...state, timeLeft: 0, finished: true }
      return { ...state, timeLeft: state.timeLeft - 1 }
    }
  }
}
