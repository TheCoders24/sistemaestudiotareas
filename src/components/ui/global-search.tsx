import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'
import { Search, CheckSquare, StickyNote, Code2, FolderKanban, CornerDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface SearchResult {
  id: number
  title: string
  subtitle: string
  type: 'task' | 'note' | 'snippet' | 'project'
  tabId: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ICONS = {
    task: CheckSquare, note: StickyNote, snippet: Code2, project: FolderKanban,
  }
  const TAB_IDS = {
    task: 'tareas', note: 'notas', snippet: 'snippets', project: 'proyectos',
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'f') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !window.electronAPI) {
      setResults([])
      return
    }
    setLoading(true)
    const lower = q.toLowerCase()

    const [tasks, notes, snippets, projects] = await Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getNotes(),
      window.electronAPI.getSnippets(),
      window.electronAPI.getProjects(),
    ])

    const found: SearchResult[] = []

    for (const t of tasks) {
      if (t.title.toLowerCase().includes(lower) || t.description?.toLowerCase().includes(lower)) {
        found.push({ id: t.id, title: t.title, subtitle: t.description || 'Sin descripción', type: 'task', tabId: 'tareas' })
      }
    }
    for (const n of notes) {
      if (n.title.toLowerCase().includes(lower) || n.content?.toLowerCase().includes(lower)) {
        found.push({ id: n.id, title: n.title, subtitle: n.content?.slice(0, 80) || '', type: 'note', tabId: 'notas' })
      }
    }
    for (const s of snippets) {
      if (s.title.toLowerCase().includes(lower) || s.description?.toLowerCase().includes(lower) || s.tags?.toLowerCase().includes(lower)) {
        found.push({ id: s.id, title: s.title, subtitle: s.description || `${s.language}`, type: 'snippet', tabId: 'snippets' })
      }
    }
    for (const p of projects) {
      if (p.name.toLowerCase().includes(lower) || p.description?.toLowerCase().includes(lower) || p.tech_stack?.toLowerCase().includes(lower)) {
        found.push({ id: p.id, title: p.name, subtitle: p.description || 'Sin descripción', type: 'project', tabId: 'proyectos' })
      }
    }

    setResults(found.slice(0, 20))
    setSelectedIndex(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(query), 200)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [query, doSearch])

  const navigateToResult = (result: SearchResult) => {
    useAppStore.getState().setActiveTab(result.tabId)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[selectedIndex]) { e.preventDefault(); navigateToResult(results[selectedIndex]) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[10%] sm:max-w-[550px] p-0 gap-0">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar en tareas, notas, snippets, proyectos..."
            className="flex-1 h-11 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto p-2">
          {loading && <p className="text-sm text-muted-foreground text-center py-8">Buscando...</p>}
          {!loading && query.trim() && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sin resultados para "{query}"</p>
          )}
          {!loading && !query.trim() && (
            <p className="text-sm text-muted-foreground text-center py-8">Escribe para buscar en toda la aplicación</p>
          )}
          {results.map((r, i) => {
            const Icon = ICONS[r.type]
            const typeLabels = { task: 'Tarea', note: 'Nota', snippet: 'Snippet', project: 'Proyecto' }
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => navigateToResult(r)}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left',
                  i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50',
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 px-1.5 py-0.5 rounded bg-muted border self-start">
                  {typeLabels[r.type]}
                </span>
              </button>
            )
          })}
        </div>
        {results.length > 0 && (
          <div className="border-t px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><CornerDownRight className="h-3 w-3" /> Navegar</span>
            <span className="flex items-center gap-1">↑↓ Navegar</span>
            <span className="flex items-center gap-1">Esc Cerrar</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
