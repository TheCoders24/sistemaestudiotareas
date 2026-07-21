import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { BarChart3, Timer, CheckSquare, TrendingUp, Zap, Activity, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSkeleton, StatsCardSkeleton } from '@/components/ui/loading-skeleton'

const CUSTOM_TOOLTIP = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))',
    fontSize: '12px',
  },
}

export default function Statistics() {
  const [period, setPeriod] = useState('week')
  const [stats, setStats] = useState<any>(null)
  const [xpHistory, setXpHistory] = useState<Array<{ date: string; xp: number }>>([])
  const [habitStats, setHabitStats] = useState<any[]>([])

  async function loadStats() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getStats(period)
    setStats(data)
  }

  useEffect(() => { loadStats() }, [period])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getXpHistory(30).then(setXpHistory)
      window.electronAPI.getHabitStats().then(setHabitStats)
    }
  }, [])

  const pomodoroChartData = stats ? (stats.dailyPomodoros || []).map((d: any) => ({
    date: d.date.slice(5),
    pomodoros: d.count,
  })) : []

  const days = period === 'week' ? 7 : 30
  const xpChartData = useMemo(() => {
    const data = xpHistory.slice(-days)
    const max = Math.max(...data.map(d => d.xp), 1)
    return data.map(d => ({ ...d, fill: d.xp / max }))
  }, [xpHistory, days])

  const habitChartData = useMemo(() => {
    return habitStats.map((h: any) => ({
      name: h.name,
      completions: h.thisMonth,
      color: h.color,
    }))
  }, [habitStats])

  const completionRate = stats && stats.tasksTotal.count > 0
    ? Math.round((stats.tasksCompleted.count / stats.tasksTotal.count) * 100)
    : 0

  return (
    <div className="max-w-5xl mx-auto">
      {!stats ? (
        <div className="py-8">
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatsCardSkeleton /><StatsCardSkeleton /><StatsCardSkeleton /><StatsCardSkeleton />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton /><CardSkeleton />
          </div>
        </div>
      ) : (
        <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" /> Estadísticas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Seguimiento detallado de tu productividad</p>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="week">7 días</TabsTrigger>
            <TabsTrigger value="month">30 días</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Timer className="h-4 w-4 text-red-500" /> Pomodoros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{stats.pomodoroCount.count}</p>
            <p className="text-xs text-muted-foreground">{Math.round(stats.pomodoroCount.total / 60)} min en foco</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-500" /> Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{stats.tasksCompleted.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-indigo-500">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.tasksCompleted.count}/{stats.tasksTotal.count} tareas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" /> XP ganados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-500">
              {xpHistory.slice(-days).reduce((sum, d) => sum + d.xp, 0)}
            </p>
            <p className="text-xs text-muted-foreground">en {days} días</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4 text-red-500" /> Pomodoros por día
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pomodoroChartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sin datos aún</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pomodoroChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip {...CUSTOM_TOOLTIP} />
                  <Bar dataKey="pomodoros" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" /> XP ganados por día
            </CardTitle>
          </CardHeader>
          <CardContent>
            {xpChartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sin datos aún</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={xpChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip {...CUSTOM_TOOLTIP} />
                  <defs>
                    <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="xp" stroke="#f59e0b" fill="url(#xpGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {habitChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" /> Hábitos (30 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={habitChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                  <Tooltip {...CUSTOM_TOOLTIP} />
                  <Bar dataKey="completions" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {pomodoroChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" /> Distribución por día de semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={(() => {
                  const dayMap: Record<string, number> = {}
                  for (const d of pomodoroChartData) {
                    const dayName = new Date(d.date + 'T12:00:00').toLocaleDateString('es', { weekday: 'long' })
                    dayMap[dayName] = (dayMap[dayName] || 0) + d.pomodoros
                  }
                  const order = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
                  return order.map(name => ({ name: name.slice(0, 3), pomodoros: dayMap[name] || 0 }))
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip {...CUSTOM_TOOLTIP} />
                  <Bar dataKey="pomodoros" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
        </>
      )}
    </div>
  )
}