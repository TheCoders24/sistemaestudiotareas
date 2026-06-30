import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Timer, CheckSquare, Zap, Clock, TrendingUp, StickyNote,
  Activity, Target,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/stores/appStore'
import { StatsCardSkeleton } from '@/components/ui/loading-skeleton'
import { cn } from '@/lib/utils'
import { safeIpc } from '@/lib/ipc'
import type { Note, Task, PomodoroSession } from '@/types'

export default function Dashboard() {
  const streak = useAppStore((s) => s.streak)
  const [todayPomodoros, setTodayPomodoros] = useState(0)
  const [pendingTasks, setPendingTasks] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [recentNotes, setRecentNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    if (!window.electronAPI) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [sessions, tasks, notes] = await Promise.all([
      safeIpc<PomodoroSession[]>('getPomodoroSessions', today),
      safeIpc<Task[]>('getTasks'),
      safeIpc<Note[]>('getNotes'),
    ])
    setTodayPomodoros(sessions?.length ?? 0)
    setPendingTasks((tasks ?? []).filter(t => !t.completed).length)
    setTotalTasks((tasks ?? []).length)
    setRecentNotes((notes ?? []).slice(0, 3))
    setLoading(false)
  }

  const now = new Date()
  const hours = now.getHours()
  const greeting = hours < 12 ? 'Buenos días' : hours < 18 ? 'Buenas tardes' : 'Buenas noches'

  const statCards = [
    { label: 'Pomodoros hoy', value: todayPomodoros, icon: Timer, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Tareas pendientes', value: pendingTasks, icon: CheckSquare, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'Racha actual', value: `${streak.current}d`, icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Tareas totales', value: totalTasks, icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-indigo-500" /> {greeting}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4"><StatsCardSkeleton /></CardContent>
              </Card>
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
                  <Card className="hover:shadow-md transition-shadow">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" /> Notas recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin notas aún</p>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note) => (
                  <div key={note.id} className="p-2 rounded-lg bg-accent/50 text-sm">
                    <p className="font-medium truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" /> Progreso de tareas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : totalTasks === 0 ? (
              <p className="text-sm text-muted-foreground">Sin tareas aún</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Completadas</span>
                  <span className="font-medium text-green-500">{totalTasks - pendingTasks}/{totalTasks}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${((totalTasks - pendingTasks) / totalTasks) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Racha máx</span>
                  <span className="font-medium text-orange-500">{streak.max} días</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
