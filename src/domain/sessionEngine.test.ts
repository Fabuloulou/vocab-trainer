import { describe, expect, it } from 'vitest'
import { mulberry32 } from './rng'
import { buildSession, VERB_FIELDS, type Exercise, type VerbField } from './sessionEngine'
import type { LeitnerState, VerbItem, WordList } from './types'

function makeVocabList(id: string, words: [string, string][]): WordList {
  const list: WordList = { id, name: id, type: 'vocab-en', isExample: false, items: {}, subLists: [], unclassifiedItemIds: [] }
  const sub = { id: `${id}-s1`, name: 'S1', itemIds: [] as string[] }
  words.forEach(([fr, translation], i) => {
    const itemId = `${id}-w${i}`
    list.items[itemId] = { id: itemId, fr, translation }
    sub.itemIds.push(itemId)
  })
  list.subLists.push(sub)
  return list
}

function makeVerbList(id: string, verbs: [string, string, string, string][]): WordList {
  const list: WordList = { id, name: id, type: 'verbs-en', isExample: false, items: {}, subLists: [], unclassifiedItemIds: [] }
  const sub = { id: `${id}-s1`, name: 'S1', itemIds: [] as string[] }
  verbs.forEach(([infinitive, preterite, pastParticiple, fr], i) => {
    const itemId = `${id}-v${i}`
    list.items[itemId] = { id: itemId, fr, infinitive, preterite, pastParticiple }
    sub.itemIds.push(itemId)
  })
  list.subLists.push(sub)
  return list
}

const words20 = Array.from({ length: 20 }, (_, i) => [`mot ${i}`, `word ${i}`] as [string, string])

