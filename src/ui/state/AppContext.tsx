import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { LocalStorageRepository, type Repository } from '../../data/repository'
import type { AppState } from '../../domain/types'

interface AppController {
  state: AppState
  repo: Repository
  update: (fn: (state: AppState) => AppState) => void
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

  const resetAll = useCallback(() => {
    const fresh = repo.reset()
    setState(fresh)
  }, [repo])

  const value = useMemo(() => ({ state, repo, update, resetAll }), [state, repo, update, resetAll])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppController {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé dans AppProvider')
  return ctx
}
