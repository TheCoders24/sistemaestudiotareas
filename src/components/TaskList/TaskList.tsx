import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Plus, Trash2, Calendar, Bell, ChevronDown, ChevronRight, GripVertical, ListChecks, FolderKanban, Repeat, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton } from '@/components/ui/loading-skeleton'
import { useUndoStore } from '@/stores/undoStore'
import { InfoBox } from '@/components/ui/info-box'
import { useTranslate } from '@/lib/translate'

interface Subtask {
  id: number; task_id: number; title: string; completed: number; position: number
}

interface Task {
  id: number; title: string; description: string; completed: number
  priority: string; due_date: string | null; reminder: string | null
  tags?: string
  project_id: number | null; repeat: string | null; position: number
  created_at: string; subtasks?: Subtask[]
}

interface Project { id: number; name: string; color: string }

const REPEAT_OPTIONS = [
  { value: '', label: 'No repetir' },
  { value: 'daily', label: 'Cada día' },
  { value: 'weekly', label: 'Cada semana' },
  { value: 'monthly', label: 'Cada mes' },
  { value: 'weekdays', label: 'Días de semana' },
]

export default function TaskList() {
  const t = useTranslate()
  const { pushAction } = useUndoStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('media')
  const [newDueDate, setNewDueDate] = useState('')
  const [newReminder, setNewReminder] = useState('')
  const [newProjectId, setNewProjectId] = useState<string>('')
  const [newRepeat, setNewRepeat] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [tagInput, setTagInput] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set())
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [editingSubtask, setEditingSubtask] = useState<{ taskId: number; title: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'position' | 'priority' | 'due_date' | 'title'>('position')

  useEffect(() => { loadTasks(); loadProjects() }, [])
  useEffect(() => {
    const handler = () => setShowForm(true)
    window.addEventListener('open-task-form', handler)
    return () => window.removeEventListener('open-task-form', handler)
  }, [])

  const taskCounts = useMemo(() => {
    let pending = 0, done = 0
    for (const t of tasks) { if (t.completed) done++; else pending++ }
    return { total: tasks.length, pending, done }
  }, [tasks])

  async function loadTasks() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getTasksWithSubtasks?.() || []
    setTasks(data)
    setLoading(false)
  }

  async function loadProjects() {
    if (!window.electronAPI) return
    setProjects(await window.electronAPI.getProjects())
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !window.electronAPI) return
    try {
      await window.electronAPI.createTask({
        title: newTitle, description: newDesc, priority: newPriority,
        due_date: newDueDate || null, reminder: newReminder || null,
        project_id: newProjectId ? Number(newProjectId) : null,
        repeat: newRepeat || null, tags: newTags.join(',') || null,
      } as any)
      setNewTitle(''); setNewDesc(''); setNewDueDate(''); setNewReminder(''); setNewProjectId(''); setNewRepeat('')
      setNewTags([]); setTagInput('')
      setShowForm(false)
      loadTasks()
      toast({ title: 'Tarea creada', description: `"${newTitle}" agregada.` })
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la tarea', variant: 'destructive' })
    }
  }

  async function handleToggle(id: number) {
    if (!window.electronAPI) return
    try {
      const task = tasks.find(t => t.id === id)
      await window.electronAPI.toggleTask(id)
      if (task?.repeat && task.completed) {
        await window.electronAPI.createTask({
          title: task.title, description: task.description, priority: task.priority,
          project_id: task.project_id, repeat: task.repeat, tags: task.tags,
        } as any)
        toast({ title: 'Tarea recurrente renovada' })
      }
      loadTasks()
      if (task) {
        pushAction({
          label: `"${task.title}" ${task.completed ? 'descompletada' : 'completada'}`,
          onUndo: async () => {
            if (window.electronAPI) {
              await window.electronAPI.toggleTask(id)
              loadTasks()
            }
          },
        })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar la tarea', variant: 'destructive' })
    }
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    const task = tasks.find(t => t.id === id)
    if (window.__confirmDelete) {
      window.__confirmDelete('task', id, task?.title || '')
    } else {
      await window.electronAPI.softDeleteItem('task', id)
      loadTasks()
      if (task) {
        pushAction({
          label: `"${task.title}" eliminada`,
          onUndo: async () => {
            if (window.electronAPI) {
              await window.electronAPI.restoreItem('task', id)
              loadTasks()
            }
          },
        })
      }
    }
  }

  async function handleAddSubtask(taskId: number) {
    if (!editingSubtask || !editingSubtask.title.trim() || !window.electronAPI) return
    await window.electronAPI.createSubtask({ task_id: taskId, title: editingSubtask.title } as any)
    setEditingSubtask(null)
    loadTasks()
  }

  async function handleToggleSubtask(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.toggleSubtask(id)
    loadTasks()
  }

  async function handleDeleteSubtask(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.deleteSubtask(id)
    loadTasks()
  }

  function handleAddTag() {
    const t = tagInput.trim()
    if (t && !newTags.includes(t)) {
      setNewTags([...newTags, t])
    }
    setTagInput('')
  }

  function handleRemoveNewTag(tag: string) {
    setNewTags(newTags.filter(t => t !== tag))
  }

  async function handleRemoveTagFromTask(taskId: number, tag: string) {
    if (!window.electronAPI) return
    await window.electronAPI.removeTagFromTask(taskId, tag)
    loadTasks()
  }

  const handleDragStart = useCallback((id: number) => setDragId(id), [])
  const handleDragOver = useCallback((e: React.DragEvent, id: number) => {
    e.preventDefault(); setDragOverId(id)
  }, [])
  const handleDrop = useCallback(async () => {
    if (dragId === null || dragOverId === null || dragId === dragOverId) {
      setDragId(null); setDragOverId(null); return
    }
    const copy = [...tasks]
    const dragIdx = copy.findIndex(t => t.id === dragId)
    const overIdx = copy.findIndex(t => t.id === dragOverId)
    const [item] = copy.splice(dragIdx, 1)
    copy.splice(overIdx, 0, item)
    setTasks(copy)
    setDragId(null); setDragOverId(null)
    if (window.electronAPI) {
      await window.electronAPI.reorderTasks(copy.map(t => t.id))
    }
  }, [dragId, dragOverId, tasks])

  const toggleExpand = (id: number) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const t of tasks) {
      if (t.tags) {
        t.tags.split(',').map(s => s.trim()).filter(Boolean).forEach(tag => set.add(tag))
      }
    }
    return Array.from(set).sort()
  }, [tasks])

  const filtered = useMemo(() => {
    let result = tasks
    if (filter === 'pending') result = result.filter(t => !t.completed)
    else if (filter === 'done') result = result.filter(t => t.completed)
    if (projectFilter !== 'all') result = result.filter(t => t.project_id === Number(projectFilter))
    if (tagFilter !== 'all') result = result.filter(t => t.tags && t.tags.split(',').map(s => s.trim()).includes(tagFilter))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)))
    }
    if (sortBy === 'priority') {
      const order = { alta: 0, media: 1, baja: 2 }
      result = [...result].sort((a, b) => (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1))
    } else if (sortBy === 'due_date') {
      result = [...result].sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
    } else if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    }
    return result
  }, [tasks, filter, projectFilter, tagFilter, searchQuery, sortBy])

  const priorityColor: Record<string, string> = {
    baja: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    alta: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const getProject = (id: number | null) => projects.find(p => p.id === id)

  return (
    <TooltipProvider>
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-indigo-500" /> {t('tasks.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Arrastrá para reordenar</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cerrar' : 'Nueva Tarea'}
        </Button>
      </div>

      <InfoBox title={t('tasks.title')} storageKey="tutorial_tasks" className="mb-4">
        <p>Gestiona tus tareas diarias con prioridades, fechas límite, subtareas y etiquetas.
          Puedes repetir tareas (diario, semanal, etc.), filtrar por proyecto y arrastrar para reordenar.
          Las tareas vencidas aparecen en rojo, las de hoy en amarillo.
        </p>
      </InfoBox>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="mb-6 space-y-3 overflow-hidden"
          >
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título de la tarea" autoFocus required />
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descripción (opcional)" className="min-h-[60px]" />
                <div className="flex gap-3 flex-wrap">
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja prioridad</SelectItem>
                      <SelectItem value="media">Media prioridad</SelectItem>
                      <SelectItem value="alta">Alta prioridad</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-[140px]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Input type="datetime-local" value={newReminder} onChange={e => setNewReminder(e.target.value)} className="w-[180px]" />
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Select value={newProjectId} onValueChange={setNewProjectId}>
                    <SelectTrigger className="w-[160px]"><FolderKanban className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Sin proyecto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin proyecto</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newRepeat} onValueChange={setNewRepeat}>
                    <SelectTrigger className="w-[160px]"><Repeat className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="No repetir" /></SelectTrigger>
                    <SelectContent>
                      {REPEAT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex gap-2">
                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }}}
                      placeholder="Agregar etiqueta" className="flex-1" />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>+</Button>
                  </div>
                  {newTags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {newTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                          {tag}
                          <button type="button" onClick={() => handleRemoveNewTag(tag)} className="hover:text-destructive">&times;</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full">✓ Crear Tarea</Button>
              </CardContent>
            </Card>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Tabs value={filter} onValueChange={v => setFilter(v)}>
          <TabsList>
            <TabsTrigger value="all">Todas ({taskCounts.total})</TabsTrigger>
            <TabsTrigger value="pending">Pendientes ({taskCounts.pending})</TabsTrigger>
            <TabsTrigger value="done">Completadas ({taskCounts.done})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar tareas..."
          className="h-9 w-[160px] text-xs"
        />
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="position">Manual</SelectItem>
            <SelectItem value="priority">Prioridad</SelectItem>
            <SelectItem value="due_date">Fecha límite</SelectItem>
            <SelectItem value="title">Nombre</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><FolderKanban className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Todas las etiquetas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las etiquetas</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        {loading ? (
          <ListSkeleton rows={4} />
        ) : (
          <>
        {filtered.length === 0 && (
          <EmptyState icon={CheckSquare} title="No hay tareas" description="Creá tu primera tarea para empezar." actionLabel="Nueva tarea" onAction={() => setShowForm(true)} />
        )}
        <AnimatePresence>
          {filtered.map((task) => {
            const project = getProject(task.project_id)
            const subtasks = task.subtasks || []
            const subtasksDone = subtasks.filter(s => s.completed).length
            const isExpanded = expandedTasks.has(task.id)
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                layout
                draggable
                onDragStart={() => handleDragStart(task.id)}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDrop={handleDrop}
                onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                className={`${dragOverId === task.id ? 'border-t-2 border-indigo-500' : ''}`}
              >
                <Card className={`group ${task.completed ? 'opacity-60' : ''}`}>
                  <CardContent className="py-2.5 px-3">
                    <div className="flex items-start gap-2">
                      <div className="flex items-center gap-1 pt-0.5">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab active:cursor-grabbing hover:text-muted-foreground/60 shrink-0" />
                        <Checkbox checked={!!task.completed} onCheckedChange={() => handleToggle(task.id)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </span>
                          <Badge variant="outline" className={`text-[10px] ${priorityColor[task.priority] || ''}`}>
                            {task.priority}
                          </Badge>
                          {project && (
                            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                              {project.name}
                            </Badge>
                          )}
                          {task.repeat && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <RotateCcw className="h-3 w-3 text-blue-400" />
                              </TooltipTrigger>
                              <TooltipContent side="top"><span>Repite: {task.repeat}</span></TooltipContent>
                            </Tooltip>
                          )}
                          {task.tags && task.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                              {tag}
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveTagFromTask(task.id, tag) }}
                                className="hover:text-destructive">&times;</button>
                            </Badge>
                          ))}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                          {task.due_date && <span>📅 {task.due_date}</span>}
                          {task.reminder && <span>⏰ {new Date(task.reminder).toLocaleString()}</span>}
                          {subtasks.length > 0 && (
                            <span className="text-muted-foreground/60">{subtasksDone}/{subtasks.length} sub</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {subtasks.length > 0 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleExpand(task.id)}>
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => setEditingSubtask({ taskId: task.id, title: '' })}>
                          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDelete(task.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && subtasks.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-9 mt-2 space-y-1 overflow-hidden"
                        >
                          {subtasks.map((sub) => (
                            <div key={sub.id} className="flex items-center gap-2 py-0.5 group/sub">
                              <Checkbox
                                checked={!!sub.completed}
                                onCheckedChange={() => handleToggleSubtask(sub.id)}
                                className="h-3.5 w-3.5"
                              />
                              <span className={`text-xs flex-1 ${sub.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {sub.title}
                              </span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/sub:opacity-100"
                                onClick={() => handleDeleteSubtask(sub.id)}>
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
          </>
        )}
      </div>

      <Dialog open={editingSubtask !== null} onOpenChange={() => setEditingSubtask(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> Agregar subtarea</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (editingSubtask) handleAddSubtask(editingSubtask.taskId) }} className="flex gap-2">
            <Input
              value={editingSubtask?.title || ''}
              onChange={e => setEditingSubtask(prev => prev ? { ...prev, title: e.target.value } : null)}
              placeholder="Nombre de la subtarea"
              autoFocus
            />
            <Button type="submit">Agregar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}