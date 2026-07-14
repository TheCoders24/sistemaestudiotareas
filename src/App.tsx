import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/components/ui/use-toast'
import {
  Clock, LayoutDashboard, CheckSquare, BookOpen, BarChart3,
  StickyNote, Target, FolderKanban, NotebookPen, Code2, Activity,
  Menu, Sun, Moon, Zap, Loader, Search, Keyboard, Sparkles, Plus, Trophy,
  CalendarDays, Trash2, Swords
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SoundProvider, useSound } from '@/hooks/useSound'

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'))
const PomodoroTimer = lazy(() => import('./components/Pomodoro/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })))
const KanbanBoard = lazy(() => import('./components/Kanban/KanbanBoard'))
const TaskList = lazy(() => import('./components/TaskList/TaskList'))
const StudyMap = lazy(() => import('./components/StudyMap/StudyMap'))
const Statistics = lazy(() => import('./components/Statistics/Statistics'))
const QuickNotes = lazy(() => import('./components/QuickNotes/QuickNotes'))
const Goals = lazy(() => import('./components/Goals/Goals'))
const Sidebar = lazy(() => import('./components/Sidebar/Sidebar'))
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

const TABS = [
  { id: 'inicio', label: 'Inicio', icon: Sparkles },
  { id: 'pomodoro', label: 'Pomodoro', icon: Clock },
  { id: 'kanban', label: 'Kanban', icon: LayoutDashboard },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
  { id: 'diario', label: 'Diario', icon: NotebookPen },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'snippets', label: 'Snippets', icon: Code2 },
  { id: 'habitos', label: 'Hábitos', icon: Activity },
  { id: 'logros', label: 'Logros', icon: Trophy },
  { id: 'desafios', label: 'Desafíos', icon: Swords },
  { id: 'mapa', label: 'Estudio', icon: BookOpen },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'notas', label: 'Notas', icon: StickyNote },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'reporte', label: 'Reporte', icon: BarChart3 },
  { id: 'papelera', label: 'Papelera', icon: Trash2 },
]

const KEYBOARD_SHORTCUTS: Record<string, string> = {
  inicio: 'Ctrl+1', pomodoro: 'Ctrl+P', kanban: 'Ctrl+K', tareas: 'Ctrl+T',
  proyectos: 'Ctrl+Shift+P', diario: 'Ctrl+D', calendario: 'Ctrl+Shift+C',
  snippets: 'Ctrl+Shift+S', habitos: 'Ctrl+H', logros: 'Ctrl+L',
  desafios: 'Ctrl+Shift+D', mapa: 'Ctrl+M', stats: 'Ctrl+E',
  notas: 'Ctrl+N', metas: 'Ctrl+G', reporte: 'Ctrl+Shift+R', papelera: 'Ctrl+Shift+T',
}

