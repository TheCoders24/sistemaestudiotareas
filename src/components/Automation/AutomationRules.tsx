import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { useWorkspaceStore } from '@/stores/workspaceStore'

interface Condition {
  type: string
  field: string
  value?: string
}

interface Action {
  type: string
  payload: Record<string, any>
}

interface AutomationRule {
  id: number
  workspace_id: number
  name: string
  enabled: number
  trigger: string
  conditions: Condition[]
  actions: Action[]
  created_at: string
  updated_at: string
}

const TRIGGERS = [
  { value: 'task.created', label: 'Tarea creada' },
  { value: 'task.updated', label: 'Tarea actualizada' },
  { value: 'task.deleted', label: 'Tarea eliminada' },
  { value: 'task.moved', label: 'Tarea movida' },
  { value: 'project.created', label: 'Proyecto creado' },
  { value: 'project.updated', label: 'Proyecto actualizado' },
  { value: 'project.archived', label: 'Proyecto archivado' },
  { value: 'workspace.switched', label: 'Workspace cambiado' },
  { value: 'module.changed', label: 'Módulo cambiado' },
]

const ACTION_TYPES = [
  { value: 'task.move.column', label: 'Mover tarea a columna' },
  { value: 'task.set.priority', label: 'Cambiar prioridad' },
  { value: 'task.create', label: 'Crear tarea' },
  { value: 'project.archive', label: 'Archivar proyecto' },
  { value: 'notification.show', label: 'Mostrar notificación' },
  { value: 'webhook', label: 'Webhook' },
]

const CONDITION_TYPES = [
  { value: 'equals', label: 'Igual a' },
  { value: 'exists', label: 'Existe' },
]

const CONDITION_FIELDS = [
  { value: 'priority', label: 'Prioridad' },
  { value: 'projectName', label: 'Nombre del proyecto' },
  { value: 'taskName', label: 'Nombre de la tarea' },
  { value: 'status', label: 'Estado' },
]

