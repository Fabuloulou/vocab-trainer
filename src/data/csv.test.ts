import { describe, expect, it } from 'vitest'
import { listToCsv, parseCsv, parseLine } from './csv'
import { applyParsedItems } from './import'
import type { WordList } from '../domain/types'

describe('parseur CSV — vocabulaire', () => {
  it('parse une liste FR/EN valide avec en-tête', () => {
    const res = parseCsv('fr;trad;liste\nle chat;a cat;Leçon 1\nla maison;the house;\n', 'vocab-en')
    expect(res.errors).toEqual([])
    expect(res.items).toHaveLength(2)
    expect(res.items[0]).toEqual({ kind: 'vocab', fr: 'le chat', translation: 'a cat', subListName: 'Leçon 1' })
    expect(res.items[1]).toMatchObject({ subListName: null })
  })

  it('conserve les accents et umlauts tels quels', () => {
    const res = parseCsv('fr;trad;liste\ngrand;groß;L1\nle livre;das Buch;L1\n', 'vocab-de')
    expect(res.errors).toEqual([])
    expect(res.items[0]).toMatchObject({ fr: 'grand', translation: 'groß' })
  })

  it('gère les guillemets et points-virgules dans les champs', () => {
    const res = parseCsv('fr;trad;liste\n"un; deux";"a ""test""";L1\n', 'vocab-en')
    expect(res.errors).toEqual([])
    expect(res.items[0]).toMatchObject({ fr: 'un; deux', translation: 'a "test"' })
  })

  it('signale un en-tête invalide', () => {
    const res = parseCsv('a;b;c\n1;2;3\n', 'vocab-en')
    expect(res.items).toHaveLength(0)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].line).toBe(1)
  })

  it('signale les lignes malformées avec leur numéro', () => {
    const res = parseCsv('fr;trad;liste\nok;good;L1\nchamp vide;;L1\ntrop;de;colonnes;ici\n', 'vocab-en')
    expect(res.items).toHaveLength(1)
    expect(res.errors.map((e) => e.line)).toEqual([3, 4])
  })

  it('parseLine respecte les guillemets échappés', () => {
    expect(parseLine('a;"b;""c""";d')).toEqual({ fields: ['a', 'b;"c"', 'd'], error: null })
  })

  it('accepte un en-tête sans colonne liste (vocab)', () => {
    const res = parseCsv('fr;trad\nle chat;a cat\n', 'vocab-en')
    expect(res.errors).toEqual([])
    expect(res.items[0]).toMatchObject({ fr: 'le chat', translation: 'a cat', subListName: null })
  })

  it('accepte un en-tête sans colonne liste (verbes)', () => {
    const res = parseCsv('infinitive;preterite;past_participle;fr\nbe;was/were;been;être\n', 'verbs-en')
    expect(res.errors).toEqual([])
    expect(res.items[0]).toMatchObject({ infinitive: 'be', subListName: null })
  })

  it('signale un guillemet non fermé avec le numéro de ligne', () => {
    const res = parseCsv('fr;trad;liste\n"le chat;a cat;L1\n', 'vocab-en')
    expect(res.items).toHaveLength(0)
    expect(res.errors[0].line).toBe(2)
    expect(res.errors[0].message).toContain('non fermé')
  })

  it('signale un guillemet en position illégale', () => {
    expect(parseLine('ab"cd;ef').error).toContain('illégale')
    const res = parseCsv('fr;trad;liste\nab"cd;ef;L1\n', 'vocab-en')
    expect(res.errors[0].line).toBe(2)
  })

  it('signale du texte après un guillemet fermant', () => {
    expect(parseLine('"ab"cd;ef').error).toContain('après')
    const res = parseCsv('fr;trad;liste\n"ab"cd;ef;L1\n', 'vocab-en')
    expect(res.items).toHaveLength(0)
    expect(res.errors[0].line).toBe(2)
  })
})

