import { useState, useEffect, useCallback } from 'react'
import { Zap, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { safeIpc } from '@/lib/ipc'
import { toast } from '@/components/ui/use-toast'

export function QuickCapture() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('media')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return
    await safeIpc('createTask', { title: title.trim(), description, priority } as any)
    toast({ title: '⚡ Tarea creada', description: title.trim() })
    setTitle(''); setDescription(''); setPriority('media'); setOpen(false)
  }, [title, description, priority])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false) }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-yellow-500" /> Captura rápida
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="¿Qué necesitas hacer?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit() }}
          />
          <Textarea
            placeholder="Notas adicionales (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px]"
          />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baja">Baja prioridad</SelectItem>
              <SelectItem value="media">Media prioridad</SelectItem>
              <SelectItem value="alta">Alta prioridad</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full" onClick={handleSubmit}>
            <Plus className="h-4 w-4 mr-1" /> Crear tarea
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">Ctrl+Shift+U para abrir desde cualquier lugar</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
