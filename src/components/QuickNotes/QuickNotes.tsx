import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Plus, Trash2, Edit3, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { safeIpc } from '@/lib/ipc'
import { TagPicker } from '@/components/ui/tag-picker'
import { TagBadge } from '@/components/ui/tag-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tag, Notebook } from '@/types'

interface Note {
  id: number
  title: string
  content: string
  notebook_id: number | null
  updated_at: string
  tags: Tag[]
}

export default function QuickNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newNotebookId, setNewNotebookId] = useState<number | null>(null)
  const [newTagIds, setNewTagIds] = useState<number[]>([])
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadNotes()
    loadNotebooks()
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        setShowCreate(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => { if (showCreate && inputRef.current) inputRef.current.focus() }, [showCreate])

  async function loadNotebooks() {
    const data = await safeIpc<Notebook[]>('getNotebooks')
    if (data) setNotebooks(data)
  }

  async function loadNotes() {
    const data = await safeIpc<Note[]>('getNotes')
    if (!data) return
    const withTags = await Promise.all(
      data.map(async (note) => {
        const tags = await safeIpc<Tag[]>('getNoteTags', note.id)
        return { ...note, tags: tags ?? [] }
      })
    )
    setNotes(withTags)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const note = await safeIpc<Note>('createNote', { title: newTitle, content: newContent, notebook_id: newNotebookId } as any)
    if (note && newTagIds.length > 0) {
      await safeIpc('setNoteTags', note.id, newTagIds)
    }
    setNewTitle(''); setNewContent(''); setNewNotebookId(null); setNewTagIds([])
    setShowCreate(false)
    loadNotes()
    toast({ title: 'Nota creada' })
  }

  async function handleSave(id: number) {
    await safeIpc('updateNote', id, { title: editTitle, content: editContent } as any)
    setEditingId(null)
    loadNotes()
    toast({ title: 'Nota guardada' })
  }

  async function handleDelete(id: number) {
    await safeIpc('deleteNote', id)
    loadNotes()
    toast({ title: 'Nota eliminada' })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-indigo-500" /> Notas Rápidas
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            Apunta ideas al vuelo <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted border">Ctrl+N</kbd>
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" /> {showCreate ? 'Cerrar' : 'Nueva Nota'}
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="mb-6 overflow-hidden"
          >
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Input ref={inputRef} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título" required />
                <Select value={newNotebookId?.toString() ?? '_none'} onValueChange={(v) => setNewNotebookId(v === '_none' ? null : Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cuaderno..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin cuaderno</SelectItem>
                    {notebooks.map((nb) => (
                      <SelectItem key={nb.id} value={nb.id.toString()}>{nb.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Contenido..." className="min-h-[100px]" />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">✓ Guardar Nota</Button>
                  <TagPicker selectedIds={newTagIds} onChange={setNewTagIds} />
                </div>
              </CardContent>
            </Card>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={StickyNote}
              title="No hay notas"
              description="Crea tu primera nota con Ctrl+N o el botón de arriba."
              actionLabel="Crear nota"
              onAction={() => setShowCreate(true)}
            />
          </div>
        )}
        {notes.map(note => (
          <motion.div key={note.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="group h-full">
              <CardContent className="pt-4">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-sm font-medium" />
                    <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[120px]" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(note.id)}>Guardar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm">{note.title}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(note.id); setEditTitle(note.title); setEditContent(note.content) }}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(note.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{note.content}</p>
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.map(tag => (
                          <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/50 mt-2">{new Date(note.updated_at).toLocaleString()}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Eliminar nota"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  )
}
