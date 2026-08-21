import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronDown, StickyNote, Target, TrendingUp, Zap, Timer, CheckSquare, Settings2, PanelRightClose } from 'lucide-react'
import { TABS, HUBS, KEYBOARD_SHORTCUTS } from '@/constants/tabs'
import type { Tab } from '@/constants/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher/WorkspaceSwitcher'
import { useWorkspaceStore } from '@/stores/workspaceStore'

interface SidebarProps {
  activeTab: string
  onNavigate: (tabId: string) => void
  onClose?: () => void
  onOpenSettings?: () => void
  userName?: string
  fontSize?: 'sm' | 'base' | 'lg'
  denseMode?: boolean
}

export default function Sidebar({ activeTab, onNavigate, onOpenSettings, userName = '', fontSize = 'base', denseMode = false }: SidebarProps) {
  const [notes, setNotes] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [goalProgress, setGoalProgress] = useState<Record<number, number>>({})
  const [xp, setXp] = useState<{ level: number; currentXp: number; nextLevelXp: number; total: number } | null>(null)
  const [streak, setStreak] = useState<{ current: number; max: number } | null>(null)
  const [dailyStats, setDailyStats] = useState<{ pomodoros: number; tasks: number } | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [expandedHubs, setExpandedHubs] = useState<Record<string, boolean>>({})
  const toggleHub = (id: string) => setExpandedHubs(prev => ({ ...prev, [id]: !(prev[id] ?? true) }))
  const activeWorkspace = useWorkspaceStore(s => s.activeWorkspace)

  async function loadData() {
    if (!window.electronAPI) return
    const [notesData, goalsData, xpData] = await Promise.all([
      window.electronAPI.notes.list(),
      window.electronAPI.goals.list(),
      window.electronAPI.gamification.xp.get(),
    ])
    setNotes(notesData.slice(0, 3))
    setGoals(goalsData.slice(0, 3))
    setXp(xpData)
    const today = new Date().toISOString().split('T')[0]
    const progressMap: Record<number, number> = {}
    for (const goal of goalsData.slice(0, 3)) {
      try {
        const val = await window.electronAPI.goals.progress.get(goal.id, today)
        progressMap[goal.id] = val ?? 0
      } catch { progressMap[goal.id] = 0 }
    }
    setGoalProgress(progressMap)
    try {
      const s = await window.electronAPI.streaks.get('daily_study')
      if (s) setStreak(s)
    } catch {}
    try {
      const d = await window.electronAPI.dashboard.get()
      setDailyStats({ pomodoros: d.pomodorosToday, tasks: d.tasksToday })
    } catch {}
  }

  useEffect(() => { loadData() }, [activeWorkspace?.id])

  const textSize = fontSize === 'sm' ? 'text-xs' : fontSize === 'base' ? 'text-sm' : 'text-base'
  const avatarSize = denseMode ? 'h-8 w-8' : 'h-10 w-10'
  const avatarTextSize = denseMode ? 'text-sm' : 'text-lg'
  const navItemPad = denseMode ? 'py-1.5 px-3' : 'py-2 px-4'
  const sectionGap = denseMode ? 'space-y-2' : 'space-y-3'
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U'

  function handleSettingsClick() {
    onOpenSettings?.()
  }

  function renderTab(tab: Tab, indent = false) {
    const Icon = tab.icon
    const shortcut = KEYBOARD_SHORTCUTS[tab.id]
    const isActive = activeTab === tab.id
    return (
      <button
        key={tab.id}
        onClick={() => onNavigate(tab.id)}
        className={cn(
          'flex items-center gap-3 w-full text-left transition-colors',
          navItemPad,
          textSize,
          indent && 'pl-10',
          isActive
            ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground border-l-2 border-transparent'
        )}
      >
        <Icon className={cn('shrink-0', denseMode ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        <span className="flex-1 truncate">{tab.label}</span>
        {shortcut && (
          <kbd className="hidden lg:inline-flex items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70">
            {shortcut}
          </kbd>
        )}
      </button>
    )
  }

  if (collapsed) {
    return (
      <div className="flex flex-col h-full w-12 bg-card border-r items-center py-2 gap-1">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Expandir sidebar"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
        <Separator />
        {TABS.filter(t => t.id !== 'tienda' && t.id !== 'social').map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              title={tab.label}
              className={cn(
                'p-2 rounded-md transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-60 bg-card border-r">
      <WorkspaceSwitcher />

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col">
            <div className={cn('flex items-center gap-3', denseMode ? 'px-3 pt-3 pb-1' : 'px-4 pt-4 pb-2')}>
              <div className={cn('rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold shrink-0', avatarSize, avatarTextSize)}>
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium truncate', textSize)}>{userName || 'Usuario'}</p>
              </div>
              <button
                onClick={handleSettingsClick}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Abrir configuración"
              >
                <Settings2 className={cn(denseMode ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
              </button>
            </div>

            <nav className="flex flex-col">
              {renderTab(TABS.find(t => t.id === 'inicio')!)}
              <div className="border-t border-border my-1" />
              {HUBS.map(hub => {
                const HubIcon = hub.icon
                const isExpanded = expandedHubs[hub.id] ?? true
                return (
                  <div key={hub.id}>
                    <button
                      onClick={() => toggleHub(hub.id)}
                      className={cn(
                        'flex items-center gap-3 w-full text-left transition-colors',
                        navItemPad,
                        textSize,
                        'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <HubIcon className={cn('shrink-0', denseMode ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                      <span className="flex-1 truncate font-medium">{hub.label}</span>
                      <ChevronDown className={cn('h-3 w-3 transition-transform shrink-0', isExpanded ? '' : '-rotate-90')} />
                    </button>
                    {isExpanded && hub.tabs.map(tab => renderTab(tab, true))}
                  </div>
                )
              })}
            </nav>
          </div>

          <div className={cn(sectionGap, denseMode ? 'px-3 pb-3' : 'px-4 pb-4')}>
            {xp && (
              <div className={cn('rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20', denseMode ? 'p-2' : 'p-3')}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className={cn('text-yellow-500 shrink-0', denseMode ? 'h-3 w-3' : 'h-4 w-4')} />
                    <span className={cn('font-semibold text-yellow-500', denseMode ? 'text-[11px]' : 'text-xs')}>Nivel {xp.level}</span>
                  </div>
                  <span className={cn('text-muted-foreground shrink-0', denseMode ? 'text-[9px]' : 'text-[10px]')}>{xp.total} XP</span>
                </div>
                <Progress value={(xp.currentXp / xp.nextLevelXp) * 100} className="h-1.5" />
                <p className={cn('text-muted-foreground mt-1', denseMode ? 'text-[9px]' : 'text-[10px]')}>{xp.currentXp}/{xp.nextLevelXp} XP</p>
              </div>
            )}

            {streak && streak.current > 0 ? (
              <div className={cn('rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20', denseMode ? 'p-2' : 'p-3')}>
                <div className="flex items-center gap-2 text-orange-500">
                  <Zap className={cn('shrink-0', denseMode ? 'h-4 w-4' : 'h-5 w-5')} />
                  <span className={cn('font-semibold', denseMode ? 'text-xs' : 'text-sm')}>{streak.current} días</span>
                </div>
                <p className={cn('text-muted-foreground mt-0.5', denseMode ? 'text-[10px]' : 'text-xs')}>Racha activa (máx: {streak.max})</p>
              </div>
            ) : (
              <div className={cn('rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20', denseMode ? 'p-2' : 'p-3')}>
                <div className="flex items-center gap-2 text-orange-500">
                  <Zap className={cn('shrink-0', denseMode ? 'h-4 w-4' : 'h-5 w-5')} />
                  <span className={cn('font-semibold', denseMode ? 'text-xs' : 'text-sm')}>Sin racha activa</span>
                </div>
                <p className={cn('text-muted-foreground mt-0.5', denseMode ? 'text-[10px]' : 'text-xs')}>Completa un pomodoro para empezar</p>
              </div>
            )}

            {dailyStats && (dailyStats.pomodoros > 0 || dailyStats.tasks > 0) && (
              <div className={cn('rounded-lg bg-accent/50 border border-border', denseMode ? 'p-2' : 'p-3')}>
                <div className={cn('font-medium mb-1.5', denseMode ? 'text-[10px]' : 'text-xs', 'text-muted-foreground')}>Hoy</div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5">
                    <Timer className={cn('text-red-500 shrink-0', denseMode ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                    <span className={cn('font-semibold', denseMode ? 'text-[11px]' : 'text-sm')}>{dailyStats.pomodoros}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className={cn('text-green-500 shrink-0', denseMode ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                    <span className={cn('font-semibold', denseMode ? 'text-[11px]' : 'text-sm')}>{dailyStats.tasks}</span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h3 className={cn('font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1', denseMode ? 'text-[10px]' : 'text-xs')}>
                <StickyNote className={cn('shrink-0', denseMode ? 'h-2.5 w-2.5' : 'h-3 w-3')} /> Notas Rápidas
              </h3>
              <div className="space-y-1">
                {notes.length === 0 && <p className={cn('text-muted-foreground', denseMode ? 'text-[10px]' : 'text-xs')}>Sin notas aún</p>}
                {notes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => onNavigate('notas')}
                    className={cn('w-full text-left p-2 rounded bg-accent/50 truncate cursor-pointer hover:bg-accent transition-colors', denseMode ? 'text-[10px]' : 'text-xs')}
                    title={note.title}
                  >
                    {note.title}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className={cn('font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1', denseMode ? 'text-[10px]' : 'text-xs')}>
                <Target className={cn('shrink-0', denseMode ? 'h-2.5 w-2.5' : 'h-3 w-3')} /> Metas Hoy
              </h3>
              <div className="space-y-2">
                {goals.length === 0 && <p className={cn('text-muted-foreground', denseMode ? 'text-[10px]' : 'text-xs')}>Sin metas aún</p>}
                {goals.map(goal => {
                  const current = goalProgress[goal.id] ?? 0
                  const pct = goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0
                  return (
                    <button
                      key={goal.id}
                      onClick={() => onNavigate('metas')}
                      className={cn('w-full text-left', denseMode ? 'text-[10px]' : 'text-xs')}
                    >
                      <div className="flex justify-between mb-0.5">
                        <span className="truncate">{goal.title}</span>
                        <Badge variant="outline" className={cn('ml-1 shrink-0', denseMode ? 'text-[8px]' : 'text-[10px]')}>{current}/{goal.target}</Badge>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="shrink-0 border-t">
        <div className="flex p-1 gap-1">
          <button
            onClick={() => setCollapsed(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Colapsar sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className={cn('font-medium', denseMode ? 'text-xs' : 'text-sm')}>Colapsar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
