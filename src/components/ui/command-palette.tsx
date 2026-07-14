import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'
import {
  Clock, LayoutDashboard, CheckSquare, BookOpen, BarChart3,
  StickyNote, Target, FolderKanban, NotebookPen, Code2, Activity,
  Search, Command, Zap, Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface CommandItem {
  id: string
  label: string
  icon: React.ElementType
  shortcut?: string
  action: () => void
}

const COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Ir a Dashboard', icon: Home, shortcut: 'Ctrl+Shift+H', action: () => useAppStore.getState().setActiveTab('dashboard') },
  { id: 'pomodoro', label: 'Ir a Pomodoro', icon: Clock, shortcut: 'Ctrl+P', action: () => useAppStore.getState().setActiveTab('pomodoro') },
  { id: 'kanban', label: 'Ir a Kanban', icon: LayoutDashboard, shortcut: 'Ctrl+K', action: () => useAppStore.getState().setActiveTab('kanban') },
  { id: 'tareas', label: 'Ir a Tareas', icon: CheckSquare, shortcut: 'Ctrl+T', action: () => useAppStore.getState().setActiveTab('tareas') },
  { id: 'proyectos', label: 'Ir a Proyectos', icon: FolderKanban, shortcut: 'Ctrl+Shift+P', action: () => useAppStore.getState().setActiveTab('proyectos') },
  { id: 'diario', label: 'Ir a Diario', icon: NotebookPen, shortcut: 'Ctrl+D', action: () => useAppStore.getState().setActiveTab('diario') },
  { id: 'snippets', label: 'Ir a Snippets', icon: Code2, shortcut: 'Ctrl+Shift+S', action: () => useAppStore.getState().setActiveTab('snippets') },
  { id: 'habitos', label: 'Ir a Hábitos', icon: Activity, shortcut: 'Ctrl+H', action: () => useAppStore.getState().setActiveTab('habitos') },
  { id: 'mapa', label: 'Ir a Mapa de Estudio', icon: BookOpen, shortcut: 'Ctrl+M', action: () => useAppStore.getState().setActiveTab('mapa') },
  { id: 'stats', label: 'Ir a Estadísticas', icon: BarChart3, shortcut: 'Ctrl+E', action: () => useAppStore.getState().setActiveTab('stats') },
  { id: 'notas', label: 'Ir a Notas', icon: StickyNote, shortcut: 'Ctrl+N', action: () => useAppStore.getState().setActiveTab('notas') },
  { id: 'metas', label: 'Ir a Metas', icon: Target, shortcut: 'Ctrl+G', action: () => useAppStore.getState().setActiveTab('metas') },
  { id: 'toggle-dark', label: 'Cambiar tema oscuro/claro', icon: Zap, action: () => useAppStore.getState().setDarkMode(!useAppStore.getState().darkMode) },
  { id: 'toggle-sidebar', label: 'Mostrar/Ocultar barra lateral', icon: Zap, action: () => useAppStore.getState().toggleSidebar() },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
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
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const executeCommand = useCallback((cmd: CommandItem) => {
    cmd.action()
    setOpen(false)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      executeCommand(filtered[selectedIndex])
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[15%] sm:max-w-[500px] p-0 gap-0">
        <div className="flex items-center border-b px-3">
          <Command className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un comando o busca..."
            className="flex-1 h-11 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sin resultados</p>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                  i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50',
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-left">{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted border text-muted-foreground">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
