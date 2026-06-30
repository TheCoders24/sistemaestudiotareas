import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Badge } from '@/components/ui/badge'
import type { KanbanCard } from '@/types'
import KanbanCardComponent from './KanbanCard'

interface Column {
  id: string
  label: string
  color: string
}

interface Props {
  column: Column
  cards: KanbanCard[]
  onDelete: (id: number) => void
  onView: (card: KanbanCard) => void
}

export default function KanbanColumn({ column, cards, onDelete, onView }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={`bg-card/50 border rounded-lg min-w-[280px] w-[280px] flex-shrink-0 border-t-4 ${column.color} ${
        isOver ? 'ring-2 ring-indigo-500' : ''
      }`}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{column.label}</h3>
          <Badge variant="secondary" className="text-[10px]">{cards.length}</Badge>
        </div>
      </div>

      <div className="p-2 space-y-2 min-h-[200px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Arrastra tarjetas aquí</p>
          )}
          {cards.map(card => (
            <KanbanCardComponent key={card.id} card={card} onDelete={onDelete} onView={onView} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
