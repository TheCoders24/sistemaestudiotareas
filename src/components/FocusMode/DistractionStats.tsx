import { useState, useEffect, useMemo } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Clock, Zap, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PomodoroSession {
  id: number
  started_at: string
  duration: number
  completed: boolean
}

export default function DistractionStats() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getPomodoroSessions?.().then((data: PomodoroSession[]) => {
        if (data) setSessions(data)
      }).catch(() => {})
    }
  }, [])

  const thisWeekSessions = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1)
    startOfWeek.setHours(0, 0, 0, 0)
    return sessions.filter(s => new Date(s.started_at) >= startOfWeek)
  }, [sessions])

  const lastWeekSessions = useMemo(() => {
    const now = new Date()
    const startOfLastWeek = new Date(now)
    startOfLastWeek.setDate(now.getDate() - now.getDay() - 6)
    startOfLastWeek.setHours(0, 0, 0, 0)
    const endOfLastWeek = new Date(now)
    endOfLastWeek.setDate(now.getDate() - now.getDay())
    endOfLastWeek.setHours(23, 59, 59, 999)
    return sessions.filter(s => {
      const d = new Date(s.started_at)
      return d >= startOfLastWeek && d <= endOfLastWeek
    })
  }, [sessions])

  const thisWeekCount = thisWeekSessions.length
  const lastWeekCount = lastWeekSessions.length
  const weekChange = lastWeekCount > 0 ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100) : thisWeekCount > 0 ? 100 : 0

  const dailyAvg = useMemo(() => {
    if (sessions.length === 0) return 0
    const days = new Set(sessions.map(s => new Date(s.started_at).toDateString())).size
    return days > 0 ? Math.round((sessions.length / days) * 10) / 10 : 0
  }, [sessions])

  const bestDay = useMemo(() => {
    if (sessions.length === 0) return { name: '-', count: 0 }
    const dayMap: Record<string, number> = {}
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    for (const s of sessions) {
      const d = new Date(s.started_at)
      const name = dayNames[d.getDay()]
      dayMap[name] = (dayMap[name] || 0) + 1
    }
    const sorted = Object.entries(dayMap).sort((a, b) => b[1] - a[1])
    return { name: sorted[0]?.[0] || '-', count: sorted[0]?.[1] || 0 }
  }, [sessions])

  const totalThisWeek = thisWeekSessions.length

  const distractionTimes = useMemo(() => {
    const periods = { morning: 0, afternoon: 0, night: 0 }
    for (const s of sessions) {
      const hour = new Date(s.started_at).getHours()
      if (hour >= 6 && hour < 12) periods.morning++
      else if (hour >= 12 && hour < 19) periods.afternoon++
      else periods.night++
    }
    return periods
  }, [sessions])

  const distractionMax = Math.max(distractionTimes.morning, distractionTimes.afternoon, distractionTimes.night, 1)

  const hourlyProductivity = useMemo(() => {
    const hourMap: Record<number, number> = {}
    for (const s of sessions) {
      const hour = new Date(s.started_at).getHours()
      hourMap[hour] = (hourMap[hour] || 0) + 1
    }
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourMap[i] || 0,
      label: `${i.toString().padStart(2, '0')}:00`
    }))
    return hours
  }, [sessions])

  const hourlyMax = Math.max(...hourlyProductivity.map(h => h.count), 1)

  const pomodorosByDay = useMemo(() => {
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const dayMap: Record<number, number> = {}
    for (const s of sessions) {
      const dayIdx = (new Date(s.started_at).getDay() + 6) % 7
      dayMap[dayIdx] = (dayMap[dayIdx] || 0) + 1
    }
    return dayNames.map((name, i) => ({ name, count: dayMap[i] || 0 }))
  }, [sessions])

  const dayMax = Math.max(...pomodorosByDay.map(d => d.count), 1)

  const completedSessions = sessions.filter(s => s.completed).length
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-indigo-500" /> Patrones de distracción
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Analiza tus hábitos de estudio y productividad</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{dailyAvg}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Promedio diario</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{bestDay.name}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Mejor día ({bestDay.count})</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{bestDay.count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Día más productivo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{totalThisWeek}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total esta semana</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" /> Comparativa semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Esta semana</span>
                <span className="text-sm font-medium">{thisWeekCount} pomodoros</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${lastWeekCount > 0 ? Math.min((thisWeekCount / Math.max(thisWeekCount, lastWeekCount)) * 100, 100) : 100}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Semana pasada</span>
                <span className="text-sm font-medium">{lastWeekCount} pomodoros</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground/30 rounded-full transition-all" style={{ width: `${thisWeekCount > 0 ? Math.min((lastWeekCount / Math.max(thisWeekCount, lastWeekCount)) * 100, 100) : 100}%` }} />
              </div>
            </div>
            <div className="text-center">
              <Badge variant={weekChange >= 0 ? 'success' : 'destructive'} className="gap-1">
                {weekChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {weekChange >= 0 ? '+' : ''}{weekChange}%
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-1">vs semana pasada</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" /> Horas más productivas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos aún</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {hourlyProductivity.filter(h => h.count > 0 || [6, 8, 10, 12, 14, 16, 18, 20].includes(h.hour)).map(h => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className="w-full bg-indigo-500/60 rounded-t transition-all"
                      style={{ height: `${(h.count / hourlyMax) * 100}%`, minHeight: h.count > 0 ? '4px' : '1px' }}
                    />
                    <span className="text-[8px] text-muted-foreground">{h.hour}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" /> Días más productivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos aún</p>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {pomodorosByDay.map(d => (
                  <div key={d.name} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{d.count}</span>
                    <div
                      className="w-full bg-green-500/60 rounded-t transition-all"
                      style={{ height: `${(d.count / dayMax) * 100}%`, minHeight: '4px' }}
                    />
                    <span className="text-[10px] text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" /> Distribución de estudio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Mañana (6-12h)', value: distractionTimes.morning, color: 'bg-yellow-500', max: distractionMax },
                { label: 'Tarde (12-19h)', value: distractionTimes.afternoon, color: 'bg-orange-500', max: distractionMax },
                { label: 'Noche (19-6h)', value: distractionTimes.night, color: 'bg-indigo-500', max: distractionMax },
              ].map(p => (
                <div key={p.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{p.label}</span>
                    <span className="text-xs font-medium">{p.value}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full transition-all`} style={{ width: `${(p.value / p.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" /> Resumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de sesiones</span>
                <span className="text-sm font-medium">{sessions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completadas</span>
                <span className="text-sm font-medium text-green-500">{completedSessions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tiempo total</span>
                <span className="text-sm font-medium">{Math.round(totalMinutes / 60)}h {totalMinutes % 60}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tasa de completado</span>
                <span className="text-sm font-medium">
                  {sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
