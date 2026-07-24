import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Plus, X, Globe, TrendingUp, Clock, MousePointerClick, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'

const PREDEFINED_SITES = ['youtube.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'facebook.com', 'reddit.com', 'netflix.com', 'discord.com', 'twitch.tv']

const STORAGE_KEY = 'website_blocker'

interface BlockerData {
  blockedSites: string[]
  isEnabled: boolean
  stats: {
    timeSavedToday: number
    accessAttempts: number
  }
}

function loadData(): BlockerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { blockedSites: [...PREDEFINED_SITES], isEnabled: false, stats: { timeSavedToday: 0, accessAttempts: 0 } }
}

function saveData(data: BlockerData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function WebsiteBlocker() {
  const [blockedSites, setBlockedSites] = useState<string[]>([])
  const [isEnabled, setIsEnabled] = useState(false)
  const [stats, setStats] = useState({ timeSavedToday: 0, accessAttempts: 0 })
  const [newSite, setNewSite] = useState('')
  const [isPomodoroActive, setIsPomodoroActive] = useState(false)

  useEffect(() => {
    const data = loadData()
    setBlockedSites(data.blockedSites)
    setIsEnabled(data.isEnabled)
    setStats(data.stats)
  }, [])

  useEffect(() => {
    const data: BlockerData = { blockedSites, isEnabled, stats }
    saveData(data)
  }, [blockedSites, isEnabled, stats])

  useEffect(() => {
    const checkPomodoro = () => {
      if (window.electronAPI) {
        window.electronAPI.getSetting?.('pomodoro_running').then((val: string | null) => {
          setIsPomodoroActive(val === 'true')
        }).catch(() => {})
      }
    }
    checkPomodoro()
    const interval = setInterval(checkPomodoro, 5000)
    return () => clearInterval(interval)
  }, [])

  function addSite() {
    const site = newSite.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
    if (!site) return
    if (blockedSites.includes(site)) {
      toast({ title: 'Sitio ya bloqueado', description: `${site} ya está en la lista`, variant: 'destructive' })
      return
    }
    setBlockedSites([...blockedSites, site])
    setNewSite('')
    toast({ title: 'Sitio agregado', description: `${site} será bloqueado durante Pomodoro` })
  }

  function removeSite(site: string) {
    setBlockedSites(blockedSites.filter(s => s !== site))
  }

  function addPredefined(site: string) {
    if (!blockedSites.includes(site)) {
      setBlockedSites([...blockedSites, site])
    }
  }

  const availablePredefined = useMemo(() => PREDEFINED_SITES.filter(s => !blockedSites.includes(s)), [blockedSites])

  const hours = Math.floor(stats.timeSavedToday / 60)
  const mins = stats.timeSavedToday % 60

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" /> Bloqueador de sitios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Bloquea distractores durante sesiones de estudio</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Bloqueo activo</span>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
      </div>

      <AnimatePresence>
        {isEnabled && isPomodoroActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-500">Bloqueo activo</p>
                <p className="text-xs text-red-400">Los sitios distractores están bloqueados durante tu sesión de Pomodoro</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{hours}h {mins}m</p>
              <p className="text-[10px] text-muted-foreground">Tiempo ahorrado hoy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{blockedSites.length}</p>
              <p className="text-[10px] text-muted-foreground">Sitios bloqueados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <MousePointerClick className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.accessAttempts}</p>
              <p className="text-[10px] text-muted-foreground">Intentos de acceso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-500" /> Sitios bloqueados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <AnimatePresence mode="popLayout">
              {blockedSites.map(site => (
                <motion.div
                  key={site}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm">
                    <Globe className="h-3 w-3" />
                    {site}
                    <button onClick={() => removeSite(site)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {blockedSites.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No hay sitios bloqueados</p>
          )}

          <Separator className="my-4" />

          <div className="flex gap-2">
            <Input
              value={newSite}
              onChange={e => setNewSite(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSite()}
              placeholder="Agregar sitio (ej: youtube.com)"
              className="flex-1"
            />
            <Button onClick={addSite} disabled={!newSite.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {availablePredefined.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" /> Distractores comunes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Agrega rápidamente los sitios más comunes de distracción</p>
            <div className="flex flex-wrap gap-2">
              {availablePredefined.map(site => (
                <Button
                  key={site}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => addPredefined(site)}
                >
                  <Plus className="h-3 w-3" /> {site}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
