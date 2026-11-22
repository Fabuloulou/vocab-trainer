import { describe, expect, it } from 'vitest'
import { dateKeyInParis, masteryPercent, pointsFor, recordSession, updateStreak, HISTORY_LIMIT } from './progress'
import { emptyProfile } from './types'

describe('streak sur jours calendaires Europe/Paris', () => {
  it('le même jour ne change rien', () => {
    expect(updateStreak({ lastDate: '2025-03-10', count: 3 }, '2025-03-10')).toEqual({ lastDate: '2025-03-10', count: 3 })
  })

  it('le lendemain incrémente', () => {
    expect(updateStreak({ lastDate: '2025-03-10', count: 3 }, '2025-03-11')).toEqual({ lastDate: '2025-03-11', count: 4 })
  })

  it('un trou remet à 1 (changement de mois inclus)', () => {
    expect(updateStreak({ lastDate: '2025-01-31', count: 9 }, '2025-02-02')).toEqual({ lastDate: '2025-02-02', count: 1 })
    expect(updateStreak({ lastDate: '2025-02-28', count: 9 }, '2025-03-01')).toEqual({ lastDate: '2025-03-01', count: 10 })
  })

  it('dateKeyInParis renvoie YYYY-MM-DD', () => {
    expect(dateKeyInParis(new Date('2025-03-10T23:30:00Z'))).toBe('2025-03-11')
    expect(/^\d{4}-\d{2}-\d{2}$/.test(dateKeyInParis())).toBe(true)
  })
})

describe('points et historique', () => {
  it('points : 10 par réussite, bonus défi, 0 si échec', () => {
    expect(pointsFor(true, 'classic')).toBe(10)
    expect(pointsFor(true, 'challenge')).toBe(15)
    expect(pointsFor(false, 'challenge')).toBe(0)
  })

  it('recordSession cumule points, met à jour le streak et garde 10 sessions max', () => {
    let profile = emptyProfile()
    for (let i = 0; i < 12; i++) {
      profile = recordSession(profile, {
        date: new Date(2025, 0, i + 1, 12).toISOString(),
        mode: 'classic',
        score: 8,
        total: 10,
        pointsEarned: 80,
      }, new Date(2025, 0, i + 1, 12))
    }
    expect(profile.points).toBe(12 * 80)
    expect(profile.history).toHaveLength(HISTORY_LIMIT)
    expect(profile.streak.count).toBe(12)
  })
})

describe('maîtrise par liste', () => {
  it('0 % sans item, 100 % quand tout est en boîte 4', () => {
    const list = { items: { a: {}, b: {} }, unclassifiedItemIds: ['a'], subLists: [{ itemIds: ['b'] }] }
    expect(masteryPercent(list, {})).toBe(0)
    expect(masteryPercent(list, { a: { box: 4, lastSeenAt: null }, b: { box: 4, lastSeenAt: null } })).toBe(100)
    expect(masteryPercent(list, { a: { box: 4, lastSeenAt: null }, b: { box: 1, lastSeenAt: null } })).toBe(50)
  })
})