function AppInner() {
  const [activeTab, setActiveTab] = useState('inicio')
  const [darkMode, setDarkMode] = useState(true)
  const [streak, setStreak] = useState({ current: 0, max: 0 })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [levelUp, setLevelUp] = useState<{ level: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number; title: string } | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const { soundEnabled, playSound, createConfetti } = useSound()

  useEffect(() => {
    (window as any).__confirmDelete = (type: string, id: number, title: string) => setConfirmDelete({ type, id, title })
    return () => { delete (window as any).__confirmDelete }
  }, [])

  useEffect(() => {
    (window as any).__exitFocusMode = () => setFocusMode(false)
    return () => { delete (window as any).__exitFocusMode }
  }, [])

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
    if (window.electronAPI) window.electronAPI.setSetting('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      const key = e.key.toLowerCase()
      if (key === 'b') { e.preventDefault(); setSearchOpen(true) }
      else if (key === '/' && !e.shiftKey) { e.preventDefault(); setShortcutsOpen(true) }
      else if (key === 'l' && e.shiftKey) { e.preventDefault(); setDarkMode(p => !p) }
      else if (key === 'a' && e.shiftKey) { e.preventDefault(); setQuickAddOpen(true) }
      else if (key === '1') { e.preventDefault(); setActiveTab('inicio') }
      else if (key === 'p' && !e.shiftKey) { e.preventDefault(); setActiveTab('pomodoro') }
      else if (key === 'k') { e.preventDefault(); setActiveTab('kanban') }
      else if (key === 't' && !e.shiftKey) { e.preventDefault(); setActiveTab('tareas') }
      else if (key === 'p' && e.shiftKey) { e.preventDefault(); setActiveTab('proyectos') }
      else if (key === 'd' && !e.shiftKey) { e.preventDefault(); setActiveTab('diario') }
      else if (key === 'c' && e.shiftKey) { e.preventDefault(); setActiveTab('calendario') }
      else if (key === 's' && e.shiftKey) { e.preventDefault(); setActiveTab('snippets') }
      else if (key === 'h') { e.preventDefault(); setActiveTab('habitos') }
      else if (key === 'l' && !e.shiftKey) { e.preventDefault(); setActiveTab('logros') }
      else if (key === 'd' && e.shiftKey) { e.preventDefault(); setActiveTab('desafios') }
      else if (key === 'm') { e.preventDefault(); setActiveTab('mapa') }
      else if (key === 'e') { e.preventDefault(); setActiveTab('stats') }
      else if (key === 'n') { e.preventDefault(); setActiveTab('notas') }
      else if (key === 'g') { e.preventDefault(); setActiveTab('metas') }
      else if (key === 'r' && e.shiftKey) { e.preventDefault(); setActiveTab('reporte') }
      else if (key === 't' && e.shiftKey) { e.preventDefault(); setActiveTab('papelera') }
      else if (key === 'f' && e.shiftKey) { e.preventDefault(); setFocusMode(true) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
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

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
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
                    <Button variant={isActive ? 'default' : 'ghost'} size="sm"
                      onClick={() => setActiveTab(tab.id)}
                      className={`text-xs gap-1.5 ${isActive ? '' : 'text-muted-foreground'}`}>
                      <Icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{tab.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><span>{tab.label} ({KEYBOARD_SHORTCUTS[tab.id]})</span></TooltipContent>
                </Tooltip>
              )
            })}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
                <Search className="h-5 w-5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">Buscar (Ctrl+B)</TooltipContent></Tooltip>
            {streak.current > 0 && (
              <Tooltip><TooltipTrigger asChild>
                <span className="text-sm text-orange-500 font-medium flex items-center gap-1">
                  <Zap className="h-4 w-4" /> {streak.current}
                </span>
              </TooltipTrigger><TooltipContent><span>Racha actual: {streak.current} días (máx: {streak.max})</span></TooltipContent></Tooltip>
            )}
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
          {sidebarOpen && (
            <aside className="w-60 shrink-0 border-r bg-card overflow-y-auto p-4 hidden md:block">
              <Suspense fallback={<div className="animate-pulse bg-muted h-32 rounded" />}><Sidebar darkMode={darkMode} /></Suspense>
            </aside>
          )}
          <main className="flex-1 overflow-y-auto p-6">
            <div key={activeTab} className="animate-fade-slide-in">
              <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground"><Loader className="h-6 w-6 animate-spin" /></div>}>
                {activeTab === 'inicio' && <Dashboard />}
                {activeTab === 'pomodoro' && <PomodoroTimer onComplete={handleStreakUpdate} />}
                {activeTab === 'kanban' && <KanbanBoard />}
                {activeTab === 'tareas' && <TaskList />}
                {activeTab === 'proyectos' && <ProjectsPage />}
                {activeTab === 'diario' && <DailyLogPage />}
                {activeTab === 'calendario' && <CalendarView />}
                {activeTab === 'snippets' && <SnippetsPage />}
                {activeTab === 'habitos' && <HabitsPage />}
                {activeTab === 'logros' && <AchievementsGallery />}
                {activeTab === 'desafios' && <ChallengesPage />}
                {activeTab === 'mapa' && <StudyMap darkMode={darkMode} />}
                {activeTab === 'stats' && <Statistics />}
                {activeTab === 'notas' && <QuickNotes />}
                {activeTab === 'metas' && <Goals />}
                {activeTab === 'reporte' && <WeeklyReviewPage />}
                {activeTab === 'papelera' && <TrashPage />}
              </Suspense>
            </div>
          </main>
        </div>

        <Toaster />

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
              <DialogTitle className="flex items-center gap-2 text-red-500"><Trash2 className="h-5 w-5" /> Confirmar eliminación</DialogTitle>
              <DialogDescription>¿Estás seguro de que querés eliminar "{confirmDelete?.title}"? Se moverá a la papelera y se eliminará automáticamente a los 30 días.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={async () => {
                if (confirmDelete && window.electronAPI) {
                  await window.electronAPI.softDeleteItem(confirmDelete.type, confirmDelete.id)
                  toast({ title: 'Elemento movido a la papelera' })
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
                  <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">{KEYBOARD_SHORTCUTS[tab.id]}</kbd>
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