import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BarChart3, Timer, CheckSquare, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { safeIpc } from '@/lib/ipc'
import type { Stats } from '@/types'

export default function Statistics() {
  const [period, setPeriod] = useState('week')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => { loadStats() }, [period])

  async function loadStats() {
    if (!window.electronAPI) return
    const data = await safeIpc<Stats>('getStats', period)
    setStats(data)
  }

  if (!stats) return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-indigo-500" /> Estadísticas
      </h1>
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  )

  const chartData = (stats.dailyPomodoros || []).map(d => ({
    date: d.date.slice(5),
    pomodoros: d.count,
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" /> Estadísticas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Seguimiento de tu productividad</p>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="week">7 días</TabsTrigger>
            <TabsTrigger value="month">30 días</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Timer className="h-4 w-4 text-red-500" /> Pomodoros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{stats.pomodoroCount.count}</p>
            <p className="text-xs text-muted-foreground">{Math.round(stats.pomodoroCount.total / 60)} min total</p>
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
            <p className="text-3xl font-bold text-indigo-500">
              {stats.tasksTotal.count > 0 ? Math.round((stats.tasksCompleted.count / stats.tasksTotal.count) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">{stats.tasksCompleted.count}/{stats.tasksTotal.count} tareas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pomodoros por día</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sin datos aún. ¡Completa tu primer pomodoro!</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="pomodoros" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
