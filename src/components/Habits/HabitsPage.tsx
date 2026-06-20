import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Activity, Flame, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

export default function HabitsPage() {
  const [habits, setHabits] = useState<any[]>([])
  const [habitLogs, setHabitLogs] = useState<Record<number, any[]>>({})
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('check')
  const [color, setColor] = useState('#6366f1')
  const [frequency, setFrequency] = useState('daily')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => { loadHabits() }, [])

  async function loadHabits() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getHabits()
    setHabits(data)
    for (const h of data) {
      const logs = await window.electronAPI.getHabitLogs(h.id)
      setHabitLogs(prev => ({ ...prev, [h.id]: logs }))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !window.electronAPI) return
    await window.electronAPI.createHabit({ name, icon, color, frequency } as any)
    setName(''); setOpen(false)
    loadHabits()
    toast({ title: 'Hábito creado', description: `"${name}" agregado.` })
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.deleteHabit(id)
    loadHabits()
    toast({ title: 'Hábito eliminado' })
  }

  async function toggleHabit(habitId: number, date: string) {
    if (!window.electronAPI) return
    await window.electronAPI.toggleHabitLog(habitId, date)
    loadHabits()
  }

  function getLastDays(n: number): string[] {
    const dates: string[] = []
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  function isCompleted(habitId: number, date: string): boolean {
    return (habitLogs[habitId] || []).some((l: any) => l.date === date && l.completed)
  }

  function getStreak(habitId: number): number {
    const logs = habitLogs[habitId] || []
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
      if (logs.some((l: any) => l.date === d && l.completed)) streak++
      else break
    }
    return streak
  }

  const last30Days = getLastDays(30)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-500" /> Hábitos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Trackea tus hábitos diarios</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuevo Hábito</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Hábito</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Estudiar 2 horas" required />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Icono</label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check">✓</SelectItem>
                      <SelectItem value="book">📚</SelectItem>
                      <SelectItem value="code">💻</SelectItem>
                      <SelectItem value="gym">💪</SelectItem>
                      <SelectItem value="read">📖</SelectItem>
                      <SelectItem value="meditate">🧘</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Color</label>
                  <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 p-1" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Frecuencia</label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Crear Hábito</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {habits.length === 0 && (
          <EmptyState icon={Activity} title="No hay hábitos" description="Crea tu primer hábito para empezar a trackear." />
        )}
        {habits.map((habit, i) => (
          <motion.div
            key={habit.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: habit.color + '20', color: habit.color }}>
                      {habit.icon === 'check' ? <CheckCircle2 className="h-4 w-4" /> : habit.icon}
                    </div>
                    <div>
                      <span className="font-medium">{habit.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3 text-orange-500" /> {getStreak(habit.id)} días seguidos
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(habit.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>

                {/* Calendar grid */}
                <div className="flex gap-0.5">
                  {last30Days.map(date => {
                    const completed = isCompleted(habit.id, date)
                    const isToday = date === new Date().toISOString().split('T')[0]
                    const dayNum = new Date(date + 'T12:00:00').getDate()
                    return (
                      <Tooltip key={date}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleHabit(habit.id, date)}
                            className={`w-[14px] h-[14px] rounded-[3px] transition-colors ${
                              isToday ? 'ring-1 ring-ring' : ''
                            } ${
                              completed
                                ? 'bg-green-500 hover:bg-green-400'
                                : 'bg-muted hover:bg-muted-foreground/20'
                            }`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {date}: {completed ? '✅ Completado' : '❌ Pendiente'}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Eliminar hábito"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  )
}
