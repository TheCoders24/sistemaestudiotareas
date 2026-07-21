import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Plus, Trash2, Edit3, Eye, EyeOff, Search } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton } from '@/components/ui/loading-skeleton'

interface Note {
  id: number
  title: string
  content: string
  updated_at: string
}

export default function QuickNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [previewMode, setPreviewMode] = useState<Record<number, boolean>>({})
  const [editPreview, setEditPreview] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'alpha'>('recent')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadNotes()
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

  async function loadNotes() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getNotes()
    setNotes(data)
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !window.electronAPI) return
    await window.electronAPI.createNote({ title: newTitle, content: newContent } as any)
    setNewTitle(''); setNewContent('')
    setShowCreate(false)
    loadNotes()
    toast({ title: 'Nota creada' })
  }

  async function handleSave(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.updateNote(id, { title: editTitle, content: editContent } as any)
    setEditingId(null)
    loadNotes()
    toast({ title: 'Nota guardada' })
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.deleteNote(id)
    loadNotes()
  }

  const displayNotes = notes
    .filter(n => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'alpha') return a.title.localeCompare(b.title)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

  return (
    <div className="max-w-5xl mx-auto">
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

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar notas..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <TabsList className="h-9">
            <TabsTrigger value="recent" className="text-xs">Recientes</TabsTrigger>
            <TabsTrigger value="alpha" className="text-xs">A-Z</TabsTrigger>
          </TabsList>
        </Tabs>
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
                <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Contenido (soporta Markdown)..." className="min-h-[100px]" />
                <Button type="submit" className="w-full">✓ Guardar Nota</Button>
              </CardContent>
            </Card>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full"><ListSkeleton rows={3} /></div>
        ) : displayNotes.length === 0 && (
          <div className="col-span-full">
            {searchQuery ? (
              <div className="text-center py-16 text-muted-foreground">
                <p>Sin resultados de búsqueda</p>
              </div>
            ) : (
              <EmptyState icon={StickyNote} title="No hay notas" description="Creá tu primera nota rápida." actionLabel="Nueva nota" onAction={() => setShowCreate(true)} />
            )}
          </div>
        )}
        {displayNotes.map(note => {
          const preview = previewMode[note.id] || false
          return (
            <motion.div key={note.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="group h-full">
                <CardContent className="pt-4">
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-sm font-medium" />
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditPreview(!editPreview)}>
                          {editPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      {editPreview ? (
                        <div className="min-h-[120px] p-3 rounded bg-muted/30 prose prose-sm dark:prose-invert max-w-none text-sm">
                          <ReactMarkdown>{editContent}</ReactMarkdown>
                        </div>
                      ) : (
                        <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[120px]" />
                      )}
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
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            setEditingId(note.id); setEditTitle(note.title); setEditContent(note.content)
                          }}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setPreviewMode(prev => ({ ...prev, [note.id]: !prev[note.id] }))}>
                            {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(note.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {preview ? (
                        <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{note.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{note.content}</p>
                      )}
                      <p className="text-xs text-muted-foreground/50 mt-2">{new Date(note.updated_at).toLocaleString()}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}