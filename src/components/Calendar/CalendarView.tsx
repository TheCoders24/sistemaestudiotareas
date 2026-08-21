import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, List, CheckCircle, Flame, BookOpen, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/loading-skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslate } from '@/lib/translate'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DAYS_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

interface DayDetail {
  date: string
  tasks: any[]
  habits: any[]
  logs: any[]
  pomodoros: any[]
}

export default function CalendarView() {
  const [date, setDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
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
      window.electronAPI.tasks.list(),
      window.electronAPI.dailyLogs.list(),
      window.electronAPI.habits.logs.listAll(),
      window.electronAPI.pomodoro.sessions.list()
    ]).then(([tasksRes, logsRes, habitsRes, pomsRes]) => {
      setTasks(tasksRes)
      setDailyLogs(logsRes)
      setHabitLogs(habitsRes || [])
      setPomodoros(pomsRes || [])
      setLoading(false)
    })
  }, [])

  function fmt(d: number, m?: number, y?: number) {
    const mm = String((m ?? month) + 1).padStart(2, '0')
    const yy = y ?? year
    const dd = String(d).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  function getDayData(dateStr: string) {
    const dayTasks = tasks.filter((t: any) => t.due_date === dateStr && !t.deleted)
    const dayLogs = dailyLogs.filter((l: any) => l.date === dateStr)
    const dayHabits = habitLogs.filter((h: any) => h.date === dateStr)
    const dayPoms = pomodoros.filter((p: any) => p.started_at && p.started_at.startsWith(dateStr))
    return { tasks: dayTasks, logs: dayLogs, habits: dayHabits, pomodoros: dayPoms,
      count: dayTasks.length + dayLogs.length + dayHabits.length + dayPoms.length,
      hasTasks: dayTasks.length > 0, hasHabits: dayHabits.length > 0, hasLog: dayLogs.length > 0, hasPoms: dayPoms.length > 0 }
  }

  function handleDayClick(dateStr: string) {
    const data = getDayData(dateStr)
    setSelectedDay({ date: dateStr, ...data })
  }

  function navigate(delta: number) {
    if (viewMode === 'month') setDate(new Date(year, month + delta))
    else setDate(new Date(year, month, date.getDate() + delta * 7))
  }

  function goToday() { setDate(new Date()); setSelectedDay(null) }

  const todayStr = fmt(new Date().getDate(), new Date().getMonth(), new Date().getFullYear())

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) monthDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) monthDays.push(i)

  const weekStart = new Date(year, month, date.getDate() - date.getDay())
  const weekDays: Date[] = []
  for (let i = 0; i < 7; i++) weekDays.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i))

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-indigo-500" />
          {t('calendar') || 'Calendario'}
        </h1>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <TabsList className="h-8">
              <TabsTrigger value="month" className="text-xs">Mes</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs">Hoy</Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {viewMode === 'month'
              ? `${MONTHS[month]} ${year}`
              : `${fmt(weekDays[0].getDate(), weekDays[0].getMonth(), weekDays[0].getFullYear())} - ${fmt(weekDays[6].getDate(), weekDays[6].getMonth(), weekDays[6].getFullYear())}`
            }
          </span>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {loading ? <CardSkeleton /> : viewMode === 'month' ? (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((d, i) => {
                if (d === null) return <div key={`e-${i}`} />
                const ds = fmt(d)
                const data = getDayData(ds)
                const isToday = ds === todayStr
                const isSelected = selectedDay?.date === ds
                return (
                  <div key={d} onClick={() => handleDayClick(ds)}
                    className={`min-h-[70px] rounded-lg p-1.5 border text-xs cursor-pointer transition-colors ${
                      isSelected ? 'border-indigo-500 bg-indigo-500/20 ring-2 ring-indigo-500/30' :
                      isToday ? 'border-indigo-500 bg-indigo-500/10' : 'border-border bg-accent/30 hover:bg-accent/60'
                    }`}>
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
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, i) => (
                <div key={i} className="text-center">
                  <div className="text-xs font-medium text-muted-foreground">{DAYS[i]}</div>
                  <div className={`text-lg font-bold ${fmt(day.getDate(), day.getMonth(), day.getFullYear()) === todayStr ? 'text-indigo-500' : ''}`}>
                    {day.getDate()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{MONTHS[day.getMonth()].slice(0, 3)}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, i) => {
                const ds = fmt(day.getDate(), day.getMonth(), day.getFullYear())
                const data = getDayData(ds)
                const isToday = ds === todayStr
                const isSelected = selectedDay?.date === ds
                return (
                  <div key={i} onClick={() => handleDayClick(ds)}
                    className={`min-h-[120px] rounded-lg p-2 border cursor-pointer transition-colors ${
                      isSelected ? 'border-indigo-500 bg-indigo-500/20 ring-2 ring-indigo-500/30' :
                      isToday ? 'border-indigo-500 bg-indigo-500/10' : 'border-border bg-accent/30 hover:bg-accent/60'
                    }`}>
                    {data.tasks.length > 0 && (
                      <div className="space-y-1">
                        {data.tasks.slice(0, 3).map((t: any) => (
                          <div key={t.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${t.completed ? 'bg-green-500/20 text-green-400 line-through' : 'bg-blue-500/20 text-blue-400'}`}>
                            {t.title}
                          </div>
                        ))}
                        {data.tasks.length > 3 && <div className="text-[10px] text-muted-foreground">+{data.tasks.length - 3} más</div>}
                      </div>
                    )}
                    {data.tasks.length === 0 && data.count > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {data.hasHabits && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-green-500" />}
                        {data.hasLog && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-orange-500" />}
                        {data.hasPoms && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-purple-500" />}
                      </div>
                    )}
                    {data.count === 0 && <div className="text-[10px] text-muted-foreground italic mt-1">Sin actividad</div>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-blue-500" /> Tareas</span>
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-green-500" /> Hábitos</span>
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-orange-500" /> Diario</span>
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-purple-500" /> Pomodoros</span>
      </div>

      {selectedDay && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Detalles — {selectedDay.date} ({DAYS_FULL[new Date(selectedDay.date).getDay()]})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>Cerrar</Button>
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
                  <p className="text-sm">{selectedDay.pomodoros.length} sesión(es) — {selectedDay.pomodoros.reduce((acc: number, p: any) => acc + (p.duration || 0), 0)} min total</p>
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
