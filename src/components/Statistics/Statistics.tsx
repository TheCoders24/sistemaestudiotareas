import { useState, useEffect, useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts'
import { BarChart3, Timer, CheckSquare, TrendingUp, Zap, Activity, Clock, Download, FileText, PieChart as PieChartIcon, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CardSkeleton, StatsCardSkeleton } from '@/components/ui/loading-skeleton'
import { toast } from '@/components/ui/use-toast'

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
  const reportRef = useRef<HTMLDivElement>(null)

  async function loadStats() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.stats.get(period)
    setStats(data)
  }

  useEffect(() => { loadStats() }, [period])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.gamification.xp.history(30).then(setXpHistory)
      window.electronAPI.habits.stats().then(setHabitStats)
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

  const bestDay = useMemo(() => {
    if (pomodoroChartData.length === 0) return null
    const best = pomodoroChartData.reduce((max: any, d: any) => d.pomodoros > max.pomodoros ? d : max, pomodoroChartData[0])
    return best
  }, [pomodoroChartData])

  const avgDaily = useMemo(() => {
    if (pomodoroChartData.length === 0) return 0
    return Math.round(pomodoroChartData.reduce((s: number, d: any) => s + d.pomodoros, 0) / pomodoroChartData.length * 10) / 10
  }, [pomodoroChartData])

  function exportCSV() {
    const rows: string[] = ['Métrica,Valor']
    rows.push(`Pomodoros totales,${stats?.pomodoroCount?.count || 0}`)
    rows.push(`Minutos de foco,${Math.round((stats?.pomodoroCount?.total || 0) / 60)}`)
    rows.push(`Tareas completadas,${stats?.tasksCompleted?.count || 0}`)
    rows.push(`Tareas totales,${stats?.tasksTotal?.count || 0}`)
    rows.push(`Tasa de completado,${completionRate}%`)
    rows.push(`XP ganados,${xpHistory.slice(-days).reduce((s, d) => s + d.xp, 0)}`)
    rows.push(`Promedio pomodoros/día,${avgDaily}`)
    rows.push('')
    rows.push('Fecha,Pomodoros')
    for (const d of pomodoroChartData) rows.push(`${d.date},${d.pomodoros}`)
    rows.push('')
    rows.push('Fecha,XP')
    for (const d of xpHistory.slice(-days)) rows.push(`${d.date},${d.xp}`)
    if (habitChartData.length > 0) {
      rows.push('')
      rows.push('Hábito,Completados este mes')
      for (const h of habitChartData) rows.push(`${h.name},${h.completions}`)
    }
    const csv = '\uFEFF' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `estadisticas_${period}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast({ title: 'CSV exportado', description: 'Archivo descargado correctamente' })
  }

  async function exportPDF() {
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
      if (!reportRef.current) return
      toast({ title: 'Generando PDF...', description: 'Por favor espera' })
      const canvas = await html2canvas(reportRef.current, { backgroundColor: '#0f172a', scale: 2, useCORS: true })
      const imgW = 210; const imgH = (canvas.height * imgW) / canvas.width
      const pdf = new jsPDF('p', 'mm', 'a4')
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH)
      pdf.save(`estadisticas_${period}_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast({ title: 'PDF exportado', description: 'Reporte descargado correctamente' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar el PDF', variant: 'destructive' })
    }
  }

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="week">7 días</TabsTrigger>
              <TabsTrigger value="month">30 días</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div ref={reportRef}>

      <div className="grid grid-cols-5 gap-4 mb-8">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" /> Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-500">{avgDaily}</p>
            <p className="text-xs text-muted-foreground">pomodoros/día</p>
            {bestDay && <p className="text-[10px] text-muted-foreground">Mejor: {bestDay.date} ({bestDay.pomodoros})</p>}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {pomodoroChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Timer className="h-4 w-4 text-red-500" /> Distribución semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const dayMap: Record<string, number> = {}
                for (const d of pomodoroChartData) {
                  const dayName = new Date(d.date + 'T12:00:00').toLocaleDateString('es', { weekday: 'long' })
                  dayMap[dayName] = (dayMap[dayName] || 0) + d.pomodoros
                }
                const order = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
                const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
                const pieData = order.map((name, i) => ({ name: name.slice(0, 3), value: dayMap[name] || 0, fill: colors[i] })).filter(d => d.value > 0)
                if (pieData.length === 0) return <p className="text-muted-foreground text-center py-8 text-sm">Sin datos</p>
                return (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip {...CUSTOM_TOOLTIP} />
                    </PieChart>
                  </ResponsiveContainer>
                )
              })()}
            </CardContent>
          </Card>
        )}

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

      {stats?.pomodorosByProject?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-purple-500" /> Pomodoros por materia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={stats.pomodorosByProject.map((d: any, i: number) => ({ name: d.name, value: d.count, fill: ['#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b7d4','#f97316'][i % 8] }))}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  </Pie>
                  <Tooltip {...CUSTOM_TOOLTIP} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {stats?.tasksByPriority?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-500" /> Tareas completadas por prioridad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={stats.tasksByPriority.map((d: any) => ({ name: d.priority, value: d.count, fill: d.priority === 'alta' ? '#ef4444' : d.priority === 'media' ? '#f59e0b' : '#22c55e' }))}
                      cx="50%" cy="50%" outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    </Pie>
                    <Tooltip {...CUSTOM_TOOLTIP} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      </div>
        </>
      )}
    </div>
  )
}
