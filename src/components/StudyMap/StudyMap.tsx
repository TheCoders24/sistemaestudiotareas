import { useState, useEffect, useMemo, useRef } from 'react'
import { BookOpen, Plus, Trash2, ChevronRight, ChevronDown, Search, Link, ArrowUp, ArrowDown, CheckCircle2, RefreshCw, Clock, ChevronsDown, ChevronsUpDown, Paperclip, ExternalLink, LayoutTemplate, Sparkles, Loader, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { useTranslate } from '@/lib/translate'
import type { StudyFile } from '@/types'
import TemplateLibrary from '@/components/Templates/TemplateLibrary'

const LEVELS = [
  { value: 0, label: 'Sin iniciar', color: '#6b7280', bg: '#6b728015' },
  { value: 1, label: 'Diaria', color: '#6366f1', bg: '#6366f115' },
  { value: 2, label: '1er Repaso', color: '#f59e0b', bg: '#f59e0b15' },
  { value: 3, label: '2do Repaso', color: '#10b981', bg: '#10b98115' },
]

const LEVEL_LABELS: Record<number, string> = {
  0: 'Aún no estudiado',
  1: 'Estudio inicial del tema',
  2: 'Primer repaso completado',
  3: 'Segundo repaso completado — dominio del tema',
}

const COURSE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']

interface Topic {
  id: number
  parent_id: number | null
  name: string
  description: string
  resource_url: string
  order_position: number
  study_level?: number
  study_level_updated_at?: string
  course_id?: number | null
}

export default function StudyMap() {
  const t = useTranslate()
  const [topics, setTopics] = useState<Topic[]>([])
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formParent, setFormParent] = useState('')
  const [stats, setStats] = useState<{ levels: { study_level: number, count: number }[], total: number } | null>(null)
  const [showTutorial, setShowTutorial] = useState(true)
  const [search, setSearch] = useState('')
  const [expandingId, setExpandingId] = useState<number | null>(null)
  const [editingResource, setEditingResource] = useState<number | null>(null)
  const [resourceInput, setResourceInput] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [formCourse, setFormCourse] = useState('')
  const [topicFiles, setTopicFiles] = useState<Record<number, StudyFile[]>>({})
  const [filesPanelTopic, setFilesPanelTopic] = useState<number | null>(null)
  const [uploadingTopic, setUploadingTopic] = useState<number | null>(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [generatingFlashcards, setGeneratingFlashcards] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'all' | 'byCourse'>('all')
  const [showCourseDialog, setShowCourseDialog] = useState(false)
  const [courseFormName, setCourseFormName] = useState('')
  const [courseFormColor, setCourseFormColor] = useState('#6366f1')
  const [courseFormTerm, setCourseFormTerm] = useState('')
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({})

  useEffect(() => { loadTopics() }, [])

  async function loadCourses() {
    if (!window.electronAPI) return
    const c = await window.electronAPI.courses.list(); if (c) setCourses(c)
  }

  async function loadTopics() {
    if (!window.electronAPI) { setTopics([]); return }
    const data = await window.electronAPI.study.topics.list()
    setTopics(data ?? [])
    const exp: Record<number, boolean> = {}
    ;(data ?? []).forEach((t: Topic) => { exp[t.id] = true })
    setExpanded(exp)
    await loadCourses()
    loadStats()
  }

  async function loadStats() {
    if (!window.electronAPI) return
    const s = await window.electronAPI.study.stats()
    if (s) setStats(s)
  }

  async function handleSetLevel(topicId: number, level: number) {
    if (!window.electronAPI) return
    setExpandingId(topicId)
    await window.electronAPI.study.topics.setLevel(topicId, level)
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, study_level: level, study_level_updated_at: new Date().toISOString() } : t))
    loadStats()
    setTimeout(() => setExpandingId(null), 600)
    const lvl = LEVELS.find(l => l.value === level)
    if (lvl && lvl.value > 0) toast({ title: lvl.label, description: 'Progreso actualizado' })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    if (window.electronAPI) {
      await window.electronAPI.study.topics.create({
        name: formName, description: formDesc,
        parent_id: formParent ? Number(formParent) : null,
        course_id: formCourse ? Number(formCourse) : null,
        order_position: topics.length,
      })
    }
    setFormName(''); setFormDesc(''); setFormParent(''); setFormCourse('')
    setShowAddForm(false)
    loadTopics()
    toast({ title: 'Tema creado', description: `"${formName}" agregado.` })
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault()
    if (!courseFormName.trim() || !window.electronAPI) return
    await window.electronAPI.courses.create({
      name: courseFormName,
      color: courseFormColor,
      term: courseFormTerm || null,
      workspace_id: 1,
    })
    setCourseFormName(''); setCourseFormColor('#6366f1'); setCourseFormTerm('')
    setShowCourseDialog(false)
    loadCourses()
    toast({ title: 'Materia creada', description: `"${courseFormName}" agregada al mapa.` })
  }

  function getCourse(id: number | null | undefined) {
    if (!id) return undefined
    return courses.find(c => c.id === id)
  }

  async function handleDelete(id: number) {
    if (window.electronAPI) await window.electronAPI.study.topics.delete(id)
    loadTopics()
  }

  async function handleGenerateFlashcards(topicId: number) {
    if (!window.electronAPI) return
    setGeneratingFlashcards(topicId)
    try {
      const cards = await window.electronAPI.ai.generateFlashcards('topic', topicId)
      toast({ title: 'Flashcards generadas', description: `${cards.length} tarjetas generadas con IA. Revisalas y confirmá en la sección Flashcards.` })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setGeneratingFlashcards(null)
    }
  }

  async function handleMove(id: number, direction: 'up' | 'down') {
    if (!window.electronAPI) return
    await window.electronAPI.study.topics.move(id, direction)
    loadTopics()
  }

  async function handleSaveResource(topicId: number) {
    if (!window.electronAPI) return
    await window.electronAPI.study.topics.update(topicId, { resource_url: resourceInput })
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, resource_url: resourceInput } : t))
    setEditingResource(null)
    toast({ title: 'Recurso guardado' })
  }

  async function handleUploadFile(topicId: number) {
    if (!window.electronAPI) return
    setUploadingTopic(topicId)
    try {
      const file = await window.electronAPI.study.files.pickAndUpload(topicId)
      if (file) {
        setTopicFiles(prev => ({ ...prev, [topicId]: [...(prev[topicId] || []), file] }))
        toast({ title: 'Archivo subido', description: file.original_name })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo subir el archivo', variant: 'destructive' })
    }
    setUploadingTopic(null)
  }

  async function handleDeleteFile(topicId: number, fileId: number) {
    if (!window.electronAPI) return
    await window.electronAPI.study.files.delete(fileId)
    setTopicFiles(prev => ({ ...prev, [topicId]: (prev[topicId] || []).filter(f => f.id !== fileId) }))
    toast({ title: 'Archivo eliminado' })
  }

  function handleOpenFile(fileId: number) {
    if (window.electronAPI) window.electronAPI.study.files.open(fileId)
  }

  async function loadTopicFiles(topicId: number) {
    if (!window.electronAPI) return
    const files = await window.electronAPI.study.files.list(topicId)
    setTopicFiles(prev => ({ ...prev, [topicId]: files }))
  }

  function toggleFilesPanel(topicId: number) {
    if (filesPanelTopic === topicId) {
      setFilesPanelTopic(null)
    } else {
      setFilesPanelTopic(topicId)
      if (!topicFiles[topicId]) loadTopicFiles(topicId)
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  function getFileIcon(mime: string) {
    if (mime.startsWith('image/')) return '🖼️'
    if (mime.startsWith('video/')) return '🎬'
    if (mime.includes('pdf')) return '📄'
    if (mime.includes('word') || mime.includes('document')) return '📝'
    if (mime.includes('sheet') || mime.includes('excel')) return '📊'
    if (mime.includes('presentation') || mime.includes('powerpoint')) return '📽️'
    if (mime.includes('text')) return '📃'
    return '📎'
  }

  function getChildren(parentId: number | null) {
    return topics.filter(t => t.parent_id === parentId)
  }

  function getLevel(topic: Topic) { return topic.study_level ?? 0 }

  function countByLevel(level: number) {
    if (stats) { const f = stats.levels.find(l => l.study_level === level); return f ? f.count : 0 }
    return topics.filter(t => getLevel(t) === level).length
  }

  const today = new Date().toISOString().split('T')[0]

  function studiedToday(topic: Topic) {
    if (!topic.study_level_updated_at) return false
    return topic.study_level_updated_at.startsWith(today)
  }

  const filteredTopics = useMemo(() => {
    let result = topics
    if (selectedCourse) {
      const courseId = Number(selectedCourse)
      result = result.filter(t => t.course_id === courseId)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    }
    return result
  }, [topics, search, selectedCourse])

  function expandAll() {
    const all: Record<number, boolean> = {}
    topics.forEach(t => { all[t.id] = true })
    setExpanded(all)
    const allCourses: Record<string, boolean> = {}
    courseGroups.forEach(g => { allCourses[g.course ? String(g.course.id) : 'none'] = true })
    setExpandedCourses(allCourses)
  }

  function collapseAll() {
    setExpanded({})
    setExpandedCourses({})
  }

  const rootTopics = useMemo(() => {
    return filteredTopics.filter(t => t.parent_id === null)
      .sort((a, b) => a.order_position - b.order_position)
  }, [filteredTopics])

  const courseGroups = useMemo(() => {
    const groups: { course: any | null; topics: Topic[] }[] = []
    const byCourse = new Map<number | null, Topic[]>()
    filteredTopics.filter(t => t.parent_id === null).forEach(t => {
      const key = t.course_id ?? null
      if (!byCourse.has(key)) byCourse.set(key, [])
      byCourse.get(key)!.push(t)
    })
    const keys = Array.from(byCourse.keys()).sort((a, b) => {
      if (a === null) return 1
      if (b === null) return -1
      const ca = courses.find(c => c.id === a)
      const cb = courses.find(c => c.id === b)
      return (ca?.name || '').localeCompare(cb?.name || '')
    })
    for (const key of keys) {
      const topics = byCourse.get(key)!.sort((a, b) => a.order_position - b.order_position)
      groups.push({ course: key === null ? null : courses.find(c => c.id === key) || null, topics })
    }
    return groups
  }, [filteredTopics, courses])

  const topicsStudiedToday = useMemo(() => {
    return topics.filter(t => studiedToday(t) && t.study_level && t.study_level > 0)
  }, [topics])

  function renderLevelSelector(topic: Topic) {
    const currentLevel = getLevel(topic)
    const isAnimating = expandingId === topic.id

    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        {LEVELS.map(lvl => {
          const isActive = currentLevel === lvl.value
          const isPast = currentLevel > lvl.value
          return (
            <TooltipProvider key={lvl.value}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleSetLevel(topic.id, lvl.value)}
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold
                      transition-all duration-200
                      ${isAnimating && isActive ? 'scale-125 ring-2 ring-offset-2' : ''}
                      ${isActive
                        ? 'text-white shadow-sm ring-1 ring-offset-1 ring-offset-background'
                        : isPast
                          ? 'text-white opacity-60 hover:opacity-100 hover:scale-110'
                          : 'bg-secondary text-muted-foreground/30 hover:bg-secondary/80 hover:text-muted-foreground/60'
                      }
                    `}
                    style={{
                      backgroundColor: (isActive || isPast) ? lvl.color : undefined,
                    }}
                    aria-label={`${lvl.label}${isActive ? ' (actual)' : ''}`}
                  >
                    {isActive && lvl.value === 1 && <span className="text-xs">D</span>}
                    {isActive && lvl.value === 2 && <span className="text-xs">1R</span>}
                    {isActive && lvl.value === 3 && <span className="text-xs">2R</span>}
                    {isPast && !isActive && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {!isActive && !isPast && lvl.value === 0 && <span className="text-xs opacity-40">○</span>}
                    {!isActive && !isPast && lvl.value === 1 && <span className="text-xs opacity-30">◐</span>}
                    {!isActive && !isPast && lvl.value === 2 && <span className="text-xs opacity-30">◑</span>}
                    {!isActive && !isPast && lvl.value === 3 && <span className="text-xs opacity-30">●</span>}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[200px]">
                  <div className="font-medium" style={{ color: lvl.color }}>{lvl.label}</div>
                  <div className="text-muted-foreground">{LEVEL_LABELS[lvl.value]}</div>
                  {isActive && topic.study_level_updated_at && (
                    <div className="text-muted-foreground mt-0.5">{new Date(topic.study_level_updated_at).toLocaleDateString()}</div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    )
  }

  function renderTopic(topic: Topic, depth = 0) {
    const children = getChildren(topic.id).sort((a, b) => a.order_position - b.order_position)
    const hasChildren = children.length > 0
    const isExpanded = expanded[topic.id]
    const level = getLevel(topic)
    const levelInfo = LEVELS.find(l => l.value === level)!
    const isToday = studiedToday(topic)
    const siblings = getChildren(topic.parent_id).sort((a, b) => a.order_position - b.order_position)
    const idx = siblings.findIndex(t => t.id === topic.id)
    const isFirst = idx === 0
    const isLast = idx === siblings.length - 1

    return (
      <div key={topic.id}>
        <div
          className={`
            flex items-center gap-2 py-2 px-3 rounded-xl transition-colors
            group cursor-pointer relative
            ${isToday ? 'bg-indigo-500/5 border border-indigo-500/10' : 'hover:bg-accent/50'}
          `}
          style={{ marginLeft: depth * 24 }}
          onClick={() => { if (hasChildren) setExpanded({ ...expanded, [topic.id]: !isExpanded }) }}
        >
          {hasChildren ? (
            <span className="text-muted-foreground w-4 flex-shrink-0">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          ) : (
            <span className="text-muted-foreground/30 w-4 flex-shrink-0 text-center text-xs">•</span>
          )}

          <div className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-inset ring-black/5" style={{ backgroundColor: levelInfo.color }} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{topic.name}</span>
              {(() => {
                const course = getCourse(topic.course_id)
                return course ? (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full truncate max-w-[130px] flex-shrink-0"
                    style={{ backgroundColor: course.color + '20', color: course.color }}
                    title={course.name}
                  >
                    {course.name}
                  </span>
                ) : null
              })()}
              {isToday && <Badge variant="outline" className="text-[9px] h-4 px-1 border-indigo-300 text-indigo-600 dark:text-indigo-400 dark:border-indigo-700">Hoy</Badge>}
            </div>
            {topic.description && <span className="text-[11px] text-muted-foreground truncate block">{topic.description}</span>}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {editingResource === topic.id ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Input
                  value={resourceInput}
                  onChange={e => setResourceInput(e.target.value)}
                  placeholder="https://..."
                  className="h-7 w-40 text-xs"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveResource(topic.id); if (e.key === 'Escape') setEditingResource(null) }}
                />
                <button onClick={() => handleSaveResource(topic.id)} className="text-xs text-indigo-500 hover:text-indigo-400 px-1">✓</button>
                <button onClick={() => setEditingResource(null)} className="text-xs text-muted-foreground px-1">✕</button>
              </div>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingResource(topic.id); setResourceInput(topic.resource_url || ''); }}
                      className={`p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 ${topic.resource_url ? 'text-indigo-500 opacity-100' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}
                      aria-label="Agregar recurso"
                    >
                      <Link className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {topic.resource_url ? 'Editar recurso' : 'Agregar enlace a video, PDF, etc.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {!isFirst && (
              <button
                onClick={(e) => { e.stopPropagation(); handleMove(topic.id, 'up') }}
                className="p-1 rounded-md text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Mover arriba"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            )}
            {!isLast && (
              <button
                onClick={(e) => { e.stopPropagation(); handleMove(topic.id, 'down') }}
                className="p-1 rounded-md text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Mover abajo"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            )}

            {renderLevelSelector(topic)}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFilesPanel(topic.id) }}
                    className={`p-1 rounded-md transition-all ${filesPanelTopic === topic.id ? 'text-indigo-500 bg-indigo-500/10' : 'opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-accent'}`}
                    aria-label="Archivos"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Archivos adjuntos</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <button
              onClick={(e) => { e.stopPropagation(); handleGenerateFlashcards(topic.id) }}
              disabled={generatingFlashcards === topic.id}
              className="p-1 rounded-md text-muted-foreground/30 hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-500/10 disabled:opacity-50"
              aria-label="Generar flashcards con IA"
            >
              {generatingFlashcards === topic.id ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(topic.id) }}
              className="p-1 rounded-md text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10"
              aria-label="Eliminar tema"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {filesPanelTopic === topic.id && (
          <div
            className="ml-8 mr-2 mb-2 p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2"
            style={{ marginLeft: (depth * 24) + 32 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Archivos adjuntos</span>
              <button
                onClick={() => handleUploadFile(topic.id)}
                disabled={uploadingTopic === topic.id}
                className="text-xs flex items-center gap-1 text-indigo-500 hover:text-indigo-400 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> {uploadingTopic === topic.id ? 'Subiendo...' : 'Subir archivo'}
              </button>
            </div>
            {(!topicFiles[topic.id] || topicFiles[topic.id].length === 0) ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">Sin archivos adjuntos</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {topicFiles[topic.id].map(file => (
                  <div key={file.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent text-xs group/file">
                    <span className="text-sm">{getFileIcon(file.mime_type)}</span>
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{file.original_name}</span>
                      <span className="text-[10px] text-muted-foreground">{formatFileSize(file.file_size)} · {new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => handleOpenFile(file.id)}
                      className="p-1 rounded text-muted-foreground/50 hover:text-indigo-500 hover:bg-indigo-500/10 opacity-0 group-hover/file:opacity-100 transition-all"
                      aria-label="Abrir archivo"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(topic.id, file.id)}
                      className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/file:opacity-100 transition-all"
                      aria-label="Eliminar archivo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isExpanded && hasChildren && (
          <div className="border-l-2 border-muted ml-6 pl-1">
            {children.map(child => renderTopic(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  function renderProgressHeader() {
    const total = stats?.total ?? topics.length
    const c3 = countByLevel(3)
    const completed = c3
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0

    return (
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progreso del temario</span>
            <span className="text-xs font-bold tabular-nums">{completed}/{total} temas · {pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
          <div className="flex items-center gap-3 mt-2.5 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              Sin iniciar <span className="font-medium tabular-nums">{countByLevel(0)}</span>
            </span>
            {LEVELS.slice(1).map(lvl => (
              <span key={lvl.value} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lvl.color }} />
                {lvl.label} <span className="font-medium tabular-nums">{countByLevel(lvl.value)}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderTutorial() {
    if (!showTutorial) return null
    return (
      <Card className="mb-4 border-indigo-200 dark:border-indigo-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-sm text-foreground">Organizá tus temas de estudio</p>
              <p>
                Agregá todos los temas de tu materia, carrera o curso. Pueden tener subtemas (ej: "Anatomía" → "Sistema Respiratorio").
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {LEVELS.slice(1).map(lvl => (
                  <span key={lvl.value} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lvl.color }} />
                    <span className="font-medium text-foreground">{lvl.label}</span>
                    <span className="text-muted-foreground">— {LEVEL_LABELS[lvl.value]}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <Badge variant="outline" className="text-[10px] gap-1"><Search className="h-3 w-3" /> Buscar temas</Badge>
                <Badge variant="outline" className="text-[10px] gap-1"><ArrowUp className="h-3 w-3" /> Reordenar</Badge>
                <Badge variant="outline" className="text-[10px] gap-1"><Link className="h-3 w-3" /> Agregar video/PDF</Badge>
              </div>
            </div>
            <button onClick={() => setShowTutorial(false)} className="text-muted-foreground/40 hover:text-foreground text-xs p-1 rounded-md hover:bg-accent">✕</button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const studiedTodayCount = topicsStudiedToday.length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-500" /> {t('studymap.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('studymap.desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCourseDialog(true)} size="sm" variant="outline">
            <GraduationCap className="h-4 w-4 mr-1" /> Nueva materia
          </Button>
          <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" variant={showAddForm ? 'secondary' : 'default'}>
            <Plus className="h-4 w-4 mr-1" /> {showAddForm ? 'Cerrar' : 'Añadir Tema'}
          </Button>
        </div>
      </div>

      {renderTutorial()}

      {topics.length > 0 && (
        <>
          {studiedTodayCount > 0 && (
            <Card className="mb-4 border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-500/5 to-transparent">
              <CardContent className="p-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                <span className="text-xs">
                  <strong className="text-indigo-500 dark:text-indigo-400">{studiedTodayCount}</strong> tema{studiedTodayCount !== 1 ? 's' : ''} estudiado{studiedTodayCount !== 1 ? 's' : ''} hoy
                </span>
              </CardContent>
            </Card>
          )}

          {renderProgressHeader()}

          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center rounded-lg border border-border overflow-hidden flex-shrink-0">
              <button
                onClick={() => setViewMode('all')}
                className={`px-2.5 h-8 text-xs font-medium transition-colors ${viewMode === 'all' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Todo
              </button>
              <button
                onClick={() => setViewMode('byCourse')}
                className={`px-2.5 h-8 text-xs font-medium transition-colors ${viewMode === 'byCourse' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Por materias
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar temas..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <button onClick={expandAll} className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors" aria-label="Expandir todo"><ChevronsDown className="h-4 w-4" /></button>
              </TooltipTrigger><TooltipContent className="text-xs">Expandir todo</TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <button onClick={collapseAll} className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors" aria-label="Colapsar todo"><ChevronsUpDown className="h-4 w-4" /></button>
              </TooltipTrigger><TooltipContent className="text-xs">Colapsar todo</TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <button onClick={() => loadTopics()} className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors" aria-label="Recargar"><RefreshCw className="h-4 w-4" /></button>
              </TooltipTrigger><TooltipContent className="text-xs">Recargar</TooltipContent></Tooltip>
            </TooltipProvider>
            {courses.length > 0 && (
              <div className="w-40">
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos los cursos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los cursos</SelectItem>
                    {courses.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </>
      )}

      {showAddForm && (
        <Card className="mb-4">
          <form onSubmit={handleCreate}>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre del tema *</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Anatomía, Álgebra, Bioquímica..." autoFocus required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
                <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descripción breve del contenido" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tema padre (opcional)</label>
                <Select value={formParent} onValueChange={setFormParent}>
                  <SelectTrigger><SelectValue placeholder="Tema raíz (ninguno)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tema raíz (ninguno)</SelectItem>
                    {topics.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {courses.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Curso (opcional)</label>
                  <Select value={formCourse} onValueChange={setFormCourse}>
                    <SelectTrigger><SelectValue placeholder="Sin curso" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin curso</SelectItem>
                      {courses.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" size="sm">✓ Crear Tema</Button>
            </CardContent>
          </form>
        </Card>
      )}

      {topics.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">No hay temas todavía</h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              Agregá los temas de tu materia, carrera o curso. Pueden ser de Medicina, Ingeniería, Programación, o cualquier área de estudio.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddForm(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Crear primer tema</Button>
              <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} size="sm">
                <LayoutTemplate className="h-4 w-4 mr-1" /> Empezar con plantilla
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2">
            {viewMode === 'byCourse' ? (
              <div className="space-y-4">
                {courseGroups.length === 0 && search && (
                  <p className="text-muted-foreground text-center py-8 text-sm">No se encontraron temas con "{search}"</p>
                )}
                {courseGroups.map(group => {
                  const course = group.course
                  const groupKey = course ? String(course.id) : 'none'
                  const isOpen = search.trim() ? true : !!expandedCourses[groupKey]
                  return (
                    <div key={groupKey}>
                      <button
                        type="button"
                        onClick={() => setExpandedCourses(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Colapsar materias de ${course ? course.name : 'Sin materia'}` : `Desplegar materias de ${course ? course.name : 'Sin materia'}`}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/60 transition-colors group/course"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: course ? course.color : '#9ca3af' }}
                        />
                        <span className={`text-xs font-semibold ${course ? '' : 'text-muted-foreground'}`}>
                          {course ? course.name : 'Sin materia'}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">{group.topics.length}</Badge>
                      </button>
                      {isOpen && (
                        <div className="space-y-0.5">
                          {group.topics.map(topic => renderTopic(topic))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-0.5">
                {rootTopics.length === 0 && search && (
                  <p className="text-muted-foreground text-center py-8 text-sm">No se encontraron temas con "{search}"</p>
                )}
                {rootTopics.map(topic => renderTopic(topic))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Dialog open={showCourseDialog} onOpenChange={(o) => { setShowCourseDialog(o); if (!o) { setCourseFormName(''); setCourseFormColor('#6366f1'); setCourseFormTerm('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva materia</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateCourse} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre de la materia *</label>
              <Input value={courseFormName} onChange={e => setCourseFormName(e.target.value)} placeholder="Ej: Anatomía I, Álgebra Lineal..." autoFocus required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Término / cuatrimestre</label>
              <Input value={courseFormTerm} onChange={e => setCourseFormTerm(e.target.value)} placeholder="Ej: 2026-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
              <div className="flex gap-1.5 flex-wrap">
                {COURSE_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCourseFormColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${courseFormColor === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" size="sm">✓ Crear materia</Button>
          </form>
        </DialogContent>
      </Dialog>
      <TemplateLibrary
        type="study_plan"
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onInstantiated={() => { loadTopics(); loadStats() }}
      />
    </div>
  )
}
