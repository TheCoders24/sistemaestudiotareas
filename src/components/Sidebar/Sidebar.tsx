import { useState, useEffect } from 'react'
import { StickyNote, Target, Zap } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export default function Sidebar({ darkMode }: { darkMode: boolean }) {
  const [notes, setNotes] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (!window.electronAPI) return
    const [notesData, goalsData] = await Promise.all([
      window.electronAPI.getNotes(),
      window.electronAPI.getGoals(),
    ])
    setNotes(notesData.slice(0, 5))
    setGoals(goalsData)
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
          {goals.map(goal => (
            <div key={goal.id} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="truncate">{goal.title}</span>
                <Badge variant="outline" className="text-[10px] ml-1">0/{goal.target}</Badge>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
