import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { GripVertical, X, Archive } from 'lucide-react'
import { PRIORITY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { KanbanCard } from '@/types'

interface Props {
  card: KanbanCard
  onDelete: (id: number) => void
  onView: (card: KanbanCard) => void
  onArchive?: (id: number) => void
}

export default function KanbanCardComponent({ card, onDelete, onView, onArchive }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onView(card)}
      className="bg-card border rounded-lg p-3 cursor-pointer hover:bg-accent/50 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 flex items-start gap-2">
          <div {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="mt-0.5 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{card.title}</p>
            {card.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {onArchive && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(card.id) }}
              className="text-muted-foreground hover:text-blue-500 p-0.5"
              title="Archivar"
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(card.id) }}
            className="text-muted-foreground hover:text-destructive p-0.5"
            title="Eliminar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <Badge variant="outline" className={cn("text-[10px]", PRIORITY_COLORS[card.priority])}>
          {card.priority}
        </Badge>
        {card.tags && card.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean).map((tag: string) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
        ))}
        {card.due_date && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {new Date(card.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  )
}
