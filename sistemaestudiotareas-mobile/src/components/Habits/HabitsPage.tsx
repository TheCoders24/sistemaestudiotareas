import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Activity, Flame, CheckCircle2, Edit3, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/ui/empty-state'
import { CardSkeleton } from '@/components/ui/loading-skeleton'

const ICONS = [
  { value: 'check', label: '✓' },
  { value: 'book', label: '📚' },
  { value: 'code', label: '💻' },
  { value: 'gym', label: '💪' },
  { value: 'read', label: '📖' },
  { value: 'meditate', label: '🧘' },
  { value: 'music', label: '🎵' },
  { value: 'water', label: '💧' },
  { value: 'sleep', label: '😴' },
]

const todayStr = () => new Date().toISOString().split('T')[0]
const dayStr = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().split('T')[0]

export default function HabitsPage() {
  const [habits, setHabits] = useState<any[]>([])
  const [habitLogs, setHabitLogs] = useState<Record<number, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editHabit, setEditHabit] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('check')
  const [color, setColor] = useState('#6366f1')
  const [frequency, setFrequency] = useState('daily')

  useEffect(() => { loadHabits() }, [])

  async function loadHabits() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getHabits()
    setHabits(data)
    const allLogs: Record<number, any[]> = {}
    await Promise.all(data.map(async (h: any) => {
      allLogs[h.id] = await window.electronAPI.getHabitLogs(h.id)
    }))
    setHabitLogs(allLogs)
    setLoading(false)
  }

  function openCreate() {
    setEditHabit(null)
    setName(''); setIcon('check'); setColor('#6366f1'); setFrequency('daily')
    setOpen(true)
  }

  function openEdit(habit: any) {
    setEditHabit(habit)
    setName(habit.name); setIcon(habit.icon); setColor(habit.color); setFrequency(habit.frequency)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !window.electronAPI) return
    if (editHabit) {
      await window.electronAPI.updateHabit(editHabit.id, { name, icon, color, frequency })
      toast({ title: 'Hábito actualizado' })
    } else {
      await window.electronAPI.createHabit({ name, icon, color, frequency } as any)
      toast({ title: 'Hábito creado', description: `"${name}" agregado.` })
    }
    setName(''); setOpen(false)
    loadHabits()
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

  const last30Days = useMemo(() => {
    const dates: string[] = []
    for (let i = 29; i >= 0; i--) dates.push(dayStr(i))
    return dates
  }, [])

  function isCompleted(habitId: number, date: string): boolean {
    return (habitLogs[habitId] || []).some((l: any) => l.date === date && l.completed)
  }

  const streaks = useMemo(() => {
    const result: Record<number, number> = {}
    for (const habitId of Object.keys(habitLogs)) {
      const logs = habitLogs[Number(habitId)] || []
      let streak = 0
      for (let i = 0; i < 365; i++) {
        const d = dayStr(i)
        if (logs.some((l: any) => l.date === d && l.completed)) streak++
        else break
      }
      result[Number(habitId)] = streak
    }
    return result
  }, [habitLogs])

  const completionRates = useMemo(() => {
    const rates: Record<number, number> = {}
    for (const habitId of Object.keys(habitLogs)) {
      const logs = habitLogs[Number(habitId)] || []
      const done = logs.filter((l: any) => l.completed).length
      rates[Number(habitId)] = Math.round((done / 30) * 100)
    }
    return rates
  }, [habitLogs])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-500" /> Hábitos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Trackea tus hábitos diarios</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nuevo Hábito</Button>
      </div>

      {/* Dialogs */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editHabit ? 'Editar Hábito' : 'Crear Hábito'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Estudiar 2 horas" required />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Icono</label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICONS.map(ic => (
                      <SelectItem key={ic.value} value={ic.value}>{ic.label}</SelectItem>
                    ))}
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
            <Button type="submit" className="w-full">{editHabit ? 'Guardar Cambios' : 'Crear Hábito'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        ) : habits.length === 0 ? (
          <EmptyState icon={Activity} title="No hay hábitos" description="Creá un hábito para hacer seguimiento diario." actionLabel="Crear hábito" onAction={openCreate} />
        ) : (
        habits.map((habit, i) => (
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
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: habit.color + '20', color: habit.color }}>
                      {habit.icon === 'check' ? <CheckCircle2 className="h-4 w-4" /> : habit.icon}
                    </div>
                    <div>
                      <span className="font-medium">{habit.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3 text-orange-500" /> {streaks[habit.id] ?? 0} días
                        <BarChart3 className="h-3 w-3 ml-1 text-indigo-500" /> {completionRates[habit.id] ?? 0}%
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => openEdit(habit)}>
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => handleDelete(habit.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-0.5 overflow-x-auto pb-1">
                  {last30Days.map(date => {
                    const completed = isCompleted(habit.id, date)
                    const isToday = date === todayStr()
                    return (
                      <Tooltip key={date}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleHabit(habit.id, date)}
                            className={`min-w-[18px] w-[18px] h-[18px] sm:min-w-[14px] sm:w-[14px] sm:h-[14px] rounded-[3px] transition-colors ${
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
        )))}
      </div>
    </div>
  )
}