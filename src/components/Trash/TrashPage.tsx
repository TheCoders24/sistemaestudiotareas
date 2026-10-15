import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trash2, RotateCcw, Trash, FileText, CheckSquare, FolderKanban, Kanban, Heart, Target, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/ui/empty-state'

export default function TrashPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [kanbanCards, setKanbanCards] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [snippets, setSnippets] = useState<any[]>([])

  const loadTrash = () => {
    if (!window.electronAPI) return
    window.electronAPI.trash.list().then((r: any) => {
      setTasks(r.tasks || [])
      setNotes(r.notes || [])
      setProjects(r.projects || [])
      setKanbanCards(r.kanbanCards || [])
      setHabits(r.habits || [])
      setGoals(r.goals || [])
      setSnippets(r.snippets || [])
    })
  }

  useEffect(() => { loadTrash() }, [])

  const total = tasks.length + notes.length + projects.length + kanbanCards.length + habits.length + goals.length + snippets.length

  function handleRestore(type: string, id: number) {
    if (window.electronAPI) {
      window.electronAPI.trash.restore(type, id).then(() => {
        toast({ title: 'Elemento restaurado' })
        loadTrash()
      })
    }
  }

  function handleDeletePermanent(type: string, id: number) {
    if (window.electronAPI) {
      window.electronAPI.trash.deletePermanent(type, id).then(() => {
        toast({ title: 'Eliminado permanentemente' })
        loadTrash()
      })
    }
  }

  function handleEmptyTrash() {
    if (window.electronAPI) {
      window.electronAPI.trash.empty().then(() => {
        toast({ title: 'Papelera vaciada' })
        loadTrash()
      })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-500" />
            Papelera
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{total} elementos (se eliminan automáticamente a los 30 días)</p>
        </div>
        {total > 0 && (
          <Button variant="destructive" size="sm" onClick={handleEmptyTrash}>
            <Trash className="h-4 w-4 mr-1" /> Vaciar papelera
          </Button>
        )}
      </motion.div>

      {total === 0 && (
        <EmptyState icon={Trash2} title="Papelera vacía" description="Los elementos eliminados aparecerán aquí y se borrarán automáticamente a los 30 días." />
      )}

      {tasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2"><CheckSquare className="h-4 w-4" /> Tareas ({tasks.length})</h2>
          <div className="space-y-1">
            {tasks.map((t: any) => (
              <div key={`task-${t.id}`} className="flex items-center justify-between p-2 rounded bg-accent/50 text-sm">
                <span className="truncate">{t.title}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRestore('task', t.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDeletePermanent('task', t.id)}>
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Notas ({notes.length})</h2>
          <div className="space-y-1">
            {notes.map((n: any) => (
              <div key={`note-${n.id}`} className="flex items-center justify-between p-2 rounded bg-accent/50 text-sm">
                <span className="truncate">{n.title}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRestore('note', n.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDeletePermanent('note', n.id)}>
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2"><FolderKanban className="h-4 w-4" /> Proyectos ({projects.length})</h2>
          <div className="space-y-1">
            {projects.map((p: any) => (
              <div key={`proj-${p.id}`} className="flex items-center justify-between p-2 rounded bg-accent/50 text-sm">
                <span className="truncate">{p.name}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRestore('project', p.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDeletePermanent('project', p.id)}>
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {kanbanCards.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2"><Kanban className="h-4 w-4" /> Tarjetas Kanban ({kanbanCards.length})</h2>
          <div className="space-y-1">
            {kanbanCards.map((k: any) => (
              <div key={`kanban-${k.id}`} className="flex items-center justify-between p-2 rounded bg-accent/50 text-sm">
                <span className="truncate">{k.title}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRestore('kanban', k.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDeletePermanent('kanban', k.id)}>
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {habits.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2"><Heart className="h-4 w-4" /> Hábitos ({habits.length})</h2>
          <div className="space-y-1">
            {habits.map((h: any) => (
              <div key={`habit-${h.id}`} className="flex items-center justify-between p-2 rounded bg-accent/50 text-sm">
                <span className="truncate">{h.title}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRestore('habit', h.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDeletePermanent('habit', h.id)}>
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2"><Target className="h-4 w-4" /> Metas ({goals.length})</h2>
          <div className="space-y-1">
            {goals.map((g: any) => (
              <div key={`goal-${g.id}`} className="flex items-center justify-between p-2 rounded bg-accent/50 text-sm">
                <span className="truncate">{g.title}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRestore('goal', g.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDeletePermanent('goal', g.id)}>
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {snippets.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2"><Code2 className="h-4 w-4" /> Snippets ({snippets.length})</h2>
          <div className="space-y-1">
            {snippets.map((s: any) => (
              <div key={`snippet-${s.id}`} className="flex items-center justify-between p-2 rounded bg-accent/50 text-sm">
                <span className="truncate">{s.title}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRestore('snippet', s.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDeletePermanent('snippet', s.id)}>
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
