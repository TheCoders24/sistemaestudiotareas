import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TagBadgeProps {
  name: string
  color?: string
  onRemove?: () => void
  className?: string
}

export function TagBadge({ name, color = '#6366f1', onRemove, className }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-xs font-normal border-l-2', className)}
      style={{ borderLeftColor: color }}
    >
      {name}
      {onRemove && (
        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={(e) => { e.stopPropagation(); onRemove() }} />
      )}
    </Badge>
  )
}
