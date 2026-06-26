import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw } from 'lucide-react'

type UpdateState =
  | { type: 'idle' }
  | { type: 'available'; version: string }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded' }
  | { type: 'error'; message: string }

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ type: 'idle' })

  useEffect(() => {
    if (!window.electronAPI) return

    const unsubs: (() => void)[] = []

    unsubs.push(
      window.electronAPI.onUpdateAvailable((info) => {
        setState({ type: 'available', version: info.version })
      })
    )

    unsubs.push(
      window.electronAPI.onUpdateDownloadProgress((progress) => {
        setState({ type: 'downloading', percent: Math.round(progress.percent) })
      })
    )

    unsubs.push(
      window.electronAPI.onUpdateDownloaded(() => {
        setState({ type: 'downloaded' })
      })
    )

    unsubs.push(
      window.electronAPI.onUpdateError((msg) => {
        setState({ type: 'error', message: msg })
      })
    )

    return () => unsubs.forEach((fn) => fn())
  }, [])

  const handleDownload = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.downloadUpdate()
    }
  }, [])

  const handleInstall = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.installUpdate()
    }
  }, [])

  if (state.type === 'idle') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-right-5">
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        {state.type === 'available' && (
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-indigo-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Nueva versión disponible</p>
              <p className="text-xs text-muted-foreground">v{state.version}</p>
            </div>
            <Button size="sm" onClick={handleDownload}>Descargar</Button>
          </div>
        )}
        {state.type === 'downloading' && (
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-indigo-500 shrink-0 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium">Descargando...</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${state.percent}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{state.percent}%</span>
          </div>
        )}
        {state.type === 'downloaded' && (
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Actualización lista</p>
              <p className="text-xs text-muted-foreground">Reinicia para instalar</p>
            </div>
            <Button size="sm" onClick={handleInstall}>Instalar</Button>
          </div>
        )}
        {state.type === 'error' && (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Error al actualizar</p>
              <p className="text-xs text-muted-foreground truncate">{state.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
