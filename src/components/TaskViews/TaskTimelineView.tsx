import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, GanttChart, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListSkeleton } from '@/components/ui/loading-skeleton'

interface Task {
  id: number; title: string; completed: number; priority: string
  due_date: string | null; created_at: string; tags?: string
}

const PRIORITY_BG: Record<string, string> = {
  alta: 'bg-red-500', media: 'bg-yellow-500', baja: 'bg-green-500',
}
const PRIORITY_BG_MUTED: Record<string, string> = {
  alta: 'bg-red-500/40', media: 'bg-yellow-500/40', baja: 'bg-green-500/40',
}
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function TaskTimelineView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.tasks.list()
    setTasks(data.filter((task: any) => !task.deleted && task.due_date))
    setLoading(false)
  }

  const today = new Date()
  const currentMonday = useMemo(() => {
    const d = new Date(today)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setDate(d.getDate() + weekOffset * 7)
    d.setHours(0, 0, 0, 0)
    return d
  }, [weekOffset])

  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentMonday])

  const todayStr = useMemo(() => {
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  function formatDateKey(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const weekEnd = useMemo(() => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() + 6)
    return d
  }, [currentMonday])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.due_date) return false
      const dueDate = new Date(task.due_date + 'T12:00:00')
      return dueDate >= currentMonday && dueDate <= weekEnd
    }).sort((a, b) => {
      if (!a.due_date || !b.due_date) return 0
      return a.due_date.localeCompare(b.due_date)
    })
  }, [tasks, currentMonday, weekEnd])

  const tasksWithRange = useMemo(() => {
    return filteredTasks.map(task => {
      const dueDate = new Date(task.due_date + 'T12:00:00')
      const dueDayIndex = Math.round((dueDate.getTime() - currentMonday.getTime()) / (1000 * 60 * 60 * 24))
      const createdDate = new Date(task.created_at)
      let startDayIndex = 0
      if (createdDate >= currentMonday && createdDate <= weekEnd) {
        startDayIndex = Math.round((createdDate.getTime() - currentMonday.getTime()) / (1000 * 60 * 60 * 24))
      }
      return { ...task, startDay: startDayIndex, endDay: Math.min(dueDayIndex, 6) }
    })
  }, [filteredTasks, currentMonday, weekEnd])

  const weekLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    const start = currentMonday.toLocaleDateString('es-ES', opts)
    const end = weekEnd.toLocaleDateString('es-ES', opts)
    return `${start} - ${end}`
  }, [currentMonday, weekEnd])

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GanttChart className="h-6 w-6 text-indigo-500" />
              Línea de Tiempo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Vista tipo Gantt de tareas por semana</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
              Esta semana
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center capitalize">{weekLabel}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="flex min-w-[800px]">
            <div className="w-[200px] shrink-0 border-r">
              <div className="h-12 border-b flex items-center px-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Tarea</span>
              </div>
              {loading ? (
                <div className="p-3 space-y-3"><ListSkeleton rows={4} /></div>
              ) : tasksWithRange.length === 0 ? (
                <div className="p-3">
                  <p className="text-xs text-muted-foreground text-center py-8">Sin tareas esta semana</p>
                </div>
              ) : (
                tasksWithRange.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="h-10 border-b flex items-center px-3 gap-2 hover:bg-accent/50 transition-colors"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                    <span className={`text-xs font-medium truncate flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {task.priority}
                    </Badge>
                  </motion.div>
                ))
              )}
            </div>

            <div className="flex-1 overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="flex h-12 border-b">
                  {weekDays.map((day, i) => {
                    const dateKey = formatDateKey(day)
                    const isTodayCol = dateKey === todayStr
                    return (
                      <div key={i} className={`flex-1 flex flex-col items-center justify-center border-r last:border-r-0 ${isTodayCol ? 'bg-indigo-500/10' : ''}`}>
                        <span className={`text-[10px] font-medium ${isTodayCol ? 'text-indigo-500' : 'text-muted-foreground'}`}>
                          {DAY_NAMES[i]}
                        </span>
                        <span className={`text-xs font-semibold ${isTodayCol ? 'text-indigo-500' : ''}`}>
                          {day.getDate()}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="relative">
                  {weekDays.map((day, i) => {
                    const dateKey = formatDateKey(day)
                    const isTodayCol = dateKey === todayStr
                    return (
                      <div key={i} className={`absolute top-0 bottom-0 border-r last:border-r-0 ${isTodayCol ? 'bg-indigo-500/5' : ''}`}
                        style={{ left: `${(i / 7) * 100}%`, width: `${100 / 7}%`, minHeight: Math.max(tasksWithRange.length * 40 + 20, 80) }} />
                    )
                  })}

                  {tasksWithRange.map((task, i) => {
                    const leftPercent = (task.startDay / 7) * 100
                    const widthPercent = ((task.endDay - task.startDay + 1) / 7) * 100
                    const barColor = task.completed
                      ? PRIORITY_BG_MUTED[task.priority] || 'bg-gray-500/40'
                      : PRIORITY_BG[task.priority] || 'bg-gray-500'

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, top: i * 40 + 10 }}
                        className={`absolute h-7 ${barColor} rounded-md flex items-center px-2 cursor-grab active:cursor-grabbing group`}
                        title={`${task.title} - ${task.due_date}`}
                      >
                        <GripVertical className="h-3 w-3 text-white/40 shrink-0 mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className={`text-[10px] font-medium text-white truncate ${task.completed ? 'line-through opacity-60' : ''}`}>
                          {task.title}
                        </span>
                        {task.completed && (
                          <span className="ml-auto text-[10px] text-white/60">✓</span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {tasksWithRange.length > 0 && (
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded bg-red-500" /> Alta
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded bg-yellow-500" /> Media
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded bg-green-500" /> Baja
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded bg-gray-500/40" /> Completada
          </span>
        </div>
      )}
    </div>
  )
}
