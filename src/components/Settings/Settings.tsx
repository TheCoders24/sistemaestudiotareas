import { useState, useRef, useEffect } from 'react'
import { Settings2, Download, Upload, Eye, Volume2, VolumeX, Palette, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { useSound } from '@/hooks/useSound'
import { THEMES, useThemeStore } from '@/stores/themeStore'

const POMODORO_PRESETS = [
  { id: 'default', name: 'Clásico', focus: 25, short: 5, long: 15 },
  { id: 'long', name: 'Enfoque largo', focus: 50, short: 10, long: 20 },
  { id: 'short', name: 'Rápido', focus: 15, short: 3, long: 10 },
  { id: 'custom', name: 'Personalizado', focus: 25, short: 5, long: 15 },
]

export default function Settings() {
  const [eyeRestEnabled, setEyeRestEnabled] = useState(true)
  const [eyeRestInterval, setEyeRestInterval] = useState(20)
  const [pomodoroPreset, setPomodoroPreset] = useState('default')
  const [focusTime, setFocusTime] = useState(25)
  const { soundEnabled, setSoundEnabled } = useSound()
  const { themeId, setThemeId } = useThemeStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const eyeRestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSetting('pomodoro_preset').then((val: string | null) => {
        if (val) setPomodoroPreset(val)
      })
      window.electronAPI.getSetting('pomodoro_focus').then((val: string | null) => {
        if (val) setFocusTime(Number(val))
      })
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setSetting('pomodoro_preset', pomodoroPreset)
      if (pomodoroPreset === 'custom') {
        window.electronAPI.setSetting('pomodoro_focus', String(focusTime))
      } else {
        const preset = POMODORO_PRESETS.find(p => p.id === pomodoroPreset)
        if (preset) {
          setFocusTime(preset.focus)
          window.electronAPI.setSetting('pomodoro_focus', String(preset.focus))
        }
      }
    }
  }, [pomodoroPreset, focusTime])

  useEffect(() => {
    if (eyeRestTimerRef.current) clearInterval(eyeRestTimerRef.current)
    if (eyeRestEnabled) {
      eyeRestTimerRef.current = setInterval(() => {
        if (window.electronAPI) {
          window.electronAPI.showNotification('👀 Descanso Visual', 'Mira algo a 6 metros durante 20 segundos (Regla 20-20-20)')
        }
      }, eyeRestInterval * 60 * 1000)
    }
    return () => { if (eyeRestTimerRef.current) clearInterval(eyeRestTimerRef.current) }
  }, [eyeRestEnabled, eyeRestInterval])

  async function handleExport() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-estudio-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: 'Backup exportado', description: 'Archivo descargado exitosamente.' })
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (window.electronAPI) {
          await window.electronAPI.importData(data)
          toast({ title: '✅ Importación exitosa', description: 'Datos restaurados correctamente.' })
        }
      } catch {
        toast({ title: '❌ Error', description: 'Archivo JSON inválido.', variant: 'destructive' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Configuración
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {soundEnabled ? <Volume2 className="h-4 w-4 text-blue-500" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium">Efectos de sonido</span>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
            <p className="text-xs text-muted-foreground">Sonidos al completar pomodoros, tareas y subir de nivel</p>
          </div>

          <Separator />

          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">Tema de color</span>
              </div>
            </div>
              <div className="flex gap-2">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={`w-8 h-8 rounded-full transition-all ${themeId === t.id ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''}`}
                  style={{ backgroundColor: t.primary }}
                  title={t.label}
                />
              ))}
            </div>
          </div>

          <Separator />

          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Pomodoro</span>
            </div>
            <Select value={pomodoroPreset} onValueChange={setPomodoroPreset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POMODORO_PRESETS.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tiempo de enfoque: {focusTime} min</label>
              <Slider value={[focusTime]} onValueChange={([v]) => {
                setFocusTime(v); setPomodoroPreset('custom')
              }} min={5} max={60} step={5} />
            </div>
          </div>

          <Separator />

          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">Descanso Visual (20-20-20)</span>
              </div>
              <Switch checked={eyeRestEnabled} onCheckedChange={setEyeRestEnabled} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Intervalo: {eyeRestInterval} minutos</label>
              <Slider value={[eyeRestInterval]} onValueChange={([v]) => setEyeRestInterval(v)}
                min={10} max={60} step={5} />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-green-500" /> Exportar datos
            </p>
            <Button onClick={handleExport} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-1" /> Exportar Backup (.json)
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-500" /> Importar datos
            </p>
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline">
              <Upload className="h-4 w-4 mr-1" /> Importar Backup (.json)
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}