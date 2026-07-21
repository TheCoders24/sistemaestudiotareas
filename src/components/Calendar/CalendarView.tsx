import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/loading-skeleton'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function CalendarView() {
  const [date, setDate] = useState(new Date())
  const [tasks, setTasks] = useState<any[]>([])
  const [habitLogs] = useState<any[]>([])
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const year = date.getFullYear()
  const month = date.getMonth()

  useEffect(() => {
    if (!window.electronAPI) return
    Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getDailyLogs()
    ]).then(([tasks, logs]) => {
      setTasks(tasks)
      setDailyLogs(logs)
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
    const count = dayTasks.length + dayLogs.length + dayHabits.length
    return { count, hasTasks: dayTasks.length > 0, hasLog: dayLogs.length > 0, hasHabits: dayHabits.length > 0 }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-indigo-500" />
          Calendario
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
              return (
                <div
                  key={d}
                  className={`min-h-[70px] rounded-lg p-1.5 border text-xs ${isToday ? 'border-indigo-500 bg-indigo-500/10' : 'border-border bg-accent/30 hover:bg-accent/60'} cursor-pointer transition-colors`}
                >
                  <span className={`font-medium ${isToday ? 'text-indigo-500' : ''}`}>{d}</span>
                  {data.count > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {data.hasTasks && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-blue-500" />}
                      {data.hasHabits && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-green-500" />}
                      {data.hasLog && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-orange-500" />}
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
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-blue-500" /> Tareas</span>
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-green-500" /> Hábitos</span>
        <span className="flex items-center gap-1"><Badge className="h-2 w-2 p-0 rounded-full bg-orange-500" /> Diario</span>
      </div>
    </div>
  )
}
