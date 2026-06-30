import { useState, useRef, useEffect } from 'react'
import { Settings2, Download, Upload, Eye, Palette, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { THEMES, useThemeStore } from '@/stores/themeStore'
import { useAutoBackup } from '@/lib/useAutoBackup'
import { cn } from '@/lib/utils'
import { safeIpc } from '@/lib/ipc'

export default function Settings() {
  const [eyeRestEnabled, setEyeRestEnabled] = useState(true)
  const [eyeRestInterval, setEyeRestInterval] = useState(20)
  const themeId = useThemeStore((s) => s.themeId)
  const setThemeId = useThemeStore((s) => s.setThemeId)
  const { config: backupConfig, setConfig: setBackupConfig, doBackup } = useAutoBackup()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const eyeRestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (eyeRestEnabled) startEyeRestTimer()
    return () => { if (eyeRestTimerRef.current) clearInterval(eyeRestTimerRef.current) }
  }, [eyeRestEnabled, eyeRestInterval])

  function startEyeRestTimer() {
    if (eyeRestTimerRef.current) clearInterval(eyeRestTimerRef.current)
    eyeRestTimerRef.current = setInterval(() => {
      safeIpc('showNotification', '👀 Descanso Visual', 'Mira algo a 6 metros durante 20 segundos (Regla 20-20-20)')
    }, eyeRestInterval * 60 * 1000)
  }

  async function handleExport() {
    if (!window.electronAPI) return
    const data = await safeIpc('exportData')
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
          await safeIpc('importData', data)
          toast({ title: '✅ Importación exitosa', description: 'Datos restaurados correctamente.' })
        }
      } catch (err) {
        console.error('[Settings] Import error:', err)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Configuración
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Eye rest */}
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
              <Slider
                value={[eyeRestInterval]}
                onValueChange={([v]) => setEyeRestInterval(v)}
                min={10}
                max={60}
                step={5}
              />
            </div>
          </div>

          {/* Theme selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4 text-indigo-500" /> Tema de color
            </p>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setThemeId(theme.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-all',
                    themeId === theme.id
                      ? 'border-foreground bg-accent font-medium'
                      : 'border-transparent hover:bg-accent/50',
                  )}
                  title={theme.label}
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto backup */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Backup automático</span>
              </div>
              <Switch checked={backupConfig.enabled} onCheckedChange={(v) => setBackupConfig({ ...backupConfig, enabled: v })} />
            </div>
            {backupConfig.enabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={backupConfig.interval}
                    onValueChange={(v: 'hourly' | 'daily' | 'weekly') => setBackupConfig({ ...backupConfig, interval: v })}
                  >
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Cada hora</SelectItem>
                      <SelectItem value="daily">Cada día</SelectItem>
                      <SelectItem value="weekly">Cada semana</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={doBackup}>
                    Backup ahora
                  </Button>
                </div>
                {backupConfig.lastBackup && (
                  <p className="text-[10px] text-muted-foreground">
                    Último backup: {new Date(backupConfig.lastBackup).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Export */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-green-500" /> Exportar datos
            </p>
            <Button onClick={handleExport} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-1" /> Exportar Backup (.json)
            </Button>
          </div>

          {/* Import */}
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
