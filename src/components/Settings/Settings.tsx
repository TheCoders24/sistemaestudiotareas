import { useState, useRef, useEffect } from 'react'
import { Settings2, Download, Upload, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'

export default function Settings() {
  const [eyeRestEnabled, setEyeRestEnabled] = useState(true)
  const [eyeRestInterval, setEyeRestInterval] = useState(20)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const eyeRestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (eyeRestEnabled) startEyeRestTimer()
    return () => { if (eyeRestTimerRef.current) clearInterval(eyeRestTimerRef.current) }
  }, [eyeRestEnabled, eyeRestInterval])

  function startEyeRestTimer() {
    if (eyeRestTimerRef.current) clearInterval(eyeRestTimerRef.current)
    eyeRestTimerRef.current = setInterval(() => {
      if (window.electronAPI) {
        window.electronAPI.showNotification('👀 Descanso Visual', 'Mira algo a 6 metros durante 20 segundos (Regla 20-20-20)')
      }
    }, eyeRestInterval * 60 * 1000)
  }

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
