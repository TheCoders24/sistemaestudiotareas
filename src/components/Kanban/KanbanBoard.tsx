import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, LayoutDashboard, Calendar, Tag, AlignLeft, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { safeIpc } from '@/lib/ipc'
import { PRIORITY_COLORS } from '@/lib/constants'
import type { KanbanCard } from '@/types'
import KanbanColumn from './KanbanColumn'
import KanbanCardComponent from './KanbanCard'

const COLUMNS = [
  { id: 'pendiente', label: 'Por Hacer', color: 'border-t-gray-500' },
  { id: 'progreso', label: 'En Progreso', color: 'border-t-yellow-500' },
  { id: 'hecho', label: 'Hecho', color: 'border-t-green-500' },
]

function CardDetailModal({ card, open, onClose }: { card: KanbanCard | null; open: boolean; onClose: () => void }) {
  if (!card) return null
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg pr-6">{card.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
              <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[card.priority] || ''}`}>
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
            <span className="text-sm font-medium">{COLUMNS.find(c => c.id === card.column_type)?.label || card.column_type}</span>
          </div>
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { loadCards() }, [])

  async function loadCards() {
    if (!window.electronAPI) return
    const data = await safeIpc<KanbanCard[]>('getKanbanCards')
    setCards(data ?? [])
  }

  function getColumnCards(columnId: string) {
    return cards.filter(c => c.column_type === columnId)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim() || !window.electronAPI) return
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
    if (!window.electronAPI) return
    await safeIpc('deleteKanbanCard', id)
    loadCards()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeCard = cards.find(c => c.id === Number(active.id))
    if (!activeCard) return

    let targetColumn = String(over.id)
    let targetPosition = 0

    const overCard = cards.find(c => c.id === Number(over.id))
    if (overCard) {
      targetColumn = overCard.column_type
    }

    if (window.electronAPI) {
      await safeIpc('moveKanbanCard', Number(active.id), targetColumn, targetPosition)
    }
    loadCards()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-indigo-500" /> Kanban
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organiza tu flujo de trabajo</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cerrar' : 'Nueva Tarjeta'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border rounded-lg p-4 mb-6 space-y-3">
          <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Título" autoFocus required />
          <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descripción" className="min-h-[60px]" />
          <div className="flex gap-3 flex-wrap">
            <Select value={formColumn} onValueChange={setFormColumn}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLUMNS.map(col => <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>)}
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

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id as number)} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(column => (
            <KanbanColumn key={column.id} column={column} cards={getColumnCards(column.id)} onDelete={handleDelete} onView={setViewCard} />
          ))}
        </div>
        <DragOverlay>
          {activeId ? (
            <div className="bg-card border rounded-lg p-3 shadow-xl opacity-90">
              {cards.find(c => c.id === activeId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <CardDetailModal card={viewCard} open={viewCard !== null} onClose={() => setViewCard(null)} />
    </div>
  )
}
