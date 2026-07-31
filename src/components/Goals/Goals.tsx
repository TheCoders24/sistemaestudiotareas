import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Target, Plus, Trash2, CalendarDays, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useUndoStore } from '@/stores/undoStore'
import { EmptyState } from '@/components/ui/empty-state'

interface Goal {
  id: number
  title: string
  type: string
  target: number
  metric: string
  created_at: string
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [progress, setProgress] = useState<Record<number, number>>({})
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('daily')
  const [target, setTarget] = useState(4)
  const [metric, setMetric] = useState('pomodoros')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { pushAction } = useUndoStore()
  const [predictions, setPredictions] = useState<Record<number, string>>({})

  useEffect(() => { loadGoals() }, [])

  async function loadGoals() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.goals.list()
    setGoals(data)
    await computeProgress(data)
  }

  async function computeProgress(goalsData: Goal[]) {
    if (!window.electronAPI) return
    const today = new Date().toISOString().split('T')[0]
    const [sessions, tasks] = await Promise.all([
      window.electronAPI.pomodoro.sessions.list(today).catch(() => []) || [],
      window.electronAPI.tasks.list().catch(() => []) || [],
    ])

    const todaySessions = sessions?.length || 0

    const todayTasks = tasks?.filter((t: any) => {
      if (!t.completed) return false
      const doneDate = t.updated_at?.split('T')[0] || ''
      return doneDate === today
    }).length || 0

    const weeklySessions = sessions?.length || 0

    const progressMap: Record<number, number> = {}
    const predMap: Record<number, string> = {}
    for (const goal of goalsData) {
      let current = 0
      if (goal.metric === 'pomodoros') {
        current = goal.type === 'daily' ? todaySessions : weeklySessions
      } else if (goal.metric === 'tareas') {
        current = goal.type === 'daily' ? todayTasks : todayTasks
      } else if (goal.metric === 'estudio') {
        current = goal.type === 'daily' ? todaySessions : weeklySessions
      }
      progressMap[goal.id] = Math.min(current, goal.target)
      if (goal.target > current && current > 0) {
        const remaining = goal.target - current
        const dailyRate = goal.type === 'daily' ? current : current / 7
        if (dailyRate > 0) {
          const daysNeeded = Math.ceil(remaining / dailyRate)
          const targetDate = new Date()
          targetDate.setDate(targetDate.getDate() + daysNeeded)
          predMap[goal.id] = `~${daysNeeded} días (${targetDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })})`
        }
      } else if (current >= goal.target) {
        predMap[goal.id] = '¡Meta alcanzada!'
      }
    }
    setProgress(progressMap)
    setPredictions(predMap)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !window.electronAPI) return
    try {
      await window.electronAPI.goals.create({ title, type, target: Number(target), metric } as any)
      setTitle(''); setTarget(4)
      setShowForm(false)
      loadGoals()
      toast({ title: 'Meta creada', description: `"${title}" agregada.` })
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la meta', variant: 'destructive' })
    }
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    const goal = goals.find(g => g.id === id)
    try {
      await window.electronAPI.trash.softDelete('goal', id)
      loadGoals()
      if (goal) {
        pushAction({
          label: `"${goal.title}" eliminada`,
          onUndo: async () => {
            if (window.electronAPI) {
              await window.electronAPI.trash.restore('goal', id)
              loadGoals()
            }
          },
        })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar la meta', variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" /> Metas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Define y sigue tus objetivos</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cerrar' : 'Nueva Meta'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate}>
            <CardContent className="pt-4 space-y-3">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Completar 4 pomodoros" autoFocus required />
              <div className="flex gap-3">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">📅 Diaria</SelectItem>
                    <SelectItem value="weekly">📅 Semanal</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pomodoros">🍅 Pomodoros</SelectItem>
                    <SelectItem value="tareas">✅ Tareas</SelectItem>
                    <SelectItem value="estudio">📚 Estudio</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} className="w-20" min={1} />
              </div>
              <Button type="submit" className="w-full">✓ Crear Meta</Button>
            </CardContent>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {goals.length === 0 && (
          <EmptyState icon={Target} title="No hay metas" description="Define tu primera meta para empezar." actionLabel="Crear meta" onAction={() => setShowForm(true)} />
        )}
        {goals.map((goal, i) => (
          <motion.div key={goal.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="py-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{goal.title}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      {goal.type === 'daily' ? <CalendarDays className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {goal.type === 'daily' ? 'Diaria' : 'Semanal'} · Meta: {goal.target} {goal.metric}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(goal.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                <Progress
                  value={(progress[goal.id] || 0) / goal.target * 100}
                  className={`h-2 ${(progress[goal.id] || 0) >= goal.target ? 'bg-green-500/20' : ''}`}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">{progress[goal.id] || 0}/{goal.target} completado</p>
                  {predictions[goal.id] && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {predictions[goal.id]}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Eliminar meta"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  )
}
