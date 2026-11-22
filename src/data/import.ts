import type { ParsedItem } from './csv'
import { newId } from './ids'
import type { Item, VerbItem, VocabItem, WordList } from '../domain/types'

export interface ImportOutcome {
  list: WordList
  added: number
  skipped: number
}

function vocabKey(fr: string, translation: string): string {
  return `${fr.trim().toLocaleLowerCase('fr')}|${translation.trim().toLocaleLowerCase('fr')}`
}

function verbKey(infinitive: string, preterite: string, pastParticiple: string): string {
  return [infinitive, preterite, pastParticiple].map((v) => v.trim().toLocaleLowerCase('fr')).join('|')
}

function existingKeys(list: WordList): Set<string> {
  const keys = new Set<string>()
  for (const item of Object.values(list.items)) {
    if ('translation' in item) keys.add(vocabKey(item.fr, item.translation))
    else keys.add(verbKey((item as VerbItem).infinitive, (item as VerbItem).preterite, (item as VerbItem).pastParticiple))
  }
  return keys
}

export function applyParsedItems(
  list: WordList,
  parsed: ParsedItem[],
  idGen: () => string = () => newId('item'),
): ImportOutcome {
  const keys = existingKeys(list)
  const items: Record<string, Item> = { ...list.items }
  const subLists = list.subLists.map((s) => ({ ...s, itemIds: [...s.itemIds] }))
  const unclassifiedItemIds = [...list.unclassifiedItemIds]
  let added = 0
  let skipped = 0

  const subListIdByName = new Map(subLists.map((s) => [s.name.trim().toLocaleLowerCase('fr'), s.id]))

  for (const p of parsed) {
    const key = p.kind === 'vocab' ? vocabKey(p.fr, p.translation) : verbKey(p.infinitive, p.preterite, p.pastParticiple)
    if (keys.has(key)) {
      skipped++
      continue
    }
    keys.add(key)
    const id = idGen()
    if (p.kind === 'vocab') {
      const item: VocabItem = { id, fr: p.fr.trim(), translation: p.translation.trim() }
      items[id] = item
    } else {
      const item: VerbItem = {
        id,
        fr: p.fr.trim(),
        infinitive: p.infinitive.trim(),
        preterite: p.preterite.trim(),
        pastParticiple: p.pastParticiple.trim(),
      }
      items[id] = item
    }
    added++

    const name = p.subListName?.trim()
    if (!name) {
      unclassifiedItemIds.push(id)
    } else {
      const normalized = name.toLocaleLowerCase('fr')
      let subId = subListIdByName.get(normalized)
      if (!subId) {
        subId = newId('sub')
        subLists.push({ id: subId, name, itemIds: [] })
        subListIdByName.set(normalized, subId)
      }
      const sub = subLists.find((s) => s.id === subId)
      sub?.itemIds.push(id)
    }
  }

  return { list: { ...list, items, subLists, unclassifiedItemIds }, added, skipped }
}
