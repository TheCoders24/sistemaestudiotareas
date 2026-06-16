import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from '@/components/ui/toaster'
import { PomodoroTimer } from './components/Pomodoro/PomodoroTimer'
import KanbanBoard from './components/Kanban/KanbanBoard'
import TaskList from './components/TaskList/TaskList'
import StudyMap from './components/StudyMap/StudyMap'
import Statistics from './components/Statistics/Statistics'
import QuickNotes from './components/QuickNotes/QuickNotes'
import Goals from './components/Goals/Goals'
import Sidebar from './components/Sidebar/Sidebar'
import Settings from './components/Settings/Settings'
import ProjectsPage from './components/Projects/ProjectsPage'
import DailyLogPage from './components/DailyLog/DailyLogPage'
import SnippetsPage from './components/Snippets/SnippetsPage'
import HabitsPage from './components/Habits/HabitsPage'
import {
  Clock, LayoutDashboard, CheckSquare, BookOpen, BarChart3,
  StickyNote, Target, FolderKanban, NotebookPen, Code2, Activity,
  Menu, Sun, Moon, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const TABS = [
  { id: 'pomodoro', label: 'Pomodoro', icon: Clock },
  { id: 'kanban', label: 'Kanban', icon: LayoutDashboard },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
  { id: 'diario', label: 'Diario', icon: NotebookPen },
  { id: 'snippets', label: 'Snippets', icon: Code2 },
  { id: 'habitos', label: 'Hábitos', icon: Activity },
  { id: 'mapa', label: 'Estudio', icon: BookOpen },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'notas', label: 'Notas', icon: StickyNote },
  { id: 'metas', label: 'Metas', icon: Target },
]

const KEYBOARD_SHORTCUTS: Record<string, string> = {
  pomodoro: 'Ctrl+P',
  kanban: 'Ctrl+K',
  tareas: 'Ctrl+T',
  proyectos: 'Ctrl+Shift+P',
  diario: 'Ctrl+D',
  snippets: 'Ctrl+Shift+S',
  habitos: 'Ctrl+H',
  mapa: 'Ctrl+M',
  stats: 'Ctrl+E',
  notas: 'Ctrl+N',
  metas: 'Ctrl+G',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('pomodoro')
  const [darkMode, setDarkMode] = useState(true)
  const [streak, setStreak] = useState({ current: 0, max: 0 })
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSetting('theme').then(val => {
        if (val !== null) setDarkMode(val === 'dark')
      })
      window.electronAPI.getStreak('daily_study').then(s => {
        if (s) setStreak(s)
      })
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setSetting('theme', darkMode ? 'dark' : 'light')
    }
  }, [darkMode])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      const key = e.key.toLowerCase()
      if (key === 'p' && !e.shiftKey) { e.preventDefault(); setActiveTab('pomodoro') }
      else if (key === 'k' && !e.shiftKey) { e.preventDefault(); setActiveTab('kanban') }
      else if (key === 't' && !e.shiftKey) { e.preventDefault(); setActiveTab('tareas') }
      else if (key === 'p' && e.shiftKey) { e.preventDefault(); setActiveTab('proyectos') }
      else if (key === 'd' && !e.shiftKey) { e.preventDefault(); setActiveTab('diario') }
      else if (key === 's' && e.shiftKey) { e.preventDefault(); setActiveTab('snippets') }
      else if (key === 'h' && !e.shiftKey) { e.preventDefault(); setActiveTab('habitos') }
      else if (key === 'm' && !e.shiftKey) { e.preventDefault(); setActiveTab('mapa') }
      else if (key === 'e' && !e.shiftKey) { e.preventDefault(); setActiveTab('stats') }
      else if (key === 'n' && !e.shiftKey) { e.preventDefault(); setActiveTab('notas') }
      else if (key === 'g' && !e.shiftKey) { e.preventDefault(); setActiveTab('metas') }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleStreakUpdate = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.updateStreak('daily_study').then(s => {
        if (s) setStreak(s)
      })
    }
  }, [])

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Top Navbar */}
        <header className="flex items-center h-14 px-4 border-b bg-card shrink-0 gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="shrink-0">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-1.5 mr-4">
            <Zap className="h-5 w-5 text-indigo-500" />
            <span className="font-bold text-base">EstudioApp</span>
          </div>

          <div className="flex-1 flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab(tab.id)}
                      className={`text-xs gap-1.5 ${isActive ? '' : 'text-muted-foreground'}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{tab.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span>{tab.label} ({KEYBOARD_SHORTCUTS[tab.id]})</span>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {streak.current > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-orange-500 font-medium flex items-center gap-1">
                    <Zap className="h-4 w-4" /> {streak.current}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Racha actual: {streak.current} días (máx: {streak.max})</span>
                </TooltipContent>
              </Tooltip>
            )}
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Settings />
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {sidebarOpen && (
            <aside className="w-60 shrink-0 border-r bg-card overflow-y-auto p-4 hidden md:block">
              <Sidebar darkMode={darkMode} />
            </aside>
          )}

          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'pomodoro' && <PomodoroTimer onComplete={handleStreakUpdate} />}
                {activeTab === 'kanban' && <KanbanBoard />}
                {activeTab === 'tareas' && <TaskList />}
                {activeTab === 'proyectos' && <ProjectsPage />}
                {activeTab === 'diario' && <DailyLogPage />}
                {activeTab === 'snippets' && <SnippetsPage />}
                {activeTab === 'habitos' && <HabitsPage />}
                {activeTab === 'mapa' && <StudyMap darkMode={darkMode} />}
                {activeTab === 'stats' && <Statistics />}
                {activeTab === 'notas' && <QuickNotes />}
                {activeTab === 'metas' && <Goals />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <Toaster />
      </div>
    </TooltipProvider>
  )
}