describe('parseur CSV — verbes irréguliers', () => {
  it('parse le format verbes à 5 colonnes', () => {
    const res = parseCsv('infinitive;preterite;past_participle;fr;liste\nbe;was/were;been;être;G1\n', 'verbs-en')
    expect(res.errors).toEqual([])
    expect(res.items[0]).toEqual({
      kind: 'verb',
      infinitive: 'be',
      preterite: 'was/were',
      pastParticiple: 'been',
      fr: 'être',
      subListName: 'G1',
    })
  })

  it('rejette une ligne verbe avec champ vide', () => {
    const res = parseCsv('infinitive;preterite;past_participle;fr;liste\nbe;;been;être;G1\n', 'verbs-en')
    expect(res.items).toHaveLength(0)
    expect(res.errors[0].line).toBe(2)
  })
})

describe('import cumulatif', () => {
  const baseList: WordList = {
    id: 'l1',
    name: 'Test',
    type: 'vocab-en',
    isExample: false,
    items: {},
    subLists: [],
    unclassifiedItemIds: [],
  }
  let n = 0
  const idGen = () => `item-${++n}`

  it('ajoute les nouveaux mots et ignore les doublons au 2e import', () => {
    const first = applyParsedItems(baseList, parseCsv('fr;trad;liste\nle chat;a cat;L1\n', 'vocab-en').items, idGen)
    expect(first.added).toBe(1)
    expect(first.list.subLists[0].name).toBe('L1')
    expect(first.list.subLists[0].itemIds).toHaveLength(1)

    const second = applyParsedItems(
      first.list,
      parseCsv('fr;trad;liste\nle chat;a cat;L1\nle chien;a dog;L2\n', 'vocab-en').items,
      idGen,
    )
    expect(second.added).toBe(1)
    expect(second.skipped).toBe(1)
    expect(Object.keys(second.list.items)).toHaveLength(2)
    expect(second.list.subLists.map((s) => s.name).sort()).toEqual(['L1', 'L2'])
  })

  it('met les lignes sans colonne liste dans les non classés', () => {
    const out = applyParsedItems(baseList, parseCsv('fr;trad;liste\nle chat;a cat\n', 'vocab-en').items, idGen)
    expect(out.list.unclassifiedItemIds).toHaveLength(1)
    expect(out.list.subLists).toHaveLength(0)
  })
})

describe('export CSV', () => {
  it('round-trip : export puis re-parse redonne les mêmes items', () => {
    const list: WordList = {
      id: 'l1',
      name: 'Test',
      type: 'vocab-de',
      isExample: false,
      items: {
        a: { id: 'a', fr: 'grand', translation: 'groß' },
        b: { id: 'b', fr: 'un; deux', translation: 'eins' },
      },
      subLists: [{ id: 's1', name: 'L1', itemIds: ['a'] }],
      unclassifiedItemIds: ['b'],
    }
    const csv = listToCsv(list)
    expect(csv.startsWith('fr;trad;liste\n')).toBe(true)
    const res = parseCsv(csv, 'vocab-de')
    expect(res.errors).toEqual([])
    expect(res.items).toHaveLength(2)
    expect(res.items[0]).toMatchObject({ fr: 'grand', translation: 'groß', subListName: 'L1' })
    expect(res.items[1]).toMatchObject({ fr: 'un; deux', translation: 'eins', subListName: null })
  })

  it('exporte une seule sous-liste quand demandé', () => {
    const list: WordList = {
      id: 'l1',
      name: 'Verbes',
      type: 'verbs-en',
      isExample: false,
      items: {
        a: { id: 'a', fr: 'être', infinitive: 'be', preterite: 'was/were', pastParticiple: 'been' },
        b: { id: 'b', fr: 'faire', infinitive: 'do', preterite: 'did', pastParticiple: 'done' },
      },
      subLists: [
        { id: 's1', name: 'G1', itemIds: ['a'] },
        { id: 's2', name: 'G2', itemIds: ['b'] },
      ],
      unclassifiedItemIds: [],
    }
    const csv = listToCsv(list, 's2')
    expect(csv).toContain('do;did;done;faire;G2')
    expect(csv).not.toContain('be;was')
  })
})
