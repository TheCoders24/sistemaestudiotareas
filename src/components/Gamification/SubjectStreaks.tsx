import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame, Calendar, TrendingUp, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Project, PomodoroSession } from '@/types'

interface ProjectStreakInfo {
  project: Project
  currentStreak: number
  bestStreak: number
  heatmap: { date: string; minutes: number }[]
}

function calculateStreaks(sessions: PomodoroSession[], projectId: number): { current: number; best: number; heatmap: { date: string; minutes: number }[] } {
  const projectSessions = sessions.filter(s => s.project_id === projectId)

  const dayMap: Record<string, number> = {}
  projectSessions.forEach(s => {
    const date = s.started_at.split('T')[0]
    const duration = s.duration || 25
    dayMap[date] = (dayMap[date] || 0) + duration
  })

  const today = new Date()
  const heatmap: { date: string; minutes: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    heatmap.push({ date: ds, minutes: dayMap[ds] || 0 })
  }

  const sortedDates = Object.keys(dayMap).sort()

  let best = 0
  let current = 0
  let tempStreak = 0

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const prev = new Date(sortedDates[i - 1])
      const curr = new Date(sortedDates[i])
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      if (diff === 1) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    }
    if (tempStreak > best) best = tempStreak
  }

  const todayStr = today.toISOString().split('T')[0]
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dayMap[todayStr]) {
    current = 1
    for (let i = sortedDates.length - 1; i >= 1; i--) {
      const prev = new Date(sortedDates[i - 1])
      const curr = new Date(sortedDates[i])
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      if (diff === 1 && sortedDates[i] <= todayStr) {
        current++
      } else if (sortedDates[i] > todayStr) {
        continue
      } else {
        break
      }
    }
  } else if (dayMap[yesterdayStr]) {
    current = 1
    for (let i = sortedDates.length - 1; i >= 1; i--) {
      if (sortedDates[i] === yesterdayStr) {
        let streak = 1
        for (let j = i; j >= 1; j--) {
          const prev = new Date(sortedDates[j - 1])
          const curr = new Date(sortedDates[j])
          const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
          if (diff === 1) streak++
          else break
        }
        current = streak
        break
      }
    }
  } else {
    current = 0
  }

  return { current, best, heatmap }
}

function getHeatColor(minutes: number): string {
  if (minutes === 0) return 'hsl(var(--muted))'
  if (minutes <= 15) return 'rgb(139, 92, 246, 0.2)'
  if (minutes <= 30) return 'rgb(139, 92, 246, 0.4)'
  if (minutes <= 60) return 'rgb(139, 92, 246, 0.6)'
  return 'rgb(139, 92, 246, 0.85)'
}

export default function SubjectStreaks() {
  const [projects, setProjects] = useState<Project[]>([])
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.electronAPI) {
      setLoading(false)
      return
    }
    Promise.all([
      window.electronAPI.getProjects(),
      window.electronAPI.getPomodoroSessions(),
    ]).then(([p, s]) => {
      setProjects(p.filter(pr => !pr.deleted))
      setSessions(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const streakData: ProjectStreakInfo[] = projects.map(project => {
    const { current, best, heatmap } = calculateStreaks(sessions, project.id)
    return { project, currentStreak: current, bestStreak: best, heatmap }
  })

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4">
                <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="flex gap-0.5">{Array(30).fill(0).map((_, j) => <div key={j} className="w-2.5 h-2.5 rounded-sm bg-muted" />)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            Rachas por Materia
          </h1>
        </motion.div>
        <EmptyState
          icon={BookOpen}
          title="Sin proyectos"
          description="Creá proyectos para ver rachas por materia"
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          Rachas por Materia
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Seguí tu consistencia por proyecto</p>
      </motion.div>

      <div className="space-y-3">
        {streakData.map((info, i) => (
          <motion.div
            key={info.project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.project.color || '#6366f1' }} />
                    <span className="text-sm font-semibold">{info.project.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-bold">{info.currentStreak}</span>
                      <span className="text-[10px] text-muted-foreground">actual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-xs font-bold">{info.bestStreak}</span>
                      <span className="text-[10px] text-muted-foreground">mejor</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-[3px] flex-wrap">
                  {info.heatmap.map((cell, ci) => (
                    <motion.div
                      key={cell.date}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + ci * 0.005 }}
                      className="w-2.5 h-2.5 rounded-sm cursor-default transition-colors"
                      style={{ backgroundColor: getHeatColor(cell.minutes) }}
                      title={`${cell.date}: ${cell.minutes} min`}
                    />
                  ))}
                </div>

                {info.heatmap.some(c => c.minutes > 0) && (
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--muted))' }} /> Sin estudio
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgb(139, 92, 246, 0.2)' }} /> &lt;15 min
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgb(139, 92, 246, 0.4)' }} /> 15-30 min
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgb(139, 92, 246, 0.6)' }} /> 30-60 min
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgb(139, 92, 246, 0.85)' }} /> 60+ min
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
