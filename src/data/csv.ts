import { isVerbList, type ListType, type WordList } from '../domain/types'

export const CSV_SEPARATOR = ';'

export interface CsvError {
  line: number
  message: string
  raw: string
}

export type ParsedItem =
  | { kind: 'vocab'; fr: string; translation: string; subListName: string | null }
  | { kind: 'verb'; infinitive: string; preterite: string; pastParticiple: string; fr: string; subListName: string | null }

export interface ParseResult {
  items: ParsedItem[]
  errors: CsvError[]
}

const VOCAB_HEADERS = ['fr;trad;liste', 'fr;traduction;liste']
const VERB_HEADERS = ['infinitive;preterite;past_participle;fr;liste']

function normalizeHeader(line: string): string {
  return line.replace(/^﻿/, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr')
}

export function parseLine(row: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (inQuotes) {
      if (ch === '"') {
        if (row[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === CSV_SEPARATOR) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

export function escapeField(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
}

export function parseCsv(text: string, type: ListType): ParseResult {
  const items: ParsedItem[] = []
  const errors: CsvError[] = []
  const lines = splitLines(text)

  const firstNonEmpty = lines.findIndex((l) => l.trim() !== '')
  if (firstNonEmpty === -1) {
    return { items, errors: [{ line: 1, message: 'Fichier vide', raw: '' }] }
  }

  const header = normalizeHeader(lines[firstNonEmpty])
  const expectedHeaders = isVerbList(type) ? VERB_HEADERS : VOCAB_HEADERS
  if (!expectedHeaders.includes(header)) {
    errors.push({
      line: firstNonEmpty + 1,
      message: `En-tête invalide. Attendu : ${expectedHeaders[0]}`,
      raw: lines[firstNonEmpty],
    })
    return { items, errors }
  }

  for (let i = firstNonEmpty + 1; i < lines.length; i++) {
    const raw = lines[i]
    const lineNo = i + 1
    if (raw.trim() === '') continue
    const fields = parseLine(raw).map((f) => f.trim())
    const subListName = fields.length > (isVerbList(type) ? 4 : 2) ? (fields[isVerbList(type) ? 4 : 2] || null) : null

    if (isVerbList(type)) {
      const [infinitive, preterite, pastParticiple, fr] = fields
      if (fields.length !== 5 && fields.length !== 4) {
        errors.push({ line: lineNo, message: `Nombre de colonnes invalide (attendu 5, reçu ${fields.length})`, raw })
        continue
      }
      if (!infinitive || !preterite || !pastParticiple || !fr) {
        errors.push({ line: lineNo, message: 'Champ obligatoire vide (infinitive, preterite, past_participle et fr requis)', raw })
        continue
      }
      items.push({ kind: 'verb', infinitive, preterite, pastParticiple, fr, subListName })
    } else {
      const [fr, translation] = fields
      if (fields.length !== 3 && fields.length !== 2) {
        errors.push({ line: lineNo, message: `Nombre de colonnes invalide (attendu 3, reçu ${fields.length})`, raw })
        continue
      }
      if (!fr || !translation) {
        errors.push({ line: lineNo, message: 'Champ obligatoire vide (fr et trad requis)', raw })
        continue
      }
      items.push({ kind: 'vocab', fr, translation, subListName })
    }
  }

  return { items, errors }
}

export function listToCsv(list: WordList, subListId?: string): string {
  const verb = isVerbList(list.type)
  const header = verb ? 'infinitive;preterite;past_participle;fr;liste' : 'fr;trad;liste'
  const rows: string[] = [header]

  const emit = (itemId: string, subListName: string | null) => {
    const item = list.items[itemId]
    if (!item) return
    if (verb) {
      const v = item as { infinitive: string; preterite: string; pastParticiple: string; fr: string }
      rows.push([v.infinitive, v.preterite, v.pastParticiple, v.fr, subListName ?? ''].map(escapeField).join(CSV_SEPARATOR))
    } else {
      const v = item as { fr: string; translation: string }
      rows.push([v.fr, v.translation, subListName ?? ''].map(escapeField).join(CSV_SEPARATOR))
    }
  }

  if (subListId === undefined) {
    for (const sub of list.subLists) {
      for (const id of sub.itemIds) emit(id, sub.name)
    }
    for (const id of list.unclassifiedItemIds) emit(id, null)
  } else {
    const sub = list.subLists.find((s) => s.id === subListId)
    if (sub) {
      for (const id of sub.itemIds) emit(id, sub.name)
    }
  }

  return rows.join('\n') + '\n'
}
