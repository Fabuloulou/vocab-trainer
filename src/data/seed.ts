import { newId } from './ids'
import { emptyProfile, type AppState, type WordList } from '../domain/types'
import { SCHEMA_VERSION } from './migrations'

function vocabList(name: string, subLists: [string, [string, string][]][]): WordList {
  const list: WordList = { id: newId('list'), name, type: 'vocab-en', isExample: true, items: {}, subLists: [], unclassifiedItemIds: [] }
  for (const [subName, words] of subLists) {
    const sub = { id: newId('sub'), name: subName, itemIds: [] as string[] }
    for (const [fr, translation] of words) {
      const id = newId('item')
      list.items[id] = { id, fr, translation }
      sub.itemIds.push(id)
    }
    list.subLists.push(sub)
  }
  return list
}

function verbList(name: string, subLists: [string, [string, string, string, string][]][]): WordList {
  const list: WordList = { id: newId('list'), name, type: 'verbs-en', isExample: true, items: {}, subLists: [], unclassifiedItemIds: [] }
  for (const [subName, verbs] of subLists) {
    const sub = { id: newId('sub'), name: subName, itemIds: [] as string[] }
    for (const [infinitive, preterite, pastParticiple, fr] of verbs) {
      const id = newId('item')
      list.items[id] = { id, fr, infinitive, preterite, pastParticiple }
      sub.itemIds.push(id)
    }
    list.subLists.push(sub)
  }
  return list
}

export function exampleLists(): WordList[] {
  const en = vocabList('Vocabulaire anglais (exemple)', [
    [
      'Leçon 1',
      [
        ['un chat', 'a cat'],
        ['un chien', 'a dog'],
        ['la maison', 'the house'],
        ['aller à l’école', 'to go to school'],
        ['manger', 'to eat'],
      ],
    ],
    [
      'Leçon 2',
      [
        ['le livre', 'the book'],
        ['écrire', 'to write'],
        ['regarder', 'to watch'],
        ['le jardin', 'the garden'],
        ['jouer', 'to play'],
      ],
    ],
  ])
  en.type = 'vocab-en'

  const de = vocabList('Vocabulaire allemand (exemple)', [
    [
      'Leçon 1',
      [
        ['le chat', 'die Katze'],
        ['le chien', 'der Hund'],
        ['la maison', 'das Haus'],
        ['grand', 'groß'],
        ['manger', 'essen'],
      ],
    ],
    [
      'Leçon 2',
      [
        ['le livre', 'das Buch'],
        ['écrire', 'schreiben'],
        ['le jardin', 'der Garten'],
        ['jouer', 'spielen'],
        ['aller à l’école', 'zur Schule gehen'],
      ],
    ],
  ])
  de.type = 'vocab-de'

  const verbs = verbList('Verbes irréguliers anglais (exemple)', [
    [
      'Groupe 1',
      [
        ['be', 'was/were', 'been', 'être'],
        ['begin', 'began', 'begun', 'commencer'],
        ['break', 'broke', 'broken', 'casser'],
        ['buy', 'bought', 'bought', 'acheter'],
        ['come', 'came', 'come', 'venir'],
      ],
    ],
    [
      'Groupe 2',
      [
        ['do', 'did', 'done', 'faire'],
        ['eat', 'ate', 'eaten', 'manger'],
        ['go', 'went', 'gone', 'aller'],
        ['see', 'saw', 'seen', 'voir'],
        ['write', 'wrote', 'written', 'écrire'],
      ],
    ],
  ])

  return [en, de, verbs]
}

export function seedState(): AppState {
  return {
    version: SCHEMA_VERSION,
    lists: exampleLists(),
    leitner: {},
    profile: emptyProfile(),
  }
}
