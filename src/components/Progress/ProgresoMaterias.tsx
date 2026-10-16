import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Flame, Layers, GraduationCap, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Course, StudyTopic } from '@/types'

interface CourseProgress {
  course: Course
  topicsTotal: number
  dominio: number | null
  pendingCards: number
  streak: number
  grade: number | null
}

const MAX_LEVEL = 5

export function buildCourseProgress(
  courses: Course[],
  topics: StudyTopic[],
  decks: Array<{ id: number; course_id?: number | null }>,
  dueByDeck: Map<number, number>,
  streaks: Array<{ id: number; current: number }>,
  grades: Map<number, number | null>,
): CourseProgress[] {
  return courses.map(course => {
    const courseTopics = topics.filter(t => t.course_id === course.id)
    const levels = courseTopics.map(t => t.study_level || 0)
    const dominio = levels.length > 0
      ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) / MAX_LEVEL * 100)
      : null
    const pendingCards = decks
      .filter(d => d.course_id === course.id)
      .reduce((acc, d) => acc + (dueByDeck.get(d.id) || 0), 0)
    const streak = streaks.find(s => s.id === course.id)?.current || 0
    return {
      course,
      topicsTotal: courseTopics.length,
      dominio,
      pendingCards,
      streak,
      grade: grades.get(course.id) ?? null,
    }
  })
}

export default function ProgresoMaterias() {
  const [rows, setRows] = useState<CourseProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.electronAPI) {
      setLoading(false)
      return
    }
    const api = window.electronAPI
    Promise.all([
      api.courses.list(),
      api.study.topics.list(),
      api.flashcards.decks.list(),
      api.flashcards.streak.subjects(),
    ]).then(async ([courses, topics, decks, streaks]) => {
      const topicList = topics as StudyTopic[]
      const deckList = decks as Array<{ id: number; course_id?: number | null }>
      const streakList = streaks as Array<{ id: number; current: number }>

      const dueByDeck = new Map<number, number>()
      await Promise.all(deckList.map(async d => {
        try {
          const due = await api.flashcards.cards.getDue(d.id)
          dueByDeck.set(d.id, Array.isArray(due) ? due.length : 0)
        } catch { dueByDeck.set(d.id, 0) }
      }))

      const result: CourseProgress[] = []
      const grades = new Map<number, number | null>()
      for (const course of courses) {
        let grade: number | null = null
        try {
          const gpa = await api.exams.gpa(course.id)
          const entry = Array.isArray(gpa) ? gpa[0] : gpa
          grade = entry?.course_grade ?? null
        } catch {}
        grades.set(course.id, grade)
      }

      result.push(...buildCourseProgress(courses, topicList, deckList, dueByDeck, streakList, grades))
      setRows(result)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6 text-sm text-muted-foreground">Cargando progreso por materia…</div>
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Progreso por Materia
          </h1>
        </motion.div>
        <EmptyState
          icon={BookOpen}
          title="Sin materias"
          description="Creá materias y asigná temas, mazos y exámenes para ver tu progreso combinado"
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-indigo-500" />
          Progreso por Materia
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Dominio, repasos pendientes, racha y promedio en una sola tarjeta</p>
      </motion.div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <motion.div
            key={row.course.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.course.color || '#6366f1' }} />
                  <span className="text-sm font-semibold">{row.course.name}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-accent/50 p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wide">
                      <Layers className="h-3 w-3" /> Dominio
                    </div>
                    <p className="text-lg font-bold mt-0.5">{row.dominio === null ? '—' : `${row.dominio}%`}</p>
                    <p className="text-[10px] text-muted-foreground">{row.topicsTotal} tema(s)</p>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wide">
                      <BookOpen className="h-3 w-3" /> Repasos
                    </div>
                    <p className="text-lg font-bold mt-0.5">{row.pendingCards}</p>
                    <p className="text-[10px] text-muted-foreground">tarjetas pendientes</p>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wide">
                      <Flame className="h-3 w-3" /> Racha
                    </div>
                    <p className="text-lg font-bold mt-0.5">{row.streak}</p>
                    <p className="text-[10px] text-muted-foreground">días</p>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wide">
                      <GraduationCap className="h-3 w-3" /> Promedio
                    </div>
                    <p className="text-lg font-bold mt-0.5">{row.grade === null ? '—' : row.grade}</p>
                    <p className="text-[10px] text-muted-foreground">de exámenes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
