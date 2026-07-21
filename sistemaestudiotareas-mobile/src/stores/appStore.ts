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
  focusMode: boolean
  userName: string
  fontSize: 'sm' | 'base' | 'lg'
  language: 'es' | 'en'
  denseMode: boolean
  firstRun: boolean
  setActiveTab: (tab: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setDarkMode: (dark: boolean) => void
  setStreak: (streak: StreakData) => void
  setFocusMode: (focus: boolean) => void
  setUserName: (name: string) => void
  setFontSize: (size: 'sm' | 'base' | 'lg') => void
  setLanguage: (lang: 'es' | 'en') => void
  setDenseMode: (dense: boolean) => void
  setFirstRun: (val: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'inicio',
  sidebarOpen: true,
  darkMode: true,
  streak: { current: 0, max: 0 },
  focusMode: false,
  userName: '',
  fontSize: 'base',
  language: 'es',
  denseMode: false,
  firstRun: true,
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDarkMode: (dark) => set({ darkMode: dark }),
  setStreak: (streak) => set({ streak }),
  setFocusMode: (focus) => set({ focusMode: focus }),
  setUserName: (name) => set({ userName: name }),
  setFontSize: (size) => set({ fontSize: size }),
  setLanguage: (lang) => set({ language: lang }),
  setDenseMode: (dense) => set({ denseMode: dense }),
  setFirstRun: (val) => set({ firstRun: val }),
}))
