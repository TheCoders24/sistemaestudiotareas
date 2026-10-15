import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Timer, CheckSquare, Flame, Zap, TrendingUp, Sparkles, Trophy, Calendar, BarChart3, Activity, Clock, BookOpen, BookMarked, Plus, Play, PenLine } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { StatsCardSkeleton } from '@/components/ui/loading-skeleton'
import { InfoBox } from '@/components/ui/info-box'
import { useTranslate } from '@/lib/translate'

const STUDY_LEVELS = [
  { value: 0, label: 'Sin iniciar', color: '#6b7280' },
  { value: 1, label: 'Diaria', color: '#6366f1' },
  { value: 2, label: '1er Repaso', color: '#f59e0b' },
  { value: 3, label: '2do Repaso', color: '#10b981' },
]

const QUOTES = [
  'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
  'No cuentes los días, haz que los días cuenten.',
  'El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora.',
  'La disciplina es el puente entre metas y logros.',
  'Tu único límite es el que te pones a ti mismo.',
  'Pequeñas victorias construyen grandes hábitos.',
  'La consistencia vence a la intensidad.',
]

const ACTIVITY_ICONS: Record<string, any> = {
  tarea: CheckSquare,
  nota: BookOpen,
  pomodoro: Clock,
  xp: Zap,
}

const ACTIVITY_COLORS: Record<string, string> = {
  tarea: 'text-green-500',
  nota: 'text-blue-500',
  pomodoro: 'text-red-500',
  xp: 'text-yellow-500',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]
}

