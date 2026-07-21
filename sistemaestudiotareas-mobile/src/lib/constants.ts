// Re-export from centralized constants
export { TABS, KEYBOARD_SHORTCUTS } from '@/constants/tabs'

export const PRIORITY_COLORS: Record<string, string> = {
  baja: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  alta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}
