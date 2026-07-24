import { useState, useRef, useEffect } from 'react'
import { Settings2, Download, Upload, Eye, Volume2, VolumeX, Palette, Timer, Keyboard, RotateCcw, HardDrive, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/use-toast'
import { useSound } from '@/hooks/useSound'
import { THEMES, useThemeStore } from '@/stores/themeStore'
import { useShortcutsStore } from '@/stores/shortcutsStore'
import { TABS } from '@/constants/tabs'
import { useTranslate } from '@/lib/translate'
import { useAppStore } from '@/stores/appStore'

const POMODORO_PRESETS = [
  { id: 'default', name: 'Clásico', focus: 25, short: 5, long: 15 },
  { id: 'long', name: 'Enfoque largo', focus: 50, short: 10, long: 20 },
  { id: 'short', name: 'Rápido', focus: 15, short: 3, long: 10 },
  { id: 'custom', name: 'Personalizado', focus: 25, short: 5, long: 15 },
]

interface BackupEntry {
  date: string
  filename: string
  size: number
}

export default function Settings() {
  const t = useTranslate()
  const [eyeRestEnabled, setEyeRestEnabled] = useState(true)
  const [eyeRestInterval, setEyeRestInterval] = useState(20)
  const [pomodoroPreset, setPomodoroPreset] = useState('default')
  const [focusTime, setFocusTime] = useState(25)
  const { soundEnabled, setSoundEnabled } = useSound()
  const { themeId, setThemeId } = useThemeStore()
  const { autoDarkMode, setAutoDarkMode, autoDarkStart, setAutoDarkStart, autoDarkEnd, setAutoDarkEnd } = useAppStore()
  const { shortcuts, setShortcut, resetDefaults } = useShortcutsStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const eyeRestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [recordingTabId, setRecordingTabId] = useState<string | null>(null)
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [restoreConfirm, setRestoreConfirm] = useState<BackupEntry | null>(null)

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
          window.electronAPI.showNotification('👀 ' + t('settings.eye_rest'), t('settings.eye_rest_desc') + ' (Regla 20-20-20)')
        }
      }, eyeRestInterval * 60 * 1000)
    }
    return () => { if (eyeRestTimerRef.current) clearInterval(eyeRestTimerRef.current) }
  }, [eyeRestEnabled, eyeRestInterval, t])

  useEffect(() => {
    if (recordingTabId) {
      const handler = (e: KeyboardEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const ctrl = e.ctrlKey || e.metaKey
        const shift = e.shiftKey
        if (ctrl) {
          const key = e.key === '/' ? '/' : e.key.toUpperCase()
          const combo = `Ctrl${shift ? '+Shift' : ''}+${key}`
          if (!Object.values(shortcuts).includes(combo) || Object.keys(shortcuts).find(k => shortcuts[k] === combo) === recordingTabId) {
            setShortcut(recordingTabId, combo)
            toast({ title: t('settings.shortcuts'), description: `${TABS.find(t => t.id === recordingTabId)?.label}: ${combo}` })
          } else {
            toast({ title: t('settings.shortcuts'), description: 'Combinación ya en uso', variant: 'destructive' })
          }
        }
        setRecordingTabId(null)
      }
      window.addEventListener('keydown', handler, true)
      return () => window.removeEventListener('keydown', handler, true)
    }
  }, [recordingTabId, shortcuts, setShortcut, t])

  async function loadBackups() {
    if (!window.electronAPI) return
    setBackupsLoading(true)
    const list = await window.electronAPI.listBackups()
    setBackups(list)
    setBackupsLoading(false)
  }

  async function handleRestoreBackup(backup: BackupEntry) {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.restoreBackup(backup.filename)
      toast({ title: t('settings.backups_restore_success'), description: t('settings.backups_restore_success_desc').replace('{date}', backup.date) })
      setRestoreConfirm(null)
    } catch {
      toast({ title: t('settings.backups_restore_error'), variant: 'destructive' })
    }
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
    toast({ title: t('settings.export_success'), description: t('settings.export_success_desc') })
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
          toast({ title: '✅ ' + t('settings.import_success'), description: t('settings.import_success_desc') })
        }
      } catch {
        toast({ title: '❌ ' + t('common.error', 'Error'), description: t('settings.import_error'), variant: 'destructive' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <Dialog onOpenChange={(open) => { if (open) loadBackups() }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> {t('settings.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* Sound */}
          <div className="bg-accent/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {soundEnabled ? <Volume2 className="h-4 w-4 text-blue-500" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium">{t('settings.sound')}</span>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
            <p className="text-xs text-muted-foreground">{t('settings.sound_desc')}</p>
          </div>

          <Separator />

          {/* Theme */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">{t('settings.theme')}</span>
            </div>
            <div className="flex gap-2">
              {THEMES.map(th => (
                <button
                  key={th.id}
                  onClick={() => setThemeId(th.id)}
                  className={`w-8 h-8 rounded-full transition-all ${themeId === th.id ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''}`}
                  style={{ backgroundColor: th.primary }}
                  title={th.label}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Auto Dark Mode */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">{t('settings.auto_dark')}</span>
              </div>
              <Switch checked={autoDarkMode} onCheckedChange={(val) => {
                setAutoDarkMode(val)
                if (window.electronAPI) {
                  window.electronAPI.setSetting('auto_dark_mode', val ? 'true' : 'false')
                }
              }} />
            </div>
            <p className="text-xs text-muted-foreground">{t('settings.auto_dark_desc')}</p>
            {autoDarkMode && (
              <div className="flex gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('settings.auto_dark_start')}</label>
                  <input type="time" value={autoDarkStart} onChange={(e) => {
                    setAutoDarkStart(e.target.value)
                    if (window.electronAPI) window.electronAPI.setSetting('auto_dark_start', e.target.value)
                  }} className="w-full rounded border border-border bg-background px-2 py-1 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('settings.auto_dark_end')}</label>
                  <input type="time" value={autoDarkEnd} onChange={(e) => {
                    setAutoDarkEnd(e.target.value)
                    if (window.electronAPI) window.electronAPI.setSetting('auto_dark_end', e.target.value)
                  }} className="w-full rounded border border-border bg-background px-2 py-1 text-xs" />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Pomodoro */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">{t('settings.pomodoro')}</span>
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
              <label className="text-xs text-muted-foreground">{t('settings.pomodoro_focus')}: {focusTime} min</label>
              <Slider value={[focusTime]} onValueChange={([v]) => {
                setFocusTime(v); setPomodoroPreset('custom')
              }} min={5} max={60} step={5} />
            </div>
          </div>

          <Separator />

          {/* Eye Rest */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">{t('settings.eye_rest')}</span>
              </div>
              <Switch checked={eyeRestEnabled} onCheckedChange={setEyeRestEnabled} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('settings.eye_rest_interval')}: {eyeRestInterval} min</label>
              <Slider value={[eyeRestInterval]} onValueChange={([v]) => setEyeRestInterval(v)}
                min={10} max={60} step={5} />
            </div>
          </div>

          <Separator />

          {/* Shortcuts */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">{t('settings.shortcuts')}</span>
              <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={resetDefaults} title={t('settings.shortcuts_reset')}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('settings.shortcuts_hint')}</p>
            {recordingTabId && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400 animate-pulse">
                {t('settings.shortcuts_recording')}
              </div>
            )}
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {TABS.map(tab => (
                <div key={tab.id} className="flex items-center justify-between px-1 py-0.5 rounded hover:bg-accent/50">
                  <span className="text-xs">{tab.label}</span>
                  <button
                    onClick={() => setRecordingTabId(recordingTabId === tab.id ? null : tab.id)}
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-mono transition-all
                      ${recordingTabId === tab.id
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
                        : 'border-border bg-muted text-foreground hover:border-foreground'
                      }`}
                  >
                    {recordingTabId === tab.id ? '...' : shortcuts[tab.id]}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Export */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-green-500" /> {t('settings.export')}
            </p>
            <Button onClick={handleExport} className="w-full" variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> {t('settings.export_btn')}
            </Button>
          </div>

          {/* Import */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-500" /> {t('settings.import')}
            </p>
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1" /> {t('settings.import_btn')}
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>

          <Separator />

          {/* Auto Backups */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">{t('settings.backups')}</span>
              {backupsLoading && <span className="text-xs text-muted-foreground ml-auto">{t('common.loading')}</span>}
            </div>
            {backups.length === 0 && !backupsLoading && (
              <p className="text-xs text-muted-foreground py-2">{t('settings.backups_none')}</p>
            )}
            {backups.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {backups.map(b => (
                  <div key={b.filename} className="flex items-center justify-between px-1 py-1 rounded hover:bg-accent/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium truncate">{b.date}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(b.size)}</span>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => setRestoreConfirm(b)}>
                      <AlertTriangle className="h-3 w-3 mr-1" /> {t('settings.backups_restore')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </DialogContent>

      <ConfirmDialog
        open={!!restoreConfirm}
        onOpenChange={() => setRestoreConfirm(null)}
        onConfirm={() => restoreConfirm && handleRestoreBackup(restoreConfirm)}
        title={t('settings.backups_restore')}
        description={t('settings.backups_restore_confirm').replace('{date}', restoreConfirm?.date || '')}
        confirmLabel={t('settings.backups_restore')}
      />
    </Dialog>
  )
}