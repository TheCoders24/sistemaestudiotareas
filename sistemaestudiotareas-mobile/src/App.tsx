import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/components/ui/use-toast'
import { useThemeStore } from '@/stores/themeStore'
import { useAppStore } from '@/stores/appStore'
import { useUndoStore } from '@/stores/undoStore'
import {
  Zap, Menu, Sun, Moon, Search, Keyboard, Plus, Loader, X
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { UndoToast } from '@/components/ui/undo-toast'
import { SoundProvider, useSound } from '@/hooks/useSound'
import { TABS, KEYBOARD_SHORTCUTS } from '@/constants/tabs'
import { useShortcutsStore } from '@/stores/shortcutsStore'

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'))
const PomodoroTimer = lazy(() => import('./components/Pomodoro/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })))
const KanbanBoard = lazy(() => import('./components/Kanban/KanbanBoard'))
const TaskList = lazy(() => import('./components/TaskList/TaskList'))
const StudyMap = lazy(() => import('./components/StudyMap/StudyMap'))
const Statistics = lazy(() => import('./components/Statistics/Statistics'))
const QuickNotes = lazy(() => import('./components/QuickNotes/QuickNotes'))
const Goals = lazy(() => import('./components/Goals/Goals'))
const SidebarNav = lazy(() => import('./components/Sidebar/Sidebar'))
const Settings = lazy(() => import('./components/Settings/Settings'))
const ProjectsPage = lazy(() => import('./components/Projects/ProjectsPage'))
const DailyLogPage = lazy(() => import('./components/DailyLog/DailyLogPage'))
const SnippetsPage = lazy(() => import('./components/Snippets/SnippetsPage'))
const HabitsPage = lazy(() => import('./components/Habits/HabitsPage'))
const SearchDialog = lazy(() => import('./components/Search/SearchDialog'))
const AchievementsGallery = lazy(() => import('./components/Achievements/AchievementsGallery'))
const CalendarView = lazy(() => import('./components/Calendar/CalendarView'))
const TrashPage = lazy(() => import('./components/Trash/TrashPage'))
const ChallengesPage = lazy(() => import('./components/Challenges/ChallengesPage'))
const FocusModePage = lazy(() => import('./components/FocusMode/FocusMode').then(m => ({ default: m.FocusMode })))
const WeeklyReviewPage = lazy(() => import('./components/WeeklyReview/WeeklyReviewPage'))
const HeaderPomodoro = lazy(() => import('./components/HeaderPomodoro/HeaderPomodoro').then(m => ({ default: m.HeaderPomodoro })))
const CommandPalette = lazy(() => import('./components/CommandPalette/CommandPalette'))
const WelcomeWizard = lazy(() => import('./components/WelcomeWizard/WelcomeWizard').then(m => ({ default: m.WelcomeWizard })))
const ReviewDashboard = lazy(() => import('./components/SpacedRepetition/ReviewDashboard'))
const TaskCalendarView = lazy(() => import('./components/TaskViews/TaskCalendarView'))
const TaskTimelineView = lazy(() => import('./components/TaskViews/TaskTimelineView'))
const TaskTableView = lazy(() => import('./components/TaskViews/TaskTableView'))
const EnergyPlanning = lazy(() => import('./components/EnergyPlanning/EnergyPlanning'))
const SmartReminders = lazy(() => import('./components/SmartReminders/SmartReminders'))
const SocialPage = lazy(() => import('./components/Social/SocialPage'))
const AchievementShop = lazy(() => import('./components/Gamification/AchievementShop'))
const AvatarPet = lazy(() => import('./components/Gamification/AvatarPet'))
const SubjectStreaks = lazy(() => import('./components/Gamification/SubjectStreaks'))
const WebsiteBlocker = lazy(() => import('./components/FocusMode/WebsiteBlocker'))
const DistractionStats = lazy(() => import('./components/FocusMode/DistractionStats'))
const CloudSync = lazy(() => import('./components/Sync/CloudSync'))
const WeeklyPDFReport = lazy(() => import('./components/Reports/WeeklyPDFReport'))
const CalendarImport = lazy(() => import('./components/CalendarImport/CalendarImport'))
const QuickCapture = lazy(() => import('./components/QuickCapture/QuickCapture'))

function AppInner() {
  const {
    activeTab, setActiveTab, sidebarOpen, toggleSidebar, setSidebarOpen,
    darkMode, setDarkMode, setStreak, focusMode, setFocusMode,
    userName, setUserName, fontSize, setFontSize, language, setLanguage,
    denseMode, setDenseMode, firstRun, setFirstRun
  } = useAppStore()
  const { themeId: currentThemeId, setThemeId } = useThemeStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const shortcuts = useShortcutsStore(s => s.shortcuts)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [levelUp, setLevelUp] = useState<{ level: number } | null>(null)
  const { pushAction } = useUndoStore()
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number; title: string } | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(firstRun)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const [taskViewMode, setTaskViewMode] = useState<'calendar' | 'timeline' | 'table'>('calendar')
  const { soundEnabled, playSound, createConfetti } = useSound()

  useEffect(() => {
    (window as any).__confirmDelete = (type: string, id: number, title: string) => setConfirmDelete({ type, id, title })
    ;(window as any).__setActiveTab = setActiveTab
    ;(window as any).__quickAdd = (type: string) => { setQuickAddOpen(true) }
    return () => { delete (window as any).__confirmDelete; delete (window as any).__setActiveTab; delete (window as any).__quickAdd }
  }, [setActiveTab])

  useEffect(() => {
    (window as any).__exitFocusMode = () => setFocusMode(false)
    return () => { delete (window as any).__exitFocusMode }
  }, [])

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
    if (window.electronAPI) {
      window.electronAPI.getSetting('theme').then(val => {
        if (val !== null) setDarkMode(val === 'dark')
      })
      window.electronAPI.getSetting('theme_color').then((val: string | null) => {
        if (val) setThemeId(val)
      })
      window.electronAPI.getSetting('user_name').then((val: string | null) => {
        if (val) setUserName(val)
      })
      window.electronAPI.getSetting('font_size').then((val: string | null) => {
        if (val) setFontSize(val as 'sm' | 'base' | 'lg')
      })
      window.electronAPI.getSetting('language').then((val: string | null) => {
        if (val) setLanguage(val as 'es' | 'en')
      })
      window.electronAPI.getSetting('dense_mode').then((val: string | null) => {
        if (val) setDenseMode(val === 'true')
      })
      window.electronAPI.getStreak('daily_study').then(s => {
        if (s) setStreak(s)
      })
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.setSetting('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    if (window.electronAPI && currentThemeId) window.electronAPI.setSetting('theme_color', currentThemeId)
  }, [currentThemeId])

  useEffect(() => {
    if (window.electronAPI && userName) window.electronAPI.setSetting('user_name', userName)
  }, [userName])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.setSetting('font_size', fontSize)
  }, [fontSize])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.setSetting('language', language)
  }, [language])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.setSetting('dense_mode', String(denseMode))
  }, [denseMode])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      const key = e.key.toLowerCase()
      const shift = e.shiftKey
      const combo = `Ctrl${shift ? '+Shift' : ''}+${key === '/' ? '/' : key.toUpperCase()}`
      const tabId = Object.entries(shortcuts).find(([, s]) => s === combo)?.[0]
      if (tabId) { e.preventDefault(); setActiveTab(tabId); return }
      if (combo === 'Ctrl+B') { e.preventDefault(); setSearchOpen(true) }
      else if (combo === 'Ctrl+/') { e.preventDefault(); setShortcutsOpen(true) }
      else if (combo === 'Ctrl+Shift+L') { e.preventDefault(); setDarkMode(!useAppStore.getState().darkMode) }
      else if (combo === 'Ctrl+Shift+A') { e.preventDefault(); setQuickAddOpen(true) }
      else if (combo === 'Ctrl+K') { e.preventDefault(); setCommandPaletteOpen(true) }
      else if (combo === 'Ctrl+F') { e.preventDefault(); setSearchOpen(true) }
      else if (combo === 'Ctrl+Shift+F') { e.preventDefault(); setFocusMode(true) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (!window.electronAPI) return
    const interval = setInterval(async () => {
      try {
        const data = await window.electronAPI.exportData()
        localStorage.setItem('auto_backup', JSON.stringify({
          data,
          timestamp: new Date().toISOString(),
        }))
      } catch {}
    }, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleStreakUpdate = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.updateStreak('daily_study').then(async s => {
        if (s) setStreak(s)
        if (s && s.current > 1 && soundEnabled) playSound('achievement')
        if (window.electronAPI) {
          const result = await window.electronAPI.checkAchievements()
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
    if (!quickAddTitle.trim() || !window.electronAPI) return
    await window.electronAPI.createTask({ title: quickAddTitle, description: '', priority: 'media', repeat: null } as any)
    setQuickAddTitle('')
    setQuickAddOpen(false)
    toast({ title: 'Tarea creada', description: `"${quickAddTitle}" agregada.` })
    if (soundEnabled) playSound('complete')
  }

  function handleWelcomeComplete() {
    setFirstRun(false)
    setWelcomeOpen(false)
  }

  const sidebarContent = (
    <Suspense fallback={<div className="animate-pulse bg-muted h-full rounded" />}>
      <SidebarNav
        activeTab={activeTab}
        onNavigate={(tab) => { setActiveTab(tab); setSidebarOpen(false) }}
        onClose={() => setSidebarOpen(false)}
        userName={userName}
        fontSize={fontSize}
        denseMode={denseMode}
      />
    </Suspense>
  )

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background text-foreground pt-[env(safe-area-inset-top)]">
        <header className="flex items-center h-14 px-3 sm:px-4 border-b bg-card shrink-0 gap-2 z-40">
          <div className="md:hidden">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 hidden md:inline-flex">
            <Menu className="h-5 w-5" />
          </Button>
          <button onClick={() => setActiveTab('inicio')} className="flex items-center gap-1.5 mr-4 hover:opacity-80 transition-opacity">
            <Zap className="h-5 w-5 text-indigo-500" />
            <span className="font-bold text-base">EstudioApp</span>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
                <Search className="h-5 w-5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">Buscar (Ctrl+B)</TooltipContent></Tooltip>
            <Suspense fallback={null}>
              <HeaderPomodoro onOpenPomodoro={() => setActiveTab('pomodoro')} />
            </Suspense>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setFocusMode(true)} className="text-indigo-400">
                <Zap className="h-5 w-5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">Focus Mode (Ctrl+Shift+F)</TooltipContent></Tooltip>
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShortcutsOpen(true)}>
                <Keyboard className="h-5 w-5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">Atajos (Ctrl+/)</TooltipContent></Tooltip>
            <Suspense fallback={null}><Settings /></Suspense>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-60 shrink-0 border-r bg-card overflow-hidden hidden md:flex flex-col" style={sidebarOpen ? {} : { display: 'none' }}>
            {sidebarContent}
          </aside>
          <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-[env(safe-area-inset-bottom)]">
            <div key={activeTab} className="animate-fade-slide-in">
              <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground"><Loader className="h-6 w-6 animate-spin" /></div>}>
                {activeTab === 'inicio' && <ErrorBoundary name="Dashboard"><Dashboard /></ErrorBoundary>}
                {activeTab === 'pomodoro' && <ErrorBoundary name="Pomodoro"><PomodoroTimer onComplete={handleStreakUpdate} /></ErrorBoundary>}
                {activeTab === 'kanban' && <ErrorBoundary name="Kanban"><KanbanBoard /></ErrorBoundary>}
                {activeTab === 'tareas' && <ErrorBoundary name="Tareas"><TaskList /></ErrorBoundary>}
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
                {activeTab === 'tareas-vista' && <ErrorBoundary name="Vista Tareas">
                  <div className="flex gap-2 mb-4">
                    <Button size="sm" variant={taskViewMode === 'calendar' ? 'default' : 'outline'} onClick={() => setTaskViewMode('calendar')}>Calendario</Button>
                    <Button size="sm" variant={taskViewMode === 'timeline' ? 'default' : 'outline'} onClick={() => setTaskViewMode('timeline')}>Timeline</Button>
                    <Button size="sm" variant={taskViewMode === 'table' ? 'default' : 'outline'} onClick={() => setTaskViewMode('table')}>Tabla</Button>
                  </div>
                  {taskViewMode === 'calendar' && <TaskCalendarView />}
                  {taskViewMode === 'timeline' && <TaskTimelineView />}
                  {taskViewMode === 'table' && <TaskTableView />}
                </ErrorBoundary>}
                {activeTab === 'flashcards-repaso' && <ErrorBoundary name="Repaso"><ReviewDashboard /></ErrorBoundary>}
                {activeTab === 'energia' && <ErrorBoundary name="Energía"><EnergyPlanning /></ErrorBoundary>}
                {activeTab === 'recordatorios' && <ErrorBoundary name="Recordatorios"><SmartReminders /></ErrorBoundary>}
                {activeTab === 'social' && <ErrorBoundary name="Social"><SocialPage /></ErrorBoundary>}
                {activeTab === 'tienda-logros' && <ErrorBoundary name="Tienda"><AchievementShop /></ErrorBoundary>}
                {activeTab === 'rachas-materia' && <ErrorBoundary name="Rachas"><SubjectStreaks /></ErrorBoundary>}
                {activeTab === 'bloqueador' && <ErrorBoundary name="Bloqueador"><WebsiteBlocker /></ErrorBoundary>}
                {activeTab === 'distractions' && <ErrorBoundary name="Distracciones"><DistractionStats /></ErrorBoundary>}
                {activeTab === 'reporte-semanal' && <ErrorBoundary name="Rep. Semanal"><WeeklyPDFReport /></ErrorBoundary>}
                {activeTab === 'importar-calendario' && <ErrorBoundary name="Importar Cal"><CalendarImport /></ErrorBoundary>}
                {activeTab === 'sincronizar' && <ErrorBoundary name="Sync"><CloudSync /></ErrorBoundary>}
              </Suspense>
            </div>
          </main>
        </div>

        <Toaster />

        <UndoToast />

        <Suspense fallback={null}>
          <QuickCapture open={quickCaptureOpen} onOpenChange={setQuickCaptureOpen} />
        </Suspense>

        <Suspense fallback={null}>
          <AvatarPet />
        </Suspense>

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

        <Suspense fallback={null}>
          <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} onNavigate={setActiveTab} />
        </Suspense>

        <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500"><X className="h-5 w-5" /> Confirmar eliminación</DialogTitle>
              <DialogDescription>¿Estás seguro de que querés eliminar "{confirmDelete?.title}"? Se moverá a la papelera y se eliminará automáticamente a los 30 días.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={async () => {
                if (confirmDelete && window.electronAPI) {
                  await window.electronAPI.softDeleteItem(confirmDelete.type, confirmDelete.id)
                  toast({ title: 'Elemento movido a la papelera' })
                  const { type, id, title } = confirmDelete
                  pushAction({
                    label: `"${title}" eliminada`,
                    onUndo: async () => {
                      if (window.electronAPI) {
                        await window.electronAPI.restoreItem(type, id)
                      }
                    },
                  })
                  setConfirmDelete(null)
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
        <Suspense fallback={null}>
          <FocusModePage />
        </Suspense>
      )}

      <Suspense fallback={null}>
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
            }
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <WelcomeWizard
          open={welcomeOpen}
          onOpenChange={setWelcomeOpen}
          userName={userName}
          onChangeUserName={setUserName}
          language={language}
          onChangeLanguage={setLanguage}
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          denseMode={denseMode}
          onChangeDenseMode={setDenseMode}
          onComplete={handleWelcomeComplete}
        />
      </Suspense>
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
