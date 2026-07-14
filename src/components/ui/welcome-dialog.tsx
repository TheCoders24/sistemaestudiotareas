import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Zap, Command, Search, Maximize2 } from 'lucide-react'

const STEPS = [
  {
    icon: Zap,
    title: 'Bienvenido a EstudioApp',
    description: 'Tu sistema personal de productividad. Organiza tareas, estudia con Pomodoro, y sigue tu progreso.',
  },
  {
    icon: Command,
    title: 'Paleta de Comandos',
    description: 'Presiona Ctrl+Shift+P para abrir la paleta de comandos. Navega entre secciones sin usar el mouse.',
  },
  {
    icon: Search,
    title: 'Búsqueda Global',
    description: 'Presiona Ctrl+F para buscar en tareas, notas, snippets y proyectos desde un solo lugar.',
  },
  {
    icon: Maximize2,
    title: 'Modo Focus',
    description: 'Al iniciar un Pomodoro, el modo focus oculta distracciones automáticamente.',
  },
]

export function WelcomeDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getSetting('welcome_shown').then((val) => {
      if (val !== 'true') {
        setOpen(true)
      }
    })
  }, [])

  const handleClose = async () => {
    setOpen(false)
    if (window.electronAPI) {
      await window.electronAPI.setSetting('welcome_shown', 'true')
    }
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else handleClose()
  }

  const prev = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-indigo-500/10">
              <Icon className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">{current.title}</DialogTitle>
          <DialogDescription className="text-center text-sm mt-2">
            {current.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5 my-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i === step ? 'bg-indigo-500' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <DialogFooter className="gap-2">
          {step > 0 && (
            <Button variant="ghost" onClick={prev} size="sm">
              Anterior
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Saltar
          </Button>
          <Button onClick={next} size="sm">
            {step < STEPS.length - 1 ? 'Siguiente' : '¡Comenzar!'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
