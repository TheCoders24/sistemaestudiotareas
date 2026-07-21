import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee, Timer, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { usePomodoroStore } from '@/stores/pomodoroStore'

const POMODORO = 25 * 60
const SHORT_BREAK = 5 * 60
const LONG_BREAK = 15 * 60

interface Task {
  id: number
  title: string
  completed: number
}

interface Props {
  onComplete?: () => void
}

export function PomodoroTimer({ onComplete }: Props) {
  const [mode, setMode] = useState<'pomodoro' | 'short' | 'long'>('pomodoro')
  const [timeLeft, setTimeLeft] = useState(POMODORO)
  const [running, setRunning] = useState(false)
  const sessions = usePomodoroStore(s => s.pomodoroCount)
  const [todayCount, setTodayCount] = useState(0)
  const [linkTaskId, setLinkTaskId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const modeRef = useRef(mode)
  const sessionsRef = useRef(sessions)
  const completedRef = useRef(false)

  const MODES = {
    pomodoro: { label: 'Pomodoro', duration: POMODORO, color: 'text-red-500', icon: Timer },
    short: { label: 'Descanso Corto', duration: SHORT_BREAK, color: 'text-green-500', icon: Coffee },
    long: { label: 'Descanso Largo', duration: LONG_BREAK, color: 'text-blue-500', icon: Coffee },
  }

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  useEffect(() => {
    if (window.electronAPI) {
      const today = new Date().toISOString().split('T')[0]
      window.electronAPI.getPomodoroSessions(today).then((s: any[]) => setTodayCount(s.length))
      window.electronAPI.getTasks().then((t: Task[]) => setTasks(t.filter(task => !task.completed)))
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

  function switchMode(newMode: 'pomodoro' | 'short' | 'long') {
    setMode(newMode)
    setTimeLeft(MODES[newMode].duration)
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function handleComplete() {
    setRunning(false)
    const endedAt = new Date().toISOString()
    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : MODES[modeRef.current].duration
    const startedAt = new Date(Date.now() - elapsed * 1000).toISOString()
    const currentMode = modeRef.current
    const currentSessions = sessionsRef.current

    if (currentMode === 'pomodoro' && window.electronAPI) {
      window.electronAPI.createPomodoroSession({
        task_id: linkTaskId,
        project_id: null,
        duration: MODES.pomodoro.duration,
        started_at: startedAt,
        ended_at: endedAt,
      } as any)
      window.electronAPI.showNotification('🍅 Pomodoro Completado', '¡Buen trabajo! Tómate un descanso.')
      toast({ title: '🍅 Pomodoro completado', description: '¡Buen trabajo!' })
      usePomodoroStore.setState(s => ({ pomodoroCount: s.pomodoroCount + 1, totalPomodoros: s.totalPomodoros + 1 }))
      setTodayCount(c => c + 1)
      if (onComplete) onComplete()

      if ((currentSessions + 1) % 4 === 0) switchMode('long')
      else switchMode('short')
    } else {
      if (window.electronAPI) window.electronAPI.showNotification('⏰ Descanso terminado', '¡De vuelta al trabajo!')
      switchMode('pomodoro')
    }
  }

  useEffect(() => {
    if (completedRef.current) {
      completedRef.current = false
      handleComplete()
    }
  }, [timeLeft])

  function toggleRunning() {
    if (timeLeft === 0) setTimeLeft(MODES[mode].duration)
    setRunning(!running)
  }

  function resetTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setTimeLeft(MODES[mode].duration)
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = 1 - timeLeft / MODES[mode].duration
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

      {/* Mode selector */}
      <div className="flex justify-center gap-2 mb-8">
        {(Object.keys(MODES) as Array<keyof typeof MODES>).map(key => (
          <Button
            key={key}
            variant={mode === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => switchMode(key)}
            className="text-xs"
          >
            {MODES[key].label}
          </Button>
        ))}
      </div>

      {/* Timer circle */}
      <div className="relative w-64 h-64 mx-auto mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <motion.circle
            cx="130" cy="130" r="120" fill="none"
            stroke={mode === 'pomodoro' ? '#ef4444' : mode === 'short' ? '#22c55e' : '#3b82f6'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-6xl font-mono font-bold ${MODES[mode].color}`}>
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm text-muted-foreground mt-1">{MODES[mode].label}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 mb-8">
        <Button onClick={toggleRunning} size="lg" className="w-32">
          {running ? <><Pause className="h-5 w-5 mr-1" /> Pausa</> : <><Play className="h-5 w-5 mr-1" /> Iniciar</>}
        </Button>
        <Button variant="outline" size="icon" onClick={resetTimer} className="h-11 w-11">
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Link task */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Vincular tarea:</span>
            <Select
              value={linkTaskId?.toString() || ''}
              onValueChange={v => setLinkTaskId(v ? Number(v) : null)}
            >
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
