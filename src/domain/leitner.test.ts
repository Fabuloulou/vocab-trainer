import { describe, expect, it } from 'vitest'
import { hasWeakItems, isWeak } from './leitner'
import type { WordList } from './types'

function listWith(ids: string[]): WordList {
  const list: WordList = { id: 'l1', name: 'l1', type: 'vocab-en', isExample: false, items: {}, subLists: [], unclassifiedItemIds: [] }
  for (const id of ids) list.items[id] = { id, fr: id, translation: id }
  return list
}

describe('hasWeakItems — aligné avec isWeak (mot non vu = boîte 1 = faible)', () => {
  it('une liste fraîchement importée (aucune entrée Leitner) a des mots faibles', () => {
    expect(hasWeakItems([listWith(['a', 'b'])], {})).toBe(true)
  })

  it('tous les mots en boîte 4 → plus de mots faibles', () => {
    const leitner = { a: { box: 4 as const, lastSeenAt: null }, b: { box: 4 as const, lastSeenAt: null } }
    expect(hasWeakItems([listWith(['a', 'b'])], leitner)).toBe(false)
  })

  it('un seul mot en boîte 1 ou 2 suffit', () => {
    const leitner = { a: { box: 4 as const, lastSeenAt: null }, b: { box: 2 as const, lastSeenAt: null } }
    expect(hasWeakItems([listWith(['a', 'b'])], leitner)).toBe(true)
  })

  it('isWeak : état absent = faible (boîte 1)', () => {
    expect(isWeak(undefined)).toBe(true)
    expect(isWeak({ box: 3, lastSeenAt: null })).toBe(false)
  })
})
