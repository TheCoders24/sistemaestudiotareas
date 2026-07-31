import { useEffect, useState } from 'react'
import { Plus, Check, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
const COLORS = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7']

export default function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, loadWorkspaces, setActiveWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaceStore()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('briefcase')
  const [color, setColor] = useState('#6366f1')

  useEffect(() => { loadWorkspaces() }, [])

  function handleSelect(ws: typeof activeWorkspace) {
    if (ws) setActiveWorkspace(ws)
    setOpen(false)
  }

  function handleCreate() {
    setEditingId(null)
    setName('')
    setIcon('briefcase')
    setColor('#6366f1')
    setEditOpen(true)
  }

  function handleEdit(e: React.MouseEvent, ws: NonNullable<typeof activeWorkspace>) {
    e.stopPropagation()
    setEditingId(ws.id)
    setName(ws.name)
    setIcon(ws.icon || 'briefcase')
    setColor(ws.color || '#6366f1')
    setEditOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    if (editingId !== null) {
      await updateWorkspace(editingId, { name: name.trim(), icon, color })
    } else {
      await createWorkspace({ name: name.trim(), icon, color, sort_order: workspaces.length })
    }
    setEditOpen(false)
    await loadWorkspaces()
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    await deleteWorkspace(id)
    await loadWorkspaces()
  }

  return (
    <div className="px-3 py-2 border-b">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: activeWorkspace?.color || '#6366f1' }}
          >
            {(activeWorkspace?.name || 'E')[0].toUpperCase()}
          </div>
          <span className="flex-1 truncate text-left">{activeWorkspace?.name || 'Mi Espacio'}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors',
                    activeWorkspace?.id === ws.id && 'bg-accent/50 font-medium'
                  )}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: ws.color || '#6366f1' }}
                  >
                    {ws.name[0].toUpperCase()}
                  </div>
                  <span className="flex-1 truncate text-left">{ws.name}</span>
                  {activeWorkspace?.id === ws.id && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  <button onClick={(e) => handleEdit(e, ws)} className="text-muted-foreground hover:text-foreground p-0.5">
                    <Pencil className="h-3 w-3" />
                  </button>
                  {!ws.is_default && (
                    <button onClick={(e) => handleDelete(e, ws.id)} className="text-muted-foreground hover:text-destructive p-0.5">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </button>
              ))}
              <div className="border-t mt-1 pt-1">
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nuevo espacio</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? 'Editar espacio' : 'Nuevo espacio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del espacio" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Color</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn('w-7 h-7 rounded-full border-2 transition-all', color === c ? 'border-foreground scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editingId !== null ? 'Guardar' : 'Crear'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
