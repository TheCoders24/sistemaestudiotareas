import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wrench, Gauge, Timer, Plug, Activity, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function Pre({ data }: { data: unknown }) {
  return (
    <pre className="text-[11px] leading-relaxed bg-muted/50 rounded-md p-3 overflow-auto max-h-72">
      {data == null ? 'Sin datos' : JSON.stringify(data, null, 2)}
    </pre>
  )
}

export default function DevToolsPage() {
  const [profiler, setProfiler] = useState<unknown>(null)
  const [perfMode, setPerfMode] = useState<string>('')
  const [perfModes, setPerfModes] = useState<Array<{ id: string; name: string }>>([])
  const [perfReport, setPerfReport] = useState<unknown>(null)
  const [preloadStats, setPreloadStats] = useState<unknown>(null)
  const [plugins, setPlugins] = useState<Array<{ id: string; name: string; version: string; active?: boolean }>>([])
  const [loading, setLoading] = useState(true)

  function load() {
    if (!window.electronAPI) {
      setLoading(false)
      return
    }
    const api = window.electronAPI
    Promise.all([
      api.profiler.getReport().catch(() => null),
      api.perf.getMode().catch(() => ''),
      api.perf.getModes().catch(() => []),
      api.perfMonitor.getReport().catch(() => null),
      api.preload.getStats().catch(() => null),
      api.plugins.list().catch(() => []),
    ]).then(([p, mode, modes, report, stats, list]) => {
      setProfiler(p)
      setPerfMode(mode as string)
      setPerfModes(modes as Array<{ id: string; name: string }>)
      setPerfReport(report)
      setPreloadStats(stats)
      setPlugins(list as typeof plugins)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  async function resetProfiler() {
    if (!window.electronAPI) return
    await window.electronAPI.profiler.reset()
    load()
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6 text-sm text-muted-foreground">Cargando herramientas de desarrollo…</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-muted-foreground" />
            Herramientas de desarrollo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Diagnóstico interno (solo visible con el modo desarrollador activo)</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetProfiler}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reiniciar profiler
        </Button>
      </motion.div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Timer className="h-4 w-4" /> Profiler de arranque</CardTitle>
          </CardHeader>
          <CardContent><Pre data={profiler} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" /> Rendimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Modo actual:</span>
              <Badge variant="secondary">{perfMode || 'desconocido'}</Badge>
              {perfModes.map(m => (
                <Badge key={m.id} variant="outline">{m.name}</Badge>
              ))}
            </div>
            <Pre data={perfReport} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Smart Preload</CardTitle>
          </CardHeader>
          <CardContent><Pre data={preloadStats} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Plug className="h-4 w-4" /> Plugins</CardTitle>
          </CardHeader>
          <CardContent>
            {plugins.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin plugins instalados</p>
            ) : (
              <ul className="space-y-1">
                {plugins.map(p => (
                  <li key={p.id} className="text-xs flex items-center justify-between">
                    <span>{p.name} <span className="text-muted-foreground">v{p.version}</span></span>
                    <Badge variant={p.active ? 'default' : 'outline'}>{p.active ? 'activo' : 'inactivo'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
