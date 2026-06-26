import { create } from 'zustand'

export interface Theme {
  id: string
  label: string
  primary: string
  accent: string
  vars: Record<string, string>
}

export const THEMES: Theme[] = [
  {
    id: 'indigo',
    label: 'Índigo',
    primary: '#6366f1',
    accent: '#818cf8',
    vars: {
      '--primary': '236 80% 67%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '236 80% 67%',
    },
  },
  {
    id: 'emerald',
    label: 'Esmeralda',
    primary: '#10b981',
    accent: '#34d399',
    vars: {
      '--primary': '160 84% 39%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '160 84% 39%',
    },
  },
  {
    id: 'rose',
    label: 'Rosa',
    primary: '#f43f5e',
    accent: '#fb7185',
    vars: {
      '--primary': '346 90% 60%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '346 90% 60%',
    },
  },
  {
    id: 'amber',
    label: 'Ámbar',
    primary: '#f59e0b',
    accent: '#fbbf24',
    vars: {
      '--primary': '38 92% 50%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '38 92% 50%',
    },
  },
  {
    id: 'violet',
    label: 'Violeta',
    primary: '#8b5cf6',
    accent: '#a78bfa',
    vars: {
      '--primary': '258 90% 66%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '258 90% 66%',
    },
  },
  {
    id: 'sky',
    label: 'Cielo',
    primary: '#0ea5e9',
    accent: '#38bdf8',
    vars: {
      '--primary': '199 89% 48%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '199 89% 48%',
    },
  },
  {
    id: 'orange',
    label: 'Naranja',
    primary: '#f97316',
    accent: '#fb923c',
    vars: {
      '--primary': '24 94% 53%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '24 94% 53%',
    },
  },
  {
    id: 'lime',
    label: 'Lima',
    primary: '#84cc16',
    accent: '#a3e635',
    vars: {
      '--primary': '84 81% 44%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '84 81% 44%',
    },
  },
]

interface ThemeState {
  themeId: string
  setThemeId: (id: string) => void
}

function applyTheme(themeId: string) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0]
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val)
  })
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: 'indigo',
  setThemeId: (id) => {
    applyTheme(id)
    set({ themeId: id })
  },
}))

applyTheme('indigo')
