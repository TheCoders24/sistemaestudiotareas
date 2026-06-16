import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Code2, Plus, Copy, Trash2, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

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
  const [tags, setTags] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => { loadSnippets() }, [])

  async function loadSnippets() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getSnippets()
    setSnippets(data)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !code.trim() || !window.electronAPI) return
    await window.electronAPI.createSnippet({ title, code, language, description, tags } as any)
    setTitle(''); setCode(''); setDescription(''); setTags('')
    setOpen(false)
    loadSnippets()
    toast({ title: 'Snippet guardado', description: `"${title}" fue creado.` })
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.deleteSnippet(id)
    loadSnippets()
    toast({ title: 'Snippet eliminado' })
  }

  async function handleCopy(code: string, id: number) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast({ title: 'Copiado al portapapeles' })
  }

  const filtered = snippets.filter(s => {
    if (filterLang !== 'all' && s.language !== filterLang) return false
    if (search) {
      const q = search.toLowerCase()
      return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.toLowerCase().includes(q)
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
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (separados por coma)" />
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
          <div className="text-center py-16 text-muted-foreground">
            <Code2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No hay snippets. ¡Guarda tu primer fragmento de código!</p>
          </div>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(snippet.code, snippet.id)}>
                      {copiedId === snippet.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(snippet.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
                {snippet.tags && (
                  <div className="flex gap-1 mt-2">
                    {snippet.tags.split(',').map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
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
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
