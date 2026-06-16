import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { GripVertical, X } from 'lucide-react'

const priorityColor: Record<string, string> = {
  baja: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  alta: 'bg-red-500/20 text-red-400 border-red-500/30',
}

interface Props {
  card: any
  onDelete: (id: number) => void
}

export default function KanbanCard({ card, onDelete }: Props) {
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
      className="bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-accent/50 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 flex items-start gap-2">
          <div {...attributes} {...listeners} className="mt-0.5">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{card.title}</p>
            {card.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(card.id) }}
          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <Badge variant="outline" className={`text-[10px] ${priorityColor[card.priority] || ''}`}>
          {card.priority}
        </Badge>
        {card.tags && card.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean).map((tag: string) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
        ))}
        {card.due_date && (
          <span className="text-[10px] text-muted-foreground ml-auto">📅 {card.due_date}</span>
        )}
      </div>
    </div>
  )
}
