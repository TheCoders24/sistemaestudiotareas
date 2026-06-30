import React, { useEffect, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from '@/components/ui/toaster'
import { useAppStore } from '@/stores/appStore'
import { CommandPalette } from '@/components/ui/command-palette'
import { GlobalSearch } from '@/components/ui/global-search'
import { WelcomeDialog } from '@/components/ui/welcome-dialog'
import { UpdateBanner } from '@/components/ui/update-banner'
import { QuickCapture } from '@/components/ui/quick-capture'
import Sidebar from './components/Sidebar/Sidebar'
const Settings = lazy(() => import('./components/Settings/Settings'))
import { CardSkeleton } from '@/components/ui/loading-skeleton'
import { TABS, KEYBOARD_SHORTCUTS, SHORTCUT_CONFIG } from '@/lib/constants'
import { safeIpc } from '@/lib/ipc'
import { Menu, Sun, Moon, Zap } from 'lucide-react'
import type { Streak } from '@/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

const MemoCommandPalette = React.memo(CommandPalette)
const MemoGlobalSearch = React.memo(GlobalSearch)
const MemoWelcomeDialog = React.memo(WelcomeDialog)
const MemoUpdateBanner = React.memo(UpdateBanner)
const MemoQuickCapture = React.memo(QuickCapture)
const MemoSidebar = React.memo(Sidebar)
const MemoToaster = React.memo(Toaster)

function useAppInitializer() {
  const setDarkMode = useAppStore((s) => s.setDarkMode)
  const setStreak = useAppStore((s) => s.setStreak)

  useEffect(() => {
    safeIpc('getSetting', 'theme').then((val) => {
      if (val !== null) setDarkMode(val === 'dark')
    }).catch(err => console.error('[App]', err))
    safeIpc<Streak>('getStreak', 'daily_study').then((s) => {
      if (s) setStreak({ current: s.current, max: s.max })
    }).catch(err => console.error('[App]', err))
  }, [setDarkMode, setStreak])
}

function useThemePersistence() {
  const darkMode = useAppStore((s) => s.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    safeIpc('setSetting', 'theme', darkMode ? 'dark' : 'light')
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

      for (const shortcut of SHORTCUT_CONFIG) {
        if (key === shortcut.key && e.shiftKey === shortcut.shift) {
          e.preventDefault()
          setActiveTab(shortcut.id)
          return
        }
      }
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
    safeIpc<{ current: number; max: number }>('updateStreak', 'daily_study').then((s) => {
      if (s) setPrivateStreak(s)
    }).catch(err => console.error('[App]', err))
  }

  return (
    <>
      <MemoCommandPalette />
      <MemoGlobalSearch />
      <MemoWelcomeDialog />
      <MemoUpdateBanner />
      <MemoQuickCapture />
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
                    <MemoSidebar />
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

        <MemoToaster />
      </div>
    </TooltipProvider>
    </>
  )
}
