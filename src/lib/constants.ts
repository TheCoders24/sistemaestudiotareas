import { Clock, LayoutDashboard, CheckSquare, BookOpen, BarChart3, StickyNote, Target, FolderKanban, NotebookPen, Code2, Activity, Home, Brain, History } from 'lucide-react'

export const PRIORITY_LABELS: Record<string, string> = {
  baja: 'Baja prioridad',
  media: 'Media prioridad',
  alta: 'Alta prioridad',
}

export const PRIORITY_COLORS: Record<string, string> = {
  baja: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  alta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'pomodoro', label: 'Pomodoro', icon: Clock },
  { id: 'kanban', label: 'Kanban', icon: LayoutDashboard },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
  { id: 'flashcards', label: 'Flashcards', icon: Brain },
  { id: 'diario', label: 'Diario', icon: NotebookPen },
  { id: 'snippets', label: 'Snippets', icon: Code2 },
  { id: 'habitos', label: 'Hábitos', icon: Activity },
  { id: 'mapa', label: 'Estudio', icon: BookOpen },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'notas', label: 'Notas', icon: StickyNote },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'actividad', label: 'Actividad', icon: History },
]

export const KEYBOARD_SHORTCUTS: Record<string, string> = {
  dashboard: 'Ctrl+Shift+H',
  pomodoro: 'Ctrl+P',
  kanban: 'Ctrl+K',
  tareas: 'Ctrl+T',
  proyectos: 'Ctrl+Shift+P',
  flashcards: 'Ctrl+Shift+F',
  diario: 'Ctrl+D',
  snippets: 'Ctrl+Shift+S',
  habitos: 'Ctrl+H',
  mapa: 'Ctrl+M',
  stats: 'Ctrl+E',
  notas: 'Ctrl+N',
  metas: 'Ctrl+G',
  actividad: 'Ctrl+Shift+A',
}

export const SHORTCUT_CONFIG: Array<{ id: string; key: string; shift: boolean }> = [
  { id: 'dashboard', key: 'h', shift: true },
  { id: 'pomodoro', key: 'p', shift: false },
  { id: 'proyectos', key: 'p', shift: true },
  { id: 'kanban', key: 'k', shift: false },
  { id: 'tareas', key: 't', shift: false },
  { id: 'flashcards', key: 'f', shift: true },
  { id: 'diario', key: 'd', shift: false },
  { id: 'snippets', key: 's', shift: true },
  { id: 'habitos', key: 'h', shift: false },
  { id: 'mapa', key: 'm', shift: false },
  { id: 'stats', key: 'e', shift: false },
  { id: 'notas', key: 'n', shift: false },
  { id: 'metas', key: 'g', shift: false },
  { id: 'actividad', key: 'a', shift: true },
]

export const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekdays', label: 'Días de semana' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
]
