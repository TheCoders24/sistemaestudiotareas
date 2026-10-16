import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee, Timer, Zap, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface PomodoroSettings {
  pomodoro: number
  shortBreak: number
  longBreak: number
  autoStartBreak: boolean
  autoStartPomodoro: boolean
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  autoStartBreak: false,
  autoStartPomodoro: false,
}

function loadSettings(): PomodoroSettings {
  try {
    const saved = localStorage.getItem('pomodoroSettings')
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

interface Task { id: number; title: string; completed: number; project_id?: number | null }

interface Props { onComplete?: () => void }

export function PomodoroTimer({ onComplete }: Props) {
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings)
  const saved = (() => { try { return JSON.parse(localStorage.getItem('pomodoroState') || 'null') } catch { return null } })()
  const [mode, setMode] = useState<'pomodoro' | 'short' | 'long'>(saved?.mode || 'pomodoro')
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (saved && saved.running && saved.savedAt) {
      const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000)
      const remaining = saved.timeLeft - elapsed
      if (saved.mode === 'pomodoro' && remaining > 0) return remaining
    }
    return saved?.timeLeft ?? settings.pomodoro * 60
  })
  const [running, setRunning] = useState(saved?.running && saved?.timeLeft > 0 ? false : false)
  const sessions = usePomodoroStore(s => s.pomodoroCount)
  const [todayCount, setTodayCount] = useState(0)
  const [linkTaskId, setLinkTaskId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const modeRef = useRef(mode)
  const sessionsRef = useRef(sessions)
  const completedRef = useRef(false)
  const settingsRef = useRef(settings)
  const tasksRef = useRef<Task[]>([])

  useEffect(() => { settingsRef.current = settings }, [settings])

  function getDurations() {
    return {
      pomodoro: settings.pomodoro * 60,
      short: settings.shortBreak * 60,
      long: settings.longBreak * 60,
    }
  }

  const MODES: Record<'pomodoro' | 'short' | 'long', { label: string; duration: number; color: string; icon: typeof Timer }> = {
    pomodoro: { label: 'Pomodoro', duration: settings.pomodoro * 60, color: 'text-red-500', icon: Timer },
    short: { label: 'Descanso Corto', duration: settings.shortBreak * 60, color: 'text-green-500', icon: Coffee },
    long: { label: 'Descanso Largo', duration: settings.longBreak * 60, color: 'text-blue-500', icon: Coffee },
  }

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { sessionsRef.current = sessions }, [sessions])
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  useEffect(() => {
    try {
      localStorage.setItem('pomodoroState', JSON.stringify({ mode, timeLeft, running, savedAt: Date.now() }))
    } catch {}
  }, [mode, timeLeft, running])

  useEffect(() => {
    if (window.electronAPI) {
      const today = new Date().toISOString().split('T')[0]
      window.electronAPI.pomodoro.sessions.list(today).then((s: any[]) => setTodayCount(s.length))
      window.electronAPI.tasks.list().then((t: Task[]) => setTasks(t.filter(task => !task.completed)))
    }
  }, [])

  useEffect(() => {
    if (running) {
      completedRef.current = false
      startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = null
            completedRef.current = true
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  useEffect(() => {
    if (completedRef.current) {
      completedRef.current = false
      handleComplete()
    }
  }, [timeLeft])

  function switchMode(newMode: 'pomodoro' | 'short' | 'long') {
    setMode(newMode)
    const d = getDurations()
    setTimeLeft(newMode === 'pomodoro' ? d.pomodoro : newMode === 'short' ? d.short : d.long)
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function updateSettings(partial: Partial<PomodoroSettings>) {
    const next = { ...settings, ...partial }
    setSettings(next)
    localStorage.setItem('pomodoroSettings', JSON.stringify(next))
    if (Object.prototype.hasOwnProperty.call(partial, 'pomodoro') || Object.prototype.hasOwnProperty.call(partial, 'shortBreak') || Object.prototype.hasOwnProperty.call(partial, 'longBreak')) {
      if (!running) {
        const dur = mode === 'pomodoro' ? next.pomodoro * 60 : mode === 'short' ? next.shortBreak * 60 : next.longBreak * 60
        setTimeLeft(dur)
      }
    }
  }

  function handleComplete() {
    setRunning(false)
    const endedAt = new Date().toISOString()
    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : MODES[modeRef.current].duration
    const startedAt = new Date(Date.now() - elapsed * 1000).toISOString()
    const currentMode = modeRef.current
    const currentSessions = sessionsRef.current
    const dur = getDurations()

    if (currentMode === 'pomodoro' && window.electronAPI) {
      const linkedTask = tasksRef.current.find(t => t.id === linkTaskId)
      window.electronAPI.pomodoro.sessions.create({
        task_id: linkTaskId, project_id: linkedTask?.project_id ?? null, duration: dur.pomodoro,
        started_at: startedAt, ended_at: endedAt,
      } as any).catch(() => {
        toast({ title: 'Aviso', description: 'No se pudo guardar la sesión de pomodoro', variant: 'destructive' })
      })
      window.electronAPI.app.notification.show('🍅 Pomodoro Completado', '¡Buen trabajo! Tómate un descanso.')
      toast({ title: '🍅 Pomodoro completado', description: '¡Buen trabajo!' })
      usePomodoroStore.setState(s => ({ pomodoroCount: s.pomodoroCount + 1, totalPomodoros: s.totalPomodoros + 1 }))
      setTodayCount(c => c + 1)
      if (onComplete) onComplete()

      const nextMode = (currentSessions + 1) % 4 === 0 ? 'long' : 'short'
      if (settingsRef.current.autoStartBreak) {
        setMode(nextMode)
        setTimeLeft(nextMode === 'short' ? dur.short : dur.long)
        setRunning(true)
      } else {
        setMode(nextMode)
        setTimeLeft(nextMode === 'short' ? dur.short : dur.long)
      }
    } else {
      if (window.electronAPI) window.electronAPI.app.notification.show('⏰ Descanso terminado', '¡De vuelta al trabajo!')
      if (settingsRef.current.autoStartPomodoro) {
        setMode('pomodoro')
        setTimeLeft(dur.pomodoro)
        setRunning(true)
      } else {
        switchMode('pomodoro')
      }
    }
  }

  function toggleRunning() {
    if (timeLeft === 0) {
      const dur = getDurations()
      const next = mode === 'pomodoro' ? dur.pomodoro : mode === 'short' ? dur.short : dur.long
      setTimeLeft(next)
    }
    setRunning(!running)
  }

  function resetTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    const dur = getDurations()
    setTimeLeft(mode === 'pomodoro' ? dur.pomodoro : mode === 'short' ? dur.short : dur.long)
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const currentDuration = mode === 'pomodoro' ? settings.pomodoro * 60 : mode === 'short' ? settings.shortBreak * 60 : settings.longBreak * 60
  const progress = 1 - timeLeft / currentDuration
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Timer className="h-6 w-6 text-indigo-500" /> Pomodoro
        </h1>
        <Badge variant="secondary" className="text-xs">{todayCount} hoy</Badge>
      </div>

      <div className="flex justify-center gap-2 mb-8">
        {(Object.keys(MODES) as Array<keyof typeof MODES>).map(key => (
          <Button key={key} variant={mode === key ? 'default' : 'ghost'} size="sm" onClick={() => switchMode(key)} className="text-xs">
            {MODES[key].label}
          </Button>
        ))}
      </div>

      <div className="relative w-64 h-64 mx-auto mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <motion.circle
            cx="130" cy="130" r="120" fill="none"
            stroke={mode === 'pomodoro' ? '#ef4444' : mode === 'short' ? '#22c55e' : '#3b82f6'}
            strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference}
            animate={{ strokeDashoffset }} transition={{ duration: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-6xl font-mono font-bold ${MODES[mode].color}`}>{formatTime(timeLeft)}</span>
          <span className="text-sm text-muted-foreground mt-1">{MODES[mode].label}</span>
        </div>
      </div>

      <div className="flex justify-center gap-3 mb-8">
        <Button onClick={toggleRunning} size="lg" className="w-32">
          {running ? <><Pause className="h-5 w-5 mr-1" /> Pausa</> : <><Play className="h-5 w-5 mr-1" /> Iniciar</>}
        </Button>
        <Button variant="outline" size="icon" onClick={resetTimer} className="h-11 w-11">
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11">
              <Settings className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Configurar Pomodoro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Duración del pomodoro (min)</Label>
                <Input type="number" min={1} max={120} value={settings.pomodoro}
                  onChange={e => updateSettings({ pomodoro: Math.max(1, parseInt(e.target.value) || 25) })} />
              </div>
              <div>
                <Label>Descanso corto (min)</Label>
                <Input type="number" min={1} max={60} value={settings.shortBreak}
                  onChange={e => updateSettings({ shortBreak: Math.max(1, parseInt(e.target.value) || 5) })} />
              </div>
              <div>
                <Label>Descanso largo (min)</Label>
                <Input type="number" min={1} max={120} value={settings.longBreak}
                  onChange={e => updateSettings({ longBreak: Math.max(1, parseInt(e.target.value) || 15) })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="autoBreak">Auto-iniciar descanso</Label>
                <Switch id="autoBreak" checked={settings.autoStartBreak}
                  onCheckedChange={v => updateSettings({ autoStartBreak: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="autoPomodoro">Auto-iniciar pomodoro</Label>
                <Switch id="autoPomodoro" checked={settings.autoStartPomodoro}
                  onCheckedChange={v => updateSettings({ autoStartPomodoro: v })} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Vincular tarea:</span>
            <Select value={linkTaskId?.toString() || ''} onValueChange={v => setLinkTaskId(v ? Number(v) : null)}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Sin tarea" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin tarea</SelectItem>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id.toString()}>{task.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
