import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Clock, LayoutDashboard, CheckSquare, FolderKanban,
  NotebookPen, CalendarDays, Code2, Activity, Trophy, Swords,
  BookOpen, BarChart3, StickyNote, Target, Trash2, Plus, Zap, Sun,
  FileText, ListTodo, Brain, Settings2, RefreshCw,
} from 'lucide-react'
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from '@/components/ui/command'

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

interface GroupMeta {
  label: string
  icon: React.ElementType
  types: string[]
}

const ENTITY_GROUPS: GroupMeta[] = [
  { label: 'Tareas', icon: ListTodo, types: ['task', 'tarea'] },
  { label: 'Notas', icon: StickyNote, types: ['note', 'nota'] },
  { label: 'Snippets', icon: Code2, types: ['snippet'] },
  { label: 'Proyectos', icon: FolderKanban, types: ['project', 'proyecto'] },
  { label: 'Hábitos', icon: Activity, types: ['habit', 'hábito'] },
  { label: 'Diario', icon: NotebookPen, types: ['dailylog', 'diario'] },
  { label: 'Flashcards', icon: Brain, types: ['flashcard'] },
]

function getGroupForType(entityType: string): GroupMeta | undefined {
  return ENTITY_GROUPS.find(g => g.types.includes(entityType))
}

const SEARCH_NAV: Record<string, string> = {
  task: 'tareas', tarea: 'tareas',
  note: 'notas', nota: 'notas',
  snippet: 'snippets', proyecto: 'proyectos',
  project: 'proyectos',
  habit: 'habitos', 'hábito': 'habitos',
  dailylog: 'diario', diario: 'diario',
}

const NAV_COMMANDS: NavCommand[] = [
  { type: 'nav', id: 'inicio', label: 'Inicio', icon: Sparkles, shortcut: 'Ctrl+1' },
  { type: 'nav', id: 'pomodoro', label: 'Pomodoro', icon: Clock, shortcut: 'Ctrl+P' },
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
  { type: 'nav', id: 'flashcards', label: 'Flashcards', icon: Brain, shortcut: 'Ctrl+Shift+F' },
  { type: 'nav', id: 'sync', label: 'Sincronización', icon: RefreshCw, shortcut: 'Ctrl+Shift+W' },
]

const ACTION_COMMANDS: ActionCommand[] = [
  { type: 'action', id: 'new-task', label: 'Nueva tarea', icon: Plus },
  { type: 'action', id: 'new-note', label: 'Nueva nota', icon: StickyNote },
  { type: 'action', id: 'focus-mode', label: 'Modo enfoque', icon: Zap },
  { type: 'action', id: 'toggle-dark', label: 'Alternar modo oscuro', icon: Sun },
  { type: 'action', id: 'quick-capture', label: 'Crear tarea (captura rápida)', icon: Zap },
  { type: 'action', id: 'go-pomodoro-start', label: 'Iniciar pomodoro', icon: Clock },
  { type: 'action', id: 'go-notas-create', label: 'Nueva nota', icon: StickyNote },
  { type: 'action', id: 'go-flashcards', label: 'Nueva flashcard', icon: Brain },
  { type: 'action', id: 'go-mapa', label: 'Ir a Estudio', icon: BookOpen },
  { type: 'action', id: 'go-tareas', label: 'Ir a Trabajo', icon: LayoutDashboard },
  { type: 'action', id: 'go-stats', label: 'Ir a Progreso', icon: BarChart3 },
  { type: 'action', id: 'go-diario', label: 'Ir a Registro', icon: NotebookPen },
  { type: 'action', id: 'go-pomodoro', label: 'Ir a Enfoque', icon: Clock },
  { type: 'action', id: 'go-notas', label: 'Ir a Conocimiento', icon: StickyNote },
  { type: 'action', id: 'go-sync', label: 'Ir a Sistema', icon: Settings2 },
]

const ACTION_NAV_MAP: Record<string, string> = {
  'go-pomodoro-start': 'pomodoro',
  'go-pomodoro': 'pomodoro',
  'go-notas-create': 'notas',
  'go-notas': 'notas',
  'go-flashcards': 'flashcards',
  'go-mapa': 'mapa',
  'go-tareas': 'tareas',
  'go-stats': 'stats',
  'go-diario': 'diario',
  'go-sync': 'sync',
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (tabId: string) => void
  onAction: (actionId: string) => void
}

