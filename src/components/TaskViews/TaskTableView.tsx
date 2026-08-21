import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Trash2, CheckSquare, Filter, Table2, MoreHorizontal, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton } from '@/components/ui/loading-skeleton'

interface Task {
  id: number; title: string; description: string; completed: number
  priority: string; due_date: string | null; tags?: string
  project_id: number | null; created_at: string
}

interface Project { id: number; name: string }

type SortField = 'title' | 'priority' | 'due_date' | 'completed'
type SortDir = 'asc' | 'desc'

const PRIORITY_BADGE: Record<string, string> = {
  alta: 'bg-red-500/20 text-red-400 border-red-500/30',
  media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  baja: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const SPANISH_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default function TaskTableView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [sortField, setSortField] = useState<SortField>('due_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [filterQuery, setFilterQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingCell, setEditingCell] = useState<{ taskId: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTasks(); loadProjects() }, [])

  async function loadTasks() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.tasks.list()
    setTasks(data.filter((task: any) => !task.deleted))
    setLoading(false)
  }

  async function loadProjects() {
    if (!window.electronAPI) return
    try {
      const data = await window.electronAPI.projects.list()
      setProjects(data || [])
    } catch {}
  }

  const priorityOrder: Record<string, number> = { alta: 0, media: 1, baja: 2 }

  const filtered = useMemo(() => {
    let result = [...tasks]
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase()
      result = result.filter(task =>
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q))
      )
    }
    if (priorityFilter !== 'all') {
      result = result.filter(task => task.priority === priorityFilter)
    }
    if (statusFilter === 'pending') {
      result = result.filter(task => !task.completed)
    } else if (statusFilter === 'completed') {
      result = result.filter(task => task.completed)
    }
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break
        case 'priority': cmp = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1); break
        case 'due_date':
          if (!a.due_date && !b.due_date) cmp = 0
          else if (!a.due_date) cmp = 1
          else if (!b.due_date) cmp = -1
          else cmp = a.due_date.localeCompare(b.due_date)
          break
        case 'completed': cmp = (a.completed ? 1 : 0) - (b.completed ? 1 : 0); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [tasks, filterQuery, priorityFilter, statusFilter, sortField, sortDir])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-indigo-500" />
      : <ArrowDown className="h-3 w-3 ml-1 text-indigo-500" />
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)))
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleBulkDelete() {
    if (!window.electronAPI || selectedIds.size === 0) return
    for (const id of selectedIds) {
      await window.electronAPI.trash.softDelete('task', id)
    }
    toast({ title: `${selectedIds.size} tarea(s) eliminada(s)` })
    setSelectedIds(new Set())
    loadTasks()
  }

  async function handleBulkComplete() {
    if (!window.electronAPI || selectedIds.size === 0) return
    for (const id of selectedIds) {
      const task = tasks.find(t => t.id === id)
      if (task && !task.completed) {
        await window.electronAPI.tasks.toggle(id)
      }
    }
    toast({ title: `${selectedIds.size} tarea(s) completada(s)` })
    setSelectedIds(new Set())
    loadTasks()
  }

  async function handleBulkPriority(priority: string) {
    if (!window.electronAPI || selectedIds.size === 0) return
    for (const id of selectedIds) {
      await window.electronAPI.tasks.update(id, { priority })
    }
    toast({ title: `Prioridad cambiada a "${priority}"` })
    setSelectedIds(new Set())
    loadTasks()
  }

  function startEditing(taskId: number, field: string, currentValue: string) {
    setEditingCell({ taskId, field })
    setEditValue(currentValue || '')
  }

  async function saveEdit() {
    if (!editingCell || !window.electronAPI) return
    const field = editingCell.field
    const value = field === 'due_date' ? (editValue || null) : editValue
    await window.electronAPI.tasks.update(editingCell.taskId, { [field]: value })
    setEditingCell(null)
    loadTasks()
  }

  function cancelEdit() {
    setEditingCell(null)
    setEditValue('')
  }

  function formatDueDate(date: string | null): string {
    if (!date) return '—'
    const d = new Date(date + 'T12:00:00')
    return `${d.getDate()} ${SPANISH_MONTHS[d.getMonth()]}`
  }

  function getProjectName(id: number | null): string {
    if (!id) return '—'
    const p = projects.find(pr => pr.id === id)
    return p?.name || '—'
  }

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Table2 className="h-6 w-6 text-indigo-500" />
              Tabla de Tareas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Vista tipo hoja de cálculo con edición inline</p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} seleccionada(s)</span>
              <Button variant="outline" size="sm" onClick={handleBulkComplete}>
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                Completar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    Prioridad
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkPriority('alta')}>Alta</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkPriority('media')}>Media</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkPriority('baja')}>Baja</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Eliminar
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 p-3 border-b flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Buscar tareas..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-accent/30">
                  <th className="w-10 p-2 text-left">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('title')}>
                    <span className="flex items-center">Título <SortIcon field="title" /></span>
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors w-[100px]" onClick={() => handleSort('priority')}>
                    <span className="flex items-center">Prioridad <SortIcon field="priority" /></span>
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors w-[90px]" onClick={() => handleSort('due_date')}>
                    <span className="flex items-center">Fecha <SortIcon field="due_date" /></span>
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground w-[120px]">Etiquetas</th>
                  <th className="p-2 text-left font-medium text-muted-foreground w-[100px]">Proyecto</th>
                  <th className="p-2 text-left font-medium text-muted-foreground w-[60px]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}><ListSkeleton rows={5} /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={Table2} title="Sin resultados" description="No se encontraron tareas con estos filtros." />
                    </td>
                  </tr>
                ) : (
                  filtered.map((task, i) => (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-b hover:bg-accent/40 transition-colors ${task.completed ? 'opacity-50' : ''}`}
                    >
                      <td className="p-2">
                        <Checkbox checked={selectedIds.has(task.id)} onCheckedChange={() => toggleSelect(task.id)} />
                      </td>
                      <td className="p-2">
                        {editingCell?.taskId === task.id && editingCell.field === 'title' ? (
                          <Input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                            autoFocus
                            className="h-6 text-xs"
                          />
                        ) : (
                          <span
                            className={`cursor-pointer hover:text-indigo-400 transition-colors ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                            onClick={() => startEditing(task.id, 'title', task.title)}
                          >
                            {task.title}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className={`text-[10px] ${PRIORITY_BADGE[task.priority] || ''}`}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {editingCell?.taskId === task.id && editingCell.field === 'due_date' ? (
                          <Input
                            type="date"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                            autoFocus
                            className="h-6 text-[10px] w-[120px]"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:text-indigo-400 transition-colors text-muted-foreground"
                            onClick={() => startEditing(task.id, 'due_date', task.due_date || '')}
                          >
                            {formatDueDate(task.due_date)}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 flex-wrap">
                          {task.tags && task.tags.split(',').map(s => s.trim()).filter(Boolean).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {getProjectName(task.project_id)}
                        </span>
                      </td>
                      <td className="p-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEditing(task.id, 'title', task.title)}>
                              Editar título
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              if (window.electronAPI) {
                                await window.electronAPI.tasks.toggle(task.id)
                                loadTasks()
                              }
                            }}>
                              {task.completed ? 'Descompletar' : 'Completar'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              if (window.electronAPI) {
                                await window.electronAPI.trash.softDelete('task', task.id)
                                loadTasks()
                                toast({ title: 'Tarea eliminada' })
                              }
                            }} className="text-destructive">
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-3 border-t text-xs text-muted-foreground">
            <span>{filtered.length} tarea(s)</span>
            {selectedIds.size > 0 && <span>{selectedIds.size} seleccionada(s)</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
