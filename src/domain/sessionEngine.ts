import { isWeak } from './leitner'
import { pick, shuffle, type Rng } from './rng'
import type { DifficultyLevel, Item, LeitnerState, ListType, VerbItem, VocabItem, WordList } from './types'

export type ExerciseKind = 'flashcard' | 'qcm' | 'typing'
export type Direction = 'fr-to-target' | 'target-to-fr'
export type VerbField = 'fr' | 'infinitive' | 'preterite' | 'pastParticiple'

export const VERB_FIELDS: VerbField[] = ['infinitive', 'preterite', 'pastParticiple', 'fr']

export interface Exercise {
  index: number
  itemId: string
  listId: string
  listType: ListType
  kind: ExerciseKind
  direction: Direction | null
  prompt: string
  expected: string[]
  labels: string[]
  given: Partial<Record<VerbField, string>> | null
  choices: string[] | null
}

export interface SelectedSubList {
  listId: string
  subListId: string
}

export interface BuildSessionOptions {
  lists: WordList[]
  selection: SelectedSubList[]
  leitner: Record<string, LeitnerState>
  weakOnly?: boolean
  level?: DifficultyLevel
  rng: Rng
}

const KINDS: ExerciseKind[] = ['flashcard', 'qcm', 'typing']
const DIRECTIONS: Direction[] = ['fr-to-target', 'target-to-fr']
export const QCM_CHOICES = 4

export const LEVEL_KIND: Record<DifficultyLevel, ExerciseKind> = { 1: 'flashcard', 2: 'qcm', 3: 'typing' }

function vocabFields(item: VocabItem, direction: Direction): { prompt: string; answer: string } {
  return direction === 'fr-to-target'
    ? { prompt: item.fr, answer: item.translation }
    : { prompt: item.translation, answer: item.fr }
}

export const VERB_LABELS: Record<VerbField, string> = {
  infinitive: 'Infinitif (anglais)',
  preterite: 'Prétérit',
  pastParticiple: 'Participe passé',
  fr: 'Traduction (français)',
}

function verbPrompt(item: VerbItem, givenField: VerbField): string {
  return `${VERB_LABELS[givenField]} : ${item[givenField]}`
}

function buildExercise(
  item: Item,
  list: WordList,
  rng: Rng,
  index: number,
  poolByList: Map<string, Item[]>,
  level?: DifficultyLevel,
): Exercise {
  const isVerb = list.type === 'verbs-en'
  const kind: ExerciseKind = isVerb ? 'typing' : level ? LEVEL_KIND[level] : pick(rng, KINDS)
  const base = { index, itemId: item.id, listId: list.id, listType: list.type, kind }

  if (isVerb) {
    const verb = item as VerbItem
    const givenField = pick(rng, ['infinitive', 'fr'] as VerbField[])
    const asked = VERB_FIELDS.filter((f) => f !== givenField)
    return {
      ...base,
      direction: null,
      prompt: verbPrompt(verb, givenField),
      expected: asked.map((f) => verb[f]),
      labels: asked.map((f) => VERB_LABELS[f]),
      given: { [givenField]: verb[givenField] },
      choices: null,
    }
  }

  const vocab = item as VocabItem
  const direction = pick(rng, DIRECTIONS)
  const { prompt, answer } = vocabFields(vocab, direction)

  if (kind === 'qcm') {
    const siblings = (poolByList.get(list.id) ?? []).filter((other) => other.id !== item.id)
    if (siblings.length === 0) {
      return { ...base, kind: 'typing', direction, prompt, expected: [answer], labels: ['réponse'], given: null, choices: null }
    }
    const distractors = shuffle(rng, siblings)
      .slice(0, QCM_CHOICES - 1)
      .map((other) => (direction === 'fr-to-target' ? (other as VocabItem).translation : (other as VocabItem).fr))
    const choices = shuffle(rng, [answer, ...distractors])
    return { ...base, direction, prompt, expected: [answer], labels: ['réponse'], given: null, choices }
  }

  return { ...base, direction, prompt, expected: [answer], labels: ['réponse'], given: null, choices: null }
}

export function buildSession(options: BuildSessionOptions): Exercise[] {
  const { lists, selection, leitner, weakOnly = false, rng } = options

  const listById = new Map(lists.map((l) => [l.id, l]))
  const poolByList = new Map<string, Item[]>(
    lists.map((l) => [l.id, [...Object.values(l.items)]]),
  )

  let picked: { item: Item; list: WordList }[]
  if (weakOnly) {
    picked = lists.flatMap((list) => Object.values(list.items).map((item) => ({ item, list })))
  } else {
    picked = []
    const seen = new Set<string>()
    for (const sel of selection) {
      const list = listById.get(sel.listId)
      if (!list) continue
      const subList = list.subLists.find((s) => s.id === sel.subListId)
      const ids = subList ? subList.itemIds : sel.subListId === '__unclassified__' ? list.unclassifiedItemIds : []
      for (const id of ids) {
        if (seen.has(id)) continue
        const item = list.items[id]
        if (!item) continue
        seen.add(id)
        picked.push({ item, list })
      }
    }
  }

  const filtered = weakOnly ? picked.filter((p) => isWeak(leitner[p.item.id])) : picked

  const ordered = shuffle(rng, filtered).sort((a, b) => {
    const boxA = leitner[a.item.id]?.box ?? 1
    const boxB = leitner[b.item.id]?.box ?? 1
    return boxA - boxB
  })

  return ordered.map((p, i) => buildExercise(p.item, p.list, rng, i, poolByList, options.level))
}

export function challengeSeconds(exerciseCount: number): number {
  return Math.max(30, exerciseCount * 10)
}
