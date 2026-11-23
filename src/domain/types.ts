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

export interface Progress {
  points: number
  streak: Streak
  history: SessionRecord[]
}

export function emptyProgress(): Progress {
  return { points: 0, streak: { lastDate: null, count: 0 }, history: [] }
}

export const DEFAULT_PROFILE_EMOJI = '\u{1F642}'

export const PROFILE_EMOJIS = [
  '\u{1F642}', '\u{1F98A}', '\u{1F43C}', '\u{1F981}', '\u{1F438}', '\u{1F435}', '\u{1F984}', '\u{1F419}',
  '\u{1F680}', '\u{2B50}', '\u{1F3AE}', '\u{1F4DA}', '\u{1F422}', '\u{1F989}', '\u{1F916}', '\u{1F47D}',
  '\u{1F335}', '\u{1F369}',
]

export interface UserProfile {
  id: string
  name: string
  emoji: string
  lists: WordList[]
  leitner: Record<string, LeitnerState>
  progress: Progress
}

export interface AppState {
  version: number
  profiles: UserProfile[]
  activeProfileId: string | null
}
