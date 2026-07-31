import { useState, useEffect, useRef } from 'react'
import { Search, FileText, CheckSquare, Code2, FolderKanban, Loader, Filter, X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, typeof FileText> = {
  tarea: CheckSquare, nota: FileText, snippet: Code2, proyecto: FolderKanban, 'hábito': CheckSquare, diario: FileText,
}

const OPERATORS = [
  { op: 'priority:', label: 'Prioridad', values: ['alta', 'media', 'baja'] },
  { op: 'tag:', label: 'Etiqueta', values: [] },
  { op: 'status:', label: 'Estado', values: ['activo', 'completado', 'pendiente'] },
  { op: 'type:', label: 'Tipo', values: ['tarea', 'nota', 'snippet', 'proyecto', 'hábito'] },
  { op: 'language:', label: 'Lenguaje', values: ['javascript', 'python', 'html', 'css', 'typescript'] },
]

interface SearchResult { id: number; name: string; type: string }

export default function SearchDialog({ open, onOpenChange, onNavigate }: {
  open: boolean; onOpenChange: (o: boolean) => void; onNavigate: (tab: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showOperators, setShowOperators] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery(''); setResults([]); setSelectedIndex(0); setShowOperators(false)
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    const lastWord = query.split(' ').pop() || ''
    setShowOperators(lastWord.length > 0 && !lastWord.includes(':') && OPERATORS.some(o => o.op.startsWith(lastWord)))
    debounceRef.current = setTimeout(async () => {
      if (window.electronAPI) {
        const res = await window.electronAPI.search(query.trim())
        setResults(res); setSelectedIndex(0)
      }
      setLoading(false)
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const activeFilters = query.match(/(\w+):(\S+)/g)?.map(f => ({ raw: f, operator: f.split(':')[0], value: f.split(':')[1] })) || []

  const TYPE_TO_TAB: Record<string, string> = { tarea: 'tareas', nota: 'notas', snippet: 'snippets', proyecto: 'proyectos', 'hábito': 'habitos', diario: 'diario' }

  function handleSelect(result: SearchResult) {
    onOpenChange(false)
    const tab = TYPE_TO_TAB[result.type] || 'tareas'
    onNavigate(tab)
  }

  function insertOperator(op: string) {
    const words = query.split(' ')
    words[words.length - 1] = op
    setQuery(words.join(' ') + ' ')
    setShowOperators(false)
    inputRef.current?.focus()
  }

  function removeFilter(raw: string) {
    setQuery(query.replace(raw, '').replace(/\s+/g, ' ').trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[selectedIndex]) handleSelect(results[selectedIndex])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl top-[15%] translate-y-0">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Buscar... usa priority:alta tag:trabajo type:nota"
              className="pl-9 h-11 text-base" />
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs">
                  <Filter className="h-3 w-3" />
                  <span className="font-medium">{f.operator}:</span>{f.value}
                  <button onClick={() => removeFilter(f.raw)} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          )}

          {showOperators && (
            <div className="border rounded-lg p-2 space-y-1 bg-accent/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold px-1">Filtros rápidos</p>
              <div className="flex flex-wrap gap-1.5">
                {OPERATORS.map(op => (
                  <button key={op.op} onClick={() => insertOperator(op.op)}
                    className="px-2 py-1 text-xs rounded-md border bg-card hover:bg-accent transition-colors text-left">
                    <span className="font-medium">{op.op}</span>
                    {op.values.length > 0 && <span className="text-muted-foreground ml-1">({op.values.join(', ')})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader className="h-5 w-5 animate-spin" /></div>}
          {!loading && query && results.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">Sin resultados para "{query}"</p>}
          {!loading && results.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-0.5">
              {results.map((result, i) => {
                const Icon = TYPE_ICONS[result.type] || FileText
                return (
                  <button key={`${result.type}-${result.id}`} onClick={() => handleSelect(result)} onMouseEnter={() => setSelectedIndex(i)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                      i === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50')}>
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{result.name}</span>
                    <span className="text-xs text-muted-foreground capitalize shrink-0">{result.type}</span>
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
            <span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">↑↓</kbd> Navegar</span>
            <span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">Enter</kbd> Abrir</span>
            <span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">Esc</kbd> Cerrar</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
