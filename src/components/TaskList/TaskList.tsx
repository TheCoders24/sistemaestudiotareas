import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Plus, Trash2, Calendar, Bell, ChevronDown } from 'lucide-react'
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

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('media')
  const [newDueDate, setNewDueDate] = useState('')
  const [newReminder, setNewReminder] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getTasks()
    setTasks(data)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !window.electronAPI) return
    await window.electronAPI.createTask({
      title: newTitle, description: newDesc, priority: newPriority,
      due_date: newDueDate || null, reminder: newReminder || null,
    } as any)
    setNewTitle(''); setNewDesc(''); setNewDueDate(''); setNewReminder('')
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
                      <span className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${priorityColor[task.priority] || ''}`}>
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.due_date && <span>📅 {task.due_date}</span>}
                      {task.reminder && <span>⏰ {new Date(task.reminder).toLocaleString()}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => setDeleteId(task.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
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
