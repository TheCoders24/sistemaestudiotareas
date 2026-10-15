import { useState, useEffect, useCallback, useRef } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/components/ui/use-toast'
import { useThemeStore } from '@/stores/themeStore'
import { useAppStore } from '@/stores/appStore'
import { useUndoStore } from '@/stores/undoStore'
import {
  Zap, Menu, Sun, Moon, Search, Keyboard, Plus, Loader, X,
  List, Calendar, GanttChart, Table2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { RouteSuspense, createLazyRoute, registerRoutePreloader } from '@/components/ui/route-suspense'
import { UndoToast } from '@/components/ui/undo-toast'
import { SoundProvider, useSound } from '@/hooks/useSound'
import { TABS } from '@/constants/tabs'
import { useShortcutsStore } from '@/stores/shortcutsStore'

const Dashboard = createLazyRoute(() => import('./components/Dashboard/Dashboard'), { name: 'Dashboard' })
const PomodoroTimer = createLazyRoute(() => import('./components/Pomodoro/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })), { name: 'Pomodoro' })
const KanbanBoard = createLazyRoute(() => import('./components/Kanban/KanbanBoard'), { name: 'Kanban' })
const TaskList = createLazyRoute(() => import('./components/TaskList/TaskList'), { name: 'TaskList' })
const StudyMap = createLazyRoute(() => import('./components/StudyMap/StudyMap'), { name: 'StudyMap' })
const Statistics = createLazyRoute(() => import('./components/Statistics/Statistics'), { name: 'Statistics' })
const QuickNotes = createLazyRoute(() => import('./components/QuickNotes/QuickNotes'), { name: 'QuickNotes' })
const Goals = createLazyRoute(() => import('./components/Goals/Goals'), { name: 'Goals' })
const SidebarNav = createLazyRoute(() => import('./components/Sidebar/Sidebar'), { name: 'Sidebar' })
const Settings = createLazyRoute(() => import('./components/Settings/Settings'), { name: 'Settings' })
const ProjectsPage = createLazyRoute(() => import('./components/Projects/ProjectsPage'), { name: 'Projects' })
const DailyLogPage = createLazyRoute(() => import('./components/DailyLog/DailyLogPage'), { name: 'DailyLog' })
const SnippetsPage = createLazyRoute(() => import('./components/Snippets/SnippetsPage'), { name: 'Snippets' })
const HabitsPage = createLazyRoute(() => import('./components/Habits/HabitsPage'), { name: 'Habits' })
const SearchDialog = createLazyRoute(() => import('./components/Search/SearchDialog'), { name: 'Search' })
const AchievementsGallery = createLazyRoute(() => import('./components/Achievements/AchievementsGallery'), { name: 'Achievements' })
const CalendarView = createLazyRoute(() => import('./components/Calendar/CalendarView'), { name: 'Calendar' })
const TrashPage = createLazyRoute(() => import('./components/Trash/TrashPage'), { name: 'Trash' })
const ChallengesPage = createLazyRoute(() => import('./components/Challenges/ChallengesPage'), { name: 'Challenges' })
const FocusModePage = createLazyRoute(() => import('./components/FocusMode/FocusMode').then(m => ({ default: m.FocusMode })), { name: 'FocusMode' })
const WeeklyReviewPage = createLazyRoute(() => import('./components/WeeklyReview/WeeklyReviewPage'), { name: 'WeeklyReview' })
const HeaderPomodoro = createLazyRoute(() => import('./components/HeaderPomodoro/HeaderPomodoro').then(m => ({ default: m.HeaderPomodoro })), { name: 'HeaderPomodoro' })
const CommandPalette = createLazyRoute(() => import('./components/CommandPalette/CommandPalette'), { name: 'CommandPalette' })
const WelcomeWizard = createLazyRoute(() => import('./components/WelcomeWizard/WelcomeWizard').then(m => ({ default: m.WelcomeWizard })), { name: 'WelcomeWizard' })
const ReviewDashboard = createLazyRoute(() => import('./components/SpacedRepetition/ReviewDashboard'), { name: 'ReviewDashboard' })
const QuickCapture = createLazyRoute(() => import('./components/QuickCapture/QuickCapture'), { name: 'QuickCapture' })
const TaskCalendarView = createLazyRoute(() => import('./components/TaskViews/TaskCalendarView'), { name: 'TaskCalendar' })
const TaskTimelineView = createLazyRoute(() => import('./components/TaskViews/TaskTimelineView'), { name: 'TaskTimeline' })
const TaskTableView = createLazyRoute(() => import('./components/TaskViews/TaskTableView'), { name: 'TaskTable' })
const EnergyPlanning = createLazyRoute(() => import('./components/EnergyPlanning/EnergyPlanning'), { name: 'EnergyPlanning' })
const SmartReminders = createLazyRoute(() => import('./components/SmartReminders/SmartReminders'), { name: 'SmartReminders' })
const AvatarPet = createLazyRoute(() => import('./components/Gamification/AvatarPet'), { name: 'AvatarPet' })
const SubjectStreaks = createLazyRoute(() => import('./components/Gamification/SubjectStreaks'), { name: 'SubjectStreaks' })
const WebsiteBlocker = createLazyRoute(() => import('./components/FocusMode/WebsiteBlocker'), { name: 'WebsiteBlocker' })
const DistractionStats = createLazyRoute(() => import('./components/FocusMode/DistractionStats'), { name: 'DistractionStats' })
const CloudSync = createLazyRoute(() => import('./components/Sync/CloudSync'), { name: 'CloudSync' })
const WeeklyPDFReport = createLazyRoute(() => import('./components/Reports/WeeklyPDFReport'), { name: 'WeeklyPDFReport' })
const CalendarImport = createLazyRoute(() => import('./components/CalendarImport/CalendarImport'), { name: 'CalendarImport' })
const AutomationRules = createLazyRoute(() => import('./components/Automation/AutomationRules'), { name: 'AutomationRules' })
const Flashcards = createLazyRoute(() => import('./components/Flashcards/FlashcardsPage'), { name: 'Flashcards' })
const CoursesPage = createLazyRoute(() => import('./components/Courses/CoursesPage'), { name: 'Courses' })
const ExamsPage = createLazyRoute(() => import('./components/Exams/ExamsPage'), { name: 'Exams' })
const TutorPage = createLazyRoute(() => import('./components/Tutor/TutorPage'), { name: 'Tutor' })
const PinLockDialog = createLazyRoute(() => import('./components/Security/PinLockDialog'), { name: 'PinLock' })

registerRoutePreloader('Dashboard', () => import('./components/Dashboard/Dashboard'))
registerRoutePreloader('TaskList', () => import('./components/TaskList/TaskList'))
registerRoutePreloader('Pomodoro', () => import('./components/Pomodoro/PomodoroTimer'))
registerRoutePreloader('Calendar', () => import('./components/Calendar/CalendarView'))

console.log('[APP] App module loaded')

function LoadingScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-muted-foreground">Cargando configuración...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <X className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRetry}>Reintentar</Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>Recargar app</Button>
        </div>
      </div>
    </div>
  )
}

function AppInner() {
  const [initialLoading, setInitialLoading] = useState(() => !!window.electronAPI)
  const [initError, setInitError] = useState<string | null>(null)
  const [initRetry, setInitRetry] = useState(0)
  const {
    activeTab, setActiveTab, sidebarOpen, toggleSidebar, setSidebarOpen,
    darkMode, setDarkMode, autoDarkMode, autoDarkStart, autoDarkEnd,
    setStreak, focusMode, setFocusMode,
    userName, setUserName, fontSize, setFontSize, language, setLanguage,
    denseMode, setDenseMode, firstRun, setFirstRun, setInitialSettings
  } = useAppStore()
  const { themeId: currentThemeId, setThemeId } = useThemeStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const shortcuts = useShortcutsStore(s => s.shortcuts)
  const shortcutsRef = useRef(shortcuts)
  useEffect(() => { shortcutsRef.current = shortcuts }, [shortcuts])

  useEffect(() => {
    if (!window.electronAPI?.pin?.isEnabled) return
    window.electronAPI.pin.isEnabled().then(enabled => { if (enabled) setLocked(true) }).catch(() => {})
  }, [])

  useEffect(() => {
    const onLock = () => setLocked(true)
    window.addEventListener('lock-app', onLock)
    return () => window.removeEventListener('lock-app', onLock)
  }, [])
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [levelUp, setLevelUp] = useState<{ level: number } | null>(null)
  const { pushAction } = useUndoStore()
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number; title: string; onConfirm?: () => void } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(firstRun)
  const [userProfile, setUserProfile] = useState('custom')
  const { soundEnabled, playSound, createConfetti } = useSound()
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'calendar' | 'timeline' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('task-view-mode')
      if (saved === 'calendar' || saved === 'timeline' || saved === 'table') return saved
      return 'list'
    } catch { return 'list' }
  })

  useEffect(() => {
    try { localStorage.setItem('task-view-mode', taskViewMode) } catch {}
  }, [taskViewMode])

  useEffect(() => {
    (window as any).__confirmDelete = (type: string, id: number, title: string, onConfirm?: () => void) => setConfirmDelete({ type, id, title, onConfirm })
    ;(window as any).__setActiveTab = setActiveTab
    ;(window as any).__quickAdd = () => { setQuickAddOpen(true) }
    return () => { delete (window as any).__confirmDelete; delete (window as any).__setActiveTab; delete (window as any).__quickAdd }
  }, [setActiveTab])

  useEffect(() => {
    (window as any).__exitFocusMode = () => setFocusMode(false)
    return () => { delete (window as any).__exitFocusMode }
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI?.events?.onReminderNotification?.((data: { id: number; title: string }) => {
      toast({ title: `⏰ ${data.title}`, description: 'Es hora de revisar esta tarea' })
      if (soundEnabled) playSound('complete')
    })
    return () => { if (typeof unsub === 'function') unsub() }
  }, [soundEnabled, playSound])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg')
    document.documentElement.classList.add(`text-${fontSize}`)
  }, [fontSize])

  useEffect(() => {
    document.documentElement.classList.toggle('dense-mode', denseMode)
  }, [denseMode])

  useEffect(() => {
    let active = true
    setInitialLoading(true)
    setInitError(null)

    const timeoutId = setTimeout(() => {
      if (!active) return
      console.warn('[APP] Initialization timed out')
      setInitError('La inicialización está tomando más de lo esperado. Verifica la conexión con Electron.')
      setInitialLoading(false)
    }, 15000)

    async function loadInitialSettings() {
      if (!window.electronAPI) {
        clearTimeout(timeoutId)
        if (active) setInitialLoading(false)
        return
      }

      try {
        const results = await Promise.all([
          window.electronAPI.settings.get('theme').catch(() => null),
          window.electronAPI.settings.get('theme_color').catch(() => null),
          window.electronAPI.settings.get('user_name').catch(() => null),
          window.electronAPI.settings.get('font_size').catch(() => null),
          window.electronAPI.settings.get('language').catch(() => null),
          window.electronAPI.settings.get('dense_mode').catch(() => null),
          window.electronAPI.settings.get('auto_dark_mode').catch(() => null),
          window.electronAPI.settings.get('auto_dark_start').catch(() => null),
          window.electronAPI.settings.get('auto_dark_end').catch(() => null),
          window.electronAPI.settings.get('firstRun').catch(() => null),
          window.electronAPI.settings.get('custom_shortcuts').catch(() => null),
          window.electronAPI.streaks.get('daily_study').catch(() => null),
        ])

        if (!active) return

        const [theme, themeColor, userName, fontSz, lang, dense, autoDark, autoDarkSt, autoDarkEn, firstRunSetting, customShortcuts, streak] = results

        setInitialSettings({
          ...(theme !== null && { darkMode: theme === 'dark' }),
          ...(userName !== null && { userName }),
          ...(fontSz !== null && { fontSize: fontSz as 'sm' | 'base' | 'lg' }),
          ...(lang !== null && { language: lang as 'es' | 'en' }),
          ...(dense !== null && { denseMode: dense === 'true' }),
          ...(autoDark !== null && { autoDarkMode: autoDark === 'true' }),
          ...(autoDarkSt !== null && { autoDarkStart: autoDarkSt }),
          ...(autoDarkEn !== null && { autoDarkEnd: autoDarkEn }),
          ...(firstRunSetting !== null && { firstRun: firstRunSetting === 'true' }),
        })

        setWelcomeOpen(firstRunSetting === null ? true : firstRunSetting === 'true')

        // Load custom shortcuts
        if (customShortcuts) {
          try {
            const parsed = JSON.parse(customShortcuts)
            Object.entries(parsed).forEach(([k, v]) => {
              useShortcutsStore.getState().setShortcut(k, v as string)
            })
          } catch {}
        }

        if (themeColor) setThemeId(themeColor)
        if (streak) setStreak(streak)

        if (window.electronAPI.events.onUpdateStatus) {
          window.electronAPI.events.onUpdateStatus((data: any) => {
            if (data.status === 'available') toast({ title: 'Actualización disponible', description: 'Descargando en segundo plano...' })
            if (data.status === 'downloaded') toast({ title: 'Actualización lista', description: 'Reinicia la app para aplicar la actualización.' })
          })
        }

        clearTimeout(timeoutId)
        if (active) setInitialLoading(false)
      } catch (e) {
        console.error('[APP] Error loading initial settings:', e)
        clearTimeout(timeoutId)
        if (active) {
          setInitError('Error al cargar configuración inicial. Intenta de nuevo.')
          setInitialLoading(false)
        }
      }
    }

    loadInitialSettings()

    return () => { active = false; clearTimeout(timeoutId) }
  }, [initRetry])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.settings.set('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    if (!autoDarkMode) return
    function isInRange(now: string, start: string, end: string): boolean {
      if (start <= end) return now >= start && now < end
      return now >= start || now < end
    }
    function check() {
      const now = new Date()
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      setDarkMode(isInRange(current, autoDarkStart, autoDarkEnd))
    }
    check()
    const id = setInterval(check, 60000)
    return () => clearInterval(id)
  }, [autoDarkMode, autoDarkStart, autoDarkEnd, setDarkMode])

  useEffect(() => {
    if (window.electronAPI && currentThemeId) window.electronAPI.settings.set('theme_color', currentThemeId)
  }, [currentThemeId])

  useEffect(() => {
    if (window.electronAPI && userName) window.electronAPI.settings.set('user_name', userName)
  }, [userName])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.settings.set('font_size', fontSize)
  }, [fontSize])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.settings.set('language', language)
  }, [language])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.settings.set('dense_mode', String(denseMode))
  }, [denseMode])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.settings.get('userProfile').then((val: string | null) => {
        if (val) setUserProfile(val)
      })
    }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      const key = e.key.toLowerCase()
      const shift = e.shiftKey
      const combo = `Ctrl${shift ? '+Shift' : ''}+${key === '/' ? '/' : key.toUpperCase()}`
      const tabId = Object.entries(shortcutsRef.current).find(([, s]) => s === combo)?.[0]
      if (tabId) { e.preventDefault(); setActiveTab(tabId); return }
      if (combo === 'Ctrl+B') { e.preventDefault(); setSearchOpen(true) }
      else if (combo === 'Ctrl+/') { e.preventDefault(); setShortcutsOpen(true) }
      else if (combo === 'Ctrl+Shift+L') { e.preventDefault(); setDarkMode(!useAppStore.getState().darkMode) }
      else if (combo === 'Ctrl+Shift+A') { e.preventDefault(); setQuickAddOpen(true) }
      else if (combo === 'Ctrl+K') { e.preventDefault(); setCommandPaletteOpen(true) }
      else if (combo === 'Ctrl+F') { e.preventDefault(); setSearchOpen(true) }
      else if (combo === 'Ctrl+Shift+F') { e.preventDefault(); setFocusMode(true) }
      else if (combo === 'Ctrl+Space') { e.preventDefault(); setQuickCaptureOpen(true) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (!window.electronAPI) return
    let lastToast = 0
    const onRejection = (e: PromiseRejectionEvent) => {
      const now = Date.now()
      if (now - lastToast < 4000) return
      lastToast = now
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason || 'Error desconocido')
      toast({ title: 'Algo falló', description: msg, variant: 'destructive' })
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  const handleStreakUpdate = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.streaks.update('daily_study').then(async s => {
        if (s) setStreak(s)
        if (s && s.current > 1 && soundEnabled) playSound('achievement')
        if (window.electronAPI) {
          const result = await window.electronAPI.gamification.achievements.check()
          for (const a of result.unlocked) {
            if (soundEnabled) playSound('levelup')
            createConfetti()
            toast({ title: `🏆 Logro: ${a.name}`, description: `+${a.xp_reward} XP` })
          }
          if (result.leveledUp) {
            setLevelUp({ level: result.newLevel })
            if (soundEnabled) playSound('levelup')
            createConfetti()
          }
        }
      })
    }
  }, [soundEnabled, playSound, createConfetti])

  async function handleQuickAdd() {
    if (!quickAddTitle.trim()) return
    if (!window.electronAPI) { toast({ title: 'Error', description: 'API no disponible', variant: 'destructive' }); return }
    try {
      await window.electronAPI.tasks.create({ title: quickAddTitle, description: '', priority: 'media', repeat: null } as any)
      setQuickAddTitle('')
      setQuickAddOpen(false)
      toast({ title: 'Tarea creada', description: `"${quickAddTitle}" agregada.` })
      if (soundEnabled) playSound('complete')
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la tarea', variant: 'destructive' })
    }
  }

  function markWelcomeSeen() {
    if (window.electronAPI) window.electronAPI.settings.set('firstRun', 'false')
    setFirstRun(false)
  }

  function handleWelcomeComplete() {
    if (window.electronAPI) {
      window.electronAPI.settings.set('userProfile', userProfile)
    }
    markWelcomeSeen()
    setWelcomeOpen(false)
  }

  function handleWelcomeOpenChange(open: boolean) {
    setWelcomeOpen(open)
    if (!open) markWelcomeSeen()
  }

  const sidebarContent = (
    <RouteSuspense fallback={<div className="animate-pulse bg-muted h-full rounded" />}>
      <SidebarNav
        activeTab={activeTab}
        onNavigate={(tab) => { setActiveTab(tab); setSidebarOpen(false) }}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        userName={userName}
        fontSize={fontSize}
        denseMode={denseMode}
      />
    </RouteSuspense>
  )

  if (initError) return <ErrorScreen message={initError} onRetry={() => setInitRetry(c => c + 1)} />
  if (initialLoading) return <LoadingScreen />

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Skip link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Saltar al contenido principal
        </a>
        <header className="flex items-center h-14 px-4 border-b bg-card shrink-0 gap-2 z-40">
          <div className="md:hidden">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 hidden md:inline-flex" aria-label="Toggle sidebar">
            <Menu className="h-5 w-5" />
          </Button>
          <button onClick={() => setActiveTab('inicio')} className="flex items-center gap-1.5 mr-4 hover:opacity-80 transition-opacity">
            <Zap className="h-5 w-5 text-indigo-500" />
            <span className="font-bold text-base">EstudioApp</span>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Buscar">
                <Search className="h-5 w-5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">Buscar (Ctrl+B)</TooltipContent></Tooltip>
            <HeaderPomodoro onOpenPomodoro={() => setActiveTab('pomodoro')} />
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setFocusMode(true)} className="text-indigo-400" aria-label="Modo enfoque">
                <Zap className="h-5 w-5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">Focus Mode (Ctrl+Shift+F)</TooltipContent></Tooltip>
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShortcutsOpen(true)} aria-label="Atajos de teclado">
                <Keyboard className="h-5 w-5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">Atajos (Ctrl+/)</TooltipContent></Tooltip>
            <RouteSuspense fallback={null}><Settings open={settingsOpen} onOpenChange={setSettingsOpen} /></RouteSuspense>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-60 shrink-0 border-r bg-card overflow-hidden hidden md:flex flex-col" style={sidebarOpen ? {} : { display: 'none' }}>
            {sidebarContent}
          </aside>
          <main id="main-content" className="flex-1 overflow-y-auto p-6" role="main">
            <div key={activeTab} className="animate-fade-slide-in h-full">
              {activeTab === 'tareas' && (
                <div className="mb-4 flex justify-end">
                  <div className="inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5" role="tablist" aria-label="Vista de tareas">
                    {([
                      ['list', 'Lista', List],
                      ['calendar', 'Calendario', Calendar],
                      ['timeline', 'Cronograma', GanttChart],
                      ['table', 'Tabla', Table2],
                    ] as const).map(([mode, label, Icon]) => (
                      <Button
                        key={mode}
                        role="tab"
                        aria-selected={taskViewMode === mode}
                        variant={taskViewMode === mode ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 gap-1.5 px-2.5 text-xs"
                        onClick={() => setTaskViewMode(mode)}
                        title={label}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'inicio' && <ErrorBoundary name="Dashboard"><Dashboard /></ErrorBoundary>}
              {activeTab === 'pomodoro' && <ErrorBoundary name="Pomodoro"><PomodoroTimer onComplete={handleStreakUpdate} /></ErrorBoundary>}
              {activeTab === 'kanban' && <ErrorBoundary name="Kanban"><KanbanBoard /></ErrorBoundary>}
              {activeTab === 'tareas' && taskViewMode === 'list' && <ErrorBoundary name="Tareas"><TaskList /></ErrorBoundary>}
              {activeTab === 'proyectos' && <ErrorBoundary name="Proyectos"><ProjectsPage /></ErrorBoundary>}
              {activeTab === 'diario' && <ErrorBoundary name="Diario"><DailyLogPage /></ErrorBoundary>}
              {activeTab === 'calendario' && <ErrorBoundary name="Calendario"><CalendarView /></ErrorBoundary>}
              {activeTab === 'snippets' && <ErrorBoundary name="Snippets"><SnippetsPage /></ErrorBoundary>}
              {activeTab === 'habitos' && <ErrorBoundary name="Hábitos"><HabitsPage /></ErrorBoundary>}
              {activeTab === 'logros' && <ErrorBoundary name="Logros"><AchievementsGallery /></ErrorBoundary>}
              {activeTab === 'desafios' && <ErrorBoundary name="Desafíos"><ChallengesPage /></ErrorBoundary>}
              {activeTab === 'mapa' && <ErrorBoundary name="Estudio"><StudyMap /></ErrorBoundary>}
              {activeTab === 'stats' && <ErrorBoundary name="Stats"><Statistics /></ErrorBoundary>}
              {activeTab === 'notas' && <ErrorBoundary name="Notas"><QuickNotes /></ErrorBoundary>}
              {activeTab === 'metas' && <ErrorBoundary name="Metas"><Goals /></ErrorBoundary>}
              {activeTab === 'reporte' && <ErrorBoundary name="Reporte"><WeeklyReviewPage /></ErrorBoundary>}
              {activeTab === 'papelera' && <ErrorBoundary name="Papelera"><TrashPage /></ErrorBoundary>}
              {activeTab === 'flashcards' && <ErrorBoundary name="Flashcards"><Flashcards /></ErrorBoundary>}
              {activeTab === 'repaso' && <ErrorBoundary name="Repaso"><ReviewDashboard /></ErrorBoundary>}
              {activeTab === 'tareas' && taskViewMode === 'calendar' && <ErrorBoundary name="Calendario Tareas"><TaskCalendarView /></ErrorBoundary>}
              {activeTab === 'tareas' && taskViewMode === 'timeline' && <ErrorBoundary name="Timeline Tareas"><TaskTimelineView /></ErrorBoundary>}
              {activeTab === 'tareas' && taskViewMode === 'table' && <ErrorBoundary name="Tabla Tareas"><TaskTableView /></ErrorBoundary>}
              {activeTab === 'energia' && <ErrorBoundary name="Energía"><EnergyPlanning /></ErrorBoundary>}
              {activeTab === 'recordatorios' && <ErrorBoundary name="Recordatorios"><SmartReminders /></ErrorBoundary>}
              {activeTab === 'cursos' && <ErrorBoundary name="Cursos"><CoursesPage /></ErrorBoundary>}
              {activeTab === 'exams' && <ErrorBoundary name="Exámenes"><ExamsPage /></ErrorBoundary>}
              {activeTab === 'tutor' && <ErrorBoundary name="Tutor IA"><TutorPage /></ErrorBoundary>}
              {activeTab === 'rachas-materias' && <ErrorBoundary name="Rachas"><SubjectStreaks /></ErrorBoundary>}
              {activeTab === 'bloqueador' && <ErrorBoundary name="Rastreador de sitios"><WebsiteBlocker /></ErrorBoundary>}
              {activeTab === 'distracciones' && <ErrorBoundary name="Distracciones"><DistractionStats /></ErrorBoundary>}
              {activeTab === 'sync' && <ErrorBoundary name="Sync"><CloudSync /></ErrorBoundary>}
              {activeTab === 'informe' && <ErrorBoundary name="Informe"><WeeklyPDFReport /></ErrorBoundary>}
              {activeTab === 'importar-cal' && <ErrorBoundary name="Importar Cal"><CalendarImport /></ErrorBoundary>}
              {activeTab === 'automation' && <ErrorBoundary name="Automation"><AutomationRules /></ErrorBoundary>}
            </div>
          </main>
        </div>

        <Toaster />

        <UndoToast />

        <RouteSuspense fallback={null}>
          <QuickCapture open={quickCaptureOpen} onOpenChange={setQuickCaptureOpen} />
        </RouteSuspense>

        <RouteSuspense fallback={null}>
          <AvatarPet />
        </RouteSuspense>

        <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Agregar tarea rápida</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); handleQuickAdd() }} className="space-y-3">
              <Input value={quickAddTitle} onChange={e => setQuickAddTitle(e.target.value)} placeholder="¿Qué tenés que hacer?" autoFocus className="h-11 text-base" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setQuickAddOpen(false)}>Cancelar</Button>
                <Button type="submit">Crear tarea</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <RouteSuspense fallback={null}>
          <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} onNavigate={setActiveTab} />
        </RouteSuspense>

        <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500"><X className="h-5 w-5" /> Confirmar eliminación</DialogTitle>
              <DialogDescription>¿Estás seguro de que querés eliminar "{confirmDelete?.title}"? Se moverá a la papelera y se eliminará automáticamente a los 30 días.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={async () => {
                if (!confirmDelete || !window.electronAPI) return
                const { type, id, title, onConfirm } = confirmDelete
                try {
                  await window.electronAPI.trash.softDelete(type, id)
                  toast({ title: 'Elemento movido a la papelera' })
                  pushAction({
                    label: `"${title}" eliminada`,
                    onUndo: async () => {
                      if (window.electronAPI) {
                        await window.electronAPI.trash.restore(type, id)
                      }
                      onConfirm?.()
                    },
                  })
                  onConfirm?.()
                  setConfirmDelete(null)
                } catch {
                  toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
                }
              }}>Eliminar</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={levelUp !== null} onOpenChange={() => setLevelUp(null)}>
          <DialogContent className="sm:max-w-xs text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <div className="py-6">
                <div className="text-5xl mb-3">🎉</div>
                <DialogTitle className="text-2xl font-bold text-yellow-500 mb-2">¡Subiste de Nivel!</DialogTitle>
                <p className="text-lg">Ahora eres nivel <strong className="text-yellow-500">{levelUp?.level}</strong></p>
                <Button className="mt-4" onClick={() => setLevelUp(null)}>¡Genial!</Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>

        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Keyboard className="h-5 w-5" /> Atajos de Teclado</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium text-muted-foreground col-span-2 text-xs uppercase tracking-wider py-1">Navegación</div>
              {TABS.map(tab => (
                <div key={tab.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                  <span>{tab.label}</span>
                  <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">{shortcuts[tab.id]}</kbd>
                </div>
              ))}
              <div className="font-medium text-muted-foreground col-span-2 text-xs uppercase tracking-wider pt-3 pb-1">General</div>
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                <span>Buscar</span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+B</kbd>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                <span>Tarea rápida</span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+Shift+A</kbd>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                <span>Modo oscuro</span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+Shift+L</kbd>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                <span>Focus Mode</span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+Shift+F</kbd>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                <span>Paleta de comandos</span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+K</kbd>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                <span>Este menú</span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+/</kbd>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {focusMode && (
        <FocusModePage />
      )}

      <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={setActiveTab}
          onAction={(actionId) => {
            setCommandPaletteOpen(false)
            switch (actionId) {
              case 'new-task': setQuickAddOpen(true); break
              case 'new-note': setActiveTab('notas'); break
              case 'focus-mode': setFocusMode(true); break
              case 'toggle-dark': setDarkMode(!useAppStore.getState().darkMode); break
              case 'quick-capture': setQuickCaptureOpen(true); break
            }
          }}
        />

      <WelcomeWizard
          open={welcomeOpen}
          onOpenChange={handleWelcomeOpenChange}
          userName={userName}
          onChangeUserName={setUserName}
          language={language}
          onChangeLanguage={setLanguage}
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          denseMode={denseMode}
          onChangeDenseMode={setDenseMode}
          userProfile={userProfile}
          onChangeUserProfile={setUserProfile}
          onComplete={handleWelcomeComplete}
        />

      {locked && (
        <PinLockDialog mode="unlock" onUnlocked={() => setLocked(false)} />
      )}
    </TooltipProvider>
  )
}

export default function App() {
  return (
    <SoundProvider>
      <AppInner />
    </SoundProvider>
  )
}
