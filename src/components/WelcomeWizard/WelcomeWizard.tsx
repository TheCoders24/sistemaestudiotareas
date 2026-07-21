import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Zap, ChevronRight, ChevronLeft, Check } from 'lucide-react'

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
  onComplete: () => void
}

const FONT_OPTIONS = [
  { label: 'Pequeño', value: 'sm' as const },
  { label: 'Mediano', value: 'base' as const },
  { label: 'Grande', value: 'lg' as const },
]

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
  onComplete,
}: WelcomeWizardProps) {
  const [step, setStep] = useState(0)

  const next = () => setStep((s) => Math.min(s + 1, 2))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {step === 0 && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-indigo-500/10">
                <Zap className="h-8 w-8 text-indigo-500" />
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
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-2">
          {[0, 1, 2].map((i) => (
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

          {step < 2 ? (
            <Button size="sm" onClick={next}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={onComplete}>
              <Check className="h-4 w-4 mr-1" />
              Comenzar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
