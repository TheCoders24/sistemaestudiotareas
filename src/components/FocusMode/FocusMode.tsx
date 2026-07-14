import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, RotateCcw, Timer, Bell } from 'lucide-react'

const POMODORO = 25 * 60
const SHORT_BREAK = 5 * 60
const LONG_BREAK = 15 * 60

export function FocusMode() {
  const [timeLeft, setTimeLeft] = useState(POMODORO)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            if (window.electronAPI) {
              window.electronAPI.showNotification(
                mode === 'focus' ? '🍅 Focus completado' : '☕ Descanso terminado',
                mode === 'focus' ? '¡Buen trabajo! Tomá un descanso.' : '¡De vuelta al trabajo!'
              )
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, mode])

  const toggle = useCallback(() => {
    if (timeLeft === 0) {
      setTimeLeft(mode === 'focus' ? POMODORO : SHORT_BREAK)
    }
    setRunning(!running)
  }, [running, timeLeft, mode])

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setTimeLeft(mode === 'focus' ? POMODORO : SHORT_BREAK)
  }, [mode])

  const switchMode = useCallback((newMode: 'focus' | 'break') => {
    setMode(newMode)
    setRunning(false)
    setTimeLeft(newMode === 'focus' ? POMODORO : SHORT_BREAK)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  const progress = 1 - timeLeft / (mode === 'focus' ? POMODORO : SHORT_BREAK)

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none"
      style={{ userSelect: 'none' }}>
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => switchMode(mode === 'focus' ? 'break' : 'focus')}
          className="px-4 py-2 rounded-full text-sm bg-white/10 hover:bg-white/20 text-white/70 transition-colors">
          {mode === 'focus' ? '☕ Descanso' : '🍅 Focus'}
        </button>
        <button onClick={() => window.__exitFocusMode?.()}
          className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative mb-12">
        <svg className="w-80 h-80 -rotate-90" viewBox="0 0 340 340">
          <circle cx="170" cy="170" r="150" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="170" cy="170" r="150" fill="none"
            stroke={mode === 'focus' ? '#ef4444' : '#22c55e'}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 150}
            strokeDashoffset={2 * Math.PI * 150 * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-8xl font-mono font-bold text-white tracking-wider">{timeStr}</span>
          <span className="text-white/40 text-lg mt-2">{mode === 'focus' ? 'ENFOQUE' : 'DESCANSO'}</span>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={toggle}
          className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          {running ? <Pause className="h-8 w-8 text-white" /> : <Play className="h-8 w-8 text-white ml-1" />}
        </button>
        <button onClick={reset}
          className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <RotateCcw className="h-7 w-7 text-white/70" />
        </button>
      </div>

      <p className="text-white/30 text-sm mt-8">Presioná ESC para salir del modo focus</p>
    </div>
  )
}