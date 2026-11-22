import { describe, expect, it } from 'vitest'
import { LocalStorageRepository, memoryStorage } from './repository'
import { migrate, SCHEMA_VERSION } from './migrations'
import { seedState } from './seed'
import { emptyProfile, type AppState } from '../domain/types'

describe('repository localStorage (couture 4)', () => {
  it('état vide → données de démonstration (3 listes exemple)', () => {
    const repo = new LocalStorageRepository(memoryStorage())
    const state = repo.load()
    expect(state.lists).toHaveLength(3)
    expect(state.lists.every((l) => l.isExample)).toBe(true)
    expect(state.lists.map((l) => l.type).sort()).toEqual(['verbs-en', 'vocab-de', 'vocab-en'])
  })

  it('save → load redonne un état identique', () => {
    const storage = memoryStorage()
    const repo = new LocalStorageRepository(storage)
    const state = repo.load()
    const modified: AppState = {
      ...state,
      leitner: { abc: { box: 3, lastSeenAt: '2025-01-01T10:00:00.000Z' } },
      profile: { points: 40, streak: { lastDate: '2025-01-01', count: 2 }, history: [] },
    }
    repo.save(modified)
    const reloaded = repo.load()
    expect(reloaded).toEqual({ ...modified, version: SCHEMA_VERSION })
  })

  it('JSON corrompu → retombe sur les données de démo', () => {
    const storage = memoryStorage()
    storage.setItem('vocab-trainer:state', '{pas du json')
    const repo = new LocalStorageRepository(storage)
    expect(repo.load().lists).toHaveLength(3)
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
    expect(() => repo.save({ ...state, profile: { ...state.profile, points: 50 } })).not.toThrow()
    expect(repo.load().profile.points).toBe(0)
  })

  it('reset() repart des données de démo', () => {
    const repo = new LocalStorageRepository(memoryStorage())
    repo.save({ ...seedState(), profile: { points: 999, streak: { lastDate: null, count: 0 }, history: [] } })
    const fresh = repo.reset()
    expect(fresh.profile.points).toBe(0)
  })
})

describe('migrations de schéma', () => {
  it('un état v0 sans profil reçoit un profil par défaut et passe en v1', () => {
    const migrated = migrate({ version: 0, lists: [], leitner: {} })
    expect(migrated.version).toBe(SCHEMA_VERSION)
    expect(migrated.profile).toEqual(emptyProfile())
  })

  it('un état v1 valide est normalisé sans perte', () => {
    const state = seedState()
    const migrated = migrate(JSON.parse(JSON.stringify(state)))
    expect(migrated.lists).toHaveLength(3)
    expect(migrated.profile.points).toBe(0)
  })
})
