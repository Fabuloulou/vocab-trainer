import { describe, expect, it } from 'vitest'
import { mulberry32 } from './rng'
import { buildSession, type Exercise } from './sessionEngine'
import { createRunner, runnerReducer, type RunnerState } from './sessionRunner'
import type { WordList } from './types'

function makeList(n: number): WordList {
  const list: WordList = { id: 'l1', name: 'l1', type: 'vocab-en', isExample: false, items: {}, subLists: [], unclassifiedItemIds: [] }
  const sub = { id: 'l1-s1', name: 'S1', itemIds: [] as string[] }
  for (let i = 0; i < n; i++) {
    const id = `l1-w${i}`
    list.items[id] = { id, fr: `mot ${i}`, translation: `word ${i}` }
    sub.itemIds.push(id)
  }
  list.subLists.push(sub)
  return list
}

function exercises(n: number): Exercise[] {
  const list = makeList(n)
  const ex = buildSession({ lists: [list], selection: [{ listId: 'l1', subListId: 'l1-s1' }], leitner: {}, rng: mulberry32(1) })
  return ex.map((e) => ({ ...e, kind: 'typing' as const, choices: null }))
}

function run(exs: Exercise[], state: RunnerState, actions: Parameters<typeof runnerReducer>[2][]): RunnerState {
  return actions.reduce((s, a) => runnerReducer(exs, s, a), state)
}

describe('sessionRunner', () => {
  it('une soumission répétée en phase feedback est ignorée (pas de double comptage)', () => {
    const exs = exercises(3)
    let s = createRunner(exs, 'classic')
    s = runnerReducer(exs, s, { type: 'submit', ok: true, expected: exs[0].expected, input: ['saisie 0'] })
    expect(s.results).toEqual([true])
    expect(s.phase).toBe('feedback')
    s = runnerReducer(exs, s, { type: 'submit', ok: false, expected: exs[0].expected, input: ['saisie 0'] })
    expect(s.results).toEqual([true])
    expect(s.finished).toBe(false)
  })

  it('la dernière réponse termine la session immédiatement', () => {
    const exs = exercises(2)
    let s = createRunner(exs, 'classic')
    s = runnerReducer(exs, s, { type: 'submit', ok: true, expected: exs[0].expected, input: ['saisie 0'] })
    s = runnerReducer(exs, s, { type: 'next' })
    expect(s.index).toBe(1)
    s = runnerReducer(exs, s, { type: 'submit', ok: false, expected: exs[1].expected, input: ['saisie 1'] })
    expect(s.finished).toBe(true)
    expect(s.results).toEqual([true, false])
  })

  it('le timeout en plein feedback termine avec les résultats déjà enregistrés', () => {
    const exs = exercises(3)
    let s = createRunner(exs, 'challenge')
    expect(s.timeLeft).toBe(30)
    s = runnerReducer(exs, s, { type: 'submit', ok: true, expected: exs[0].expected, input: ['saisie 0'] })
    expect(s.phase).toBe('feedback')
    for (let i = 0; i < 29; i++) s = runnerReducer(exs, s, { type: 'tick' })
    expect(s.finished).toBe(false)
    s = runnerReducer(exs, s, { type: 'tick' })
    expect(s.finished).toBe(true)
    expect(s.timeLeft).toBe(0)
    expect(s.results).toEqual([true])
  })

  it('après la fin, toute action est ignorée (concurrence dernière réponse / timeout)', () => {
    const exs = exercises(1)
    let s = createRunner(exs, 'challenge')
    s = runnerReducer(exs, s, { type: 'submit', ok: true, expected: exs[0].expected, input: ['saisie 0'] })
    expect(s.finished).toBe(true)
    const after = run(exs, s, [{ type: 'tick' }, { type: 'next' }, { type: 'submit', ok: false, expected: [], input: [] }])
    expect(after).toBe(s)
    expect(after.results).toEqual([true])
  })

  it('reveal et answer ne fonctionnent que pour une flashcard en phase ask/revealed', () => {
    const exs = exercises(2)
    let s = createRunner(exs, 'classic')
    s = runnerReducer(exs, s, { type: 'reveal' })
    expect(s.phase).toBe('ask')
    s = runnerReducer(exs, s, { type: 'answer', ok: true })
    expect(s.results).toEqual([])
    const flash = [{ ...exs[0], kind: 'flashcard' as const }]
    let f = createRunner(flash, 'classic')
    f = runnerReducer(flash, f, { type: 'reveal' })
    expect(f.phase).toBe('revealed')
    f = runnerReducer(flash, f, { type: 'reveal' })
    expect(f.phase).toBe('revealed')
    f = runnerReducer(flash, f, { type: 'answer', ok: true })
    expect(f.results).toEqual([true])
    expect(f.finished).toBe(true)
  })

  it('dont-know sur une flashcard enregistre un échec et affiche la réponse attendue en feedback', () => {
    const exs = exercises(2)
    const flash = [{ ...exs[0], kind: 'flashcard' as const }, exs[1]]
    let s = createRunner(flash, 'classic')
    s = runnerReducer(flash, s, { type: 'dont-know' })
    expect(s.results).toEqual([false])
    expect(s.phase).toBe('feedback')
    expect(s.verdict).toEqual({ ok: false, expected: flash[0].expected, input: flash[0].expected.map(() => '') })
    s = runnerReducer(flash, s, { type: 'dont-know' })
    expect(s.results).toEqual([false])
    s = runnerReducer(flash, s, { type: 'next' })
    expect(s.index).toBe(1)
    expect(s.phase).toBe('ask')
  })

  it('dont-know est ignoré hors flashcard ou hors phase ask', () => {
    const exs = exercises(2)
    let s = createRunner(exs, 'classic')
    s = runnerReducer(exs, s, { type: 'dont-know' })
    expect(s.results).toEqual([])
    expect(s.phase).toBe('ask')
    const flash = [{ ...exs[0], kind: 'flashcard' as const }]
    let f = createRunner(flash, 'classic')
    f = runnerReducer(flash, f, { type: 'reveal' })
    f = runnerReducer(flash, f, { type: 'dont-know' })
    expect(f.results).toEqual([])
    expect(f.phase).toBe('revealed')
  })

  it('next en phase ask est ignoré', () => {
    const exs = exercises(2)
    let s = createRunner(exs, 'classic')
    s = runnerReducer(exs, s, { type: 'next' })
    expect(s.index).toBe(0)
    expect(s.phase).toBe('ask')
  })

  it('le verdict conserve la saisie de l utilisateur pour l affichage de l erreur', () => {
    const exs = exercises(2)
    let s = createRunner(exs, 'classic')
    s = runnerReducer(exs, s, { type: 'submit', ok: false, expected: exs[0].expected, input: ['became'] })
    expect(s.verdict).toEqual({ ok: false, expected: exs[0].expected, input: ['became'] })
  })

  it('tick sans chrono (mode classique) ne change rien', () => {
    const exs = exercises(2)
    let s = createRunner(exs, 'classic')
    expect(s.timeLeft).toBeNull()
    s = runnerReducer(exs, s, { type: 'tick' })
    expect(s.timeLeft).toBeNull()
    expect(s.finished).toBe(false)
  })
})
