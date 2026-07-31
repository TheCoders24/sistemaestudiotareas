import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, RotateCcw, VolumeX, CloudRain, Waves, Wind, Music } from 'lucide-react'

const POMODORO = 25 * 60
const SHORT_BREAK = 5 * 60

export function FocusMode() {
  const [timeLeft, setTimeLeft] = useState(POMODORO)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [ambient, setAmbient] = useState<'none' | 'rain' | 'waves' | 'wind' | 'brown'>('none')
  const [volume, setVolume] = useState(0.3)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            if (window.electronAPI) {
              window.electronAPI.app.notification.show(
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

  function getNoiseBuffer(ctx: AudioContext, type: string, duration: number) {
    const sampleRate = ctx.sampleRate
    const length = sampleRate * duration
    const buffer = ctx.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)
    
    if (type === 'rain') {
      let last = 0
      for (let i = 0; i < length; i++) {
        last = (last + (Math.random() - 0.5) * 0.02) * 0.98
        data[i] = last * 0.3
      }
    } else if (type === 'waves') {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        data[i] = (Math.sin(t * 0.3) * 0.5 + Math.sin(t * 0.7) * 0.3 + Math.random() * 0.1) * 0.4
      }
    } else if (type === 'wind') {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        data[i] = (Math.sin(t * 0.1 + Math.sin(t * 0.05) * 5) * 0.3 + (Math.random() - 0.5) * 0.08)
      }
    } else {
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() - 0.5) * 0.3
      }
    }
    return buffer
  }

  function startAmbient(type: string) {
    stopAmbient()
    const ctx = new AudioContext()
    const buffer = getNoiseBuffer(ctx, type, 4)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const gain = ctx.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(ctx.destination)
    source.start()
    audioCtxRef.current = ctx
    sourceRef.current = source
    gainRef.current = gain
    setAmbient(type as any)
  }

  function stopAmbient() {
    sourceRef.current?.stop()
    audioCtxRef.current?.close()
    sourceRef.current = null
    audioCtxRef.current = null
    gainRef.current = null
    setAmbient('none')
  }

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

      <div className="flex items-center gap-2 mt-6">
        {ambient !== 'none' && (
          <div className="flex items-center gap-1">
            <button onClick={stopAmbient} className="p-1 hover:text-white/80"><VolumeX className="w-4 h-4" /></button>
            <input type="range" min="0" max="1" step="0.05" value={volume}
              onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (gainRef.current) gainRef.current.gain.value = v }}
              className="w-20 h-1 accent-indigo-500" />
          </div>
        )}
        <button onClick={() => startAmbient('rain')} className={`p-2 rounded-full transition-colors ${ambient === 'rain' ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/60 hover:text-white/80 hover:bg-white/10'}`} title="Lluvia"><CloudRain className="w-4 h-4" /></button>
        <button onClick={() => startAmbient('waves')} className={`p-2 rounded-full transition-colors ${ambient === 'waves' ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/60 hover:text-white/80 hover:bg-white/10'}`} title="Olas"><Waves className="w-4 h-4" /></button>
        <button onClick={() => startAmbient('wind')} className={`p-2 rounded-full transition-colors ${ambient === 'wind' ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/60 hover:text-white/80 hover:bg-white/10'}`} title="Viento"><Wind className="w-4 h-4" /></button>
        <button onClick={() => startAmbient('brown')} className={`p-2 rounded-full transition-colors ${ambient === 'brown' ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/60 hover:text-white/80 hover:bg-white/10'}`} title="Ruido marrón"><Music className="w-4 h-4" /></button>
      </div>

      <p className="text-white/30 text-sm mt-8">Presioná ESC para salir del modo focus</p>
    </div>
  )
}