import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, List, CheckCircle, Flame, BookOpen, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/loading-skeleton'
import { useTranslate } from '@/lib/translate'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

interface DayDetail {
  date: string
  tasks: any[]
  habits: any[]
  logs: any[]
  pomodoros: any[]
}

export default function CalendarView() {
  const [date, setDate] = useState(new Date())
  const [tasks, setTasks] = useState<any[]>([])
  const [habitLogs, setHabitLogs] = useState<any[]>([])
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [pomodoros, setPomodoros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null)
  const t = useTranslate()

  const year = date.getFullYear()
  const month = date.getMonth()

  useEffect(() => {
    if (!window.electronAPI) return
    Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getDailyLogs(),
      window.electronAPI.getAllHabitLogs?.(),
      window.electronAPI.getPomodoroSessions()
    ]).then(([tasksRes, logsRes, habitsRes, pomsRes]) => {
      setTasks(tasksRes)
      setDailyLogs(logsRes)
      setHabitLogs(habitsRes || [])
      setPomodoros(pomsRes || [])
      setLoading(false)
    })
  }, [])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  function fmt(d: number) {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  function getDayData(d: number) {
    const ds = fmt(d)
    const dayTasks = tasks.filter((t: any) => t.due_date === ds && !t.deleted)
    const dayLogs = dailyLogs.filter((l: any) => l.date === ds)
    const dayHabits = habitLogs.filter((h: any) => h.date === ds)
    const dayPoms = pomodoros.filter((p: any) => p.started_at && p.started_at.startsWith(ds))
    const count = dayTasks.length + dayLogs.length + dayHabits.length + dayPoms.length
    return { count, hasTasks: dayTasks.length > 0, hasHabits: dayHabits.length > 0, hasLog: dayLogs.length > 0, hasPoms: dayPoms.length > 0 }
  }

  function handleDayClick(d: number) {
    const ds = fmt(d)
    setSelectedDay({
      date: ds,
      tasks: tasks.filter((t: any) => t.due_date === ds && !t.deleted),
      habits: habitLogs.filter((h: any) => h.date === ds),
      logs: dailyLogs.filter((l: any) => l.date === ds),
      pomodoros: pomodoros.filter((p: any) => p.started_at && p.started_at.startsWith(ds)),
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-indigo-500" />
          {t('calendar') || 'Calendario'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setDate(new Date(year, month - 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">{MONTHS[month]} {year}</span>
          <Button variant="ghost" size="icon" onClick={() => setDate(new Date(year, month + 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <CardSkeleton />
      ) : (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (d === null) return <div key={`e-${i}`} />
              const data = getDayData(d)
              const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()
              const isSelected = selectedDay?.date === fmt(d)
              return (
                <div
                  key={d}
                  onClick={() => handleDayClick(d)}
                  className={`min-h-[70px] rounded-lg p-1.5 border text-xs cursor-pointer transition-colors ${
                    isSelected ? 'border-indigo-500 bg-indigo-500/20 ring-2 ring-indigo-500/30' :
                    isToday ? 'border-indigo-500 bg-indigo-500/10' : 'border-border bg-accent/30 hover:bg-accent/60'
                  }`}
                >
                  <span className={`font-medium ${isToday || isSelected ? 'text-indigo-500' : ''}`}>{d}</span>
                  {data.count > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {data.hasTasks && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-blue-500" title="Tareas" />}
                      {data.hasHabits && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-green-500" title="Hábitos" />}
                      {data.hasLog && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-orange-500" title="Diario" />}
                      {data.hasPoms && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-purple-500" title="Pomodoros" />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      )}

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-blue-500" /> {t('tasks') || 'Tareas'}</span>
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-green-500" /> {t('habits') || 'Hábitos'}</span>
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-orange-500" /> {t('daily_log') || 'Diario'}</span>
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-purple-500" /> Pomodoros</span>
      </div>

      {selectedDay && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Detalles del {selectedDay.date}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDay.tasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><CheckCircle className="h-4 w-4 text-blue-500" /> Tareas</h4>
                  <ul className="space-y-1">
                    {selectedDay.tasks.map((t: any) => (
                      <li key={t.id} className="text-sm flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${t.completed ? 'bg-green-500' : 'bg-blue-500'}`} />
                        <span className={t.completed ? 'line-through text-muted-foreground' : ''}>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedDay.habits.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><Flame className="h-4 w-4 text-green-500" /> Hábitos completados</h4>
                  <p className="text-sm">{selectedDay.habits.length} hábito(s)</p>
                </div>
              )}
              {selectedDay.logs.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><BookOpen className="h-4 w-4 text-orange-500" /> Diario</h4>
                  {selectedDay.logs.map((l: any) => (
                    <p key={l.id} className="text-sm text-muted-foreground line-clamp-2">{l.content || l.focus || l.blockers || 'Sin contenido'}</p>
                  ))}
                </div>
              )}
              {selectedDay.pomodoros.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><List className="h-4 w-4 text-purple-500" /> Pomodoros</h4>
                  <p className="text-sm">{selectedDay.pomodoros.length} sesión(es) - {selectedDay.pomodoros.reduce((acc: number, p: any) => acc + (p.duration || 0), 0)} min total</p>
                </div>
              )}
              {selectedDay.tasks.length === 0 && selectedDay.habits.length === 0 && selectedDay.logs.length === 0 && selectedDay.pomodoros.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin actividad este día</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}