import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Code2, Plus, Copy, Trash2, Search, Check, Play, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { TagPicker } from '@/components/ui/tag-picker'
import { TagBadge } from '@/components/ui/tag-badge'

const LANGUAGES = ['javascript', 'typescript', 'python', 'html', 'css', 'jsx', 'tsx', 'sql', 'bash', 'json', 'rust', 'go', 'java', 'cpp', 'csharp']

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<any[]>([])
  const [filterLang, setFilterLang] = useState('all')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [description, setDescription] = useState('')
  const [tagIds, setTagIds] = useState<number[]>([])
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [runningId, setRunningId] = useState<number | null>(null)
  const [output, setOutput] = useState<Record<number, { stdout: string; stderr: string; exitCode: number } | null>>({})

  useEffect(() => { loadSnippets() }, [])

  async function loadSnippets() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.snippets.list()
    if (data) setSnippets(data)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !code.trim() || !window.electronAPI) return
    const tagsStr = tagIds.length > 0 ? tagIds.join(',') : undefined
    await window.electronAPI.snippets.create({ title, code, language, description, ...(tagsStr !== undefined && { tags: tagsStr }) })
    setTitle(''); setCode(''); setDescription(''); setTagIds([])
    setOpen(false)
    loadSnippets()
    toast({ title: 'Snippet guardado', description: `"${title}" fue creado.` })
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.snippets.delete(id)
    loadSnippets()
    toast({ title: 'Snippet eliminado' })
  }

  async function handleCopy(code: string, id: number) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast({ title: 'Copiado al portapapeles' })
  }

  async function handleRun(id: number) {
    if (!window.electronAPI) return
    setRunningId(id)
    setOutput(prev => ({ ...prev, [id]: null }))
    try {
      const result = await window.electronAPI.snippets.execute(id)
      setOutput(prev => ({ ...prev, [id]: result }))
      if (result.exitCode !== 0) {
        toast({ title: 'Error de ejecución', description: result.stderr?.slice(0, 100), variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setRunningId(null)
    }
  }

  const filtered = snippets.filter(s => {
    if (filterLang !== 'all' && s.language !== filterLang) return false
    if (search) {
      const q = search.toLowerCase()
      const matchesTags = Array.isArray(s.tags) ? s.tags.some((tag: { name?: string }) => tag.name?.toLowerCase().includes(q)) : false
      return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || matchesTags
    }
    return true
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code2 className="h-6 w-6 text-indigo-500" /> Snippets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Guarda fragmentos de código útiles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuevo Snippet</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Snippet</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" required />
              <div className="grid grid-cols-2 gap-4">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <TagPicker selectedIds={tagIds} onChange={setTagIds} />
              </div>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción breve" />
              <div>
                <label className="text-sm font-medium mb-1 block">Código</label>
                <Textarea value={code} onChange={e => setCode(e.target.value)} placeholder="Pega tu código aquí..." className="min-h-[200px] font-mono text-sm" required />
              </div>
              <Button type="submit" className="w-full">Guardar Snippet</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar snippets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={filterLang} onValueChange={setFilterLang} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {LANGUAGES.slice(0, 8).map(l => <TabsTrigger key={l} value={l} className="capitalize">{l}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <EmptyState icon={Code2} title="No hay snippets" description="Guarda tu primer fragmento de código." />
        )}
        {filtered.map((snippet, i) => (
          <motion.div
            key={snippet.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {snippet.title}
                      <Badge variant="secondary" className="text-[10px]">{snippet.language}</Badge>
                    </CardTitle>
                    {snippet.description && (
                      <p className="text-sm text-muted-foreground mt-1">{snippet.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {['javascript', 'typescript', 'python', 'bash'].includes(snippet.language) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRun(snippet.id)} disabled={runningId === snippet.id}>
                        {runningId === snippet.id ? <Loader className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(snippet.code, snippet.id)}>
                      {copiedId === snippet.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(snippet.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
                {snippet.tags && String(snippet.tags).trim().length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {String(snippet.tags).split(',').filter(Boolean).map((tag: string, i: number) => (
                      <TagBadge key={i} name={tag.trim()} color="#6366f1" />
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="rounded-md overflow-hidden text-sm">
                  <SyntaxHighlighter
                    language={snippet.language}
                    style={oneDark}
                    customStyle={{ margin: 0, borderRadius: '6px', fontSize: '13px' }}
                    showLineNumbers
                  >
                    {snippet.code}
                  </SyntaxHighlighter>
                </div>
                {output[snippet.id] && (
                  <div className="mt-2 rounded-md bg-black/90 p-3 text-xs font-mono">
                    {output[snippet.id]!.stdout && (
                      <pre className="text-green-400 whitespace-pre-wrap">{output[snippet.id]!.stdout}</pre>
                    )}
                    {output[snippet.id]!.stderr && (
                      <pre className="text-red-400 whitespace-pre-wrap">{output[snippet.id]!.stderr}</pre>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">Exit code: {output[snippet.id]!.exitCode}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Eliminar snippet"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  )
}
