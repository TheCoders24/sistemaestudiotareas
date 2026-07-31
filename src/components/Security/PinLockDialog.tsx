import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, KeyRound, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface PinLockDialogProps {
  mode: 'set' | 'unlock' | 'change'
  onUnlocked: () => void
  onClose?: () => void
}

export default function PinLockDialog({ mode, onUnlocked, onClose }: PinLockDialogProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'set' || mode === 'change') {
        if (pin.length < 4 || pin.length > 10) {
          setError('El PIN debe tener entre 4 y 10 dígitos')
          setLoading(false)
          return
        }
        if (pin !== confirmPin) {
          setError('Los PIN no coinciden')
          setLoading(false)
          return
        }
        if (window.electronAPI?.pin?.set) {
          const result = await window.electronAPI.pin.set(pin)
          if (result) {
            setSuccess(true)
            setTimeout(() => onUnlocked(), 1000)
          } else {
            setError('Error al configurar el PIN')
          }
        }
      } else {
        if (!window.electronAPI?.pin?.verify) {
          setError('API no disponible')
          setLoading(false)
          return
        }
        const result = await window.electronAPI.pin.verify(pin)
        if (result.ok) {
          setSuccess(true)
          setTimeout(() => onUnlocked(), 500)
        } else {
          setError(result.message || 'PIN incorrecto')
        }
      }
    } catch (err) {
      setError('Error de verificación')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <Card className="w-[380px] shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {mode === 'unlock' ? <Lock className="w-6 h-6 text-primary" /> : <KeyRound className="w-6 h-6 text-primary" />}
            </div>
            <CardTitle>
              {mode === 'set' ? 'Configurar PIN' : mode === 'change' ? 'Cambiar PIN' : 'Desbloquear'}
            </CardTitle>
            <CardDescription>
              {mode === 'unlock' ? 'Ingrese su PIN para desbloquear la aplicación' : 'Ingrese un PIN de 4 a 10 dígitos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-3 rounded-md">
                  <ShieldCheck className="w-4 h-4" />
                  {mode === 'unlock' ? 'Desbloqueado correctamente' : 'PIN configurado correctamente'}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Ingrese su PIN"
                  value={pin}
                  onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
                  maxLength={10}
                  autoFocus
                  disabled={loading || success}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              {(mode === 'set' || mode === 'change') && (
                <div>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Confirme su PIN"
                    value={confirmPin}
                    onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '')); setError('') }}
                    maxLength={10}
                    disabled={loading || success}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="flex gap-2">
                {onClose && mode !== 'unlock' && (
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={loading || success}>
                  {loading ? 'Verificando...' : mode === 'set' ? 'Configurar' : mode === 'change' ? 'Cambiar' : 'Desbloquear'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
