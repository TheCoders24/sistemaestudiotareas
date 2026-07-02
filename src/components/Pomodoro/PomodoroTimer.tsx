import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, RotateCcw, Coffee, Timer, Zap, Maximize2, Minimize2,
  Plus, Minus, History, BarChart3, Settings2, SkipForward, ListChecks,
  Volume2, VolumeX
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { toast } from '@/components/ui/use-toast'
import { useAppStore } from '@/stores/appStore'
import { safeIpc } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import type { PomodoroSession } from '@/types'

const DEFAULTS = { pomodoro: 25, short: 5, long: 15 }

const SOUND_OPTIONS = [
  { id: 'beep', label: 'Bip' },
  { id: 'chime', label: 'Campana' },
  { id: 'bell', label: 'Timbre' },
  { id: 'none', label: 'Silencio' },
]

function loadSettings() {
  try {
    const raw = localStorage.getItem('pomodoro_settings')
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { durations: { ...DEFAULTS }, autoAdvance: true, dailyGoal: 8, sound: 'chime' }
}

function saveSettings(s: any) {
  localStorage.setItem('pomodoro_settings', JSON.stringify(s))
}

interface Task { id: number; title: string; completed: number }
interface Props { onComplete?: () => void }

const MODE_LABELS = { pomodoro: 'Pomodoro', short: 'Descanso Corto', long: 'Descanso Largo' } as const

export default function PomodoroTimer({ onComplete }: Props) {
  const { durations, ...settings } = loadSettings()
  const [durationState, setDurationState] = useState(durations)
  const [autoAdvance, setAutoAdvance] = useState(settings.autoAdvance)
  const [dailyGoal, setDailyGoal] = useState(settings.dailyGoal)
  const [soundPref, setSoundPref] = useState(settings.sound)
  const [mode, setMode] = useState<'pomodoro' | 'short' | 'long'>('pomodoro')
  const [timeLeft, setTimeLeft] = useState(durationState.pomodoro * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [linkTaskId, setLinkTaskId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([])
  const [weeklyData, setWeeklyData] = useState<{ date: string; count: number }[]>([])
  const [showCompletion, setShowCompletion] = useState(false)
  const [completedTaskTitle, setCompletedTaskTitle] = useState('')
  const focusMode = useAppStore((s) => s.focusMode)
  const setFocusMode = useAppStore((s) => s.setFocusMode)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const modeRef = useRef(mode)
  const sessionsRef = useRef(sessions)
  const linkTaskIdRef = useRef(linkTaskId)
  const soundPrefRef = useRef(soundPref)
  const autoAdvanceRef = useRef(autoAdvance)

  useEffect(() => { linkTaskIdRef.current = linkTaskId }, [linkTaskId])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { sessionsRef.current = sessions }, [sessions])
  useEffect(() => { soundPrefRef.current = soundPref }, [soundPref])
  useEffect(() => { autoAdvanceRef.current = autoAdvance }, [autoAdvance])

  const MODES = useMemo(() => ({
    pomodoro: { label: 'Pomodoro', duration: durationState.pomodoro * 60, color: 'text-red-500', icon: Timer, stroke: '#ef4444' },
    short: { label: 'Descanso Corto', duration: durationState.short * 60, color: 'text-green-500', icon: Coffee, stroke: '#22c55e' },
    long: { label: 'Descanso Largo', duration: durationState.long * 60, color: 'text-blue-500', icon: Coffee, stroke: '#3b82f6' },
  }), [durationState])

  useEffect(() => {
    const payload = { durations: durationState, autoAdvance, dailyGoal, sound: soundPref }
    saveSettings(payload)
  }, [durationState, autoAdvance, dailyGoal, soundPref])

  const adjustDuration = useCallback((key: keyof typeof DEFAULTS, delta: number) => {
    setDurationState(prev => {
      const next = { ...prev, [key]: Math.max(1, Math.min(120, prev[key] + delta)) }
      return next
    })
    if (!running) {
      const d = key === 'pomodoro' ? durationState.pomodoro : key === 'short' ? durationState.short : durationState.long
      const newD = Math.max(1, Math.min(120, d + delta))
      if (key === mode) setTimeLeft(newD * 60)
    }
  }, [running, durationState, mode])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    safeIpc<PomodoroSession[]>('getPomodoroSessions', today).then(s => {
      if (s) { setTodayCount(s.length); setTodaySessions(s) }
    })
    safeIpc<Task[]>('getTasks').then(t => { if (t) setTasks(t.filter(task => !task.completed)) })
    loadWeeklyStats()
  }, [])

  async function loadWeeklyStats() {
    const data: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
      const sessions = await safeIpc<PomodoroSession[]>('getPomodoroSessions', d)
      data.push({ date: d, count: sessions?.length ?? 0 })
    }
    setWeeklyData(data)
  }

  function playSound(soundId: string) {
    if (soundId === 'none') return
    const context = new AudioContext()
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.connect(gain)
    gain.connect(context.destination)
    gain.gain.value = 0.3
    if (soundId === 'beep') {
      osc.frequency.value = 880
      osc.type = 'square'
      osc.start(); osc.stop(context.currentTime + 0.15)
    } else if (soundId === 'chime') {
      osc.frequency.value = 660
      osc.type = 'sine'
      osc.start()
      setTimeout(() => { osc.frequency.value = 880 }, 100)
      osc.stop(context.currentTime + 0.4)
    } else if (soundId === 'bell') {
      osc.frequency.value = 523
      osc.type = 'sine'
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1)
      osc.stop(context.currentTime + 1)
    }
  }

  const switchMode = useCallback((newMode: 'pomodoro' | 'short' | 'long') => {
    setMode(newMode)
    const d = newMode === 'pomodoro' ? durationState.pomodoro : newMode === 'short' ? durationState.short : durationState.long
    setTimeLeft(d * 60)
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [durationState])

  const handleComplete = useCallback(() => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    const endedAt = new Date().toISOString()
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : durationState[modeRef.current] * 60
    const startedAt = new Date(Date.now() - elapsed * 1000).toISOString()
    const currentMode = modeRef.current
    const currentSessions = sessionsRef.current
    const linkedTask = linkTaskIdRef.current
      ? tasks.find(t => t.id === linkTaskIdRef.current)
      : null

    setShowCompletion(true)
    setCompletedTaskTitle(linkedTask?.title || '')

    if (currentMode === 'pomodoro') {
      playSound(soundPrefRef.current)
      safeIpc('createPomodoroSession', {
        task_id: linkTaskIdRef.current,
        project_id: null,
        duration: durationState.pomodoro * 60,
        started_at: startedAt,
        ended_at: endedAt,
      })
      safeIpc('showNotification', 'Pomodoro Completado', 'Buen trabajo! Tomate un descanso.')
      toast({
        title: 'Pomodoro completado',
        description: linkedTask ? `Tarea: ${linkedTask.title}` : 'Buen trabajo!',
      })
      setSessions(s => s + 1)
      setTodayCount(c => c + 1)
      setTodaySessions(prev => [...prev, {
        id: Date.now(), task_id: linkTaskIdRef.current, project_id: null,
        duration: durationState.pomodoro * 60,
        started_at: startedAt, ended_at: endedAt,
      }])
      if (onComplete) onComplete()

      setTimeout(() => setShowCompletion(false), 2000)

      if (autoAdvanceRef.current) {
        setTimeout(() => {
          if ((currentSessions + 1) % 4 === 0) switchMode('long')
          else switchMode('short')
        }, 2000)
      } else {
        if ((currentSessions + 1) % 4 === 0) switchMode('long')
        else switchMode('short')
      }
    } else {
      playSound(soundPrefRef.current)
      safeIpc('showNotification', 'Descanso terminado', 'De vuelta al trabajo!')
      if (autoAdvanceRef.current) {
        setTimeout(() => switchMode('pomodoro'), 2000)
      } else {
        switchMode('pomodoro')
      }
    }
  }, [durationState, onComplete, switchMode, tasks])

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            handleComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, handleComplete])

  const toggleRunning = useCallback(() => {
    const d = mode === 'pomodoro' ? durationState.pomodoro : mode === 'short' ? durationState.short : durationState.long
    if (timeLeft === 0) setTimeLeft(d * 60)
    setRunning(!running)
    if (!running && mode === 'pomodoro') setFocusMode(true)
    else setFocusMode(false)
  }, [timeLeft, running, mode, durationState, setFocusMode])

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    const d = mode === 'pomodoro' ? durationState.pomodoro : mode === 'short' ? durationState.short : durationState.long
    setTimeLeft(d * 60)
  }, [mode, durationState])

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = 1 - timeLeft / MODES[mode].duration
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference * (1 - progress)
  const ModeIcon = MODES[mode].icon
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
  const maxWeekly = Math.max(...weeklyData.map(d => d.count), 1)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Timer className="h-6 w-6 text-indigo-500" /> Pomodoro
        </h1>
        <Badge variant="secondary" className="text-xs gap-1">
          <Zap className="h-3 w-3" /> {todayCount} hoy {dailyGoal > 0 && `/ ${dailyGoal}`}
        </Badge>
        {dailyGoal > 0 && (
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min((todayCount / dailyGoal) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {(Object.keys(MODES) as Array<keyof typeof MODES>).map(key => (
          <div key={key} className="flex items-center gap-1">
            <Button
              variant={mode === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { if (!running) switchMode(key) }}
              className={cn("text-xs", mode === key && "")}
              disabled={running}
            >
              {MODES[key].label}
            </Button>
            {!running && (
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => adjustDuration(key, -1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-[10px] text-muted-foreground w-5 text-center tabular-nums">
                  {durationState[key]}
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => adjustDuration(key, 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Timer + completion overlay */}
      <div className="relative w-64 h-64 mx-auto mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <motion.circle
            cx="130" cy="130" r="120" fill="none"
            stroke={MODES[mode].stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3 }}
          />
          {running && (
            <motion.circle
              cx="130" cy="130" r="126" fill="none"
              stroke={MODES[mode].stroke}
              strokeWidth="1"
              strokeDasharray="8 8"
              animate={{ rotate: 360 }}
              style={{ originX: '130px', originY: '130px' }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {showCompletion ? (
              <motion.div
                key="complete"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-center"
              >
                <span className="text-2xl block mb-1">🎉</span>
                <span className="text-sm font-medium text-green-500">Completado!</span>
                {completedTaskTitle && (
                  <span className="text-xs text-muted-foreground block mt-1">{completedTaskTitle}</span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="timer"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <span className={cn("text-6xl font-mono font-bold", MODES[mode].color)}>
                  {formatTime(timeLeft)}
                </span>
                <span className="text-sm text-muted-foreground mt-1 block">{MODES[mode].label}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 mb-6">
        <Button onClick={toggleRunning} size="lg" className="w-32 gap-2">
          {running ? <><Pause className="h-5 w-5" /> Pausa</> : <><Play className="h-5 w-5" /> Iniciar</>}
        </Button>
        <Button variant="outline" size="icon" onClick={resetTimer} className="h-11 w-11" title="Reiniciar">
          <RotateCcw className="h-5 w-5" />
        </Button>
        {running && (
          <Button variant="outline" size="icon" onClick={() => { handleComplete() }} className="h-11 w-11" title="Saltar">
            <SkipForward className="h-5 w-5" />
          </Button>
        )}
        <Button
          variant={focusMode ? 'default' : 'outline'}
          size="icon"
          onClick={() => setFocusMode(!focusMode)}
          className="h-11 w-11"
          title={focusMode ? 'Salir de modo focus' : 'Modo focus'}
        >
          {focusMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11" title="Configuración">
              <Settings2 className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>Configuración Pomodoro</SheetTitle></SheetHeader>
            <div className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-avance</Label>
                  <p className="text-xs text-muted-foreground">Inicia automáticamente el siguiente modo</p>
                </div>
                <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Meta diaria: {dailyGoal} pomodoros</Label>
                <Slider value={[dailyGoal]} onValueChange={([v]) => setDailyGoal(v)} min={1} max={24} step={1} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Sonido de notificación</Label>
                <Select value={soundPref} onValueChange={setSoundPref}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_OPTIONS.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          {s.id === 'none' ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Link task */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Tarea:</span>
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

        {/* Today count */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Hoy:</span>
              <span className="text-sm font-medium">{todayCount} pomodoros</span>
              {dailyGoal > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({Math.round((todayCount / dailyGoal) * 100)}% de meta)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session history + weekly stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" /> Sesiones de hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-48 overflow-y-auto">
            {todaySessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin sesiones hoy</p>
            ) : (
              <div className="space-y-1.5">
                {[...todaySessions].reverse().map((s, i) => {
                  const task = tasks.find(t => t.id === s.task_id)
                  const start = new Date(s.started_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-accent/30">
                      <span className="text-green-500">●</span>
                      <span className="text-muted-foreground">{start}</span>
                      <span className="font-medium">{Math.round(s.duration / 60)}min</span>
                      {task && <span className="text-muted-foreground truncate">— {task.title}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" /> Esta semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-1 h-24">
              {weeklyData.map((d) => {
                const day = new Date(d.date).getDay()
                const height = maxWeekly > 0 ? (d.count / maxWeekly) * 100 : 0
                const isToday = d.date === new Date().toISOString().split('T')[0]
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[10px] text-muted-foreground">{d.count}</span>
                    <div className="w-full flex justify-center" style={{ height: '100%' }}>
                      <div
                        className={cn(
                          "w-5 rounded-t transition-all self-end",
                          isToday ? "bg-indigo-500" : "bg-indigo-500/40"
                        )}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className={cn("text-[10px]", isToday ? "text-indigo-500 font-medium" : "text-muted-foreground")}>
                      {dayNames[day]}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
