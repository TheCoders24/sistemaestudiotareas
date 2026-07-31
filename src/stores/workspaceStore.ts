import { create } from 'zustand'
import type { Workspace } from '@/types'

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  loading: boolean
  loadWorkspaces: () => Promise<void>
  setActiveWorkspace: (ws: Workspace) => Promise<void>
  createWorkspace: (data: Partial<Workspace>) => Promise<Workspace>
  updateWorkspace: (id: number, data: Partial<Workspace>) => Promise<Workspace>
  deleteWorkspace: (id: number) => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspace: null,
  loading: false,
  loadWorkspaces: async () => {
    if (!window.electronAPI) return
    set({ loading: true })
    const [workspaces, active] = await Promise.all([
      window.electronAPI.workspaces.list(),
      window.electronAPI.workspaces.getActive(),
    ])
    set({ workspaces, activeWorkspace: active, loading: false })
  },
  setActiveWorkspace: async (ws) => {
    if (!window.electronAPI) return
    await window.electronAPI.workspaces.setActive(ws.id)
    set({ activeWorkspace: ws })
  },
  createWorkspace: async (data) => {
    if (!window.electronAPI) throw new Error('No electronAPI')
    const ws = await window.electronAPI.workspaces.create(data)
    set((s) => ({ workspaces: [...s.workspaces, ws] }))
    return ws
  },
  updateWorkspace: async (id, data) => {
    if (!window.electronAPI) throw new Error('No electronAPI')
    const ws = await window.electronAPI.workspaces.update(id, data)
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? ws : w)),
      activeWorkspace: s.activeWorkspace?.id === id ? ws : s.activeWorkspace,
    }))
    return ws
  },
  deleteWorkspace: async (id) => {
    if (!window.electronAPI) return
    await window.electronAPI.workspaces.delete(id)
    set((s) => ({ workspaces: s.workspaces.filter((w) => w.id !== id) }))
  },
}))
