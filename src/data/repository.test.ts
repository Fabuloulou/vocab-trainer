import { describe, expect, it } from 'vitest'
import { LocalStorageRepository, memoryStorage, STORAGE_KEY } from './repository'
import { migrate, SCHEMA_VERSION } from './migrations'
import { createUserProfile, seedState } from './seed'
import { copyListContent } from './profiles'
import { emptyProgress, type AppState, type UserProfile } from '../domain/types'

describe('repository localStorage (couture 4, schéma v2 multi-profils)', () => {
  it('état vide → un profil « Moi » actif avec les 3 listes exemple', () => {
    const repo = new LocalStorageRepository(memoryStorage())
    const state = repo.load()
    expect(state.version).toBe(SCHEMA_VERSION)
    expect(state.profiles).toHaveLength(1)
    expect(state.profiles[0].name).toBe('Moi')
    expect(state.activeProfileId).toBe(state.profiles[0].id)
    expect(state.profiles[0].lists).toHaveLength(3)
    expect(state.profiles[0].lists.every((l) => l.isExample)).toBe(true)
    expect(state.profiles[0].lists.map((l) => l.type).sort()).toEqual(['verbs-en', 'vocab-de', 'vocab-en'])
  })

  it('save → load redonne un état identique (multi-profils)', () => {
    const storage = memoryStorage()
    const repo = new LocalStorageRepository(storage)
    const state = repo.load()
    const lucas = createUserProfile('Lucas', '🦊')
    const modified: AppState = {
      ...state,
      profiles: [
        {
          ...state.profiles[0],
          leitner: { abc: { box: 3, lastSeenAt: '2025-01-01T10:00:00.000Z' } },
          progress: { points: 40, streak: { lastDate: '2025-01-01', count: 2 }, history: [] },
        },
        lucas,
      ],
      activeProfileId: lucas.id,
    }
    repo.save(modified)
    expect(repo.load()).toEqual({ ...modified, version: SCHEMA_VERSION })
  })

  it('JSON corrompu → retombe sur les données de démo', () => {
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, '{pas du json')
    const repo = new LocalStorageRepository(storage)
    expect(repo.load().profiles[0].lists).toHaveLength(3)
  })

  it('save() ne lève pas si setItem échoue (quota / stockage indisponible)', () => {
    const failingStorage = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    const repo = new LocalStorageRepository(failingStorage)
    const state = repo.load()
    const withPoints = {
      ...state,
      profiles: state.profiles.map((p) => ({ ...p, progress: { ...p.progress, points: 50 } })),
    }
    expect(() => repo.save(withPoints)).not.toThrow()
    expect(repo.load().profiles[0].progress.points).toBe(0)
  })

  it('reset() repart d’un profil neuf avec les listes exemple', () => {
    const repo = new LocalStorageRepository(memoryStorage())
    const seeded = seedState()
    repo.save({
      ...seeded,
      profiles: [{ ...seeded.profiles[0], progress: { points: 999, streak: { lastDate: null, count: 0 }, history: [] } }],
    })
    const fresh = repo.reset()
    expect(fresh.profiles[0].progress.points).toBe(0)
    expect(fresh.profiles[0].lists).toHaveLength(3)
    expect(fresh.activeProfileId).toBe(fresh.profiles[0].id)
  })
})

