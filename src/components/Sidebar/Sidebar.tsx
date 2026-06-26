import { useState, useEffect } from 'react'
import { StickyNote, Target, Zap } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export default function Sidebar() {
  const [notes, setNotes] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<number, number>>({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (!window.electronAPI) return
    const [notesData, goalsData] = await Promise.all([
      window.electronAPI.getNotes(),
      window.electronAPI.getGoals(),
    ])
    setNotes(notesData.slice(0, 5))
    setGoals(goalsData)
    await computeProgress(goalsData)
  }

  async function computeProgress(goalsData: any[]) {
    if (!window.electronAPI) return
    const today = new Date().toISOString().split('T')[0]
    const [sessions, tasks] = await Promise.all([
      window.electronAPI.getPomodoroSessions?.(today).catch(() => []) || [],
      window.electronAPI.getTasks().catch(() => []) || [],
    ])
    const todaySessions = sessions?.length || 0
    const todayTasks = tasks?.filter((t: any) => {
      if (!t.completed) return false
      return (t.updated_at || '').split('T')[0] === today
    }).length || 0

    const p: Record<number, number> = {}
    for (const goal of goalsData) {
      let current = 0
      if (goal.metric === 'pomodoros') current = todaySessions
      else if (goal.metric === 'tareas') current = todayTasks
      else if (goal.metric === 'estudio') current = todaySessions
      p[goal.id] = Math.min(current, goal.target)
    }
    setProgress(p)
  }

  return (
    <div className="space-y-5">
      {/* Streak mini */}
      <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
        <div className="flex items-center gap-2 text-orange-500">
          <Zap className="h-5 w-5" />
          <span className="text-sm font-semibold">Racha activa</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Completa un pomodoro para mantener tu racha</p>
      </div>

      <Separator />

      {/* Notas rápidas */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <StickyNote className="h-3 w-3" /> Notas Rápidas
        </h3>
        <div className="space-y-1">
          {notes.length === 0 && <p className="text-xs text-muted-foreground">Sin notas aún</p>}
          {notes.map(note => (
            <div key={note.id} className="text-xs p-2 rounded bg-accent/50 truncate cursor-pointer hover:bg-accent">
              {note.title}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Metas */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Target className="h-3 w-3" /> Metas Hoy
        </h3>
        <div className="space-y-2">
          {goals.length === 0 && <p className="text-xs text-muted-foreground">Sin metas aún</p>}
          {goals.map(goal => {
            const val = progress[goal.id] || 0
            const pct = (val / goal.target) * 100
            return (
              <div key={goal.id} className="text-xs">
                <div className="flex justify-between mb-0.5">
                  <span className="truncate">{goal.title}</span>
                  <Badge variant="outline" className="text-[10px] ml-1">{val}/{goal.target}</Badge>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
