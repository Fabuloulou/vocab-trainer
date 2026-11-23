import { newId } from './ids'
import type { Item, WordList } from '../domain/types'

export function copyListContent(list: WordList): WordList {
  const itemIdMap = new Map<string, string>()
  const items: Record<string, Item> = {}
  for (const item of Object.values(list.items)) {
    const id = newId('item')
    itemIdMap.set(item.id, id)
    items[id] = { ...item, id }
  }
  const mapId = (id: string) => itemIdMap.get(id) ?? id
  return {
    ...list,
    id: newId('list'),
    items,
    subLists: list.subLists.map((sub) => ({
      id: newId('sub'),
      name: sub.name,
      itemIds: sub.itemIds.map(mapId),
    })),
    unclassifiedItemIds: list.unclassifiedItemIds.map(mapId),
  }
}
