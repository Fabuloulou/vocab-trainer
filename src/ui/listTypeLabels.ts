import type { ListType } from '../domain/types'

export const TYPE_LABELS: Record<ListType, string> = {
  'vocab-en': 'Vocabulaire anglais (FR/EN)',
  'vocab-de': 'Vocabulaire allemand (FR/DE)',
  'verbs-en': 'Verbes irréguliers anglais',
}

export const TYPE_BADGES: Record<ListType, string> = {
  'vocab-en': 'Vocab EN',
  'vocab-de': 'Vocab DE',
  'verbs-en': 'Verbes EN',
}
