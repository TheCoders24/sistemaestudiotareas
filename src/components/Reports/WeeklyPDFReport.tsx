import { useState, useEffect, useMemo } from 'react'
import { FileText, Download, Copy, ChevronLeft, ChevronRight, CheckSquare, Timer, Activity, Brain, Trophy, ListTodo } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'

interface Task {
  id: number
  title: string
  completed: boolean
  due_date: string | null
  priority: string
}

interface PomodoroSession {
  id: number
  started_at: string
  duration: number
  completed: boolean
}

interface Habit {
  id: number
  name: string
  icon: string
  color: string
}

interface HabitLog {
  habit_id: number
  date: string
  completed: boolean
}

function getWeekRange(offset: number) {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay() + 1 + offset * 7)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function formatDate(d: Date) {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WeeklyPDFReport() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [tasks, setTasks] = useState<Task[]>([])
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [flashcardStats, setFlashcardStats] = useState({ total: 0, reviewed: 0, retentionRate: 0 })
  const [achievements, setAchievements] = useState<any[]>([])

  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset])

  useEffect(() => {
    loadData()
  }, [weekOffset])

  async function loadData() {
    if (!window.electronAPI) return
    try {
      const [t, s, h] = await Promise.all([
        window.electronAPI.tasks.list(),
        window.electronAPI.pomodoro.sessions.list(),
        window.electronAPI.habits.list(),
      ])
      if (t) setTasks(t)
      if (s) setSessions(s)
      if (h) setHabits(h)

      if (h && h.length > 0) {
        const allLogs: HabitLog[] = []
        for (const habit of h) {
          const logs = await window.electronAPI.habits.logs.list(habit.id)
          if (logs) allLogs.push(...logs.map((l: any) => ({ habit_id: habit.id, date: l.date, completed: l.completed })))
        }
        setHabitLogs(allLogs)
      }

      if (window.electronAPI.flashcards?.stats) {
        const decks = await window.electronAPI.flashcards.decks.list() || []
        let totalCards = 0
        let totalReviewed = 0
        let totalRetention = 0
        let deckCount = 0
        for (const deck of decks) {
          const stats = await window.electronAPI.flashcards.stats.deck(deck.id)
          if (stats) {
            totalCards += stats.total
            totalReviewed += stats.reviewed
            deckCount++
          }
          const ret = await window.electronAPI.flashcards.stats.retention()
          if (ret) totalRetention += ret.retentionRate
        }
        if (deckCount > 0) {
          setFlashcardStats({ total: totalCards, reviewed: totalReviewed, retentionRate: Math.round(totalRetention / deckCount) })
        }
      }

      if (window.electronAPI.gamification?.achievements) {
        const ach = await window.electronAPI.gamification.achievements.list()
        if (ach) setAchievements(ach)
      }
    } catch {}
  }

  const weekTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.due_date) return false
      const d = new Date(t.due_date)
      return d >= start && d <= end
    })
  }, [tasks, start, end])

  const completedTasks = weekTasks.filter(t => t.completed)
  const completionRate = weekTasks.length > 0 ? Math.round((completedTasks.length / weekTasks.length) * 100) : 0

  const weekSessions = useMemo(() => {
    return sessions.filter(s => {
      const d = new Date(s.started_at)
      return d >= start && d <= end
    })
  }, [sessions, start, end])

  const totalMinutes = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainMins = totalMinutes % 60

  const dailyBreakdown = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    return days.map((name, i) => {
      const dayDate = new Date(start)
      dayDate.setDate(start.getDate() + i)
      const count = weekSessions.filter(s => {
        const d = new Date(s.started_at)
        return d.toDateString() === dayDate.toDateString()
      }).length
      return { name, count }
    })
  }, [weekSessions, start])

  const maxDailyCount = Math.max(...dailyBreakdown.map(d => d.count), 1)

  const habitCompletionRates = useMemo(() => {
    return habits.map(habit => {
      const logs = habitLogs.filter(l => l.habit_id === habit.id)
      const completed = logs.filter(l => l.completed).length
      const rate = 7 > 0 ? Math.round((completed / 7) * 100) : 0
      return { ...habit, rate }
    })
  }, [habits, habitLogs])

  const upcomingTasks = useMemo(() => {
    return tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) > end).slice(0, 10)
  }, [tasks, end])

  function generateHTML() {
    const dayBars = dailyBreakdown.map(d => `
      <div style="text-align:center;flex:1;">
        <div style="height:${Math.max((d.count / maxDailyCount) * 100, 4)}px;background:#6366f1;border-radius:4px 4px 0 0;margin:0 auto;width:24px;"></div>
        <div style="font-size:10px;color:#888;margin-top:4px;">${d.name}</div>
        <div style="font-size:11px;font-weight:600;">${d.count}</div>
      </div>
    `).join('')

    const habitRows = habitCompletionRates.map(h => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
        <span style="font-size:13px;">${h.icon} ${h.name}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:100px;height:6px;background:#eee;border-radius:3px;overflow:hidden;">
            <div style="width:${h.rate}%;height:100%;background:${h.color};border-radius:3px;"></div>
          </div>
          <span style="font-size:12px;font-weight:600;">${h.rate}%</span>
        </div>
      </div>
    `).join('')

    const upcomingRows = upcomingTasks.map(t => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:12px;">${t.title}</span>
        <span style="font-size:11px;color:#888;">${t.due_date ? new Date(t.due_date).toLocaleDateString('es-ES') : '-'}</span>
      </div>
    `).join('')

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe Semanal - EstudioApp</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #6366f1; }
    .header h1 { font-size: 24px; color: #6366f1; }
    .header p { font-size: 12px; color: #888; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 16px; color: #333; margin-bottom: 12px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
    .stats-row { display: flex; gap: 16px; margin-bottom: 16px; }
    .stat-card { flex: 1; background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-card .value { font-size: 28px; font-weight: 700; color: #6366f1; }
    .stat-card .label { font-size: 11px; color: #888; margin-top: 4px; }
    .chart-row { display: flex; align-items: flex-end; gap: 8px; height: 120px; padding: 0 16px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #aaa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Informe Semanal - EstudioApp</h1>
    <p>${formatDate(start)} - ${formatDate(end)}</p>
  </div>

  <div class="section">
    <h2>Resumen</h2>
    <div class="stats-row">
      <div class="stat-card">
        <div class="value">${weekTasks.length}</div>
        <div class="label">Tareas totales</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color:#22c55e;">${completedTasks.length}</div>
        <div class="label">Completadas</div>
      </div>
      <div class="stat-card">
        <div class="value">${completionRate}%</div>
        <div class="label">Tasa de completado</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Tiempo de estudio</h2>
    <div class="stats-row">
      <div class="stat-card">
        <div class="value" style="color:#ef4444;">${weekSessions.length}</div>
        <div class="label">Pomodoros</div>
      </div>
      <div class="stat-card">
        <div class="value">${totalHours}h ${remainMins}m</div>
        <div class="label">Tiempo total</div>
      </div>
    </div>
    <div class="chart-row">${dayBars}</div>
  </div>

  ${habitCompletionRates.length > 0 ? `
  <div class="section">
    <h2>Hábitos</h2>
    ${habitRows}
  </div>` : ''}

  ${flashcardStats.total > 0 ? `
  <div class="section">
    <h2>Flashcards</h2>
    <div class="stats-row">
      <div class="stat-card">
        <div class="value" style="color:#8b5cf6;">${flashcardStats.total}</div>
        <div class="label">Tarjetas totales</div>
      </div>
      <div class="stat-card">
        <div class="value">${flashcardStats.reviewed}</div>
        <div class="label">Repasadas</div>
      </div>
      <div class="stat-card">
        <div class="value">${flashcardStats.retentionRate}%</div>
        <div class="label">Tasa de retención</div>
      </div>
    </div>
  </div>` : ''}

  ${achievements.length > 0 ? `
  <div class="section">
    <h2>Logros desbloqueados</h2>
    ${achievements.slice(0, 10).map((a: any) => `<div style="padding:4px 0;font-size:13px;">🏆 ${a.name || a.title || 'Logro'}</div>`).join('')}
  </div>` : ''}

  ${upcomingTasks.length > 0 ? `
  <div class="section">
    <h2>Próxima semana</h2>
    ${upcomingRows}
  </div>` : ''}

  <div class="footer">
    <p>EstudioApp - Informe generado el ${new Date().toLocaleDateString('es-ES')}</p>
  </div>
</body>
</html>`
  }

  function downloadHTML() {
    const html = generateHTML()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `informe_semanal_${start.toISOString().slice(0, 10)}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'HTML descargado', description: 'Informe semanal exportado correctamente' })
  }

  function copySummary() {
    const summary = `Informe Semanal (${formatDate(start)} - ${formatDate(end)})
Tareas: ${completedTasks.length}/${weekTasks.length} completadas (${completionRate}%)
Pomodoros: ${weekSessions.length} sesiones, ${totalHours}h ${remainMins}m
${habitCompletionRates.length > 0 ? 'Hábitos: ' + habitCompletionRates.map(h => `${h.name} ${h.rate}%`).join(', ') : ''}
${flashcardStats.total > 0 ? `Flashcards: ${flashcardStats.total} tarjetas, ${flashcardStats.retentionRate}% retención` : ''}`
    navigator.clipboard.writeText(summary)
    toast({ title: 'Resumen copiado', description: 'Copiado al portapapeles' })
  }

  const previewHTML = useMemo(() => generateHTML(), [weekTasks, weekSessions, habitCompletionRates, upcomingTasks, flashcardStats, achievements, start, end, dailyBreakdown, maxDailyCount])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-500" /> Informe semanal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Genera un reporte detallado de tu semana</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copySummary} className="gap-1.5">
            <Copy className="h-4 w-4" /> Copiar resumen
          </Button>
          <Button size="sm" onClick={downloadHTML} className="gap-1.5">
            <Download className="h-4 w-4" /> Descargar como HTML
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">{formatDate(start)} - {formatDate(end)}</p>
          <p className="text-xs text-muted-foreground">
            {weekOffset === 0 ? 'Esta semana' : weekOffset === -1 ? 'Semana pasada' : `${Math.abs(weekOffset)} semanas ${weekOffset < 0 ? 'atrás' : 'adelante'}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="p-8 max-h-[600px] overflow-y-auto">
          <div className="text-center mb-6 pb-4" style={{ borderBottom: '2px solid #6366f1' }}>
            <h1 className="text-2xl font-bold" style={{ color: '#6366f1' }}>Informe Semanal - EstudioApp</h1>
            <p className="text-xs mt-1" style={{ color: '#888' }}>{formatDate(start)} - {formatDate(end)}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-base font-semibold mb-3 pb-1" style={{ borderBottom: '1px solid #eee' }}>Resumen</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg" style={{ background: '#f8f9fa' }}>
                <p className="text-2xl font-bold" style={{ color: '#6366f1' }}>{weekTasks.length}</p>
                <p className="text-[10px]" style={{ color: '#888' }}>Tareas totales</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: '#f8f9fa' }}>
                <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{completedTasks.length}</p>
                <p className="text-[10px]" style={{ color: '#888' }}>Completadas</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: '#f8f9fa' }}>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <p className="text-[10px]" style={{ color: '#888' }}>Tasa de completado</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-base font-semibold mb-3 pb-1" style={{ borderBottom: '1px solid #eee' }}>Tiempo de estudio</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg" style={{ background: '#f8f9fa' }}>
                <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{weekSessions.length}</p>
                <p className="text-[10px]" style={{ color: '#888' }}>Pomodoros</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: '#f8f9fa' }}>
                <p className="text-2xl font-bold">{totalHours}h {remainMins}m</p>
                <p className="text-[10px]" style={{ color: '#888' }}>Tiempo total</p>
              </div>
            </div>
            <div className="flex items-end gap-2 h-24 px-2">
              {dailyBreakdown.map(d => (
                <div key={d.name} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t" style={{ height: `${Math.max((d.count / maxDailyCount) * 100, 4)}%`, background: '#6366f1' }} />
                  <span className="text-[10px]" style={{ color: '#888' }}>{d.name}</span>
                  <span className="text-[11px] font-semibold">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {habitCompletionRates.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold mb-3 pb-1" style={{ borderBottom: '1px solid #eee' }}>Hábitos</h2>
              {habitCompletionRates.map(h => (
                <div key={h.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <span className="text-sm">{h.icon} {h.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#eee' }}>
                      <div className="h-full rounded-full" style={{ width: `${h.rate}%`, background: h.color }} />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right">{h.rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {flashcardStats.total > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold mb-3 pb-1" style={{ borderBottom: '1px solid #eee' }}>Flashcards</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg" style={{ background: '#f8f9fa' }}>
                  <p className="text-xl font-bold" style={{ color: '#8b5cf6' }}>{flashcardStats.total}</p>
                  <p className="text-[10px]" style={{ color: '#888' }}>Tarjetas</p>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: '#f8f9fa' }}>
                  <p className="text-xl font-bold">{flashcardStats.reviewed}</p>
                  <p className="text-[10px]" style={{ color: '#888' }}>Repasadas</p>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: '#f8f9fa' }}>
                  <p className="text-xl font-bold">{flashcardStats.retentionRate}%</p>
                  <p className="text-[10px]" style={{ color: '#888' }}>Retención</p>
                </div>
              </div>
            </div>
          )}

          {achievements.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold mb-3 pb-1" style={{ borderBottom: '1px solid #eee' }}>Logros desbloqueados</h2>
              {achievements.slice(0, 10).map((a: any, i: number) => (
                <div key={i} className="py-1 text-sm">🏆 {a.name || a.title || 'Logro'}</div>
              ))}
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold mb-3 pb-1" style={{ borderBottom: '1px solid #eee' }}>Próxima semana</h2>
              {upcomingTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <span className="text-xs">{t.title}</span>
                  <span className="text-[11px]" style={{ color: '#888' }}>
                    {t.due_date ? new Date(t.due_date).toLocaleDateString('es-ES') : '-'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="text-center pt-4 mt-6" style={{ borderTop: '1px solid #eee' }}>
            <p className="text-[10px]" style={{ color: '#aaa' }}>EstudioApp - Informe generado el {new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
