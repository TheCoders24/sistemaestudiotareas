import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutTemplate, Projector, BookOpen, Kanban, Plus, X, Check, Loader
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { useTranslate } from '@/lib/translate'

interface Template {
  id: number
  type: string
  name: string
  description: string
  payload: string
  is_builtin: number
  created_at: string
}

interface TemplateLibraryProps {
  type: 'project' | 'kanban_board' | 'study_plan'
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstantiated?: (result: any) => void
  workspaceId?: number
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  project: { icon: <Projector className="h-5 w-5" />, label: 'Proyecto' },
  kanban_board: { icon: <Kanban className="h-5 w-5" />, label: 'Kanban' },
  study_plan: { icon: <BookOpen className="h-5 w-5" />, label: 'Plan de estudio' },
}

export default function TemplateLibrary({ type, open, onOpenChange, onInstantiated, workspaceId }: TemplateLibraryProps) {
  const t = useTranslate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [instantiating, setInstantiating] = useState<number | null>(null)
  const config = TYPE_CONFIG[type]

  useEffect(() => {
    if (open) loadTemplates()
  }, [open, type])

  async function loadTemplates() {
    setLoading(true)
    try {
      const data = await window.electronAPI?.templates.list(type)
      if (data) setTemplates(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleInstantiate(template: Template) {
    setInstantiating(template.id)
    try {
      const result = await window.electronAPI?.templates.instantiate(template.id, {
        workspace_id: workspaceId || 1,
        name: template.name,
        date: new Date().toISOString().split('T')[0],
      })
      toast({ title: 'Plantilla aplicada', description: `"${template.name}" creado exitosamente.` })
      onInstantiated?.(result)
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo aplicar la plantilla', variant: 'destructive' })
    } finally {
      setInstantiating(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-indigo-500" /> Empezar con plantilla
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Elegí una plantilla de {config.label.toLowerCase()} para empezar rápidamente:
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <LayoutTemplate className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No hay plantillas disponibles para este tipo.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {templates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    className={`cursor-pointer hover:border-indigo-500/50 transition-all ${instantiating === template.id ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleInstantiate(template)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {template.is_builtin ? 'Predefinida' : 'Personalizada'}
                      </Badge>
                      {instantiating === template.id && (
                        <Loader className="h-4 w-4 animate-spin text-indigo-500" />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
