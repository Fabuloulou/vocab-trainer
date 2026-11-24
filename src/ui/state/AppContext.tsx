import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { LocalStorageRepository, type Repository } from '../../data/repository'
import { copyListContent } from '../../data/profiles'
import { createUserProfile } from '../../data/seed'
import type { AppState, UserProfile } from '../../domain/types'

interface AppController {
  state: AppState
  activeProfile: UserProfile | null
  update: (fn: (state: AppState) => AppState) => void
  updateActive: (fn: (profile: UserProfile) => UserProfile) => void
  selectProfile: (id: string) => void
  createProfile: (name: string, emoji: string) => UserProfile
  renameProfile: (id: string, name: string) => void
  deleteProfile: (id: string) => void
  copyListToProfile: (listId: string, targetProfileId: string) => boolean
  resetAll: () => void
}

const AppContext = createContext<AppController | null>(null)

export function AppProvider({ repository, children }: { repository?: Repository; children: ReactNode }) {
  const repo = useMemo(() => repository ?? new LocalStorageRepository(), [repository])
  const [state, setState] = useState<AppState>(() => repo.load())

  const update = useCallback(
    (fn: (state: AppState) => AppState) => {
      setState((prev) => {
        const next = fn(prev)
        repo.save(next)
        return next
      })
    },
    [repo],
  )

  const activeProfile = useMemo(
    () => state.profiles.find((p) => p.id === state.activeProfileId) ?? null,
    [state],
  )

  const updateActive = useCallback(
    (fn: (profile: UserProfile) => UserProfile) => {
      update((s) =>
        s.activeProfileId
          ? { ...s, profiles: s.profiles.map((p) => (p.id === s.activeProfileId ? fn(p) : p)) }
          : s,
      )
    },
    [update],
  )

  const selectProfile = useCallback(
    (id: string) => {
      update((s) => (s.profiles.some((p) => p.id === id) ? { ...s, activeProfileId: id } : s))
    },
    [update],
  )

  const createProfile = useCallback(
    (name: string, emoji: string) => {
      const profile = createUserProfile(name.trim(), emoji)
      update((s) => ({ ...s, profiles: [...s.profiles, profile] }))
      return profile
    },
    [update],
  )

  const renameProfile = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      update((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id ? { ...p, name: trimmed } : p)) }))
    },
    [update],
  )

  const deleteProfile = useCallback(
    (id: string) => {
      update((s) => {
        const profiles = s.profiles.filter((p) => p.id !== id)
        return {
          ...s,
          profiles,
          activeProfileId: s.activeProfileId === id ? (profiles[0]?.id ?? null) : s.activeProfileId,
        }
      })
    },
    [update],
  )

  const copyListToProfile = useCallback(
    (listId: string, targetProfileId: string) => {
      let done = false
      update((s) => {
        const source = s.activeProfileId ? s.profiles.find((p) => p.id === s.activeProfileId) : undefined
        const target = s.profiles.find((p) => p.id === targetProfileId)
        const list = source?.lists.find((l) => l.id === listId)
        if (!target || !list) return s
        done = true
        return {
          ...s,
          profiles: s.profiles.map((p) =>
            p.id === targetProfileId ? { ...p, lists: [...p.lists, copyListContent(list)] } : p,
          ),
        }
      })
      return done
    },
    [update],
  )

  const resetAll = useCallback(() => {
    const fresh = repo.reset()
    setState(fresh)
  }, [repo])

  const value = useMemo(
    () => ({
      state,
      activeProfile,
      update,
      updateActive,
      selectProfile,
      createProfile,
      renameProfile,
      deleteProfile,
      copyListToProfile,
      resetAll,
    }),
    [state, activeProfile, update, updateActive, selectProfile, createProfile, renameProfile, deleteProfile, copyListToProfile, resetAll],
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppController {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé dans AppProvider')
  return ctx
}
