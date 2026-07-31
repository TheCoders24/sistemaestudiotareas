export type SettingValue = string | number | boolean | null | Record<string, unknown>

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  themeColor: string
  language: 'es' | 'en'
  fontSize: 'sm' | 'base' | 'lg'
  denseMode: boolean
  autoDarkMode: boolean
  autoDarkStart: string
  autoDarkEnd: string
  activeWorkspaceId: number | null
  activeProjectId: number | null
  activeModule: string | null
  sidebarOpen: boolean
  windowBounds: { width: number; height: number; x?: number; y?: number } | null
  lastBackupDate: string | null
  developerMode: boolean
  userProfile: 'student' | 'developer' | 'custom'
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  themeColor: '#6366f1',
  language: 'es',
  fontSize: 'base',
  denseMode: false,
  autoDarkMode: false,
  autoDarkStart: '20:00',
  autoDarkEnd: '07:00',
  activeWorkspaceId: null,
  activeProjectId: null,
  activeModule: null,
  sidebarOpen: true,
  windowBounds: null,
  lastBackupDate: null,
  developerMode: false,
  userProfile: 'custom',
}
