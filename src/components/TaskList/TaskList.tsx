import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Plus, Trash2, Calendar, Bell, ChevronDown, RotateCcw, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { safeIpc } from '@/lib/ipc'
import { TagPicker } from '@/components/ui/tag-picker'
import { TagBadge } from '@/components/ui/tag-badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Subtask, TaskRecurrence, Tag } from '@/types'

interface Task {
  id: number
  title: string
  description: string
  completed: number
  priority: string
  due_date: string | null
  reminder: string | null
  created_at: string
}

const recurrenceOptions = [
  { value: 'none', label: 'No repetir' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekdays', label: 'Días de semana' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
]

const recurrenceLabels: Record<string, string> = {
  daily: 'Diario',
  weekdays: 'Días de semana',
  weekly: 'Semanal',
  monthly: 'Mensual',
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('media')
  const [newDueDate, setNewDueDate] = useState('')
  const [newReminder, setNewReminder] = useState('')
  const [newTagIds, setNewTagIds] = useState<number[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [subtasks, setSubtasks] = useState<Record<number, Subtask[]>>({})
  const [recurrences, setRecurrences] = useState<Record<number, TaskRecurrence | null>>({})
  const [taskTags, setTaskTags] = useState<Record<number, Tag[]>>({})
  const [editingTitle, setEditingTitle] = useState<Record<number, string>>({})
  const [editingDesc, setEditingDesc] = useState<Record<number, string>>({})
  const [editingField, setEditingField] = useState<Record<number, 'title' | 'description' | null>>({})
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<Record<number, string>>({})

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getTasks()
    setTasks(data)

    const subsMap: Record<number, Subtask[]> = {}
    const recMap: Record<number, TaskRecurrence | null> = {}
    const tagsMap: Record<number, Tag[]> = {}

    await Promise.all(data.map(async (task) => {
      const [subs, rec, tags] = await Promise.all([
        safeIpc<Subtask[]>('getSubtasks', task.id),
        safeIpc<TaskRecurrence | undefined>('getTaskRecurrence', task.id),
        safeIpc<Tag[]>('getTaskTags', task.id),
      ])
      if (subs) subsMap[task.id] = subs
      recMap[task.id] = rec ?? null
      if (tags) tagsMap[task.id] = tags
    }))

    setSubtasks(subsMap)
    setRecurrences(recMap)
    setTaskTags(tagsMap)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !window.electronAPI) return
    const created = await window.electronAPI.createTask({
      title: newTitle, description: newDesc, priority: newPriority,
      due_date: newDueDate || null, reminder: newReminder || null,
    } as any) as Task | undefined
    if (created && newTagIds.length > 0) {
      await safeIpc('setTaskTags', created.id, newTagIds)
    }
    setNewTitle(''); setNewDesc(''); setNewDueDate(''); setNewReminder(''); setNewTagIds([])
    setShowForm(false)
    loadTasks()
    toast({ title: 'Tarea creada', description: `"${newTitle}" agregada.` })

    if (newReminder) {
      const remindMs = new Date(newReminder).getTime()
      const delay = remindMs - Date.now()
      if (delay > 0) setTimeout(async () => {
        if (window.electronAPI) {
          await window.electronAPI.showNotification('⏰ Recordatorio', `Tarea: ${newTitle}`)
        }
      }, delay)
    }
  }

  async function handleToggle(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.toggleTask(id)
    loadTasks()
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.deleteTask(id)
    loadTasks()
    toast({ title: 'Tarea eliminada', description: 'La tarea fue eliminada.' })
  }

  async function handleToggleSubtask(taskId: number, subtaskId: number) {
    await safeIpc('toggleSubtask', subtaskId)
    loadSubtasks(taskId)
  }

  async function loadSubtasks(taskId: number) {
    const data = await safeIpc<Subtask[]>('getSubtasks', taskId)
    if (data) setSubtasks(prev => ({ ...prev, [taskId]: data }))
  }

  async function handleCreateSubtask(taskId: number) {
    const title = newSubtaskTitle[taskId]?.trim()
    if (!title) return
    await safeIpc('createSubtask', { task_id: taskId, title } as Partial<Subtask>)
    setNewSubtaskTitle(prev => ({ ...prev, [taskId]: '' }))
    loadSubtasks(taskId)
  }

  async function handleSetRecurrence(taskId: number, frequency: string) {
    if (frequency === 'none') {
      await safeIpc('deleteTaskRecurrence', taskId)
    } else {
      await safeIpc('setTaskRecurrence', taskId, { frequency } as Partial<TaskRecurrence>)
    }
    loadRecurrence(taskId)
  }

  async function loadRecurrence(taskId: number) {
    const data = await safeIpc<TaskRecurrence | undefined>('getTaskRecurrence', taskId)
    setRecurrences(prev => ({ ...prev, [taskId]: data ?? null }))
  }

  async function handleSaveTitle(taskId: number) {
    const title = editingTitle[taskId]?.trim()
    if (!title || !window.electronAPI) return
    await window.electronAPI.updateTask(taskId, { title } as Partial<Task>)
    setEditingField(prev => ({ ...prev, [taskId]: null }))
    loadTasks()
  }

  async function handleSaveDescription(taskId: number) {
    const description = editingDesc[taskId] ?? ''
    if (!window.electronAPI) return
    await window.electronAPI.updateTask(taskId, { description } as Partial<Task>)
    setEditingField(prev => ({ ...prev, [taskId]: null }))
    loadTasks()
  }

  const filtered = tasks.filter(task => {
    if (filter === 'pending') return !task.completed
    if (filter === 'done') return task.completed
    return true
  })

  const priorityColor: Record<string, string> = {
    baja: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    alta: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-indigo-500" /> Tareas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona tus tareas pendientes</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cerrar' : 'Nueva Tarea'}
        </Button>
      </div>

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
                  <TagPicker selectedIds={newTagIds} onChange={setNewTagIds} />
                </div>
                <Button type="submit" className="w-full">✓ Crear Tarea</Button>
              </CardContent>
            </Card>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mb-4">
        <Tabs value={filter} onValueChange={v => setFilter(v)}>
          <TabsList>
            <TabsTrigger value="all">Todas ({tasks.length})</TabsTrigger>
            <TabsTrigger value="pending">Pendientes ({tasks.filter(t => !t.completed).length})</TabsTrigger>
            <TabsTrigger value="done">Completadas ({tasks.filter(t => t.completed).length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <EmptyState
            icon={CheckSquare}
            title={filter === 'done' ? 'Sin tareas completadas' : filter === 'pending' ? 'Sin tareas pendientes' : 'No hay tareas'}
            description="Crea tu primera tarea para empezar a organizarte."
            actionLabel={filter === 'all' ? 'Crear tarea' : undefined}
            onAction={filter === 'all' ? () => setShowForm(true) : undefined}
          />
        )}
        <AnimatePresence>
          {filtered.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              layout
            >
              <Card className={`group ${task.completed ? 'opacity-60' : ''}`}>
                <CardContent className="py-3 flex items-start gap-3">
                  <Checkbox
                    checked={!!task.completed}
                    onCheckedChange={() => handleToggle(task.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editingField[task.id] === 'title' ? (
                        <Input
                          value={editingTitle[task.id] ?? task.title}
                          onChange={e => setEditingTitle(prev => ({ ...prev, [task.id]: e.target.value }))}
                          onBlur={() => handleSaveTitle(task.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveTitle(task.id)
                            if (e.key === 'Escape') setEditingField(prev => ({ ...prev, [task.id]: null }))
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span
                          className={`text-sm font-medium cursor-pointer ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                          onClick={() => {
                            setEditingTitle(prev => ({ ...prev, [task.id]: task.title }))
                            setEditingField(prev => ({ ...prev, [task.id]: 'title' }))
                          }}
                        >
                          {task.title}
                        </span>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${priorityColor[task.priority] || ''}`}>
                        {task.priority}
                      </Badge>
                      {recurrences[task.id] && (
                        <span className="text-xs" title={recurrenceLabels[recurrences[task.id]!.frequency] ?? recurrences[task.id]!.frequency}>
                          🔄
                        </span>
                      )}
                    </div>
                    {editingField[task.id] === 'description' ? (
                      <Textarea
                        value={editingDesc[task.id] ?? task.description}
                        onChange={e => setEditingDesc(prev => ({ ...prev, [task.id]: e.target.value }))}
                        onBlur={() => handleSaveDescription(task.id)}
                        onKeyDown={e => {
                          if (e.key === 'Escape') setEditingField(prev => ({ ...prev, [task.id]: null }))
                        }}
                        className="min-h-[40px] text-xs mt-1"
                        autoFocus
                      />
                    ) : task.description ? (
                      <p
                        className="text-xs text-muted-foreground mt-1 cursor-pointer"
                        onClick={() => {
                          setEditingDesc(prev => ({ ...prev, [task.id]: task.description }))
                          setEditingField(prev => ({ ...prev, [task.id]: 'description' }))
                        }}
                      >
                        {task.description}
                      </p>
                    ) : null}
                    {taskTags[task.id]?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {taskTags[task.id].map(tag => (
                          <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.due_date && <span>📅 {task.due_date}</span>}
                      {task.reminder && <span>⏰ {new Date(task.reminder).toLocaleString()}</span>}
                    </div>
                    {subtasks[task.id]?.length > 0 && (
                      <div className="mt-2 ml-2 space-y-1 border-l-2 border-muted pl-3">
                        {subtasks[task.id].map(sub => (
                          <div key={sub.id} className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={!!sub.completed}
                              onCheckedChange={() => handleToggleSubtask(task.id, sub.id)}
                              className="h-3 w-3"
                            />
                            <span className={sub.completed ? 'line-through text-muted-foreground' : ''}>
                              {sub.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1 mt-1 ml-2">
                      <Input
                        placeholder="Sub-tarea..."
                        value={newSubtaskTitle[task.id] ?? ''}
                        onChange={e => setNewSubtaskTitle(prev => ({ ...prev, [task.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateSubtask(task.id) }}
                        className="h-6 text-xs w-auto flex-1 min-w-[100px]"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCreateSubtask(task.id)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1" align="end">
                        <div className="flex flex-col gap-1">
                          {recurrenceOptions.map(opt => (
                            <Button
                              key={opt.value}
                              variant={recurrences[task.id]?.frequency === opt.value ? 'secondary' : 'ghost'}
                              size="sm"
                              className="justify-start text-xs h-7"
                              onClick={() => handleSetRecurrence(task.id, opt.value)}
                            >
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => setDeleteId(task.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Eliminar tarea"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  )
}
