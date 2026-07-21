import { useState, useEffect, useCallback } from 'react'
import { Plus, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
interface TagType { id: number; name: string; color: string }

interface TagPickerProps {
  selectedIds: number[]
  onChange: (ids: number[]) => void
}

export function TagPicker({ selectedIds, onChange }: TagPickerProps) {
  const [tags, setTags] = useState<TagType[]>([])
  const [newName, setNewName] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (window.electronAPI) { (window.electronAPI as any).getTags().then(setTags) }
  }, [])

  const toggle = useCallback((id: number) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    onChange(next)
  }, [selectedIds, onChange])

  const createAndAdd = useCallback(async () => {
    const name = newName.trim()
    if (!name) return
    const tag = await ((window.electronAPI as any).createTag({ name }) as Promise<TagType>)
    if (tag) {
      setTags((prev) => [...prev, tag])
      onChange([...selectedIds, tag.id])
      setNewName('')
    }
  }, [newName, selectedIds, onChange])

  const selected = tags.filter((t) => selectedIds.includes(t.id))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Tag className="h-3 w-3" />
          {selected.length > 0 ? selected.length : 'Etiquetas'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="flex gap-1 mb-2">
          <Input
            placeholder="Nueva etiqueta..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={(e) => { if (e.key === 'Enter') createAndAdd() }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={createAndAdd}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggle(tag.id)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                selectedIds.includes(tag.id) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
              }`}
              style={selectedIds.includes(tag.id) ? {} : { borderColor: tag.color }}
            >
              {tag.name}
            </button>
          ))}
          {tags.length === 0 && <p className="text-xs text-muted-foreground p-1">Crea tu primera etiqueta</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}