export default function CommandPalette({ open, onClose, onNavigate, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [dbResults, setDbResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isActionMode = query.startsWith('>')
  const displayQuery = isActionMode ? query.slice(1).trimStart() : query
  const showPrefix = isActionMode

  useEffect(() => {
    if (open) {
      setQuery('')
      setDbResults([])
      setSearching(false)
    }
  }, [open])

  useEffect(() => {
    if (isActionMode) {
      setDbResults([])
      setSearching(false)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      return
    }
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
  }, [query, isActionMode])

  const filteredCommands = useMemo(() => {
    if (isActionMode) {
      const q = displayQuery.toLowerCase().trim()
      return q
        ? ACTION_COMMANDS.filter(c => c.label.toLowerCase().includes(q))
        : ACTION_COMMANDS
    }
    return null
  }, [isActionMode, displayQuery])

  const filteredNav = useMemo(() => {
    if (isActionMode) return []
    const q = query.toLowerCase().trim()
    return q
      ? NAV_COMMANDS.filter(c => c.label.toLowerCase().includes(q))
      : NAV_COMMANDS
  }, [query, isActionMode])

  const filteredActions = useMemo(() => {
    if (isActionMode) return []
    const q = query.toLowerCase().trim()
    return q
      ? ACTION_COMMANDS.filter(c => c.label.toLowerCase().includes(q))
      : []
  }, [query, isActionMode])

  const groupedSearch = useMemo(() => {
    if (isActionMode || dbResults.length === 0) return null
    const groups: Record<string, SearchResult[]> = {}
    for (const r of dbResults) {
      const key = getGroupForType(r.entityType)?.label || r.entityType
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }
    return groups
  }, [dbResults, isActionMode])

  const flatItems = useMemo(() => {
    if (isActionMode && filteredCommands) {
      return filteredCommands
    }
    const items: Command[] = []
    if (filteredNav.length > 0) {
      items.push(...filteredNav)
    }
    if (filteredActions.length > 0) {
      items.push(...filteredActions)
    }
    if (groupedSearch) {
      items.push(...dbResults)
    }
    return items
  }, [isActionMode, filteredCommands, filteredNav, filteredActions, groupedSearch, dbResults])

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

  const handleSelect = useCallback((cmd: Command) => {
    if (cmd.type === 'nav') {
      onNavigate(cmd.id)
    } else if (cmd.type === 'action') {
      const navTarget = ACTION_NAV_MAP[cmd.id]
      if (navTarget) {
        onNavigate(navTarget)
      } else {
        onAction(cmd.id)
      }
    } else if (cmd.type === 'search') {
      const targetTab = SEARCH_NAV[cmd.entityType]
      if (targetTab) onNavigate(targetTab)
    }
    onClose()
  }, [onNavigate, onAction, onClose])

  function handleInputChange(value: string) {
    setQuery(value)
  }

  const totalResults = flatItems.length

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
          onClick={onClose}
        >
          <div className="fixed inset-0 bg-black/50" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg rounded-lg shadow-2xl bg-card/95 backdrop-blur overflow-hidden border border-border"
            onClick={e => e.stopPropagation()}
          >
            <Command shouldFilter={false} loop className="bg-transparent">
              <CommandInput
                value={query}
                onValueChange={handleInputChange}
                autoFocus
                placeholder={isActionMode ? 'Escribí un comando...' : 'Buscá tareas, notas, snippets, proyectos...'}
                className="h-12 text-base"
                leading={
                  showPrefix ? (
                    <span className="mr-3 shrink-0 text-center font-mono text-sm text-muted-foreground">&gt;</span>
                  ) : undefined
                }
              />
              <CommandList className="max-h-[360px] p-2">
                {totalResults === 0 && !searching && !isActionMode && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {query.trim().length >= 2 ? 'Sin resultados' : 'Escribí al menos 2 caracteres para buscar'}
                  </p>
                )}
                {totalResults === 0 && !searching && isActionMode && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {displayQuery.trim() ? 'No hay comandos que coincidan' : 'Escribí un comando o seleccioná uno de la lista'}
                  </p>
                )}
                {totalResults === 0 && searching && (
                  <p className="text-sm text-muted-foreground text-center py-8">Buscando...</p>
                )}
                {isActionMode && filteredCommands && filteredCommands.length > 0 && (
                  <CommandGroup heading="Comandos">
                    {filteredCommands.map(cmd => {
                      const Icon = cmd.icon
                      return (
                        <CommandItem
                          key={`${cmd.type}-${cmd.id}`}
                          value={`action-cmd-${cmd.id}`}
                          onSelect={() => handleSelect(cmd)}
                          className="gap-3 px-3 py-2.5 text-sm"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{cmd.label}</span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
                {!isActionMode && filteredNav.length > 0 && (
                  <CommandGroup heading="Navegación">
                    {filteredNav.map(cmd => {
                      const Icon = cmd.icon
                      return (
                        <CommandItem
                          key={`${cmd.type}-${cmd.id}`}
                          value={`nav-${cmd.id}`}
                          onSelect={() => handleSelect(cmd)}
                          className="gap-3 px-3 py-2.5 text-sm"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground font-mono shrink-0">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
                {!isActionMode && filteredActions.length > 0 && (
                  <CommandGroup heading="Acciones">
                    {filteredActions.map(cmd => {
                      const Icon = cmd.icon
                      return (
                        <CommandItem
                          key={`${cmd.type}-${cmd.id}`}
                          value={`action-${cmd.id}`}
                          onSelect={() => handleSelect(cmd)}
                          className="gap-3 px-3 py-2.5 text-sm"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{cmd.label}</span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
                {!isActionMode && groupedSearch && Object.keys(groupedSearch).length > 0 &&
                  Object.entries(groupedSearch).map(([groupLabel, items]) => {
                    const group = ENTITY_GROUPS.find(g => g.label === groupLabel)
                    const GroupIcon = group?.icon || FileText
                    return (
                      <CommandGroup key={groupLabel} heading={groupLabel}>
                        {items.map(cmd => (
                          <CommandItem
                            key={`${cmd.type}-${cmd.id}`}
                            value={`search-${cmd.entityType}-${cmd.id}`}
                            onSelect={() => handleSelect(cmd)}
                            className="gap-3 px-3 py-2.5 text-sm"
                          >
                            <GroupIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">{cmd.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/80 text-muted-foreground capitalize shrink-0">{groupLabel}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )
                  })}
              </CommandList>
            </Command>
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
              <span><kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">↑↓</kbd> Navegar</span>
              <span><kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">Enter</kbd> Seleccionar</span>
              <span><kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">Esc</kbd> Cerrar</span>
              {totalResults > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground/50">{totalResults} resultado{totalResults !== 1 ? 's' : ''}</span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
