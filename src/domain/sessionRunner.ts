import { challengeSeconds, type Exercise } from './sessionEngine'
import type { SessionMode } from './types'

export type RunnerPhase = 'ask' | 'revealed' | 'feedback'

export interface Mistake {
  itemId: string
  prompt: string
  labels: string[]
  expected: string[]
  input: string[]
}

export interface RunnerState {
  index: number
  results: boolean[]
  mistakes: Mistake[]
  phase: RunnerPhase
  verdict: { ok: boolean; expected: string[]; input: string[] } | null
  finished: boolean
  timeLeft: number | null
}

function toMistake(exercise: Exercise, input: string[]): Mistake {
  return { itemId: exercise.itemId, prompt: exercise.prompt, labels: exercise.labels, expected: exercise.expected, input }
}

export type RunnerAction =
  | { type: 'reveal' }
  | { type: 'answer'; ok: boolean }
  | { type: 'dont-know' }
  | { type: 'submit'; ok: boolean; expected: string[]; input: string[] }
  | { type: 'next' }
  | { type: 'tick' }

export function createRunner(exercises: Exercise[], mode: SessionMode): RunnerState {
  return {
    index: 0,
    results: [],
    mistakes: [],
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
      const mistakes = action.ok ? state.mistakes : [...state.mistakes, toMistake(exercise, [])]
      if (isLast) return { ...state, results, mistakes, finished: true }
      return { ...state, results, mistakes, index: state.index + 1, phase: 'ask', verdict: null }
    }
    case 'dont-know': {
      if (state.phase !== 'ask' || !exercise || exercise.kind !== 'flashcard') return state
      const results = [...state.results, false]
      const input = exercise.expected.map(() => '')
      return {
        ...state,
        results,
        mistakes: [...state.mistakes, toMistake(exercise, input)],
        verdict: { ok: false, expected: exercise.expected, input },
        phase: 'feedback',
        finished: isLast,
      }
    }
    case 'submit': {
      if (state.phase !== 'ask' || !exercise || exercise.kind === 'flashcard') return state
      const results = [...state.results, action.ok]
      const mistakes = action.ok ? state.mistakes : [...state.mistakes, toMistake(exercise, action.input)]
      return {
        ...state,
        results,
        mistakes,
        verdict: { ok: action.ok, expected: action.expected, input: action.input },
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
