import { useState, useRef, useEffect } from 'react'
import { Settings2, Volume2, VolumeX, Palette, User, Brain, Key, Check, X, Loader, Database, ArchiveRestore, Keyboard, MousePointer2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/use-toast'
import { useSound } from '@/hooks/useSound'
import { THEMES, useThemeStore } from '@/stores/themeStore'
import { useShortcutsStore } from '@/stores/shortcutsStore'
import { TABS, KEYBOARD_SHORTCUTS } from '@/constants/tabs'
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

export default function Settings({ open: externalOpen, onOpenChange: externalOnOpenChange }: { open?: boolean; onOpenChange?: (o: boolean) => void } = {}) {
  const t = useTranslate()
  const [eyeRestEnabled] = useState(true)
  const [eyeRestInterval] = useState(20)
  const [pomodoroPreset, setPomodoroPreset] = useState('default')
  const [focusTime, setFocusTime] = useState(25)
  const { soundEnabled, setSoundEnabled } = useSound()
  const { themeId, setThemeId } = useThemeStore()
  const { autoDarkMode, setAutoDarkMode, autoDarkStart, setAutoDarkStart, autoDarkEnd, setAutoDarkEnd } = useAppStore()
  const { shortcuts, setShortcut } = useShortcutsStore()
  const eyeRestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [recordingTabId, setRecordingTabId] = useState<string | null>(null)
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [restoreConfirm, setRestoreConfirm] = useState<BackupEntry | null>(null)
  const [userProfile, setUserProfile] = useState('custom')
  const [aiProvider, setAiProvider] = useState('anthropic')
  const [aiBaseUrl, setAiBaseUrl] = useState('http://localhost:1234/v1')
  const [aiModel, setAiModel] = useState('')
  const [aiModels, setAiModels] = useState<string[]>([])
  const [aiModelsLoading, setAiModelsLoading] = useState(false)
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiKeyValid, setAiKeyValid] = useState<boolean | null>(null)
  const [aiKeyChecking, setAiKeyChecking] = useState(false)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.settings.get('pomodoro_preset').then((val: string | null) => {
        if (val) setPomodoroPreset(val)
      })
      window.electronAPI.settings.get('pomodoro_focus').then((val: string | null) => {
        if (val) setFocusTime(Number(val))
      })
      window.electronAPI.settings.get('userProfile').then((val: string | null) => {
        if (val) setUserProfile(val)
      })
      window.electronAPI.settings.get('ai_api_key').then((val: string | null) => {
        if (val) setAiApiKey(val)
      })
      window.electronAPI.settings.get('ai_provider').then((val: string | null) => {
        if (val) setAiProvider(val)
      })
      window.electronAPI.settings.get('ai_base_url').then((val: string | null) => {
        if (val) setAiBaseUrl(val)
      })
      window.electronAPI.settings.get('ai_model').then((val: string | null) => {
        if (val) setAiModel(val)
      })
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.settings.set('pomodoro_preset', pomodoroPreset)
      if (pomodoroPreset === 'custom') {
        window.electronAPI.settings.set('pomodoro_focus', String(focusTime))
      } else {
        const preset = POMODORO_PRESETS.find(p => p.id === pomodoroPreset)
        if (preset) {
          setFocusTime(preset.focus)
          window.electronAPI.settings.set('pomodoro_focus', String(preset.focus))
        }
      }
    }
  }, [pomodoroPreset, focusTime])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.settings.set('ai_provider', aiProvider)
  }, [aiProvider])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.settings.set('ai_base_url', aiBaseUrl)
  }, [aiBaseUrl])

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.settings.set('ai_model', aiModel)
  }, [aiModel])

  async function loadAiModels() {
    if (!window.electronAPI) return
    setAiModelsLoading(true)
    setAiKeyValid(null)
    try {
      await window.electronAPI.settings.set('ai_base_url', aiBaseUrl)
      const models = await window.electronAPI.ai.listModels()
      setAiModels(models)
      if (models.length > 0 && !models.includes(aiModel)) setAiModel(models[0])
      toast({ title: 'Modelos cargados', description: `${models.length} modelo(s) disponible(s).` })
    } catch (err) {
      toast({ title: 'Error al conectar con LM Studio', description: String(err), variant: 'destructive' })
    } finally {
      setAiModelsLoading(false)
    }
  }

  useEffect(() => {
    if (eyeRestTimerRef.current) clearInterval(eyeRestTimerRef.current)
    if (eyeRestEnabled) {
      eyeRestTimerRef.current = setInterval(() => {
        if (window.electronAPI) {
          window.electronAPI.app.notification.show('👀 ' + t('settings.eye_rest'), t('settings.eye_rest_desc') + ' (Regla 20-20-20)')
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

  // Persist shortcuts to DB when they change
  useEffect(() => {
    if (!window.electronAPI) return
    const customShortcuts = Object.entries(shortcuts).filter(([k, v]) => KEYBOARD_SHORTCUTS[k] !== v)
    if (Object.keys(customShortcuts).length > 0) {
      window.electronAPI.settings.set('custom_shortcuts', JSON.stringify(Object.fromEntries(customShortcuts)))
    } else {
      window.electronAPI.settings.set('custom_shortcuts', '')
    }
  }, [shortcuts])

  async function loadBackups() {
    if (!window.electronAPI) return
    setBackupsLoading(true)
    const list = await window.electronAPI.backup.list()
    setBackups(list)
    setBackupsLoading(false)
  }

  async function handleRestoreBackup(backup: BackupEntry) {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.backup.restore(backup.filename)
      toast({ title: t('settings.backups_restore_success'), description: t('settings.backups_restore_success_desc').replace('{date}', backup.date) })
      setRestoreConfirm(null)
    } catch {
      toast({ title: t('settings.backups_restore_error'), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={externalOpen} onOpenChange={(open) => { externalOnOpenChange?.(open); if (open) loadBackups() }}>
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
                  window.electronAPI.settings.set('auto_dark_mode', val ? 'true' : 'false')
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
                    if (window.electronAPI) window.electronAPI.settings.set('auto_dark_start', e.target.value)
                  }} className="w-full rounded border border-border bg-background px-2 py-1 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('settings.auto_dark_end')}</label>
                  <input type="time" value={autoDarkEnd} onChange={(e) => {
                    setAutoDarkEnd(e.target.value)
                    if (window.electronAPI) window.electronAPI.settings.set('auto_dark_end', e.target.value)
                   }} className="w-full rounded border border-border bg-background px-2 py-1 text-xs" />
                  </div>
                </div>
              )}
            </div>

          <Separator />

          {/* Perfil de usuario */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Perfil de usuario</span>
            </div>
            <p className="text-xs text-muted-foreground">Personalizá la experiencia según tu perfil</p>
            <Select value={userProfile} onValueChange={(val) => {
              setUserProfile(val)
              if (window.electronAPI) {
                window.electronAPI.settings.set('userProfile', val)
              }
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">General</SelectItem>
                <SelectItem value="student">Estudiante</SelectItem>
                <SelectItem value="developer">Desarrollador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* AI Configuration */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">IA - Asistente de Estudio</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Elegí el proveedor de IA para generación de flashcards, resúmenes y tutor IA.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Proveedor</label>
              <Select value={aiProvider} onValueChange={(v) => { setAiProvider(v); setAiKeyValid(null) }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="lmstudio">LM Studio (local)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {aiProvider === 'anthropic' ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="pl-8 h-8 text-xs font-mono"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={aiKeyChecking || !aiApiKey}
                    onClick={async () => {
                      if (!window.electronAPI) return
                      setAiKeyChecking(true)
                      setAiKeyValid(null)
                      await window.electronAPI.settings.set('ai_provider', 'anthropic')
                      await window.electronAPI.settings.set('ai_api_key', aiApiKey)
                      const result = await window.electronAPI.ai.validateKey()
                      setAiKeyValid(result.valid)
                      setAiKeyChecking(false)
                      if (result.valid) toast({ title: 'API key válida', description: 'La clave de Anthropic funciona correctamente.' })
                      else toast({ title: 'API key inválida', description: 'Verificá la clave e intentá de nuevo.', variant: 'destructive' })
                    }}
                  >
                    {aiKeyChecking ? <Loader className="h-3 w-3 animate-spin" /> : aiKeyValid === true ? <Check className="h-3 w-3 text-green-500" /> : aiKeyValid === false ? <X className="h-3 w-3 text-red-500" /> : 'Validar'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tu API key se almacena localmente y solo se usa para llamadas a la API de Anthropic.
                </p>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">URL del servidor (LM Studio)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                      placeholder="http://localhost:1234/v1"
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
                      disabled={aiModelsLoading || !aiBaseUrl}
                      onClick={loadAiModels}
                    >
                      {aiModelsLoading ? <Loader className="h-3 w-3 animate-spin" /> : aiKeyValid === false ? <X className="h-3 w-3 text-red-500" /> : <RefreshCw className="h-3 w-3" />}
                      <span className="ml-1">Cargar modelos</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                  {aiModels.length > 0 ? (
                    <Select value={aiModel} onValueChange={setAiModel}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Elegí un modelo" /></SelectTrigger>
                      <SelectContent>
                        {aiModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="Nombre del modelo (ej: llama-3.2-3b-instruct)"
                      className="h-8 text-xs font-mono"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Asegurate de que LM Studio esté corriendo con el servidor local activado (Developer → Start Server).
                  La configuración se guarda automáticamente.
                </p>
              </>
            )}
          </div>

          <Separator />

          {/* Atajos de teclado personalizables */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Atajos de teclado</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Personalizá los atajos para navegar rápido. Hacé clic en un atajo y presioná la nueva combinación.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {TABS.filter(t => KEYBOARD_SHORTCUTS[t.id]).map(tab => (
                <div key={tab.id} className="flex items-center justify-between gap-2 p-2 rounded border bg-background/50">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MousePointer2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{tab.label}</span>
                  </div>
                  <button
                    onClick={() => setRecordingTabId(tab.id)}
                    className={`flex items-center gap-2 px-2 py-1 rounded border text-sm font-mono transition-colors ${
                      recordingTabId === tab.id
                        ? 'bg-primary/10 border-primary text-primary animate-pulse'
                        : 'bg-background border-border hover:bg-accent'
                    }`}
                    style={{ minWidth: '140px' }}
                    disabled={recordingTabId !== null && recordingTabId !== tab.id}
                  >
                    {recordingTabId === tab.id ? (
                      <>
                        <Keyboard className="h-3 w-3" /> Presioná combinación...
                      </>
                    ) : (
                      shortcuts[tab.id] || '—'
                    )}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { shortcuts && Object.keys(shortcuts).forEach(k => setShortcut(k, KEYBOARD_SHORTCUTS[k])); toast({ title: 'Atajos restaurados' }) }}>
                Restaurar por defecto
              </Button>
            </div>
          </div>

          <Separator />

          {/* Copias de seguridad */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Copias de seguridad</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Backups automáticos diarios de tu información. Elegí uno para restaurarlo.
            </p>
            {backupsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader className="h-3 w-3 animate-spin" /> Cargando...
              </div>
            ) : backups.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aún no hay backups. Se creará uno automáticamente cada día.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {backups.map(b => (
                  <div key={b.filename} className="flex items-center justify-between gap-2 p-2 rounded border bg-background/50">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{b.date}</p>
                      <p className="text-[10px] text-muted-foreground">{(b.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setRestoreConfirm(b)}>
                      <ArchiveRestore className="h-3 w-3" /> Restaurar
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
