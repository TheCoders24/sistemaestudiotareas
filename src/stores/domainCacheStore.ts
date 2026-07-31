import { create } from 'zustand'

interface DomainCache {
  workspaces: Map<number, any>
  projects: Map<number, any>
  tasks: Map<number, any>
  notes: Map<number, any>
  labels: Map<number, any>
  kanbanColumns: Map<number, any>
  kanbanCards: Map<number, any>
}

interface DomainCacheState {
  cache: DomainCache
  setItem: (domain: keyof DomainCache, id: number, value: any) => void
  getItem: (domain: keyof DomainCache, id: number) => any | undefined
  invalidate: (domain: keyof DomainCache) => void
  invalidateAll: () => void
}

const initialCache: DomainCache = {
  workspaces: new Map(),
  projects: new Map(),
  tasks: new Map(),
  notes: new Map(),
  labels: new Map(),
  kanbanColumns: new Map(),
  kanbanCards: new Map(),
}

export const useDomainCacheStore = create<DomainCacheState>((set, get) => ({
  cache: initialCache,
  setItem: (domain, id, value) => {
    const newCache = { ...get().cache }
    newCache[domain] = new Map(newCache[domain])
    newCache[domain].set(id, value)
    set({ cache: newCache })
  },
  getItem: (domain, id) => {
    return get().cache[domain].get(id)
  },
  invalidate: (domain) => {
    const newCache = { ...get().cache }
    newCache[domain] = new Map()
    set({ cache: newCache })
  },
  invalidateAll: () => {
    set({ cache: initialCache })
  },
}))