export default function Dashboard() {
  const t = useTranslate()
  const [data, setData] = useState<any>(null)
  const [xpHistory, setXpHistory] = useState<Array<{ date: string; xp: number }>>([])
  const [xpHistory30, setXpHistory30] = useState<Array<{ date: string; xp: number }>>([])
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [habitStats, setHabitStats] = useState<any[]>([])
  const [studyStats, setStudyStats] = useState<{ levels: { study_level: number, count: number }[], total: number } | null>(null)
  const [weeklyReport, setWeeklyReport] = useState<any>(null)
  const [greeting] = useState(getGreeting)
  const [quote] = useState(getRandomQuote)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.dashboard.get().then(setData)
    window.electronAPI.gamification.xp.history(7).then(setXpHistory)
    window.electronAPI.gamification.xp.history(30).then(setXpHistory30)
    window.electronAPI.dashboard.activityFeed().then(setActivityFeed)
    window.electronAPI.habits.stats().then(setHabitStats)
    window.electronAPI.study.stats().then(s => { if (s) setStudyStats(s) }).catch(() => {})
    window.electronAPI.stats.weeklyReport().then(setWeeklyReport).catch(() => {})
  }, [])

  if (!data) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <StatsCardSkeleton /><StatsCardSkeleton /><StatsCardSkeleton /><StatsCardSkeleton />
    </div>
  )

  const xpProgress = data.xp.nextLevelXp > 0 ? (data.xp.currentXp / data.xp.nextLevelXp) * 100 : 0
  const maxXp7 = Math.max(...xpHistory.map(d => d.xp), 1)
  const maxXp30 = Math.max(...xpHistory30.map(d => d.xp), 1)

  return (
    <TooltipProvider>
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-500" />
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 italic">"{quote}"</p>
      </motion.div>

      <InfoBox title={t('dashboard.title')} storageKey="tutorial_dashboard" className="mb-4">
        <p>Tu centro de control personal. Aquí ves un resumen de toda tu actividad: pomodoros de hoy, tareas pendientes, racha actual, hábitos, metas y actividad reciente. Todo lo que necesitas para saber cómo va tu día.</p>
      </InfoBox>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <Timer className="h-4 w-4" />
                <span className="text-xs font-medium">Pomodoros hoy</span>
              </div>
              <span className="text-2xl font-bold">{data.pomodorosToday}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {data.totalPomodoros} total</span>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-green-500 mb-1">
                <CheckSquare className="h-4 w-4" />
                <span className="text-xs font-medium">Tareas hoy</span>
              </div>
              <span className="text-2xl font-bold">{data.tasksToday}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {data.totalTasks} total</span>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-orange-500 mb-1">
                <Flame className="h-4 w-4" />
                <span className="text-xs font-medium">Racha</span>
              </div>
              <span className="text-2xl font-bold">{data.streak.current}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {data.streak.max} máx</span>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-indigo-500 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Nivel {data.xp.level}</span>
              </div>
              <span className="text-2xl font-bold">{data.xp.total} XP</span>
              <Progress value={xpProgress} className="h-1.5 mt-1" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }}>
          <Card className="h-full">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Acciones Rápidas</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => { (window as any).__setActiveTab?.('tareas'); setTimeout(() => window.dispatchEvent(new CustomEvent('open-task-form')), 100) }}
                  className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-left">
                  <Plus className="h-3.5 w-3.5 text-green-500" />
                  <span>Nueva tarea</span>
                </button>
                <button onClick={() => { if ((window as any).__setActiveTab) (window as any).__setActiveTab('pomodoro') }}
                  className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-left">
                  <Play className="h-3.5 w-3.5 text-red-500" />
                  <span>Iniciar pomodoro</span>
                </button>
                <button onClick={() => { if ((window as any).__setActiveTab) (window as any).__setActiveTab('notas') }}
                  className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-left">
                  <PenLine className="h-3.5 w-3.5 text-blue-500" />
                  <span>Escribir nota</span>
                </button>
                <button onClick={() => { if ((window as any).__setActiveTab) (window as any).__setActiveTab('diario') }}
                  className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-left">
                  <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                  <span>Escribir en el diario</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {weeklyReport && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="md:col-span-2">
            <Card className="h-full">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium">Resumen Semanal</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{weeklyReport.weekStart}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Timer className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-lg font-bold">{weeklyReport.pomodoros}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Pomodoros</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-lg font-bold">{weeklyReport.tasksCompleted}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Tareas hechas</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-lg font-bold">{weeklyReport.xpEarned}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">XP ganados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {studyStats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="mb-6">
          <Card className="overflow-hidden border-indigo-200/30 dark:border-indigo-800/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookMarked className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium">Progreso del temario</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {studyStats.total} tema{studyStats.total !== 1 ? 's' : ''}
                </Badge>
              </div>
              {(() => {
                const c3 = studyStats.levels.find(l => l.study_level === 3)?.count ?? 0
                const pct = Math.round((c3 / studyStats.total) * 100)
                return (
                  <>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{c3} de {studyStats.total} completados</span>
                      <span className="font-semibold tabular-nums">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2.5" />
                    <div className="flex items-center gap-3 mt-2.5 text-xs flex-wrap">
                      {STUDY_LEVELS.map(lvl => {
                        const count = studyStats.levels.find(l => l.study_level === lvl.value)?.count ?? 0
                        return (
                          <span key={lvl.value} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lvl.color }} />
                            {lvl.label} <span className="font-medium tabular-nums">{count}</span>
                          </span>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="md:col-span-2">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Experiencia</span>
                </div>
                <span className="text-xs text-muted-foreground">{data.xp.total} XP total</span>
              </div>
              <Progress value={xpProgress} className="h-2 mb-1" />
              <div className="flex justify-between text-xs text-muted-foreground mb-3">
                <span>Nivel {data.xp.level}</span>
                <span>{data.xp.currentXp} / {data.xp.nextLevelXp} XP</span>
              </div>
              {xpHistory.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">XP últimos 7 días</span>
                  <div className="flex items-end gap-1 h-16 mt-1">
                    {xpHistory.map((day) => {
                      const height = (day.xp / maxXp7) * 100
                      const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('es', { weekday: 'short' })
                      return (
                        <Tooltip key={day.date}>
                          <TooltipTrigger asChild>
                            <div className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer">
                              <div className="w-full rounded-t bg-gradient-to-t from-indigo-600/60 to-indigo-500/40"
                                style={{ height: `${Math.max(height, 3)}%`, minHeight: '4px' }} />
                              <span className="text-[9px] text-muted-foreground">{dayLabel}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top"><span className="text-xs">{day.date}: {day.xp} XP</span></TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Próximas tareas</span>
              </div>
              {data.upcomingTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sin tareas con fecha límite</p>
              ) : (
                <div className="space-y-1.5">
                  {data.upcomingTasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded bg-accent/50">
                      <span className="truncate">{t.title}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{t.due_date}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Hábitos hoy</span>
              </div>
              {habitStats.length === 0 ? (
                <EmptyState icon={Activity} title="Sin hábitos" description="Creá un hábito desde la pestaña Hábitos para empezar." />
              ) : (
                <div className="space-y-2">
                  {habitStats.slice(0, 5).map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${h.todayDone ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                        <span>{h.name}</span>
                      </div>
                      <span className="text-muted-foreground">{h.thisMonth}/30d</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Actividad reciente</span>
              </div>
              {activityFeed.length === 0 ? (
                <EmptyState icon={Activity} title="Sin actividad aún" description="Completá tu primer pomodoro o tarea para ver actividad aquí." />
              ) : (
                <div className="space-y-1.5">
                  {activityFeed.slice(0, 6).map((item: any, i: number) => {
                    const Icon = ACTIVITY_ICONS[item.type] || Activity
                    const color = ACTIVITY_COLORS[item.type] || 'text-muted-foreground'
                    return (
                      <div key={`${item.type}-${item.id}-${i}`}
                        className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-accent/50 transition-colors">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                        <span className="truncate flex-1">{item.text}</span>
                        {item.title && <span className="text-muted-foreground shrink-0">{item.title}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {xpHistory30.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-6">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">XP últimos 30 días</span>
              </div>
              <div className="flex items-end gap-[2px] h-24">
                {xpHistory30.map((day) => {
                  const height = (day.xp / maxXp30) * 100
                  return (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <div className="flex-1 flex flex-col items-center justify-end cursor-pointer"
                          style={{ height: '100%' }}>
                          <div className="w-full rounded-sm bg-indigo-500/50 hover:bg-indigo-500/80 transition-colors"
                            style={{ height: `${Math.max(height, 2)}%` }} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top"><span className="text-xs">{day.date}: {day.xp} XP</span></TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Tu progreso total</span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-xl font-bold text-red-500">{data.totalPomodoros}</span>
                <p className="text-[10px] text-muted-foreground">Pomodoros</p>
              </div>
              <div>
                <span className="text-xl font-bold text-green-500">{data.totalTasks}</span>
                <p className="text-[10px] text-muted-foreground">Tareas</p>
              </div>
              <div>
                <span className="text-xl font-bold text-orange-500">{data.tasksPending}</span>
                <p className="text-[10px] text-muted-foreground">Pendientes</p>
              </div>
              <div>
                <span className="text-xl font-bold text-indigo-500">{data.xp.level}</span>
                <p className="text-[10px] text-muted-foreground">Nivel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
    </TooltipProvider>
  )
}
