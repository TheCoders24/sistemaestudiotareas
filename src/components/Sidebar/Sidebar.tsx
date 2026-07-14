import { useState, useEffect } from 'react'
import { StickyNote, Target, Zap, TrendingUp } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export default function Sidebar({ darkMode }: { darkMode: boolean }) {
  const [notes, setNotes] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [goalProgress, setGoalProgress] = useState<Record<number, number>>({})
  const [xp, setXp] = useState<{ level: number; currentXp: number; nextLevelXp: number; total: number } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (!window.electronAPI) return
    const [notesData, goalsData, xpData] = await Promise.all([
      window.electronAPI.getNotes(),
      window.electronAPI.getGoals(),
      window.electronAPI.getXp(),
    ])
    setNotes(notesData.slice(0, 5))
    setGoals(goalsData)
    setXp(xpData)
    const today = new Date().toISOString().split('T')[0]
    const progressMap: Record<number, number> = {}
    for (const goal of goalsData) {
      try {
        const val = await window.electronAPI.getGoalProgress(goal.id, today)
        progressMap[goal.id] = val ?? 0
      } catch { progressMap[goal.id] = 0 }
    }
    setGoalProgress(progressMap)
  }

  return (
    <div className="space-y-5">
      {xp && (
        <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-500">Nivel {xp.level}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{xp.total} XP</span>
          </div>
          <Progress value={(xp.currentXp / xp.nextLevelXp) * 100} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">{xp.currentXp}/{xp.nextLevelXp} XP</p>
        </div>
      )}

      {/* Streak mini */}
      <StreakCard />

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
            const current = goalProgress[goal.id] ?? 0
            const pct = goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0
            return (
              <div key={goal.id} className="text-xs">
                <div className="flex justify-between mb-0.5">
                  <span className="truncate">{goal.title}</span>
                  <Badge variant="outline" className="text-[10px] ml-1">{current}/{goal.target}</Badge>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StreakCard() {
  const [streak, setStreak] = useState<{ current: number; max: number } | null>(null)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getStreak('daily_study').then(s => { if (s) setStreak(s) })
    }
  }, [])

  if (!streak || streak.current === 0) {
    return (
      <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
        <div className="flex items-center gap-2 text-orange-500">
          <Zap className="h-5 w-5" />
          <span className="text-sm font-semibold">Sin racha activa</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Completa un pomodoro para empezar</p>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
      <div className="flex items-center gap-2 text-orange-500">
        <Zap className="h-5 w-5" />
        <span className="text-sm font-semibold">{streak.current} días</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Racha activa (máx: {streak.max})</p>
    </div>
  )
}
