export type ListType = 'vocab-en' | 'vocab-de' | 'verbs-en'

export const LIST_TYPES: ListType[] = ['vocab-en', 'vocab-de', 'verbs-en']

export function isVerbList(type: ListType): boolean {
  return type === 'verbs-en'
}

export interface VocabItem {
  id: string
  fr: string
  translation: string
}

export interface VerbItem {
  id: string
  fr: string
  infinitive: string
  preterite: string
  pastParticiple: string
}

export type Item = VocabItem | VerbItem

export const UNCLASSIFIED_ID = '__unclassified__'

export interface SubList {
  id: string
  name: string
  itemIds: string[]
}

export interface WordList {
  id: string
  name: string
  type: ListType
  isExample: boolean
  items: Record<string, Item>
  subLists: SubList[]
  unclassifiedItemIds: string[]
}

export type Box = 1 | 2 | 3 | 4

export interface LeitnerState {
  box: Box
  lastSeenAt: string | null
}

export type SessionMode = 'classic' | 'challenge'

export interface SessionRecord {
  id: string
  date: string
  mode: SessionMode
  score: number
  total: number
  pointsEarned: number
}

export interface Streak {
  lastDate: string | null
  count: number
}

export interface Profile {
  points: number
  streak: Streak
  history: SessionRecord[]
}

export interface AppState {
  version: number
  lists: WordList[]
  leitner: Record<string, LeitnerState>
  profile: Profile
}

export function emptyProfile(): Profile {
  return { points: 0, streak: { lastDate: null, count: 0 }, history: [] }
}
