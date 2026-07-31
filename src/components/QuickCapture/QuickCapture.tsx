import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Flag, Tag, Clock, X, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'

interface QuickCaptureProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DAY_MAP: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
  domingo: 0,
}

function getNextDayOfWeek(dayIndex: number): Date {
  const now = new Date()
  const currentDay = now.getDay()
  let daysUntil = dayIndex - currentDay
  if (daysUntil <= 0) daysUntil += 7
  const result = new Date(now)
  result.setDate(now.getDate() + daysUntil)
  return result
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function parseInput(text: string) {
  const lower = text.toLowerCase()

  let dueDate: string | null = null
  const today = new Date()

  if (lower.includes('hoy')) {
    dueDate = formatDate(today)
  } else if (lower.includes('mañana') || lower.includes('manana')) {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    dueDate = formatDate(tomorrow)
  } else if (lower.includes('ayer')) {
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    dueDate = formatDate(yesterday)
  } else {
    for (const [dayName, dayIndex] of Object.entries(DAY_MAP)) {
      if (lower.includes(dayName)) {
        dueDate = formatDate(getNextDayOfWeek(dayIndex))
        break
      }
    }
  }

  let priority: string | null = null
  const priorityWords = ['urgente', 'importante', 'crítico', 'critico', 'prioridad alta']
  if (priorityWords.some((w) => lower.includes(w))) {
    priority = 'alta'
  }

  return { dueDate, priority }
}

export default function QuickCapture({ open, onOpenChange }: QuickCaptureProps) {
  const [value, setValue] = useState('')
  const [parsed, setParsed] = useState<{ dueDate: string | null; priority: string | null }>({
    dueDate: null,
    priority: null,
  })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setParsed(parseInput(value))
  }, [value])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setValue('')
      setParsed({ dueDate: null, priority: null })
    }
  }, [open])

  const handleSubmit = useCallback(async () => {
    if (!value.trim()) return
    if (!window.electronAPI) {
      toast({ title: 'Error', description: 'API no disponible', variant: 'destructive' })
      return
    }
    try {
      const cleanTitle = value.trim()
      await window.electronAPI.tasks.create({
        title: cleanTitle,
        description: '',
        priority: parsed.priority || 'media',
        due_date: parsed.dueDate,
        repeat: null,
      } as any)
      toast({ title: 'Tarea creada', description: `"${cleanTitle}" agregada.` })
      onOpenChange(false)
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la tarea', variant: 'destructive' })
    }
  }, [value, parsed, onOpenChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    },
    [handleSubmit, onOpenChange]
  )

  const addChip = useCallback((chip: string) => {
    setValue((prev) => {
      const trimmed = prev.trim()
      if (chip === 'Prioridad alta') return trimmed ? `${trimmed} urgente` : 'urgente'
      if (chip === 'Con fecha') return trimmed ? `${trimmed} mañana` : 'mañana'
      if (chip === 'Con etiqueta') return trimmed ? `${trimmed} #etiqueta` : '#etiqueta'
      if (chip === 'Pomodoro') return trimmed ? `${trimmed} pomodoro 25min` : 'pomodoro 25min'
      return trimmed
    })
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="relative z-10 w-full max-w-xl mx-4 pointer-events-auto"
              initial={{ opacity: 0, y: -30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-xl border bg-background shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribí tu tarea..."
                    className="h-14 text-lg border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {(parsed.dueDate || parsed.priority) && (
                  <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
                    {parsed.dueDate && (
                      <Badge variant="info" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {parsed.dueDate}
                      </Badge>
                    )}
                    {parsed.priority && (
                      <Badge variant="destructive" className="gap-1">
                        <Flag className="h-3 w-3" />
                        Alta prioridad
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
                  {[
                    { label: 'Prioridad alta', icon: Flag },
                    { label: 'Con fecha', icon: Calendar },
                    { label: 'Con etiqueta', icon: Tag },
                    { label: 'Pomodoro', icon: Clock },
                  ].map(({ label, icon: Icon }) => (
                    <Button
                      key={label}
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full text-xs gap-1"
                      onClick={() => addChip(label)}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </Button>
                  ))}

                  <div className="ml-auto">
                    <Button
                      size="sm"
                      disabled={!value.trim()}
                      onClick={handleSubmit}
                      className="h-7 gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Crear
                    </Button>
                  </div>
                </div>

                <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Enter para crear · Esc para cerrar</span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+Space</kbd>
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
