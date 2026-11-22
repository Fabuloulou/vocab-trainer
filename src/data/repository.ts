import { migrate, SCHEMA_VERSION } from './migrations'
import { seedState } from './seed'
import type { AppState } from '../domain/types'

export const STORAGE_KEY = 'vocab-trainer:state'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function memoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

export interface Repository {
  load(): AppState
  save(state: AppState): void
  reset(): AppState
}

export class LocalStorageRepository implements Repository {
  private storage: StorageLike
  private key: string

  constructor(storage?: StorageLike, key: string = STORAGE_KEY) {
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : memoryStorage())
    this.key = key
  }

  load(): AppState {
    const raw = this.storage.getItem(this.key)
    if (!raw) return seedState()
    try {
      return migrate(JSON.parse(raw))
    } catch {
      return seedState()
    }
  }

  save(state: AppState): void {
    this.storage.setItem(this.key, JSON.stringify({ ...state, version: SCHEMA_VERSION }))
  }

  reset(): AppState {
    this.storage.removeItem(this.key)
    return seedState()
  }
}
