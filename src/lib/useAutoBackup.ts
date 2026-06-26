import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/use-toast'

interface BackupConfig {
  enabled: boolean
  interval: 'hourly' | 'daily' | 'weekly'
  lastBackup: string | null
}

const BACKUP_KEY = 'auto-backup-config'

async function loadConfig(): Promise<BackupConfig> {
  if (!window.electronAPI) return { enabled: false, interval: 'daily', lastBackup: null }
  const saved = await window.electronAPI.getSetting(BACKUP_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return { enabled: false, interval: 'daily', lastBackup: null }
}

async function saveConfig(config: BackupConfig) {
  if (!window.electronAPI) return
  await window.electronAPI.setSetting(BACKUP_KEY, JSON.stringify(config))
}

function getIntervalMs(interval: string): number {
  switch (interval) {
    case 'hourly': return 60 * 60 * 1000
    case 'daily': return 24 * 60 * 60 * 1000
    case 'weekly': return 7 * 24 * 60 * 60 * 1000
    default: return 24 * 60 * 60 * 1000
  }
}

export function useAutoBackup() {
  const [config, setConfig] = useState<BackupConfig>({
    enabled: false, interval: 'daily', lastBackup: null,
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadConfig().then((c) => {
      setConfig(c)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveConfig(config)
  }, [config, loaded])

  const doBackup = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const data = await window.electronAPI.exportData()
      const path = await window.electronAPI.saveBackupDialog(data)
      if (path) {
        const now = new Date().toISOString()
        setConfig((prev) => ({ ...prev, lastBackup: now }))
        toast({ title: '💾 Backup guardado', description: path.split('\\').pop() })
      }
    } catch {
      toast({ title: '❌ Error en backup', description: 'No se pudo crear el backup.', variant: 'destructive' })
    }
  }, [])

  useEffect(() => {
    if (!config.enabled || !loaded) return
    const ms = getIntervalMs(config.interval)
    const last = config.lastBackup ? new Date(config.lastBackup).getTime() : 0
    const next = last + ms - Date.now()
    const delay = Math.max(next, 5000)

    const timer = setTimeout(() => {
      doBackup()
    }, delay)

    return () => clearTimeout(timer)
  }, [config.enabled, config.interval, config.lastBackup, loaded, doBackup])

  return { config, setConfig, doBackup }
}