describe('migrations de schéma', () => {
  it('un état v0 sans données → v2 avec un profil « Moi » vide et actif', () => {
    const migrated = migrate({ version: 0, lists: [], leitner: {} })
    expect(migrated.version).toBe(SCHEMA_VERSION)
    expect(migrated.profiles).toHaveLength(1)
    expect(migrated.profiles[0].name).toBe('Moi')
    expect(migrated.profiles[0].progress).toEqual(emptyProgress())
    expect(migrated.activeProfileId).toBe(migrated.profiles[0].id)
  })

  it('un état v1 mono-utilisateur → v2 sans perte (listes, boîtes, points, streak, historique dans « Moi »)', () => {
    const v1 = {
      version: 1,
      lists: [
        {
          id: 'l1',
          name: 'Anglais 4e',
          type: 'vocab-en',
          isExample: false,
          items: { i1: { id: 'i1', fr: 'le chat', translation: 'a cat' } },
          subLists: [{ id: 's1', name: 'Leçon 1', itemIds: ['i1'] }],
          unclassifiedItemIds: [],
        },
      ],
      leitner: { i1: { box: 3, lastSeenAt: '2025-01-01T10:00:00.000Z' } },
      profile: {
        points: 120,
        streak: { lastDate: '2025-01-02', count: 4 },
        history: [{ id: 's-1', date: '2025-01-02T10:00:00.000Z', mode: 'classic', score: 5, total: 5, pointsEarned: 50 }],
      },
    }
    const migrated = migrate(JSON.parse(JSON.stringify(v1)))
    expect(migrated.version).toBe(2)
    expect(migrated.profiles).toHaveLength(1)
    const p = migrated.profiles[0]
    expect(p.name).toBe('Moi')
    expect(p.lists).toEqual(v1.lists)
    expect(p.leitner).toEqual(v1.leitner)
    expect(p.progress).toEqual(v1.profile)
    expect(migrated.activeProfileId).toBe(p.id)
  })

  it('un état v2 valide est normalisé sans perte et le profil actif est conservé', () => {
    const state = seedState()
    const lucas = createUserProfile('Lucas', '🦊')
    const withTwo: AppState = { ...state, profiles: [...state.profiles, lucas], activeProfileId: lucas.id }
    const migrated = migrate(JSON.parse(JSON.stringify(withTwo)))
    expect(migrated.version).toBe(2)
    expect(migrated.profiles.map((p) => p.name)).toEqual(['Moi', 'Lucas'])
    expect(migrated.activeProfileId).toBe(lucas.id)
  })

  it('un activeProfileId inconnu en v2 retombe sur le premier profil', () => {
    const migrated = migrate({
      version: 2,
      profiles: [{ id: 'p1', name: 'A', emoji: '🦊', lists: [], leitner: {}, progress: emptyProgress() }],
      activeProfileId: 'inconnu',
    })
    expect(migrated.activeProfileId).toBe('p1')
  })
})

describe('isolation et copie entre profils (couture 4)', () => {
  it('deux profils stockés séparément : modifier l’un ne change pas l’autre au rechargement', () => {
    const storage = memoryStorage()
    const repo = new LocalStorageRepository(storage)
    const s0 = repo.load()
    const moi = s0.profiles[0]
    const lucas = createUserProfile('Lucas', '🦊')
    repo.save({ ...s0, profiles: [moi, lucas], activeProfileId: moi.id })

    const reloaded = repo.load()
    const bumped: AppState = {
      ...reloaded,
      profiles: reloaded.profiles.map((p) =>
        p.id === moi.id ? { ...p, progress: { ...p.progress, points: 500 } } : p,
      ),
    }
    repo.save(bumped)

    const final = repo.load()
    expect(final.profiles.find((p) => p.id === moi.id)?.progress.points).toBe(500)
    expect(final.profiles.find((p) => p.id === lucas.id)?.progress.points).toBe(0)
    expect(final.profiles.find((p) => p.id === lucas.id)?.lists).toHaveLength(3)
  })

  it('suppression d’un profil : retiré du stockage, le profil actif retombe sur un profil restant', () => {
    const storage = memoryStorage()
    const repo = new LocalStorageRepository(storage)
    const s0 = repo.load()
    const moi = s0.profiles[0]
    const lucas = createUserProfile('Lucas', '🦊')
    repo.save({ ...s0, profiles: [moi, lucas], activeProfileId: lucas.id })
    repo.save({ ...repo.load(), profiles: [moi], activeProfileId: lucas.id })
    const reloaded = repo.load()
    expect(reloaded.profiles.map((p) => p.name)).toEqual(['Moi'])
    expect(reloaded.activeProfileId).toBe(moi.id)
  })

  it('copie de liste inter-profils : contenu identique, nouveaux ids, progression vierge (boîte 1)', () => {
    const source = createUserProfile('Moi', '🙂')
    const target: UserProfile = { ...createUserProfile('Lucas', '🦊'), lists: [], leitner: {} }
    const list = source.lists[0]
    const copy = copyListContent(list)
    target.lists = [...target.lists, copy]

    expect(copy.name).toBe(list.name)
    expect(copy.type).toBe(list.type)
    expect(copy.isExample).toBe(list.isExample)
    expect(Object.keys(copy.items)).toHaveLength(Object.keys(list.items).length)
    expect(copy.subLists.map((s) => s.name)).toEqual(list.subLists.map((s) => s.name))
    expect([...copy.subLists.flatMap((s) => s.itemIds), ...copy.unclassifiedItemIds].sort()).toEqual(
      Object.keys(copy.items).sort(),
    )
    expect(copy.id).not.toBe(list.id)
    expect(Object.keys(copy.items)).not.toEqual(expect.arrayContaining(Object.keys(list.items)))
    for (const sub of copy.subLists) {
      expect(sub.id).not.toBe(list.subLists.find((s) => s.name === sub.name)?.id)
    }
    expect(target.leitner).toEqual({})
  })
})
