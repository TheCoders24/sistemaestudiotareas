import { useState, useEffect, useMemo } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Plus, LayoutDashboard, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { InfoBox } from '@/components/ui/info-box'
import { useTranslate } from '@/lib/translate'
import { useUndoStore } from '@/stores/undoStore'
import TemplateLibrary from '@/components/Templates/TemplateLibrary'
import KanbanColumn from './KanbanColumn'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PRIORITY_COLORS } from '@/lib/constants'

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
  const [templateOpen, setTemplateOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<any>(null)

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

  function handleView(card: any) {
    setSelectedCard(card)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-indigo-500" /> {t('kanban.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('kanban.desc')}</p>
        </div>
        <Button variant="outline" onClick={() => setTemplateOpen(true)}>
          <LayoutTemplate className="h-4 w-4 mr-1" /> Plantilla
        </Button>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cerrar' : 'Nueva Tarjeta'}
        </Button>
      </div>

      <InfoBox title={t('kanban.title')} storageKey="tutorial_kanban" className="mb-4 flex-shrink-0">
        <p>Un tablero visual para organizar tu trabajo en columnas:
          <strong>Por Hacer</strong> → <strong>En Progreso</strong> → <strong>Hecho</strong>.
          Arrastra las tarjetas entre columnas para actualizar su estado. Añade etiquetas, prioridades y fechas límite.
        </p>
      </InfoBox>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border rounded-lg p-4 mb-6 space-y-3 flex-shrink-0">
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
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {COLUMNS.map(column => (
            <KanbanColumn key={column.id} column={column} cards={cardsByColumn[column.id] || []} onDelete={handleDelete} onView={handleView} />
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

      {cards.length === 0 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-3 py-3 text-sm text-muted-foreground">
          <span>Tu tablero está vacío.</span>
          <Button variant="outline" size="sm" onClick={() => setTemplateOpen(true)}>
            <LayoutTemplate className="h-4 w-4 mr-1" /> Empezar con plantilla
          </Button>
        </div>
      )}

      <TemplateLibrary
        type="kanban_board"
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onInstantiated={() => { loadCards() }}
      />

      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedCard?.title}</DialogTitle>
            <DialogDescription>Información completa de la tarjeta</DialogDescription>
          </DialogHeader>

          {selectedCard && (
            <div className="space-y-4 mt-4">
              {/* Título */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Título</label>
                <p className="text-base">{selectedCard.title}</p>
              </div>

              {/* Descripción */}
              {selectedCard.description && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Descripción</label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedCard.description}</p>
                </div>
              )}

              {/* Columna */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Columna</label>
                <Badge variant="secondary" className={cn("px-3 py-1", PRIORITY_COLORS[selectedCard.column_type])}>
                  {selectedCard.column_type === 'pendiente' ? 'Por Hacer' : selectedCard.column_type === 'progreso' ? 'En Progreso' : 'Hecho'}
                </Badge>
              </div>

              {/* Prioridad */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Prioridad</label>
                <Badge variant="outline" className={cn("px-3 py-1", PRIORITY_COLORS[selectedCard.priority])}>
                  {selectedCard.priority}
                </Badge>
              </div>

              {/* Fecha límite */}
              {selectedCard.due_date && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Fecha Límite</label>
                  <p className="text-sm">{new Date(selectedCard.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              )}

              {/* Tags */}
              {selectedCard.tags && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCard.tags.split(',').map((tag: string) => tag.trim().filter(Boolean).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    )))}
                  </div>
                </div>
              )}

              {/* ID */}
              <div className="space-y-1.5 pt-2 border-t">
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <p className="text-xs text-muted-foreground">{selectedCard.id}</p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-2 border-t">
            <Button onClick={() => setSelectedCard(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
