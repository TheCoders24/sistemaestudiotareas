import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Timer, CheckSquare, Zap, Clock, TrendingUp, StickyNote,
  Activity, Target, ListChecks, Flame, BookOpen, Coffee,
  ArrowRight, Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/stores/appStore'
import { StatsCardSkeleton } from '@/components/ui/loading-skeleton'
import { cn } from '@/lib/utils'
import { safeIpc } from '@/lib/ipc'
import type { Note, Task, PomodoroSession, Habit, HabitLog, Goal, GoalProgress } from '@/types'

const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

export default function Dashboard() {
  const streak = useAppStore((s) => s.streak)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const [todayPomodoros, setTodayPomodoros] = useState(0)
  const [pendingTasks, setPendingTasks] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [recentNotes, setRecentNotes] = useState<Note[]>([])
  const [weeklyData, setWeeklyData] = useState<{ date: string; count: number }[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [todayHabits, setTodayHabits] = useState<{ habit: Habit; done: boolean }[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalProgress, setGoalProgress] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [sessions, tasks, notes, habits, gs] = await Promise.all([
      safeIpc<PomodoroSession[]>('getPomodoroSessions', today),
      safeIpc<Task[]>('getTasks'),
      safeIpc<Note[]>('getNotes'),
      safeIpc<Habit[]>('getHabits'),
      safeIpc<Goal[]>('getGoals'),
    ])
    setTodayPomodoros(sessions?.length ?? 0)
    setPendingTasks((tasks ?? []).filter(t => !t.completed).length)
    setTotalTasks((tasks ?? []).length)
    setRecentNotes((notes ?? []).slice(0, 3))

    // Upcoming tasks (not completed, with due dates, sorted by due date)
    const upcoming = (tasks ?? [])
      .filter(t => !t.completed && t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5)
    setUpcomingTasks(upcoming)

    // Habits for today
    if (habits && habits.length > 0) {
      const logs = await Promise.all(
        habits.map(h => safeIpc<HabitLog[]>('getHabitLogs', h.id))
      )
      const todayHabitState = habits.map((h, i) => {
        const habitLogs = logs[i] || []
        const done = habitLogs.some(l => l.date === today && l.completed)
        return { habit: h, done }
      })
      setTodayHabits(todayHabitState)
    }

    // Goals with progress
    if (gs && gs.length > 0) {
      setGoals(gs)
      const progressMap: Record<number, number> = {}
      for (const goal of gs) {
        const p = await safeIpc<GoalProgress[]>('getGoalProgress', goal.id)
        if (p) {
          const todayEntry = (p as GoalProgress[]).find(e => e.date === today)
          progressMap[goal.id] = todayEntry?.value ?? 0
        }
      }
      setGoalProgress(progressMap)
    }

    // Weekly pomodoro stats
    const weekly: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
      const s = await safeIpc<PomodoroSession[]>('getPomodoroSessions', d)
      weekly.push({ date: d, count: s?.length ?? 0 })
    }
    setWeeklyData(weekly)
    setLoading(false)
  }

  const now = new Date()
  const hours = now.getHours()
  const greeting = hours < 12 ? 'Buenos días' : hours < 18 ? 'Buenas tardes' : 'Buenas noches'
  const maxWeekly = Math.max(...weeklyData.map(d => d.count), 1)
  const completedTasks = totalTasks - pendingTasks
  const taskProgressPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const isToday = (date: string) => date === now.toISOString().split('T')[0]

  const statCards = [
    { label: 'Pomodoros hoy', value: todayPomodoros, icon: Timer, color: 'text-red-500', bg: 'bg-red-500/10', tab: 'pomodoro' },
    { label: 'Tareas pendientes', value: pendingTasks, icon: CheckSquare, color: 'text-yellow-500', bg: 'bg-yellow-500/10', tab: 'tareas' },
    { label: 'Racha actual', value: `${streak.current}d`, icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10', tab: 'habitos' },
    { label: 'Completadas', value: completedTasks, icon: Target, color: 'text-green-500', bg: 'bg-green-500/10', tab: 'stats' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-indigo-500" /> {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {streak.current > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span>{streak.current} días seguidos</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><StatsCardSkeleton /></CardContent></Card>
            ))
          : statCards.map((stat, i) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setActiveTab(stat.tab)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', stat.bg)}>
                          <Icon className={cn('h-5 w-5', stat.color)} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Acciones rápidas:</span>
        <Button variant="outline" size="sm" onClick={() => setActiveTab('pomodoro')} className="gap-1.5">
          <Timer className="h-3.5 w-3.5" /> Pomodoro
        </Button>
        <Button variant="outline" size="sm" onClick={() => setActiveTab('notas')} className="gap-1.5">
          <StickyNote className="h-3.5 w-3.5" /> Nueva nota
        </Button>
        <Button variant="outline" size="sm" onClick={() => setActiveTab('tareas')} className="gap-1.5">
          <ListChecks className="h-3.5 w-3.5" /> Nueva tarea
        </Button>
        <Button variant="outline" size="sm" onClick={() => setActiveTab('flashcards')} className="gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Estudiar
        </Button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Weekly activity chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" /> Actividad semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-1 h-28">
                  {weeklyData.map((d) => {
                    const height = maxWeekly > 0 ? (d.count / maxWeekly) * 100 : 0
                    const today = isToday(d.date)
                    const day = new Date(d.date).getDay()
                    return (
                      <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-[10px] text-muted-foreground">{d.count}</span>
                        <div className="w-full flex justify-center flex-1 items-end">
                          <div
                            className={cn(
                              "w-6 rounded-t transition-all",
                              today ? "bg-indigo-500" : "bg-indigo-500/30 hover:bg-indigo-500/50"
                            )}
                            style={{ height: `${height}%`, minHeight: d.count > 0 ? '4px' : '2px' }}
                          />
                        </div>
                        <span className={cn("text-[10px]", today ? "text-indigo-500 font-semibold" : "text-muted-foreground")}>
                          {dayNames[day]}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Total: {weeklyData.reduce((s, d) => s + d.count, 0)} pomodoros esta semana
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Habits mini */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" /> Hábitos hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : todayHabits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin hábitos aún
                <br />
                <Button variant="link" size="sm" className="mt-1" onClick={() => setActiveTab('habitos')}>
                  Crear hábitos <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </p>
            ) : (
              <div className="space-y-2">
                {todayHabits.slice(0, 5).map(({ habit, done }) => (
                  <div key={habit.id} className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center",
                      done ? "bg-green-500 border-green-500" : "border-muted-foreground/30"
                    )}>
                      {done && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={cn(done && "text-muted-foreground line-through")}>{habit.name}</span>
                  </div>
                ))}
                <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => setActiveTab('habitos')}>
                  Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" /> Tareas próximas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin tareas pendientes</p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => {
                  const dueDate = task.due_date ? new Date(task.due_date) : null
                  const isOverdue = dueDate && dueDate < new Date()
                  const isToday = dueDate && dueDate.toDateString() === new Date().toDateString()
                  return (
                    <div key={task.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-accent/30">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isOverdue ? "bg-red-500" : isToday ? "bg-yellow-500" : "bg-muted-foreground"
                      )} />
                      <span className="flex-1 truncate">{task.title}</span>
                      <span className={cn(
                        "text-[10px] shrink-0",
                        isOverdue ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {dueDate?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )
                })}
                <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => setActiveTab('tareas')}>
                  Ver todas <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent notes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" /> Notas recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin notas aún</p>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note) => (
                  <div key={note.id} className="p-2 rounded-lg bg-accent/50 text-sm">
                    <p className="font-medium truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{note.content}</p>
                  </div>
                ))}
                <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => setActiveTab('notas')}>
                  Ver todas <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Progreso general
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : totalTasks === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos aún</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Tareas completadas</span>
                  <span className="font-medium text-green-500">{completedTasks}/{totalTasks}</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${taskProgressPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-orange-500" />
                    <span className="text-muted-foreground">Racha máx:</span>
                    <span className="font-medium">{streak.max}d</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coffee className="h-3 w-3 text-red-500" />
                    <span className="text-muted-foreground">Pomodoros:</span>
                    <span className="font-medium">{todayPomodoros}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals mini */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" /> Metas de hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : goals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin metas
                <br />
                <Button variant="link" size="sm" className="mt-1" onClick={() => setActiveTab('metas')}>
                  Crear metas <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </p>
            ) : (
              <div className="space-y-3">
                {goals.slice(0, 3).map((goal) => {
                  const current = goalProgress[goal.id] || 0
                  const pct = goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="truncate">{goal.title}</span>
                        <span className="text-muted-foreground">{current}/{goal.target}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {goals.length > 3 && (
                  <Button variant="link" size="sm" className="text-xs" onClick={() => setActiveTab('metas')}>
                    Ver más <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
