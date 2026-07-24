import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Monitor, ArrowDownToLine, ArrowUpFromLine, Download, Upload, Search, Loader2, Smartphone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'

interface Device { name: string; ip: string; port?: number }

export default function CloudSync() {
  const [serverActive, setServerActive] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [manualIp, setManualIp] = useState('')
  const [scanning, setScanning] = useState(false)
  const [syncingDevice, setSyncingDevice] = useState<string | null>(null)
  const [myIps, setMyIps] = useState<{ ip: string; name: string }[]>([])

  useEffect(() => {
    if (window.electronAPI?.onWifiSyncDevice) {
      window.electronAPI.onWifiSyncDevice((device: Device) => {
        setDevices(prev => {
          if (prev.some(d => d.ip === device.ip)) return prev
          return [...prev, device]
        })
      })
    }
  }, [])

  const startServer = useCallback(async () => {
    if (!window.electronAPI?.startWifiSync) return
    const result = await window.electronAPI.startWifiSync()
    if (result?.ok) {
      setServerActive(true)
      const ips = await window.electronAPI.discoverWifiSync()
      setMyIps(ips || [])
      toast({ title: 'Servidor WiFi activo', description: 'Otros dispositivos pueden encontrarte en la red local' })
    }
  }, [])

  const stopServer = useCallback(async () => {
    if (!window.electronAPI?.stopWifiSync) return
    await window.electronAPI.stopWifiSync()
    setServerActive(false)
    setDevices([])
    toast({ title: 'Servidor detenido' })
  }, [])

  const scanDevices = useCallback(async () => {
    setScanning(true)
    setDevices([])
    if (!window.electronAPI?.discoverWifiSync) { setScanning(false); return }
    const ips = await window.electronAPI.discoverWifiSync()
    setMyIps(ips || [])
    setTimeout(() => setScanning(false), 3000)
  }, [])

  const connectManual = useCallback(async () => {
    if (!manualIp.trim() || !window.electronAPI?.connectWifiSync) return
    try {
      const info = await window.electronAPI.connectWifiSync(manualIp.trim())
      if (info) {
        setDevices(prev => {
          if (prev.some(d => d.ip === manualIp.trim())) return prev
          return [...prev, { name: info.name, ip: manualIp.trim() }]
        })
        setManualIp('')
        toast({ title: 'Dispositivo encontrado', description: `${info.name} (${manualIp.trim()})` })
      }
    } catch {
      toast({ title: 'No encontrado', description: `No se pudo conectar a ${manualIp}`, variant: 'destructive' })
    }
  }, [manualIp])

  const pullFromDevice = useCallback(async (ip: string, name: string) => {
    setSyncingDevice(ip)
    try {
      await window.electronAPI?.pullWifiSync(ip)
      toast({ title: 'Datos recibidos', description: `Sincronizado desde ${name}` })
    } catch {
      toast({ title: 'Error', description: `No se pudo sincronizar desde ${name}`, variant: 'destructive' })
    }
    setSyncingDevice(null)
  }, [])

  const pushToDevice = useCallback(async (ip: string, name: string) => {
    setSyncingDevice(ip)
    try {
      await window.electronAPI?.pushWifiSync(ip)
      toast({ title: 'Datos enviados', description: `Enviados a ${name}` })
    } catch {
      toast({ title: 'Error', description: `No se pudo enviar a ${name}`, variant: 'destructive' })
    }
    setSyncingDevice(null)
  }, [])

  const exportToFile = useCallback(async () => {
    if (!window.electronAPI?.exportData) {
      toast({ title: 'Error', description: 'API no disponible', variant: 'destructive' })
      return
    }
    const data = await window.electronAPI.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estudioapp-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exportado', description: 'Archivo descargado correctamente' })
  }, [])

  const importFromFile = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (window.electronAPI?.restoreFromJSON) {
          await window.electronAPI.restoreFromJSON(data)
          toast({ title: 'Importado', description: 'Datos restaurados correctamente. Reiniciá la app.' })
        }
      } catch {
        toast({ title: 'Error', description: 'Archivo inválido', variant: 'destructive' })
      }
    }
    input.click()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wifi className="h-6 w-6 text-blue-500" /> Sincronización WiFi Local
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gratis, sin cuentas, sin internet — solo necesitás estar en la misma red WiFi</p>
          </div>
          <Button onClick={serverActive ? stopServer : startServer}
            variant={serverActive ? 'destructive' : 'default'} className="gap-2">
            {serverActive ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            {serverActive ? 'Detener servidor' : 'Iniciar servidor'}
          </Button>
        </div>
      </motion.div>

      {serverActive && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-green-500">Servidor activo</p>
                  <p className="text-xs text-muted-foreground">
                    Puerto {27346} · Tu IP: {myIps.map(m => m.ip).join(', ') || 'local'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" /> Dispositivos en la red
              </h2>
              <Button variant="outline" size="sm" onClick={scanDevices} disabled={scanning} className="gap-1.5">
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                {scanning ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>

            <div className="flex gap-2 mb-4">
              <Input value={manualIp} onChange={e => setManualIp(e.target.value)}
                placeholder="IP manual (ej: 192.168.1.50)" className="flex-1"
                onKeyDown={e => e.key === 'Enter' && connectManual()} />
              <Button onClick={connectManual} variant="outline" disabled={!manualIp.trim()}>
                Conectar
              </Button>
            </div>

            {devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No se encontraron dispositivos</p>
                <p className="text-xs mt-1">Asegurate que la app esté abierta en otro dispositivo en la misma red WiFi</p>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map(device => (
                  <div key={device.ip} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">{device.ip}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="gap-1"
                        disabled={syncingDevice === device.ip}
                        onClick={() => pullFromDevice(device.ip, device.name)}>
                        {syncingDevice === device.ip ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowDownToLine className="h-3 w-3" />}
                        Recibir
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1"
                        disabled={syncingDevice === device.ip}
                        onClick={() => pushToDevice(device.ip, device.name)}>
                        {syncingDevice === device.ip ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpFromLine className="h-3 w-3" />}
                        Enviar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="py-4">
            <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
              <Download className="h-4 w-4 text-purple-500" /> Exportar / Importar archivo
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Descargá un archivo .json con todos tus datos. Pasalo por USB, email, WhatsApp o donde quieras.</p>
            <div className="flex gap-3">
              <Button onClick={exportToFile} variant="outline" className="gap-2 flex-1">
                <Download className="h-4 w-4" /> Descargar backup (.json)
              </Button>
              <Button onClick={importFromFile} variant="outline" className="gap-2 flex-1">
                <Upload className="h-4 w-4" /> Importar backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardContent className="py-4">
            <h2 className="text-sm font-medium mb-2">Cómo funciona</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <span className="text-lg font-bold text-indigo-500">1</span>
                <div><strong className="text-foreground">Activá el servidor</strong><br/>Tu dispositivo se anuncia en la red WiFi</div>
              </div>
              <div className="flex gap-2">
                <span className="text-lg font-bold text-indigo-500">2</span>
                <div><strong className="text-foreground">Encontrá dispositivos</strong><br/>Buscá automáticamente o ingresá la IP</div>
              </div>
              <div className="flex gap-2">
                <span className="text-lg font-bold text-indigo-500">3</span>
                <div><strong className="text-foreground">Sincronizá</strong><br/>Elegí: recibir datos o enviar tus datos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
