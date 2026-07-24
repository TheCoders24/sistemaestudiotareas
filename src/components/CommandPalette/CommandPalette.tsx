import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Sparkles, Clock, LayoutDashboard, CheckSquare, FolderKanban, NotebookPen, CalendarDays, Code2, Activity, Trophy, Swords, BookOpen, BarChart3, StickyNote, Target, Trash2, Plus, Zap, Sun, FileText, ListTodo } from 'lucide-react'

interface NavCommand {
  type: 'nav'
  id: string
  label: string
  icon: React.ElementType
  shortcut?: string
}

interface ActionCommand {
  type: 'action'
  id: string
  label: string
  icon: React.ElementType
}

interface SearchResult {
  type: 'search'
  id: number
  name: string
  entityType: string
}

type Command = NavCommand | ActionCommand | SearchResult

const NAV_COMMANDS: NavCommand[] = [
  { type: 'nav', id: 'inicio', label: 'Inicio', icon: Sparkles, shortcut: 'Ctrl+1' },
  { type: 'nav', id: 'pomodoro', label: 'Pomodoro', icon: Clock, shortcut: 'Ctrl+P' },
  { type: 'nav', id: 'kanban', label: 'Kanban', icon: LayoutDashboard, shortcut: 'Ctrl+K' },
  { type: 'nav', id: 'tareas', label: 'Tareas', icon: CheckSquare, shortcut: 'Ctrl+T' },
  { type: 'nav', id: 'proyectos', label: 'Proyectos', icon: FolderKanban, shortcut: 'Ctrl+Shift+P' },
  { type: 'nav', id: 'diario', label: 'Diario', icon: NotebookPen, shortcut: 'Ctrl+D' },
  { type: 'nav', id: 'calendario', label: 'Calendario', icon: CalendarDays, shortcut: 'Ctrl+Shift+C' },
  { type: 'nav', id: 'snippets', label: 'Snippets', icon: Code2, shortcut: 'Ctrl+Shift+S' },
  { type: 'nav', id: 'habitos', label: 'Hábitos', icon: Activity, shortcut: 'Ctrl+H' },
  { type: 'nav', id: 'logros', label: 'Logros', icon: Trophy, shortcut: 'Ctrl+L' },
  { type: 'nav', id: 'desafios', label: 'Desafíos', icon: Swords, shortcut: 'Ctrl+Shift+D' },
  { type: 'nav', id: 'mapa', label: 'Estudio', icon: BookOpen, shortcut: 'Ctrl+M' },
  { type: 'nav', id: 'stats', label: 'Stats', icon: BarChart3, shortcut: 'Ctrl+E' },
  { type: 'nav', id: 'notas', label: 'Notas', icon: StickyNote, shortcut: 'Ctrl+N' },
  { type: 'nav', id: 'metas', label: 'Metas', icon: Target, shortcut: 'Ctrl+G' },
  { type: 'nav', id: 'reporte', label: 'Reporte', icon: BarChart3, shortcut: 'Ctrl+Shift+R' },
  { type: 'nav', id: 'papelera', label: 'Papelera', icon: Trash2, shortcut: 'Ctrl+Shift+T' },
]

const ACTION_COMMANDS: ActionCommand[] = [
  { type: 'action', id: 'new-task', label: 'Nueva tarea', icon: Plus },
  { type: 'action', id: 'new-note', label: 'Nueva nota', icon: StickyNote },
  { type: 'action', id: 'focus-mode', label: 'Modo enfoque', icon: Zap },
  { type: 'action', id: 'toggle-dark', label: 'Alternar modo oscuro', icon: Sun },
]

const SEARCH_ICONS: Record<string, any> = {
  tarea: ListTodo,
  nota: StickyNote,
  snippet: Code2,
  proyecto: FolderKanban,
  hábito: Activity,
  diario: NotebookPen,
}

const SEARCH_NAV: Record<string, string> = {
  tarea: 'tareas',
  nota: 'notas',
  snippet: 'snippets',
  proyecto: 'proyectos',
  hábito: 'habitos',
  diario: 'diario',
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (tabId: string) => void
  onAction: (actionId: string) => void
}

export default function CommandPalette({ open, onClose, onNavigate, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dbResults, setDbResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setDbResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (window.electronAPI) {
        window.electronAPI.search(query.trim()).then((results: any[]) => {
          setDbResults(results.map(r => ({ type: 'search' as const, id: r.id, name: r.name, entityType: r.type })))
          setSearching(false)
        }).catch(() => setSearching(false))
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    const nav = q
      ? NAV_COMMANDS.filter(c => c.label.toLowerCase().includes(q))
      : NAV_COMMANDS
    const actions = q
      ? ACTION_COMMANDS.filter(c => c.label.toLowerCase().includes(q))
      : ACTION_COMMANDS
    return [...nav, ...actions, ...dbResults]
  }, [query, dbResults])

  const flatItems = filtered

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSelect = useCallback((cmd: Command) => {
    if (cmd.type === 'nav') {
      onNavigate(cmd.id)
    } else if (cmd.type === 'action') {
      onAction(cmd.id)
    } else if (cmd.type === 'search') {
      const targetTab = SEARCH_NAV[cmd.entityType]
      if (targetTab) onNavigate(targetTab)
    }
    onClose()
  }, [onNavigate, onAction, onClose])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (listRef.current && flatItems.length > 0) {
      const item = listRef.current.children[selectedIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, flatItems.length])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(flatItems[selectedIndex])
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md rounded-lg shadow-2xl bg-card/95 backdrop-blur overflow-hidden border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-4 w-4 mr-3 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar comandos, tareas, notas..."
            className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
          />
        </div>
        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2 space-y-0.5">
          {flatItems.length === 0 && !searching && (
            <p className="text-sm text-muted-foreground text-center py-8">Sin resultados</p>
          )}
          {flatItems.length === 0 && searching && (
            <p className="text-sm text-muted-foreground text-center py-8">Buscando...</p>
          )}
          {flatItems.map((cmd, i) => {
            const Icon = cmd.type === 'search'
              ? (SEARCH_ICONS[cmd.entityType] || FileText)
              : cmd.icon
            return (
              <button
                key={`${cmd.type}-${cmd.id}`}
                onClick={() => handleSelect(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent/50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{'label' in cmd ? cmd.label : cmd.name}</span>
                {cmd.type === 'search' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/80 text-muted-foreground capitalize shrink-0">{cmd.entityType}</span>
                )}
                {cmd.type === 'nav' && cmd.shortcut && (
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground font-mono shrink-0">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
          <span><kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">↑↓</kbd> Navegar</span>
          <span><kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">Enter</kbd> Seleccionar</span>
          <span><kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">Esc</kbd> Cerrar</span>
        </div>
      </div>
    </div>
  )
}