export default function AutomationRulesPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editRule, setEditRule] = useState<AutomationRule | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const workspaceId = useWorkspaceStore(s => s.activeWorkspace?.id)

  useEffect(() => {
    loadRules()
  }, [workspaceId])

  async function loadRules() {
    setLoading(true)
    try {
      const res = await (window as any).electronAPI.automation.list(workspaceId)
      setRules(res || [])
    } catch { setRules([]) }
    setLoading(false)
  }

  async function toggleRule(rule: AutomationRule) {
    try {
      await (window as any).electronAPI.automation.update(rule.id, { enabled: rule.enabled ? 0 : 1 })
      toast({ title: rule.enabled ? 'Regla desactivada' : 'Regla activada' })
      loadRules()
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado', variant: 'destructive' })
    }
  }

  async function deleteRule(id: number) {
    try {
      await (window as any).electronAPI.automation.delete(id)
      toast({ title: 'Regla eliminada' })
      loadRules()
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  async function saveRule(data: any) {
    try {
      if (editRule) {
        await (window as any).electronAPI.automation.update(editRule.id, data)
        toast({ title: 'Regla actualizada' })
      } else {
        await (window as any).electronAPI.automation.create({ ...data, workspaceId })
        toast({ title: 'Regla creada' })
      }
      setEditOpen(false)
      setEditRule(null)
      loadRules()
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
    }
  }

  const triggerLabel = (t: string) => TRIGGERS.find(x => x.value === t)?.label || t
  const actionLabel = (a: Action) => ACTION_TYPES.find(x => x.value === a.type)?.label || a.type

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-yellow-500" /> Reglas de Automatización</h1>
          <p className="text-muted-foreground text-sm">Creá reglas para automatizar acciones cuando ocurran eventos</p>
        </div>
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditRule(null) }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nueva regla</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <RuleForm rule={editRule} onSave={saveRule} onCancel={() => { setEditOpen(false); setEditRule(null) }} />
          </DialogContent>
        </Dialog>
      </div>
      <Separator />

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Cargando...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No hay reglas de automatización</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Creá tu primera regla para empezar a automatizar tareas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="bg-accent/50 rounded-lg p-4 border border-border/50 hover:border-border transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{rule.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 shrink-0">
                      {triggerLabel(rule.trigger)}
                    </span>
                  </div>
                  {rule.conditions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Condiciones: {rule.conditions.map(c => `${c.field} ${c.type === 'equals' ? '=' : 'existe'}`).join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Acciones: {rule.actions.map(actionLabel).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={!!rule.enabled} onCheckedChange={() => toggleRule(rule)} />
                  <Button variant="ghost" size="icon" onClick={() => { setEditRule(rule); setEditOpen(true) }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RuleForm({ rule, onSave, onCancel }: { rule: AutomationRule | null; onSave: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(rule?.name || '')
  const [trigger, setTrigger] = useState(rule?.trigger || 'task.created')
  const [conditions, setConditions] = useState<Condition[]>(rule?.conditions || [])
  const [actions, setActions] = useState<Action[]>(rule?.actions || [{ type: 'notification.show', payload: { title: '', body: '' } }])

  function addCondition() {
    setConditions([...conditions, { type: 'equals', field: 'priority', value: 'alta' }])
  }

  function updateCondition(i: number, part: Partial<Condition>) {
    const c = [...conditions]
    c[i] = { ...c[i], ...part }
    setConditions(c)
  }

  function removeCondition(i: number) {
    setConditions(conditions.filter((_, idx) => idx !== i))
  }

  function addAction() {
    setActions([...actions, { type: 'notification.show', payload: { title: '', body: '' } }])
  }

  function updateAction(i: number, part: Partial<Action>) {
    const a = [...actions]
    a[i] = { ...a[i], ...part }
    setActions(a)
  }

  function updateActionPayload(i: number, key: string, value: any) {
    const a = [...actions]
    a[i] = { ...a[i], payload: { ...a[i].payload, [key]: value } }
    setActions(a)
  }

  function removeAction(i: number) {
    setActions(actions.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
    if (actions.length === 0) { toast({ title: 'Agregá al menos una acción', variant: 'destructive' }); return }
    onSave({ name, trigger, conditions, actions })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{rule ? 'Editar regla' : 'Nueva regla de automatización'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <Label>Nombre</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Priorizar tareas urgentes" />
      </div>
      <div className="space-y-2">
        <Label>Evento disparador</Label>
        <Select value={trigger} onValueChange={setTrigger}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRIGGERS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Condiciones (opcional)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCondition}><Plus className="h-3 w-3 mr-1" /> Agregar</Button>
        </div>
        {conditions.map((c, i) => (
          <div key={i} className="flex items-center gap-2 bg-muted/50 rounded p-2">
            <Select value={c.type} onValueChange={v => updateCondition(i, { type: v })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={c.field} onValueChange={v => updateCondition(i, { field: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITION_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {c.type === 'equals' && (
              <Input value={c.value || ''} onChange={e => updateCondition(i, { value: e.target.value })} placeholder="Valor" className="w-32" />
            )}
            <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(i)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Acciones</Label>
          <Button type="button" variant="outline" size="sm" onClick={addAction}><Plus className="h-3 w-3 mr-1" /> Agregar</Button>
        </div>
        {actions.map((a, i) => (
          <div key={i} className="space-y-2 bg-muted/50 rounded p-3">
            <div className="flex items-center gap-2">
              <Select value={a.type} onValueChange={v => updateAction(i, { type: v, payload: {} })}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeAction(i)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
            {a.type === 'notification.show' && (
              <div className="grid grid-cols-2 gap-2 pl-2">
                <Input value={a.payload.title || ''} onChange={e => updateActionPayload(i, 'title', e.target.value)} placeholder="Título notificación" />
                <Input value={a.payload.body || ''} onChange={e => updateActionPayload(i, 'body', e.target.value)} placeholder="Cuerpo notificación" />
              </div>
            )}
            {a.type === 'task.set.priority' && (
              <Select value={a.payload.priority || 'media'} onValueChange={v => updateActionPayload(i, 'priority', v)}>
                <SelectTrigger className="w-40 ml-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            )}
            {a.type === 'task.create' && (
              <div className="grid grid-cols-2 gap-2 pl-2">
                <Input value={a.payload.title || ''} onChange={e => updateActionPayload(i, 'title', e.target.value)} placeholder="Título tarea" />
                <Input value={a.payload.description || ''} onChange={e => updateActionPayload(i, 'description', e.target.value)} placeholder="Descripción" />
              </div>
            )}
            {a.type === 'project.archive' && (
              <p className="text-xs text-muted-foreground pl-2">El proyecto asociado al evento será archivado</p>
            )}
            {a.type === 'webhook' && (
              <div className="space-y-2 pl-2">
                <div>
                  <label className="text-xs font-medium">URL del Webhook</label>
                  <Input value={a.payload.url || ''} onChange={e => updateActionPayload(i, 'url', e.target.value)} placeholder="https://hooks.slack.com/services/..." />
                </div>
                <div>
                  <label className="text-xs font-medium">Payload JSON (usa {"{{task.title}}"}, {"{{task.description}}"})</label>
                  <Textarea value={a.payload.body || ''} onChange={e => updateActionPayload(i, 'body', e.target.value)} rows={4} placeholder='{"text": "Nueva tarea: {{task.title}}"}' />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{rule ? 'Actualizar' : 'Crear regla'}</Button>
      </div>
    </form>
  )
}
