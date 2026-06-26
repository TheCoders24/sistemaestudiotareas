import { useEffect, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from '@/components/ui/toaster'
import { useAppStore } from '@/stores/appStore'
import { CommandPalette } from '@/components/ui/command-palette'
import { GlobalSearch } from '@/components/ui/global-search'
import { WelcomeDialog } from '@/components/ui/welcome-dialog'
import { UpdateBanner } from '@/components/ui/update-banner'
import { QuickCapture } from '@/components/ui/quick-capture'
import Sidebar from './components/Sidebar/Sidebar'
import Settings from './components/Settings/Settings'
import { CardSkeleton } from '@/components/ui/loading-skeleton'

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'))
const PomodoroTimer = lazy(() => import('./components/Pomodoro/PomodoroTimer'))
const KanbanBoard = lazy(() => import('./components/Kanban/KanbanBoard'))
const TaskList = lazy(() => import('./components/TaskList/TaskList'))
const StudyMap = lazy(() => import('./components/StudyMap/StudyMap'))
const Statistics = lazy(() => import('./components/Statistics/Statistics'))
const QuickNotes = lazy(() => import('./components/QuickNotes/QuickNotes'))
const Goals = lazy(() => import('./components/Goals/Goals'))
const ProjectsPage = lazy(() => import('./components/Projects/ProjectsPage'))
const DailyLogPage = lazy(() => import('./components/DailyLog/DailyLogPage'))
const SnippetsPage = lazy(() => import('./components/Snippets/SnippetsPage'))
const HabitsPage = lazy(() => import('./components/Habits/HabitsPage'))
const FlashcardsPage = lazy(() => import('./components/Flashcards/FlashcardsPage'))
const ActivityLog = lazy(() => import('./components/ActivityLog/ActivityLog'))
import {
  Clock, LayoutDashboard, CheckSquare, BookOpen, BarChart3,
  StickyNote, Target, FolderKanban, NotebookPen, Code2, Activity,
  Menu, Sun, Moon, Zap, Home, Brain, History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const TABS = [
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

const KEYBOARD_SHORTCUTS: Record<string, string> = {
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

function useAppInitializer() {
  const setDarkMode = useAppStore((s) => s.setDarkMode)
  const setStreak = useAppStore((s) => s.setStreak)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSetting('theme').then((val) => {
        if (val !== null) setDarkMode(val === 'dark')
      }).catch(() => {})
      window.electronAPI.getStreak('daily_study').then((s) => {
        if (s) setStreak(s)
      }).catch(() => {})
    }
  }, [setDarkMode, setStreak])
}

function useThemePersistence() {
  const darkMode = useAppStore((s) => s.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    if (window.electronAPI) {
      window.electronAPI.setSetting('theme', darkMode ? 'dark' : 'light')
    }
  }, [darkMode])
}

function useKeyboardShortcuts() {
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isInput) return

      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      const key = e.key.toLowerCase()
      if (key === 'h' && e.shiftKey) { e.preventDefault(); setActiveTab('dashboard') }
      else if (key === 'p' && !e.shiftKey) { e.preventDefault(); setActiveTab('pomodoro') }
      else if (key === 'k' && !e.shiftKey) { e.preventDefault(); setActiveTab('kanban') }
      else if (key === 't' && !e.shiftKey) { e.preventDefault(); setActiveTab('tareas') }
      else if (key === 'p' && e.shiftKey) { e.preventDefault(); setActiveTab('proyectos') }
      else if (key === 'f' && e.shiftKey) { e.preventDefault(); setActiveTab('flashcards') }
      else if (key === 'd' && !e.shiftKey) { e.preventDefault(); setActiveTab('diario') }
      else if (key === 's' && e.shiftKey) { e.preventDefault(); setActiveTab('snippets') }
      else if (key === 'h' && !e.shiftKey) { e.preventDefault(); setActiveTab('habitos') }
      else if (key === 'm' && !e.shiftKey) { e.preventDefault(); setActiveTab('mapa') }
      else if (key === 'e' && !e.shiftKey) { e.preventDefault(); setActiveTab('stats') }
      else if (key === 'n' && !e.shiftKey) { e.preventDefault(); setActiveTab('notas') }
      else if (key === 'g' && !e.shiftKey) { e.preventDefault(); setActiveTab('metas') }
      else if (key === 'a' && e.shiftKey) { e.preventDefault(); setActiveTab('actividad') }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [setActiveTab])
}

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const darkMode = useAppStore((s) => s.darkMode)
  const streak = useAppStore((s) => s.streak)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setDarkMode = useAppStore((s) => s.setDarkMode)
  const focusMode = useAppStore((s) => s.focusMode)
  const setPrivateStreak = useAppStore((s) => s.setStreak)

  useAppInitializer()
  useThemePersistence()
  useKeyboardShortcuts()

  const handleStreakUpdate = () => {
    if (window.electronAPI) {
      window.electronAPI.updateStreak('daily_study').then((s) => {
        if (s) setPrivateStreak(s)
      })
    }
  }

  return (
    <>
      <CommandPalette />
      <GlobalSearch />
      <WelcomeDialog />
      <UpdateBanner />
      <QuickCapture />
      <TooltipProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Top Navbar */}
        <header className="flex items-center h-14 px-4 border-b bg-card shrink-0 gap-2">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-1.5 mr-4">
            <Zap className="h-5 w-5 text-indigo-500" />
            <span className="font-bold text-base">EstudioApp</span>
          </div>

          <div className="flex-1 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
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
                    <span>
                      {tab.label} ({KEYBOARD_SHORTCUTS[tab.id]})
                    </span>
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
                  <span>
                    Racha actual: {streak.current} días (máx: {streak.max})
                  </span>
                </TooltipContent>
              </Tooltip>
            )}
            {focusMode && (
              <span className="text-xs text-red-500 font-medium flex items-center gap-1 mr-1">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Focus
              </span>
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
          <div className="hidden md:block">
            <AnimatePresence>
              {sidebarOpen && !focusMode && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="shrink-0 border-r bg-card overflow-hidden p-4"
                >
                  <div className="w-52">
                    <Sidebar />
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>

          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-6">
            <Suspense fallback={<CardSkeleton />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'pomodoro' && <PomodoroTimer onComplete={handleStreakUpdate} />}
                {activeTab === 'kanban' && <KanbanBoard />}
                {activeTab === 'tareas' && <TaskList />}
                {activeTab === 'proyectos' && <ProjectsPage />}
                {activeTab === 'diario' && <DailyLogPage />}
                {activeTab === 'snippets' && <SnippetsPage />}
                {activeTab === 'habitos' && <HabitsPage />}
                {activeTab === 'mapa' && <StudyMap />}
                {activeTab === 'stats' && <Statistics />}
                {activeTab === 'notas' && <QuickNotes />}
                {activeTab === 'metas' && <Goals />}
                {activeTab === 'flashcards' && <FlashcardsPage />}
                {activeTab === 'actividad' && <ActivityLog />}
              </motion.div>
            </AnimatePresence>
            </Suspense>
          </main>
        </div>

        <Toaster />
      </div>
    </TooltipProvider>
    </>
  )
}
