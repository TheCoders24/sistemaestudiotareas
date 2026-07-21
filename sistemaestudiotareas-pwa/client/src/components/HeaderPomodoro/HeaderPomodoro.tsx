import { useEffect, useRef } from 'react'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import { RotateCcw, Clock } from 'lucide-react'

interface HeaderPomodoroProps {
  onOpenPomodoro: () => void
}

export function HeaderPomodoro({ onOpenPomodoro }: HeaderPomodoroProps) {
  const { timeLeft, isRunning, focusTime, start, pause, reset, tick } = usePomodoroStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        tick()
      }, 1000)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, tick])

  function handleClick() {
    if (isRunning) pause()
    else start()
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  const total = focusTime * 60
  const progress = total > 0 ? 1 - timeLeft / total : 1
  const circumference = 2 * Math.PI * 16
  const offset = circumference * (1 - progress)

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleClick}
        className="relative w-10 h-10 flex items-center justify-center cursor-pointer"
        title={isRunning ? 'Pausar Pomodoro' : 'Iniciar Pomodoro'}
      >
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
          <circle
            cx="20" cy="20" r="16" fill="none"
            stroke="var(--primary, hsl(var(--primary)))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.3s' }}
          />
        </svg>
        <span className="relative text-[9px] font-mono font-bold leading-none pointer-events-none select-none">
          {display}
        </span>
      </button>

      {isRunning && (
        <button
          onClick={(e) => { e.stopPropagation(); reset() }}
          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
          title="Reiniciar"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        onClick={onOpenPomodoro}
        className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
        title="Abrir Pomodoro"
      >
        <Clock className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
