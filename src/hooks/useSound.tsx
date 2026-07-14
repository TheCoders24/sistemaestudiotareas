import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface SoundContextType {
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  playSound: (type: 'complete' | 'levelup' | 'achievement') => void
  createConfetti: () => void
}

const SoundContext = createContext<SoundContextType>({
  soundEnabled: true,
  setSoundEnabled: () => {},
  playSound: () => {},
  createConfetti: () => {},
})

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSetting('sound_enabled').then(val => {
        if (val !== null) setSoundEnabledState(val === 'true')
      })
    }
  }, [])

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v)
    if (window.electronAPI) window.electronAPI.setSetting('sound_enabled', v ? 'true' : 'false')
  }, [])

  const playSound = useCallback((type: 'complete' | 'levelup' | 'achievement') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0.1
      if (type === 'complete') {
        osc.frequency.value = 800
        osc.start()
        setTimeout(() => { osc.frequency.value = 1000; gain.gain.value = 0 }, 200)
      } else if (type === 'levelup') {
        osc.frequency.value = 523
        osc.start()
        setTimeout(() => { osc.frequency.value = 659; gain.gain.value = 0.1 }, 100)
        setTimeout(() => { osc.frequency.value = 784; gain.gain.value = 0.1 }, 200)
        setTimeout(() => { gain.gain.value = 0 }, 350)
      } else {
        osc.frequency.value = 660
        osc.start()
        setTimeout(() => { osc.frequency.value = 880; gain.gain.value = 0 }, 150)
      }
      setTimeout(() => ctx.close(), 500)
    } catch {}
  }, [])

  const createConfetti = useCallback(() => {
    try {
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
      document.body.appendChild(canvas)
      const ctx = canvas.getContext('2d')!
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * canvas.width, y: -20,
        w: Math.random() * 8 + 4, h: Math.random() * 6 + 3,
        color: ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)],
        vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2, rot: Math.random() * 360, rv: (Math.random() - 0.5) * 10,
      }))
      let frames = 0
      const interval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.rot += p.rv
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180)
          ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          ctx.restore()
        })
        if (++frames > 120) { clearInterval(interval); canvas.remove() }
      }, 16)
    } catch {}
  }, [])

  return (
    <SoundContext.Provider value={{ soundEnabled, setSoundEnabled, playSound, createConfetti }}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  return useContext(SoundContext)
}
