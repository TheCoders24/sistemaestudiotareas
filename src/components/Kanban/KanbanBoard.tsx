import { useState, useEffect, useMemo } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Plus, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { InfoBox } from '@/components/ui/info-box'
import { useTranslate } from '@/lib/translate'
import { useUndoStore } from '@/stores/undoStore'
import KanbanColumn from './KanbanColumn'

const COLUMNS = [
  { id: 'pendiente', label: 'Por Hacer', color: 'border-t-gray-500' },
  { id: 'progreso', label: 'En Progreso', color: 'border-t-yellow-500' },
  { id: 'hecho', label: 'Hecho', color: 'border-t-green-500' },
]

export default function KanbanBoard() {
  const t = useTranslate()
  const [cards, setCards] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formColumn, setFormColumn] = useState('pendiente')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPriority, setFormPriority] = useState('media')
  const [formTags, setFormTags] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { loadCards() }, [])

  async function loadCards() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.kanban.cards.list()
    setCards(data)
  }

  const cardsByColumn = useMemo(() => {
    const map: Record<string, any[]> = { pendiente: [], progreso: [], hecho: [] }
    cards.forEach(c => { if (map[c.column_type]) map[c.column_type].push(c) })
    return map
  }, [cards])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim() || !window.electronAPI) return
    try {
      await window.electronAPI.kanban.cards.create({
        title: formTitle, description: formDesc, column_type: formColumn,
        priority: formPriority, tags: formTags, due_date: formDueDate || null,
      } as any)
      setFormTitle(''); setFormDesc(''); setFormTags(''); setFormDueDate('')
      setShowForm(false)
      loadCards()
      toast({ title: 'Tarjeta creada' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la tarjeta', variant: 'destructive' })
    }
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    const card = cards.find(c => c.id === id)
    if (window.__confirmDelete) {
      window.__confirmDelete('kanban', id, card?.title || '', loadCards)
    } else {
      try {
        await window.electronAPI.trash.softDelete('kanban', id)
        loadCards()
        if (card) {
          const { pushAction } = useUndoStore.getState()
          pushAction({
            label: `"${card.title}" eliminada`,
            onUndo: async () => {
              if (window.electronAPI) {
                await window.electronAPI.trash.restore('kanban', id)
                loadCards()
              }
            },
          })
        }
      } catch {
        toast({ title: 'Error', description: 'No se pudo eliminar la tarjeta', variant: 'destructive' })
      }
    }
  }

  async function handleDragEnd(event: any) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeCard = cards.find((c: any) => c.id === Number(active.id))
    if (!activeCard) return

    let targetColumn = String(over.id)

    const overCard = cards.find((c: any) => c.id === Number(over.id))
    if (overCard) {
      targetColumn = overCard.column_type
    }

    const columnCards = cards.filter((c: any) => c.column_type === targetColumn && c.id !== activeCard.id)
    let targetPosition = columnCards.length
    if (overCard) {
      const overIdx = columnCards.findIndex((c: any) => c.id === overCard.id)
      targetPosition = overIdx >= 0 ? overIdx : columnCards.length
    }

    if (window.electronAPI) {
      try {
        await window.electronAPI.kanban.cards.move(Number(active.id), targetColumn, targetPosition)
      } catch {
        toast({ title: 'Error', description: 'No se pudo mover la tarjeta', variant: 'destructive' })
      }
    }
    loadCards()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-indigo-500" /> {t('kanban.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('kanban.desc')}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cerrar' : 'Nueva Tarjeta'}
        </Button>
      </div>

      <InfoBox title={t('kanban.title')} storageKey="tutorial_kanban" className="mb-4">
        <p>Un tablero visual para organizar tu trabajo en columnas:
          <strong>Por Hacer</strong> → <strong>En Progreso</strong> → <strong>Hecho</strong>.
          Arrastra las tarjetas entre columnas para actualizar su estado. Añade etiquetas, prioridades y fechas límite.
        </p>
      </InfoBox>

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
            <KanbanColumn key={column.id} column={column} cards={cardsByColumn[column.id] || []} onDelete={handleDelete} onView={() => {}} />
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
    </div>
  )
}
