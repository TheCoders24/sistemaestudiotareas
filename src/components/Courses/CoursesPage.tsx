import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Trash2, Pencil, ChevronRight, BookMarked, Brain,
  School, GraduationCap, Palette, X, Check, ArrowLeft
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
import { useTranslate } from '@/lib/translate'
import type { Course, StudyTopic, FlashcardDeck } from '@/types'

const COURSE_ICONS = ['book', 'school', 'graduation-cap', 'brain', 'book-marked', 'flask', 'atom', 'calculator', 'music', 'pencil']
const COURSE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']

const ICON_MAP: Record<string, React.ReactNode> = {
  book: <BookOpen className="h-5 w-5" />,
  school: <School className="h-5 w-5" />,
  'graduation-cap': <GraduationCap className="h-5 w-5" />,
  brain: <Brain className="h-5 w-5" />,
  'book-marked': <BookMarked className="h-5 w-5" />,
}

function getIcon(icon: string) {
  return ICON_MAP[icon] || <BookOpen className="h-5 w-5" />
}

export default function CoursesPage() {
  const t = useTranslate()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#6366f1')
  const [formIcon, setFormIcon] = useState('book')
  const [formTerm, setFormTerm] = useState('')
  const [formCredits, setFormCredits] = useState('')
  const [formGrade, setFormGrade] = useState('')
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [decks, setDecks] = useState<FlashcardDeck[]>([])

  useEffect(() => { loadCourses() }, [])

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData(selectedCourse.id)
    }
  }, [selectedCourse])

  async function loadCourses() {
    const data = await window.electronAPI?.courses.list()
    if (data) setCourses(data)
  }

  async function loadCourseData(courseId: number) {
    if (!window.electronAPI) return
    const [topicsData, decksData] = await Promise.all([
      window.electronAPI.study.topics.list(),
      window.electronAPI.flashcards.decks.list(),
    ])
    if (topicsData) setTopics(topicsData.filter((t: any) => t.course_id === courseId))
    if (decksData) setDecks(decksData.filter((d: any) => d.course_id === courseId))
  }

  function resetForm() {
    setFormName('')
    setFormColor('#6366f1')
    setFormIcon('book')
    setFormTerm('')
    setFormCredits('')
    setFormGrade('')
  }

  async function handleCreate() {
    if (!formName.trim() || !window.electronAPI) return
    const course = await window.electronAPI.courses.create({
      name: formName,
      color: formColor,
      icon: formIcon,
      term: formTerm || null,
      credits: formCredits ? Number(formCredits) : null,
      target_grade: formGrade ? Number(formGrade) : null,
      workspace_id: 1,
    })
    if (course) {
      loadCourses()
      setShowCreateDialog(false)
      resetForm()
      toast({ title: 'Curso creado', description: `"${formName}" agregado.` })
    }
  }

  async function handleEdit() {
    if (!selectedCourse || !formName.trim() || !window.electronAPI) return
    await window.electronAPI.courses.update(selectedCourse.id, {
      name: formName,
      color: formColor,
      icon: formIcon,
      term: formTerm || null,
      credits: formCredits ? Number(formCredits) : null,
      target_grade: formGrade ? Number(formGrade) : null,
    })
    loadCourses()
    setShowEditDialog(false)
    toast({ title: 'Curso actualizado' })
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.courses.delete(id)
    if (selectedCourse?.id === id) setSelectedCourse(null)
    setDeleteConfirm(null)
    loadCourses()
    toast({ title: 'Curso archivado' })
  }

  function openEdit(course: Course) {
    setSelectedCourse(course)
    setFormName(course.name)
    setFormColor(course.color)
    setFormIcon(course.icon)
    setFormTerm(course.term || '')
    setFormCredits(course.credits?.toString() || '')
    setFormGrade(course.target_grade?.toString() || '')
    setShowEditDialog(true)
  }

  const renderCourseList = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-500" /> Cursos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestioná tus cursos y materias</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(o) => { setShowCreateDialog(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo curso</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo curso</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Anatomía I, Álgebra Lineal..." autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Cuatrimestre</label>
                  <Input value={formTerm} onChange={(e) => setFormTerm(e.target.value)} placeholder="Ej: 2026-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Créditos</label>
                  <Input value={formCredits} onChange={(e) => setFormCredits(e.target.value)} type="number" min="1" placeholder="Ej: 6" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nota objetivo</label>
                <Input value={formGrade} onChange={(e) => setFormGrade(e.target.value)} type="number" min="0" max="100" placeholder="Ej: 85" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
                <div className="flex gap-1.5 flex-wrap">
                  {COURSE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFormColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${formColor === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Icono</label>
                <div className="flex gap-2 flex-wrap">
                  {COURSE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setFormIcon(icon)}
                      className={`p-2 rounded-lg transition-all ${formIcon === icon ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground bg-accent' : 'hover:bg-accent'}`}
                    >
                      {getIcon(icon)}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">Crear curso</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="Sin cursos" description="Creá tu primer curso para organizar temas y flashcards por materia" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer hover:border-indigo-500/50 transition-all hover:shadow-md"
              onClick={() => setSelectedCourse(course)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: course.color + '20', color: course.color }}
                  >
                    {getIcon(course.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{course.name}</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {course.term && <Badge variant="outline" className="text-[10px]">{course.term}</Badge>}
                      {course.credits && <Badge variant="outline" className="text-[10px]">{course.credits} créditos</Badge>}
                      {course.target_grade != null && (
                        <Badge variant="outline" className="text-[10px]" style={{ color: course.target_grade >= 70 ? '#22c55e' : '#f97316' }}>
                          Objetivo: {course.target_grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderCourseDetail = () => {
    if (!selectedCourse) return null
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCourse(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: selectedCourse.color + '20', color: selectedCourse.color }}
          >
            {getIcon(selectedCourse.icon)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{selectedCourse.name}</h1>
            <p className="text-xs text-muted-foreground">
              {selectedCourse.term && `${selectedCourse.term} · `}
              {selectedCourse.credits && `${selectedCourse.credits} créditos`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => openEdit(selectedCourse)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(selectedCourse.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {selectedCourse.target_grade != null && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Nota objetivo</span>
                <span className="text-sm font-bold" style={{ color: selectedCourse.target_grade >= 70 ? '#22c55e' : '#f97316' }}>
                  {selectedCourse.target_grade}/100
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${selectedCourse.target_grade}%`, backgroundColor: selectedCourse.target_grade >= 70 ? '#22c55e' : '#f97316' }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Topics section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookMarked className="h-4 w-4 text-indigo-500" />
                <h3 className="font-semibold text-sm">Temas de estudio</h3>
                <Badge variant="secondary" className="ml-auto text-[10px]">{topics.length}</Badge>
              </div>
              {topics.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin temas asignados</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {topics.map((topic) => (
                    <div key={topic.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{topic.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flashcards section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-indigo-500" />
                <h3 className="font-semibold text-sm">Flashcards</h3>
                <Badge variant="secondary" className="ml-auto text-[10px]">{decks.length}</Badge>
              </div>
              {decks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin mazos asignados</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {decks.map((deck) => (
                    <div key={deck.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs">
                      <Brain className="h-3 w-3 text-muted-foreground" />
                      <span>{deck.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCourse ? 'detail' : 'list'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {selectedCourse ? renderCourseDetail() : renderCourseList()}
        </motion.div>
      </AnimatePresence>

      {/* Edit dialog */}
      <Dialog open={showEditDialog} onOpenChange={(o) => { setShowEditDialog(o); if (!o) { resetForm(); setSelectedCourse(null) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar curso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cuatrimestre</label>
                <Input value={formTerm} onChange={(e) => setFormTerm(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Créditos</label>
                <Input value={formCredits} onChange={(e) => setFormCredits(e.target.value)} type="number" min="1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nota objetivo</label>
              <Input value={formGrade} onChange={(e) => setFormGrade(e.target.value)} type="number" min="0" max="100" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
              <div className="flex gap-1.5 flex-wrap">
                {COURSE_COLORS.map((c) => (
                  <button key={c} onClick={() => setFormColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${formColor === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Icono</label>
              <div className="flex gap-2 flex-wrap">
                {COURSE_ICONS.map((icon) => (
                  <button key={icon} onClick={() => setFormIcon(icon)}
                    className={`p-2 rounded-lg transition-all ${formIcon === icon ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground bg-accent' : 'hover:bg-accent'}`}>
                    {getIcon(icon)}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleEdit} className="w-full">Guardar cambios</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(o) => { if (!o) setDeleteConfirm(null) }}
        title="Archivar curso"
        description="El curso se archivará. Los temas y flashcards asociados no se eliminarán."
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </>
  )
}
