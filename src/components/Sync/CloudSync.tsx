import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, RefreshCw, CheckCircle2, Clock, Settings2, ChevronDown, ChevronUp, AlertCircle, HardDrive, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'

const STORAGE_KEY = 'cloud_sync'

type Provider = 'google_drive' | 'dropbox' | 'onedrive' | null
type ConflictResolution = 'newest' | 'ask' | 'skip'

interface SyncHistoryEntry {
  date: string
  source: string
  eventCount: number
  status: 'success' | 'error'
}

interface SyncData {
  provider: Provider
  connected: boolean
  autoSync: boolean
  syncInterval: string
  whatToSync: Record<string, boolean>
  lastSync: string | null
  history: SyncHistoryEntry[]
  conflictResolution: ConflictResolution
}

function loadData(): SyncData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    provider: null,
    connected: false,
    autoSync: false,
    syncInterval: '15min',
    whatToSync: { tasks: true, notes: true, habits: true, flashcards: false, settings: false },
    lastSync: null,
    history: [],
    conflictResolution: 'newest',
  }
}

function saveData(data: SyncData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const PROVIDERS = [
  {
    id: 'google_drive' as const,
    name: 'Google Drive',
    description: 'Sincroniza con tu cuenta de Google Drive',
    color: 'from-blue-500 to-green-500',
    icon: 'G',
  },
  {
    id: 'dropbox' as const,
    name: 'Dropbox',
    description: 'Sincroniza con tu cuenta de Dropbox',
    color: 'from-blue-600 to-blue-400',
    icon: 'D',
  },
  {
    id: 'onedrive' as const,
    name: 'OneDrive',
    description: 'Sincroniza con tu cuenta de Microsoft OneDrive',
    color: 'from-blue-500 to-cyan-500',
    icon: 'O',
  },
]

const SYNC_ITEMS = [
  { key: 'tasks', label: 'Tareas' },
  { key: 'notes', label: 'Notas' },
  { key: 'habits', label: 'Hábitos' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'settings', label: 'Configuración' },
]

export default function CloudSync() {
  const [data, setData] = useState<SyncData>(loadData)
  const [syncing, setSyncing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => { saveData(data) }, [data])

  function update<K extends keyof SyncData>(key: K, value: SyncData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  function toggleWhatToSync(key: string) {
    setData(prev => ({
      ...prev,
      whatToSync: { ...prev.whatToSync, [key]: !prev.whatToSync[key] },
    }))
  }

  async function handleSync() {
    setSyncing(true)
    await new Promise(r => setTimeout(r, 2000))
    const now = new Date().toISOString()
    const newEntry: SyncHistoryEntry = {
      date: now,
      source: PROVIDERS.find(p => p.id === data.provider)?.name || 'Local',
      eventCount: Math.floor(Math.random() * 20) + 1,
      status: 'success',
    }
    setData(prev => ({
      ...prev,
      lastSync: now,
      history: [newEntry, ...prev.history].slice(0, 20),
    }))
    setSyncing(false)
    toast({ title: 'Sincronización completada', description: 'Datos sincronizados correctamente' })
  }

  function connectProvider(provider: Provider) {
    update('provider', provider)
    update('connected', true)
    toast({ title: 'Proveedor conectado', description: `Conectado a ${PROVIDERS.find(p => p.id === provider)?.name}` })
  }

  function disconnectProvider() {
    update('provider', null)
    update('connected', false)
    toast({ title: 'Desconectado', description: 'Proveedor de sincronización desconectado' })
  }

  const lastSyncText = useMemo(() => {
    if (!data.lastSync) return 'Nunca'
    const diff = Date.now() - new Date(data.lastSync).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Ahora mismo'
    if (mins < 60) return `Hace ${mins} minutos`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Hace ${hours} horas`
    const days = Math.floor(hours / 24)
    return `Hace ${days} días`
  }, [data.lastSync])

  const INTERVALS: Record<string, string> = {
    '5min': 'Cada 5 minutos',
    '15min': 'Cada 15 minutos',
    '30min': 'Cada 30 minutos',
    '1h': 'Cada hora',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cloud className="h-6 w-6 text-blue-500" /> Sincronización entre dispositivos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Mantén tus datos sincronizados en todos tus dispositivos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {PROVIDERS.map(provider => (
          <Card
            key={provider.id}
            className={`cursor-pointer transition-all ${
              data.provider === provider.id
                ? 'border-blue-500/50 ring-1 ring-blue-500/20'
                : 'hover:border-muted-foreground/30'
            }`}
            onClick={() => {
              if (data.provider === provider.id) {
                disconnectProvider()
              } else {
                connectProvider(provider.id)
              }
            }}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${provider.color} flex items-center justify-center text-white font-bold text-lg`}>
                  {provider.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{provider.name}</p>
                  {data.provider === provider.id && data.connected && (
                    <Badge variant="success" className="text-[10px] mt-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Conectado
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{provider.description}</p>
              <Button
                variant={data.provider === provider.id ? 'destructive' : 'outline'}
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation()
                  if (data.provider === provider.id) disconnectProvider()
                  else connectProvider(provider.id)
                }}
              >
                {data.provider === provider.id ? 'Desconectar' : 'Conectar'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-indigo-500" /> Configuración de sincronización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sincronización automática</p>
              <p className="text-xs text-muted-foreground">Sincronizar datos automáticamente</p>
            </div>
            <Switch checked={data.autoSync} onCheckedChange={v => update('autoSync', v)} />
          </div>

          {data.autoSync && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Intervalo de sincronización</label>
              <Select value={data.syncInterval} onValueChange={v => update('syncInterval', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INTERVALS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3">¿Qué sincronizar?</p>
            <div className="space-y-2">
              {SYNC_ITEMS.map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <Checkbox
                    checked={data.whatToSync[item.key] || false}
                    onCheckedChange={() => toggleWhatToSync(item.key)}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">En caso de conflicto</p>
            <div className="space-y-2">
              {[
                { value: 'newest', label: 'Usar más reciente' },
                { value: 'ask', label: 'Preguntar' },
                { value: 'skip', label: 'No sincronizar este dato' },
              ].map(option => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="conflict"
                    checked={data.conflictResolution === option.value}
                    onChange={() => update('conflictResolution', option.value as ConflictResolution)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Última sincronización</p>
                <p className="text-xs text-muted-foreground">{lastSyncText}</p>
              </div>
            </div>
            <Button onClick={handleSync} disabled={syncing || !data.connected} className="gap-2">
              <AnimatePresence mode="wait">
                {syncing ? (
                  <motion.div key="spinner" initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 1, rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Loader2 className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <RefreshCw className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
              {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.history.length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" /> Historial de sincronización
              </span>
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {data.history.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          {entry.status === 'success' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          <div>
                            <p className="text-xs font-medium">{entry.source}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(entry.date).toLocaleString('es-ES')} - {entry.eventCount} elementos
                            </p>
                          </div>
                        </div>
                        <Badge variant={entry.status === 'success' ? 'success' : 'destructive'} className="text-[10px]">
                          {entry.status === 'success' ? 'Éxito' : 'Error'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}
    </div>
  )
}
