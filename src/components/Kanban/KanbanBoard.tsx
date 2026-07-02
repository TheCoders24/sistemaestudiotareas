import { useState, useEffect, useMemo, useCallback } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  Plus, LayoutDashboard, Calendar, Tag, AlignLeft, Layers,
  Search, Archive, ArchiveRestore, Settings2, Pencil, X, GripVertical, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'
import { safeIpc } from '@/lib/ipc'
import { PRIORITY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { KanbanCard } from '@/types'
import KanbanColumn from './KanbanColumn'
import KanbanCardComponent from './KanbanCard'

const DEFAULT_COLUMNS = [
  { id: 'pendiente', label: 'Por Hacer', color: 'border-t-gray-500' as const },
  { id: 'progreso', label: 'En Progreso', color: 'border-t-yellow-500' as const },
  { id: 'hecho', label: 'Hecho', color: 'border-t-green-500' as const },
]

const COLUMN_COLORS = [
  { id: 'gray', label: 'Gris', cls: 'border-t-gray-500' },
  { id: 'yellow', label: 'Amarillo', cls: 'border-t-yellow-500' },
  { id: 'green', label: 'Verde', cls: 'border-t-green-500' },
  { id: 'blue', label: 'Azul', cls: 'border-t-blue-500' },
  { id: 'red', label: 'Rojo', cls: 'border-t-red-500' },
  { id: 'indigo', label: 'Índigo', cls: 'border-t-indigo-500' },
  { id: 'purple', label: 'Púrpura', cls: 'border-t-purple-500' },
  { id: 'pink', label: 'Rosa', cls: 'border-t-pink-500' },
  { id: 'orange', label: 'Naranja', cls: 'border-t-orange-500' },
  { id: 'teal', label: 'Teal', cls: 'border-t-teal-500' },
]

interface ColumnConfig {
  id: string
  label: string
  color: string
}

function loadColumns(): ColumnConfig[] {
  try {
    const raw = localStorage.getItem('kanban_columns')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_COLUMNS
}

function saveColumns(cols: ColumnConfig[]) {
  localStorage.setItem('kanban_columns', JSON.stringify(cols))
}

function CardDetailModal({ card, open, onClose, onSave, onArchive }: {
  card: KanbanCard | null
  open: boolean
  onClose: () => void
  onArchive?: (id: number) => void
  onSave?: (id: number, data: Partial<KanbanCard>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPriority, setEditPriority] = useState('media')
  const [editTags, setEditTags] = useState('')
  const [editDueDate, setEditDueDate] = useState('')

  useEffect(() => {
    if (card && open) {
      setEditTitle(card.title)
      setEditDesc(card.description || '')
      setEditPriority(card.priority || 'media')
      setEditTags(card.tags || '')
      setEditDueDate(card.due_date || '')
      setEditing(false)
    }
  }, [card, open])

  if (!card) return null

  function handleSave() {
    if (!editTitle.trim()) return
    onSave?.(card.id, {
      title: editTitle,
      description: editDesc,
      priority: editPriority,
      tags: editTags,
      due_date: editDueDate || null,
    })
    setEditing(false)
  }

  const columns = loadColumns()

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex-row items-center justify-between">
          <div className="flex-1 min-w-0">
            {editing ? (
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-lg font-semibold" />
            ) : (
              <DialogTitle className="text-lg truncate pr-2">{card.title}</DialogTitle>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (editing) handleSave(); else setEditing(true) }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {onArchive && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { onArchive(card.id); onClose() }}>
                <Archive className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-4">
          {editing ? (
            <>
              <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descripción" className="min-h-[60px]" />
              <div className="flex gap-3 flex-wrap">
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-[140px]" />
              </div>
              <Input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="Tags (separados por coma)" />
              <div className="flex gap-2">
                <Button onClick={handleSave}>Guardar</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </>
          ) : (
            <>
              {card.description && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <AlignLeft className="h-3.5 w-3.5" /> Descripción
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{card.description}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[card.priority])}>
                    {card.priority === 'alta' ? 'Alta' : card.priority === 'media' ? 'Media' : 'Baja'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{card.due_date || 'Sin fecha'}</span>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {card.tags ? card.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  )) : <span className="text-sm text-muted-foreground">Sin etiquetas</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Columna:</span>
                <span className="text-sm font-medium">{columns.find(c => c.id === card.column_type)?.label || card.column_type}</span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ColumnManagerDialog({ open, onOpenChange, columns, onSave }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  columns: ColumnConfig[]
  onSave: (cols: ColumnConfig[]) => void
}) {
  const [localCols, setLocalCols] = useState<ColumnConfig[]>([])

  useEffect(() => { if (open) setLocalCols([...columns]) }, [open, columns])

  function updateCol(index: number, field: keyof ColumnConfig, value: string) {
    setLocalCols(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function addColumn() {
    const id = `col-${Date.now()}`
    setLocalCols(prev => [...prev, { id, label: 'Nueva columna', color: 'border-t-gray-500' }])
  }

  function removeColumn(index: number) {
    setLocalCols(prev => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    const valid = localCols.filter(c => c.label.trim())
    if (valid.length < 2) {
      toast({ title: 'Mínimo 2 columnas', variant: 'destructive' })
      return
    }
    onSave(valid)
    onOpenChange(false)
    toast({ title: 'Columnas actualizadas' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Gestionar Columnas</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {localCols.map((col, i) => (
            <div key={col.id} className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input value={col.label} onChange={e => updateCol(i, 'label', e.target.value)} placeholder="Nombre" className="h-8 text-sm" />
                <Select value={col.color} onValueChange={v => updateCol(i, 'color', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMN_COLORS.map(cc => (
                      <SelectItem key={cc.id} value={cc.cls}>{cc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeColumn(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={addColumn}>
            <Plus className="h-4 w-4 mr-1" /> Añadir columna
          </Button>
          <Separator />
          <Button className="w-full" onClick={handleSave}>Guardar cambios</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function KanbanBoard() {
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formColumn, setFormColumn] = useState('pendiente')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPriority, setFormPriority] = useState('media')
  const [formTags, setFormTags] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [viewCard, setViewCard] = useState<KanbanCard | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [showArchived, setShowArchived] = useState(false)
  const [columns, setColumns] = useState<ColumnConfig[]>(loadColumns)
  const [showColManager, setShowColManager] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { loadCards() }, [])
  useEffect(() => { saveColumns(columns) }, [columns])

  async function loadCards() {
    const data = await safeIpc<KanbanCard[]>('getKanbanCards')
    setCards(data ?? [])
  }

  const displayedCards = useMemo(() => {
    return cards.filter(c => {
      if (!showArchived && c.column_type === 'archivado') return false
      if (showArchived && c.column_type !== 'archivado') return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesSearch = c.title.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.tags || '').toLowerCase().includes(q)
        if (!matchesSearch) return false
      }
      if (filterPriority && c.priority !== filterPriority) return false
      return true
    })
  }, [cards, showArchived, searchQuery, filterPriority])

  const filteredColumnCards = useCallback((columnId: string) => {
    return displayedCards.filter(c => c.column_type === columnId)
  }, [displayedCards])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim()) return
    await safeIpc('createKanbanCard', {
      title: formTitle, description: formDesc, column_type: formColumn,
      priority: formPriority, tags: formTags, due_date: formDueDate || null,
    })
    setFormTitle(''); setFormDesc(''); setFormTags(''); setFormDueDate('')
    setShowForm(false)
    loadCards()
    toast({ title: 'Tarjeta creada' })
  }

  async function handleDelete(id: number) {
    await safeIpc('deleteKanbanCard', id)
    loadCards()
    toast({ title: 'Tarjeta eliminada' })
  }

  async function handleArchive(id: number) {
    await safeIpc('moveKanbanCard', id, 'archivado', 0)
    loadCards()
    toast({ title: 'Tarjeta archivada', description: 'Puedes verla en "Archivadas"' })
  }

  async function handleRestore(id: number) {
    await safeIpc('moveKanbanCard', id, 'pendiente', 0)
    loadCards()
    toast({ title: 'Tarjeta restaurada' })
  }

  async function handleSaveCard(id: number, data: Partial<KanbanCard>) {
    await safeIpc('updateKanbanCard', id, data)
    loadCards()
    toast({ title: 'Tarjeta actualizada' })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeCard = cards.find(c => c.id === Number(active.id))
    if (!activeCard) return

    let targetColumn = String(over.id)
    const overCard = cards.find(c => c.id === Number(over.id))
    if (overCard) targetColumn = overCard.column_type

    await safeIpc('moveKanbanCard', Number(active.id), targetColumn, 0)
    loadCards()
  }

  function handleColumnsChange(cols: ColumnConfig[]) {
    setColumns(cols)
    saveColumns(cols)
  }

  const activeCard = activeId ? cards.find(c => c.id === activeId) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-indigo-500" /> Kanban
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organiza tu flujo de trabajo</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showArchived ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
            {showArchived ? 'Activas' : 'Archivadas'}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowColManager(true)} title="Gestionar columnas">
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cerrar' : 'Nueva'}
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border rounded-lg p-4 mb-4 space-y-3">
          <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Título" autoFocus required />
          <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descripción" className="min-h-[60px]" />
          <div className="flex gap-3 flex-wrap">
            <Select value={formColumn} onValueChange={setFormColumn}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={formPriority} onValueChange={setFormPriority}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} className="w-[140px]" />
          </div>
          <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="Tags (separados por coma)" />
          <Button type="submit" className="w-full">✓ Crear Tarjeta</Button>
        </form>
      )}

      {!showArchived && (
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarjetas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showArchived ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Tarjetas archivadas</h2>
          {displayedCards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin tarjetas archivadas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedCards.map(card => (
                <div key={card.id} className="bg-card border rounded-lg p-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{card.title}</p>
                    {card.description && <p className="text-xs text-muted-foreground truncate">{card.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRestore(card.id)} title="Restaurar">
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => setActiveId(e.active.id as number)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={filteredColumnCards(column.id)}
                onDelete={handleDelete}
                onView={setViewCard}
                onArchive={handleArchive}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? (
              <div className="bg-card border rounded-lg p-3 shadow-xl opacity-90 w-[260px]">
                <p className="text-sm font-medium">{activeCard.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <CardDetailModal
        card={viewCard}
        open={viewCard !== null}
        onClose={() => setViewCard(null)}
        onSave={handleSaveCard}
        onArchive={handleArchive}
      />
      <ColumnManagerDialog
        open={showColManager}
        onOpenChange={setShowColManager}
        columns={columns}
        onSave={handleColumnsChange}
      />
    </div>
  )
}