describe('moteur de session', () => {
  it('ne fait jamais apparaître un item deux fois', () => {
    const list = makeVocabList('l1', words20)
    const ex = buildSession({ lists: [list], selection: [{ listId: 'l1', subListId: 'l1-s1' }], leitner: {}, rng: mulberry32(1) })
    expect(ex).toHaveLength(20)
    expect(new Set(ex.map((e) => e.itemId)).size).toBe(20)
  })

  it('priorise les boîtes basses (Leitner)', () => {
    const list = makeVocabList('l1', words20)
    const leitner: Record<string, LeitnerState> = {}
    for (let i = 0; i < 20; i++) leitner[`l1-w${i}`] = { box: (i < 5 ? 1 : 4) as 1 | 4, lastSeenAt: null }
    const ex = buildSession({ lists: [list], selection: [{ listId: 'l1', subListId: 'l1-s1' }], leitner, rng: mulberry32(7) })
    const firstFiveBoxes = ex.slice(0, 5).map((e) => leitner[e.itemId].box)
    expect(firstFiveBoxes).toEqual([1, 1, 1, 1, 1])
    const restBoxes = ex.slice(5).map((e) => leitner[e.itemId].box)
    expect(restBoxes.every((b) => b === 4)).toBe(true)
  })

  it('mélange les directions FR→langue et langue→FR', () => {
    const list = makeVocabList('l1', words20)
    const ex = buildSession({ lists: [list], selection: [{ listId: 'l1', subListId: 'l1-s1' }], leitner: {}, rng: mulberry32(3) })
    const dirs = new Set(ex.filter((e) => e.listType !== 'verbs-en').map((e) => e.direction))
    expect(dirs).toEqual(new Set(['fr-to-target', 'target-to-fr']))
  })

  it('répartit les 3 mécanismes d exercice', () => {
    const list = makeVocabList('l1', words20)
    const ex = buildSession({ lists: [list], selection: [{ listId: 'l1', subListId: 'l1-s1' }], leitner: {}, rng: mulberry32(11) })
    const kinds = new Set(ex.map((e) => e.kind))
    expect(kinds).toEqual(new Set(['flashcard', 'qcm', 'typing']))
  })

  it('QCM : 4 choix distincts contenant la bonne réponse, distracteurs de la même liste', () => {
    const list = makeVocabList('l1', words20)
    const ex = buildSession({ lists: [list], selection: [{ listId: 'l1', subListId: 'l1-s1' }], leitner: {}, rng: mulberry32(5) })
    const qcms = ex.filter((e) => e.kind === 'qcm')
    expect(qcms.length).toBeGreaterThan(0)
    for (const q of qcms) {
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices).toContain(q.expected[0])
      const pool = new Set(
        Object.values(list.items).map((i) =>
          q.direction === 'fr-to-target' ? (i as { translation: string }).translation : (i as { fr: string }).fr,
        ),
      )
      for (const c of q.choices ?? []) expect(pool.has(c)).toBe(true)
    }
  })

  it('verbes : un champ donné au hasard, exactement les 3 autres demandés', () => {
    const verbs = Array.from({ length: 12 }, (_, i) => [`v${i}`, `p${i}`, `pp${i}`, `fr ${i}`] as [string, string, string, string])
    const list = makeVerbList('lv', verbs)
    const ex = buildSession({ lists: [list], selection: [{ listId: 'lv', subListId: 'lv-s1' }], leitner: {}, rng: mulberry32(9) })
    expect(ex).toHaveLength(12)
    const givenSeen = new Set<string>()
    for (const e of ex) {
      expect(e.kind).toBe('typing')
      expect(e.expected).toHaveLength(3)
      expect(e.labels).toHaveLength(3)
      const givenFields = Object.keys(e.given ?? {}) as VerbField[]
      expect(givenFields).toHaveLength(1)
      givenSeen.add(givenFields[0])
      const verb = list.items[e.itemId] as VerbItem
      const askedFields = VERB_FIELDS.filter((f) => !givenFields.includes(f))
      expect(e.expected).toEqual(askedFields.map((f) => verb[f]))
      expect(e.given?.[givenFields[0]]).toBe(verb[givenFields[0]])
    }
    expect(givenSeen.size).toBeGreaterThan(1)
  })

  it('sélection multiple : agrège plusieurs sous-listes', () => {
    const list = makeVocabList('l1', [['a', 'x'], ['b', 'y'], ['c', 'z']])
    list.subLists.push({ id: 'l1-s2', name: 'S2', itemIds: ['l1-w2'] })
    list.subLists[0].itemIds = ['l1-w0', 'l1-w1']
    const ex = buildSession({
      lists: [list],
      selection: [
        { listId: 'l1', subListId: 'l1-s1' },
        { listId: 'l1', subListId: 'l1-s2' },
      ],
      leitner: {},
      rng: mulberry32(2),
    })
    expect(ex.map((e) => e.itemId).sort()).toEqual(['l1-w0', 'l1-w1', 'l1-w2'])
  })

  it('"mots faibles" : ne garde que les boîtes 1 et 2', () => {
    const list = makeVocabList('l1', words20)
    const leitner: Record<string, LeitnerState> = {}
    for (let i = 0; i < 20; i++) leitner[`l1-w${i}`] = { box: (i < 3 ? 2 : 3) as 2 | 3, lastSeenAt: null }
    const ex = buildSession({
      lists: [list],
      selection: [{ listId: 'l1', subListId: 'l1-s1' }],
      leitner,
      weakOnly: true,
      rng: mulberry32(4),
    })
    expect(ex).toHaveLength(3)
    expect(ex.every((e) => leitner[e.itemId].box <= 2)).toBe(true)
  })

  it('est reproductible avec la même graine de PRNG', () => {
    const list = makeVocabList('l1', words20)
    const opts = { lists: [list], selection: [{ listId: 'l1', subListId: 'l1-s1' }], leitner: {} }
    const a = buildSession({ ...opts, rng: mulberry32(42) })
    const b = buildSession({ ...opts, rng: mulberry32(42) })
    expect(a.map((e: Exercise) => `${e.itemId}:${e.kind}:${e.direction}`).join(',')).toBe(
      b.map((e: Exercise) => `${e.itemId}:${e.kind}:${e.direction}`).join(','),
    )
  })
})
