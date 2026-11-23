import { describe, expect, it } from 'vitest'
import { checkAnswer, fieldVerdicts, normalizeForCompare } from './checkAnswer'

describe('correction de saisie', () => {
  it('ignore la casse', () => {
    expect(checkAnswer('A CAT', 'a cat')).toBe(true)
    expect(checkAnswer('Die Katze', 'die katze')).toBe(true)
  })

  it('est stricte sur les accents', () => {
    expect(checkAnswer('chateau', 'château')).toBe(false)
    expect(checkAnswer('etre', 'être')).toBe(false)
  })

  it('est stricte sur les umlauts : groß ≠ gross', () => {
    expect(checkAnswer('gross', 'groß')).toBe(false)
    expect(checkAnswer('GROSS', 'groß')).toBe(false)
    expect(checkAnswer('groß', 'groß')).toBe(true)
    expect(checkAnswer('GROß', 'groß')).toBe(true)
  })

  it('tolère les espaces en trop autour et entre les mots', () => {
    expect(checkAnswer('  la   maison ', 'La Maison')).toBe(true)
  })

  it('normalise pour la comparaison', () => {
    expect(normalizeForCompare('  Été  ')).toBe('été')
  })

  it('fieldVerdicts compare champ par champ (saisie partielle tolérée)', () => {
    expect(fieldVerdicts(['blew', 'blow', 'souffler'], ['blew', 'blown', 'souffler'])).toEqual([true, false, true])
    expect(fieldVerdicts(['BLEW'], ['blew'])).toEqual([true])
    expect(fieldVerdicts([], ['blew'])).toEqual([false])
  })
})
