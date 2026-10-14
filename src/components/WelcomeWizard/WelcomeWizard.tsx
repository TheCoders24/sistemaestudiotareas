import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronLeft, Check, Sparkles, BookOpen, Code, User } from 'lucide-react'

const FONT_OPTIONS = [
  { label: 'Pequeño', value: 'sm' as const },
  { label: 'Mediano', value: 'base' as const },
  { label: 'Grande', value: 'lg' as const },
]

const PROFILE_OPTIONS = [
  { value: 'custom', label: 'General', desc: 'Uso general de productividad', icon: User },
  { value: 'student', label: 'Estudiante', desc: 'Enfoque en cursos, exámenes y estudio', icon: BookOpen },
  { value: 'developer', label: 'Desarrollador', desc: 'Enfoque en proyectos, código y sprints', icon: Code },
]

export interface WelcomeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  onChangeUserName: (name: string) => void
  language: 'es' | 'en'
  onChangeLanguage: (lang: 'es' | 'en') => void
  fontSize: 'sm' | 'base' | 'lg'
  onChangeFontSize: (size: 'sm' | 'base' | 'lg') => void
  denseMode: boolean
  onChangeDenseMode: (dense: boolean) => void
  userProfile?: string
  onChangeUserProfile?: (profile: string) => void
  onComplete: () => void
}

export function WelcomeWizard({
  open,
  onOpenChange,
  userName,
  onChangeUserName,
  language,
  onChangeLanguage,
  fontSize,
  onChangeFontSize,
  denseMode,
  onChangeDenseMode,
  userProfile = 'custom',
  onChangeUserProfile,
  onComplete,
}: WelcomeWizardProps) {
  const [step, setStep] = useState(0)
  const [showProgressiveTips, setShowProgressiveTips] = useState(false)

  const next = () => setStep((s) => Math.min(s + 1, 3))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const handleComplete = () => {
    setShowProgressiveTips(true)
    onComplete()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {step === 0 && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="p-3 rounded-full bg-indigo-500/10">
                  <Sparkles className="h-8 w-8 text-indigo-500" />
                </div>
                <div className="text-center space-y-2">
                  <DialogTitle className="text-xl">¡Bienvenido a EstudioApp!</DialogTitle>
                  <DialogDescription>
                    Tu asistente personal de estudio. Configurá tu experiencia en unos segundos.
                  </DialogDescription>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 py-2">
                <DialogTitle className="text-lg text-center">¿Cómo te llamás?</DialogTitle>
                <Input
                  value={userName}
                  onChange={(e) => onChangeUserName(e.target.value)}
                  placeholder="Tu nombre"
                  autoFocus
                />
                <div className="flex flex-col gap-2">
                  <Label className="text-center text-sm text-muted-foreground">Idioma</Label>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant={language === 'es' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onChangeLanguage('es')}
                    >
                      Español
                    </Button>
                    <Button
                      variant={language === 'en' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onChangeLanguage('en')}
                    >
                      English
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 py-2">
                <DialogTitle className="text-lg text-center">Preferencias iniciales</DialogTitle>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground text-center">Tamaño de fuente</Label>
                  <div className="flex justify-center gap-2">
                    {FONT_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={fontSize === opt.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onChangeFontSize(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Switch
                    id="dense-mode"
                    checked={denseMode}
                    onCheckedChange={onChangeDenseMode}
                  />
                  <Label htmlFor="dense-mode">Modo compacto</Label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 py-2">
                <h3 className="text-lg font-semibold text-center">¿Cuál es tu perfil?</h3>
                <p className="text-sm text-muted-foreground text-center">Esto personalizará tu experiencia</p>
                <div className="grid gap-3">
                  {PROFILE_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => onChangeUserProfile?.(p.value)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        userProfile === p.value
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-border hover:border-indigo-500/30'
                      )}
                    >
                      <p.icon className="text-2xl" />
                      <div>
                        <span className="font-medium text-sm block">{p.label}</span>
                        <span className="text-xs text-muted-foreground">{p.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="flex justify-center gap-1.5 py-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-6 rounded-full transition-colors',
                  i === step ? 'bg-indigo-500' : 'bg-muted'
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={prev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button size="sm" onClick={next}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleComplete}>
                <Check className="h-4 w-4 mr-1" />
                Comenzar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showProgressiveTips && (
        <ProgressiveOnboardingTips onDismiss={() => setShowProgressiveTips(false)} />
      )}
    </>
  )
}

/* Progressive onboarding tips - contextual tips shown as user explores features */
function ProgressiveOnboardingTips({ onDismiss }: { onDismiss: () => void }) {
  const [tipIndex, setTipIndex] = useState(0)
  const [visible, setVisible] = useState(false)

  const tips = [
    { id: 'tasks', title: 'Gestión de tareas', desc: 'Creá tareas con prioridades, fechas y etiquetas. Usá Ctrl+Shift+A para acceso rápido.', feature: 'tasks' },
    { id: 'pomodoro', title: 'Pomodoro', desc: 'Usá el temporizador Pomodoro para sesiones de foco. Ctrl+Shift+F para modo foco.', feature: 'pomodoro' },
    { id: 'kanban', title: 'Tablero Kanban', desc: 'Organizá tus tareas en columnas arrastrando y soltando. Ideal para flujos de trabajo.', feature: 'kanban' },
    { id: 'notes', title: 'Notas rápidas', desc: 'Tomá notas con Markdown, carpetas y etiquetas. Ctrl+Shift+N para nota rápida.', feature: 'notes' },
    { id: 'calendar', title: 'Calendario', desc: 'Vení tus tareas y eventos en vista mensual o semanal.', feature: 'calendar' },
    { id: 'shortcuts', title: 'Atajos de teclado', desc: 'Presioná Ctrl+/ en cualquier momento para ver todos los atajos disponibles.', feature: 'shortcuts' },
  ]

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [tipIndex])

  if (!visible) return null

  const tip = tips[tipIndex]

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-sm p-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <Sparkles className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{tip.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{tip.desc}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {tipIndex + 1} / {5}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTipIndex((i) => (i + 1) % 5)}>
              Siguiente
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setVisible(false); onDismiss() }}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}