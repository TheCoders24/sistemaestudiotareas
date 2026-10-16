import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays, Plus, Trash2, Pencil,
  CheckCircle2, Award, BookOpen, GraduationCap, ClipboardList, Timer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/use-toast'

interface Exam {
  id: number
  course_id: number | null
  title: string
  date: string
  weight: number | null
  study_topic_ids: string | null
  completed: number
  grade_obtained: number | null
  created_at: string
}

interface Course {
  id: number
  name: string
  color: string
  credits: number | null
  target_grade: number | null
}

interface GpaEntry {
  course_id: number
  course_name: string
  target_grade: number | null
  course_grade: number | null
  credits: number | null
  exams_count: number
}

interface Deck {
  id: number
  name: string
}

interface Simulation {
  id: number
  deck_id: number
  course_id: number | null
  total_questions: number
  correct_answers: number
  wrong_answers: number
  duration_seconds: number
  created_at: string
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [gpaData, setGpaData] = useState<GpaEntry[]>([])
  const [showGpa, setShowGpa] = useState(false)

  const [decks, setDecks] = useState<Deck[]>([])
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [showSims, setShowSims] = useState(false)
  const [showSimForm, setShowSimForm] = useState(false)
  const [simDeckId, setSimDeckId] = useState('')
  const [simCourseId, setSimCourseId] = useState('')
  const [simTotal, setSimTotal] = useState('')
  const [simCorrect, setSimCorrect] = useState('')
  const [simMinutes, setSimMinutes] = useState('')

  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formWeight, setFormWeight] = useState('')
  const [formCourseId, setFormCourseId] = useState('')
  const [formCompleted, setFormCompleted] = useState(false)
  const [formGrade, setFormGrade] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    await Promise.all([loadExams(), loadCourses(), loadGpa(), loadDecks(), loadSimulations()])
  }

  async function loadExams() {
    const data = await window.electronAPI?.exams.list(selectedCourseId ? Number(selectedCourseId) : undefined)
    if (data) setExams(data)
  }

  async function loadCourses() {
    const data = await window.electronAPI?.courses.list()
    if (data) setCourses(data)
  }

  async function loadGpa() {
    const data = await window.electronAPI?.exams.gpa()
    setGpaData(Array.isArray(data) ? data : data ? [data] : [])
  }

  async function loadDecks() {
    const data = await window.electronAPI?.flashcards.decks.list()
    if (data) setDecks(data as Deck[])
  }

  async function loadSimulations() {
    const data = await window.electronAPI?.examSimulations.list()
    if (data) setSimulations(data as unknown as Simulation[])
  }

  function getDeckName(id: number) {
    return decks.find(d => d.id === id)?.name || 'Mazo eliminado'
  }

  async function handleCreateSimulation() {
    const total = Number(simTotal)
    if (!simDeckId || !total || total <= 0) return
    const correct = Math.min(Number(simCorrect) || 0, total)
    const wrong = Math.max(0, total - correct)
    await window.electronAPI?.examSimulations.create({
      deck_id: Number(simDeckId),
      course_id: simCourseId ? Number(simCourseId) : null,
      total_questions: total,
      correct_answers: correct,
      wrong_answers: wrong,
      duration_seconds: (Number(simMinutes) || 1) * 60,
    })
    setShowSimForm(false)
    setSimDeckId(''); setSimCourseId(''); setSimTotal(''); setSimCorrect(''); setSimMinutes('')
    loadSimulations()
    toast({ title: 'Simulacro registrado' })
  }

  function resetForm() {
    setFormTitle('')
    setFormDate('')
    setFormWeight('')
    setFormCourseId('')
    setFormCompleted(false)
    setFormGrade('')
    setEditingId(null)
  }

  async function handleCreate() {
    if (!formTitle.trim() || !formDate) return
    const payload: any = {
      title: formTitle,
      date: formDate,
      weight: formWeight ? Number(formWeight) : null,
      course_id: formCourseId ? Number(formCourseId) : null,
      completed: formCompleted ? 1 : 0,
      grade_obtained: formGrade ? Number(formGrade) : null,
    }
    await window.electronAPI?.exams.create(payload)
    resetForm()
    setShowCreate(false)
    loadData()
    toast({ title: 'Examen creado', description: `"${formTitle}" agregado.` })
  }

  async function handleUpdate() {
    if (!editingId || !formTitle.trim() || !formDate) return
    await window.electronAPI?.exams.update(editingId, {
      title: formTitle,
      date: formDate,
      weight: formWeight ? Number(formWeight) : null,
      course_id: formCourseId ? Number(formCourseId) : null,
      completed: formCompleted ? 1 : 0,
      grade_obtained: formGrade ? Number(formGrade) : null,
    })
    resetForm()
    setShowCreate(false)
    loadData()
    toast({ title: 'Examen actualizado' })
  }

  async function handleDelete(id: number) {
    await window.electronAPI?.exams.delete(id)
    setDeleteConfirm(null)
    loadData()
    toast({ title: 'Examen eliminado' })
  }

  function openEdit(exam: Exam) {
    setFormTitle(exam.title)
    setFormDate(exam.date)
    setFormWeight(exam.weight?.toString() || '')
    setFormCourseId(exam.course_id?.toString() || '')
    setFormCompleted(!!exam.completed)
    setFormGrade(exam.grade_obtained?.toString() || '')
    setEditingId(exam.id)
    setShowCreate(true)
  }

  function getDaysUntil(date: string) {
    const diff = new Date(date).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  function getCourseName(id: number | null) {
    if (!id) return 'Sin curso'
    return courses.find(c => c.id === id)?.name || 'Curso eliminado'
  }

  function getCourseColor(id: number | null) {
    return courses.find(c => c.id === id)?.color || '#6366f1'
  }

  const filteredExams = selectedCourseId
    ? exams.filter(e => e.course_id === Number(selectedCourseId))
    : exams

  const totalGpa = (() => {
    const filtered = selectedCourseId ? gpaData.filter(g => g.course_id === Number(selectedCourseId)) : gpaData
    let weightedSum = 0
    let totalCredits = 0
    for (const g of filtered) {
      if (g.course_grade != null && g.credits) {
        weightedSum += g.course_grade * g.credits
        totalCredits += g.credits
      }
    }
    return totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : null
  })()

  const averageScore = simulations.length > 0
    ? Math.round(simulations.reduce((acc, s) => acc + (s.total_questions > 0 ? (s.correct_answers / s.total_questions) * 100 : 0), 0) / simulations.length)
    : null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-indigo-500" /> Exámenes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Seguimiento de exámenes, entregas y promedio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSims(!showSims)}>
            <ClipboardList className="h-4 w-4 mr-1" /> Simulacros
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowGpa(!showGpa)}>
            <Award className="h-4 w-4 mr-1" /> {showGpa ? 'Ocultar GPA' : 'Ver GPA'}
          </Button>
          <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo examen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar examen' : 'Nuevo examen'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Título *</label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ej: Parcial de Anatomía" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha *</label>
                  <Input value={formDate} onChange={(e) => setFormDate(e.target.value)} type="date" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Ponderación (%)</label>
                    <Input value={formWeight} onChange={(e) => setFormWeight(e.target.value)} type="number" min="0" max="100" placeholder="Ej: 30" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Curso</label>
                    <Select value={formCourseId} onValueChange={setFormCourseId}>
                      <SelectTrigger><SelectValue placeholder="Sin curso" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin curso</SelectItem>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={formCompleted} onChange={(e) => setFormCompleted(e.target.checked)} className="rounded" />
                    Completado
                  </label>
                  {formCompleted && (
                    <div className="flex-1">
                      <Input value={formGrade} onChange={(e) => setFormGrade(e.target.value)} type="number" min="0" max="100" placeholder="Nota obtenida" />
                    </div>
                  )}
                </div>
                <Button onClick={editingId ? handleUpdate : handleCreate} className="w-full">
                  {editingId ? 'Guardar cambios' : 'Crear examen'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {courses.length > 0 && (
        <div className="mb-4 max-w-[200px]">
          <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); loadExams() }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todos los cursos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los cursos</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showGpa && gpaData.length > 0 && (
        <Card className="mb-4 border-indigo-200 dark:border-indigo-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-sm">Promedio General</h3>
              {totalGpa && (
                <Badge variant="secondary" className="ml-auto text-xs">{totalGpa}</Badge>
              )}
            </div>
            <div className="space-y-2">
              {gpaData.map((g) => (
                <div key={g.course_id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: courses.find(c => c.id === g.course_id)?.color || '#6366f1' }} />
                    <span>{g.course_name}</span>
                    <Badge variant="outline" className="text-[9px]">{g.exams_count} exam{g.exams_count !== 1 ? 'enes' : ''}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.course_grade != null ? (
                      <span className="font-medium tabular-nums" style={{ color: g.course_grade >= (g.target_grade || 70) ? '#22c55e' : '#f97316' }}>
                        {g.course_grade}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {g.target_grade != null && (
                      <span className="text-muted-foreground">/ {g.target_grade}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showSims && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-sm">Simulacros de examen</h3>
              {averageScore != null && (
                <Badge variant="secondary" className="text-xs">Promedio: {averageScore}%</Badge>
              )}
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => setShowSimForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> Registrar
              </Button>
            </div>
            {simulations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Todavía no registraste simulacros.</p>
            ) : (
              <div className="space-y-2">
                {simulations.map(sim => {
                  const score = sim.total_questions > 0 ? Math.round((sim.correct_answers / sim.total_questions) * 100) : 0
                  return (
                    <div key={sim.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-bold tabular-nums ${score >= 70 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{score}%</span>
                        <span className="truncate">{getDeckName(sim.deck_id)}</span>
                        {sim.course_id && <Badge variant="outline" className="text-[9px] shrink-0">{getCourseName(sim.course_id)}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                        <span>{sim.correct_answers}/{sim.total_questions}</span>
                        <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{Math.round(sim.duration_seconds / 60)}m</span>
                        <span>{new Date(sim.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <Dialog open={showSimForm} onOpenChange={setShowSimForm}>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar simulacro</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Mazo de flashcards *</label>
                    <Select value={simDeckId} onValueChange={setSimDeckId}>
                      <SelectTrigger><SelectValue placeholder={decks.length ? 'Elegí un mazo' : 'No hay mazos creados'} /></SelectTrigger>
                      <SelectContent>
                        {decks.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Curso</label>
                    <Select value={simCourseId} onValueChange={setSimCourseId}>
                      <SelectTrigger><SelectValue placeholder="Sin curso" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin curso</SelectItem>
                        {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Preguntas *</label>
                      <Input value={simTotal} onChange={(e) => setSimTotal(e.target.value)} type="number" min="1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Correctas</label>
                      <Input value={simCorrect} onChange={(e) => setSimCorrect(e.target.value)} type="number" min="0" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Minutos</label>
                      <Input value={simMinutes} onChange={(e) => setSimMinutes(e.target.value)} type="number" min="1" />
                    </div>
                  </div>
                  <Button onClick={handleCreateSimulation} className="w-full">Guardar simulacro</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {filteredExams.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sin exámenes" description="Agregá tus exámenes y entregas para hacer seguimiento" />
      ) : (
        <div className="space-y-2">
          {filteredExams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((exam) => {
            const daysUntil = exam.completed ? null : getDaysUntil(exam.date)
            const urgent = daysUntil != null && daysUntil <= 7 && daysUntil >= 0
            const overdue = daysUntil != null && daysUntil < 0
            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`${exam.completed ? 'border-green-500/30 bg-green-500/5' : overdue ? 'border-red-500/30 bg-red-500/5' : urgent ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${exam.completed ? 'bg-green-500/10' : overdue ? 'bg-red-500/10' : 'bg-indigo-500/10'}`}>
                        {exam.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <CalendarDays className="h-5 w-5 text-indigo-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${exam.completed ? 'line-through text-muted-foreground' : ''}`}>{exam.title}</span>
                          {exam.completed && exam.grade_obtained != null && (
                            <Badge variant="secondary" className="text-[10px]">{exam.grade_obtained}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {exam.course_id && (
                            <Badge variant="outline" className="text-[10px] flex items-center gap-1" style={{ borderColor: getCourseColor(exam.course_id) + '40', color: getCourseColor(exam.course_id) }}>
                              <BookOpen className="h-3 w-3" />
                              {getCourseName(exam.course_id)}
                            </Badge>
                          )}
                          {exam.weight != null && (
                            <Badge variant="outline" className="text-[10px]">Peso: {exam.weight}%</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {!exam.completed && daysUntil != null && (
                          <div className={`text-sm font-bold tabular-nums ${overdue ? 'text-red-500' : urgent ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {overdue ? `${Math.abs(daysUntil)}d atrasado` : daysUntil === 0 ? 'Hoy' : `${daysUntil}d`}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(exam.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(exam)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(exam.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(o) => { if (!o) setDeleteConfirm(null) }}
        title="Eliminar examen"
        description="¿Estás seguro de eliminar este examen?"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  )
}
