import {
  Sparkles, Clock, LayoutDashboard, CheckSquare, FolderKanban,
  NotebookPen, CalendarDays, Code2, Activity, Trophy, Swords,
  BookOpen, BarChart3, StickyNote, Target, Trash2, Brain, Battery,
  BellRing, Flame, Globe, Eye, RefreshCw,
  FileText, CalendarPlus, Zap, Settings2, TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface Tab {
  id: string
  label: string
  icon: LucideIcon
}

export interface Hub {
  id: string
  label: string
  icon: LucideIcon
  tabs: Tab[]
}

export const HUBS: Hub[] = [
  {
    id: 'enfoque',
    label: 'Enfoque',
    icon: Clock,
    tabs: [
      { id: 'pomodoro', label: 'Pomodoro', icon: Clock },
      { id: 'bloqueador', label: 'Rastreador de sitios', icon: Globe },
      { id: 'distracciones', label: 'Distracciones', icon: Eye },
    ],
  },
  {
    id: 'estudio',
    label: 'Estudio',
    icon: BookOpen,
    tabs: [
      { id: 'cursos', label: 'Cursos', icon: BookOpen },
      { id: 'exams', label: 'Exámenes', icon: CalendarDays },
      { id: 'tutor', label: 'Tutor IA', icon: Brain },
      { id: 'mapa', label: 'Study Map', icon: BookOpen },
      { id: 'flashcards', label: 'Flashcards', icon: Brain },
      { id: 'repaso', label: 'Repaso Inteligente', icon: Brain },
      { id: 'rachas-materias', label: 'Rachas por Materia', icon: Flame },
    ],
  },
  {
    id: 'trabajo',
    label: 'Trabajo',
    icon: LayoutDashboard,
    tabs: [
      { id: 'kanban', label: 'Kanban', icon: LayoutDashboard },
      { id: 'tareas', label: 'Tareas', icon: CheckSquare },
      { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
      { id: 'automation', label: 'Automatización', icon: Zap },
    ],
  },
  {
    id: 'registro',
    label: 'Registro',
    icon: NotebookPen,
    tabs: [
      { id: 'diario', label: 'Diario / Daily Log', icon: NotebookPen },
      { id: 'calendario', label: 'Calendario', icon: CalendarDays },
      { id: 'habitos', label: 'Hábitos', icon: Activity },
      { id: 'metas', label: 'Metas', icon: Target },
      { id: 'importar-cal', label: 'Importar Calendario', icon: CalendarPlus },
      { id: 'energia', label: 'Energy Planning', icon: Battery },
    ],
  },
  {
    id: 'conocimiento',
    label: 'Conocimiento',
    icon: StickyNote,
    tabs: [
      { id: 'notas', label: 'Notas', icon: StickyNote },
      { id: 'snippets', label: 'Snippets', icon: Code2 },
    ],
  },
  {
    id: 'progreso',
    label: 'Progreso',
    icon: Trophy,
    tabs: [
      { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
      { id: 'logros', label: 'Logros', icon: Trophy },
      { id: 'desafios', label: 'Desafíos', icon: Swords },
      { id: 'reporte', label: 'Reporte Semanal', icon: TrendingUp },
      { id: 'informe', label: 'Informe Semanal PDF', icon: FileText },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: Settings2,
    tabs: [
      { id: 'sync', label: 'Sincronización', icon: RefreshCw },
      { id: 'recordatorios', label: 'Smart Reminders', icon: BellRing },
      { id: 'papelera', label: 'Papelera', icon: Trash2 },
    ],
  },
]

export const TABS: Tab[] = [
  { id: 'inicio', label: 'Inicio', icon: Sparkles },
  ...HUBS.flatMap(h => h.tabs),
]

export const KEYBOARD_SHORTCUTS: Record<string, string> = {
  inicio: 'Ctrl+1', pomodoro: 'Ctrl+P', tareas: 'Ctrl+T',
  proyectos: 'Ctrl+Shift+P', diario: 'Ctrl+D', calendario: 'Ctrl+Shift+C',
  snippets: 'Ctrl+Shift+S', habitos: 'Ctrl+H', logros: 'Ctrl+L',
  desafios: 'Ctrl+Shift+D', mapa: 'Ctrl+M', stats: 'Ctrl+E',
  notas: 'Ctrl+N', metas: 'Ctrl+G', reporte: 'Ctrl+Shift+R', papelera: 'Ctrl+Shift+T',
  flashcards: 'Ctrl+Shift+F', repaso: 'Ctrl+Shift+Q', energia: 'Ctrl+Shift+B',
  recordatorios: 'Ctrl+Shift+N',
  bloqueador: 'Ctrl+Shift+Z', distracciones: 'Ctrl+Shift+E', sync: 'Ctrl+Shift+W',
  informe: 'Ctrl+Shift+O', 'importar-cal': 'Ctrl+Shift+A',
}
