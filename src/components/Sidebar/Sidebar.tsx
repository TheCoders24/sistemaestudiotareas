import { useState, useEffect } from 'react'
import { ChevronLeft, Settings2, StickyNote, Target, TrendingUp, Zap, Timer, CheckSquare } from 'lucide-react'
import { TABS, KEYBOARD_SHORTCUTS } from '@/constants/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface SidebarProps {
  activeTab: string
  onNavigate: (tabId: string) => void
  onClose?: () => void
  userName?: string
  fontSize?: 'sm' | 'base' | 'lg'
  denseMode?: boolean
}

export default function Sidebar({ activeTab, onNavigate, onClose, userName = '', fontSize = 'base', denseMode = false }: SidebarProps) {
  const [notes, setNotes] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [goalProgress, setGoalProgress] = useState<Record<number, number>>({})
  const [xp, setXp] = useState<{ level: number; currentXp: number; nextLevelXp: number; total: number } | null>(null)
  const [streak, setStreak] = useState<{ current: number; max: number } | null>(null)
  const [dailyStats, setDailyStats] = useState<{ pomodoros: number; tasks: number } | null>(null)

  async function loadData() {
    if (!window.electronAPI) return
    const [notesData, goalsData, xpData] = await Promise.all([
      window.electronAPI.getNotes(),
      window.electronAPI.getGoals(),
      window.electronAPI.getXp(),
    ])
    setNotes(notesData.slice(0, 3))
    setGoals(goalsData.slice(0, 3))
    setXp(xpData)
    const today = new Date().toISOString().split('T')[0]
    const progressMap: Record<number, number> = {}
    for (const goal of goalsData.slice(0, 3)) {
      try {
        const val = await window.electronAPI.getGoalProgress(goal.id, today)
        progressMap[goal.id] = val ?? 0
      } catch { progressMap[goal.id] = 0 }
    }
    setGoalProgress(progressMap)
    if (window.electronAPI) {
      window.electronAPI.getStreak('daily_study').then(s => { if (s) setStreak(s) })
      window.electronAPI.getDashboard().then(d => {
        setDailyStats({ pomodoros: d.pomodorosToday, tasks: d.tasksToday })
      }).catch(() => {})
    }
  }

  useEffect(() => { loadData() }, [])

  const textSize = fontSize === 'sm' ? 'text-xs' : fontSize === 'base' ? 'text-sm' : 'text-base'
  const avatarSize = denseMode ? 'h-8 w-8' : 'h-10 w-10'
  const avatarTextSize = denseMode ? 'text-sm' : 'text-lg'
  const navItemPad = denseMode ? 'py-1.5 px-3' : 'py-2 px-4'
  const sectionGap = denseMode ? 'space-y-2' : 'space-y-3'
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U'

  return (
    <div className="flex flex-col h-full w-60 bg-card border-r">
      <div className={cn('flex flex-col flex-shrink-0', sectionGap)}>
        <div className={cn('flex items-center gap-3', denseMode ? 'p-3' : 'p-4')}>
          <div className={cn('rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold', avatarSize, avatarTextSize)}>
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium truncate', textSize)}>{userName || 'Usuario'}</p>
          </div>
          <Settings2 className={cn('text-muted-foreground flex-shrink-0', denseMode ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        </div>

        <nav className="flex flex-col">
          {TABS.map(tab => {
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
                  isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground border-l-2 border-transparent'
                )}
              >
                <Icon className={cn('flex-shrink-0', denseMode ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                <span className="flex-1 truncate">{tab.label}</span>
                {shortcut && (
                  <kbd className="hidden lg:inline-flex items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70">
                    {shortcut}
                  </kbd>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className={cn(sectionGap, denseMode ? 'p-3' : 'p-4')}>
            {xp && (
              <div className={cn('rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20', denseMode ? 'p-2' : 'p-3')}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className={cn('text-yellow-500', denseMode ? 'h-3 w-3' : 'h-4 w-4')} />
                    <span className={cn('font-semibold text-yellow-500', denseMode ? 'text-[11px]' : 'text-xs')}>Nivel {xp.level}</span>
                  </div>
                  <span className={cn('text-muted-foreground', denseMode ? 'text-[9px]' : 'text-[10px]')}>{xp.total} XP</span>
                </div>
                <Progress value={(xp.currentXp / xp.nextLevelXp) * 100} className="h-1.5" />
                <p className={cn('text-muted-foreground mt-1', denseMode ? 'text-[9px]' : 'text-[10px]')}>{xp.currentXp}/{xp.nextLevelXp} XP</p>
              </div>
            )}

            {streak && streak.current > 0 ? (
              <div className={cn('rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20', denseMode ? 'p-2' : 'p-3')}>
                <div className="flex items-center gap-2 text-orange-500">
                  <Zap className={cn(denseMode ? 'h-4 w-4' : 'h-5 w-5')} />
                  <span className={cn('font-semibold', denseMode ? 'text-xs' : 'text-sm')}>{streak.current} días</span>
                </div>
                <p className={cn('text-muted-foreground mt-0.5', denseMode ? 'text-[10px]' : 'text-xs')}>Racha activa (máx: {streak.max})</p>
              </div>
            ) : (
              <div className={cn('rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20', denseMode ? 'p-2' : 'p-3')}>
                <div className="flex items-center gap-2 text-orange-500">
                  <Zap className={cn(denseMode ? 'h-4 w-4' : 'h-5 w-5')} />
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
                    <Timer className={cn('text-red-500', denseMode ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                    <span className={cn('font-semibold', denseMode ? 'text-[11px]' : 'text-sm')}>{dailyStats.pomodoros}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className={cn('text-green-500', denseMode ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                    <span className={cn('font-semibold', denseMode ? 'text-[11px]' : 'text-sm')}>{dailyStats.tasks}</span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h3 className={cn('font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1', denseMode ? 'text-[10px]' : 'text-xs')}>
                <StickyNote className={denseMode ? 'h-2.5 w-2.5' : 'h-3 w-3'} /> Notas Rápidas
              </h3>
              <div className="space-y-1">
                {notes.length === 0 && <p className={cn('text-muted-foreground', denseMode ? 'text-[10px]' : 'text-xs')}>Sin notas aún</p>}
                {notes.map(note => (
                  <div key={note.id} className={cn('p-2 rounded bg-accent/50 truncate cursor-pointer hover:bg-accent', denseMode ? 'text-[10px]' : 'text-xs')}>
                    {note.title}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className={cn('font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1', denseMode ? 'text-[10px]' : 'text-xs')}>
                <Target className={denseMode ? 'h-2.5 w-2.5' : 'h-3 w-3'} /> Metas Hoy
              </h3>
              <div className="space-y-2">
                {goals.length === 0 && <p className={cn('text-muted-foreground', denseMode ? 'text-[10px]' : 'text-xs')}>Sin metas aún</p>}
                {goals.map(goal => {
                  const current = goalProgress[goal.id] ?? 0
                  const pct = goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0
                  return (
                    <div key={goal.id} className={cn(denseMode ? 'text-[10px]' : 'text-xs')}>
                      <div className="flex justify-between mb-0.5">
                        <span className="truncate">{goal.title}</span>
                        <Badge variant="outline" className={cn('ml-1', denseMode ? 'text-[8px]' : 'text-[10px]')}>{current}/{goal.target}</Badge>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="flex-shrink-0 border-t p-2">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-full gap-2 rounded-md py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className={cn('font-medium', denseMode ? 'text-xs' : 'text-sm')}>Colapsar</span>
        </button>
      </div>
    </div>
  )
}
