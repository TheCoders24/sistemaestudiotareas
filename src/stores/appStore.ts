import { create } from 'zustand'

interface StreakData {
  current: number
  max: number
}

interface AppState {
  activeTab: string
  sidebarOpen: boolean
  darkMode: boolean
  streak: StreakData
  setActiveTab: (tab: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setDarkMode: (dark: boolean) => void
  setStreak: (streak: StreakData) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  sidebarOpen: true,
  darkMode: true,
  streak: { current: 0, max: 0 },
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDarkMode: (dark) => {
    document.documentElement.classList.toggle('dark', dark)
    set({ darkMode: dark })
  },
  setStreak: (streak) => set({ streak }),
}))
