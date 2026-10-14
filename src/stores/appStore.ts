import { create } from 'zustand'

interface StreakData {
  current: number
  max: number
}

interface InitSettings {
  darkMode?: boolean
  themeColor?: string
  userName?: string
  fontSize?: 'sm' | 'base' | 'lg'
  language?: 'es' | 'en'
  denseMode?: boolean
  autoDarkMode?: boolean
  autoDarkStart?: string
  autoDarkEnd?: string
  firstRun?: boolean
}

interface AppState {
  activeTab: string
  sidebarOpen: boolean
  darkMode: boolean
  autoDarkMode: boolean
  autoDarkStart: string
  autoDarkEnd: string
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
  setAutoDarkMode: (val: boolean) => void
  setAutoDarkStart: (val: string) => void
  setAutoDarkEnd: (val: string) => void
  setStreak: (streak: StreakData) => void
  setFocusMode: (focus: boolean) => void
  setUserName: (name: string) => void
  setFontSize: (size: 'sm' | 'base' | 'lg') => void
  setLanguage: (lang: 'es' | 'en') => void
  setDenseMode: (dense: boolean) => void
  setFirstRun: (val: boolean) => void
  setInitialSettings: (settings: InitSettings) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'inicio',
  sidebarOpen: true,
  darkMode: true,
  autoDarkMode: false,
  autoDarkStart: '20:00',
  autoDarkEnd: '07:00',
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
  setAutoDarkMode: (val) => set({ autoDarkMode: val }),
  setAutoDarkStart: (val) => set({ autoDarkStart: val }),
  setAutoDarkEnd: (val) => set({ autoDarkEnd: val }),
  setStreak: (streak) => set({ streak }),
  setFocusMode: (focus) => set({ focusMode: focus }),
  setUserName: (name) => set({ userName: name }),
  setFontSize: (size) => set({ fontSize: size }),
  setLanguage: (lang) => set({ language: lang }),
  setDenseMode: (dense) => set({ denseMode: dense }),
  setFirstRun: (val) => set({ firstRun: val }),
  setInitialSettings: (settings) => set({
    ...(settings.darkMode !== undefined && { darkMode: settings.darkMode }),
    ...(settings.userName !== undefined && { userName: settings.userName }),
    ...(settings.fontSize !== undefined && { fontSize: settings.fontSize }),
    ...(settings.language !== undefined && { language: settings.language }),
    ...(settings.denseMode !== undefined && { denseMode: settings.denseMode }),
    ...(settings.autoDarkMode !== undefined && { autoDarkMode: settings.autoDarkMode }),
    ...(settings.autoDarkStart !== undefined && { autoDarkStart: settings.autoDarkStart }),
    ...(settings.autoDarkEnd !== undefined && { autoDarkEnd: settings.autoDarkEnd }),
    ...(settings.firstRun !== undefined && { firstRun: settings.firstRun }),
  }),
}))
