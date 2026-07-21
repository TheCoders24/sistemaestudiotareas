import { create } from 'zustand'

interface UndoAction {
  id: string
  label: string
  timestamp: number
  onUndo: () => void | Promise<void>
}

interface UndoState {
  actions: UndoAction[]
  pushAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void
  undo: (id: string) => Promise<void>
  clearExpired: () => void
}

export const useUndoStore = create<UndoState>((set, get) => ({
  actions: [],
  pushAction: (action) => {
    const id = Math.random().toString(36).slice(2)
    const entry: UndoAction = { ...action, id, timestamp: Date.now() }
    set((s) => ({ actions: [...s.actions, entry] }))
    setTimeout(() => {
      set((s) => ({ actions: s.actions.filter(a => a.id !== id) }))
    }, 8000)
  },
  undo: async (id) => {
    const action = get().actions.find(a => a.id === id)
    if (action) {
      await action.onUndo()
      set((s) => ({ actions: s.actions.filter(a => a.id !== id) }))
    }
  },
  clearExpired: () => {
    const cutoff = Date.now() - 8000
    set((s) => ({ actions: s.actions.filter(a => a.timestamp > cutoff) }))
  },
}))
