import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Trash2, ExternalLink, FolderKanban, GitBranch, GitCommit,
  Circle, LayoutTemplate, Code2, Terminal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import TemplateLibrary from '@/components/Templates/TemplateLibrary'
import type { Project } from '@/types'

const STATUS_OPTIONS = ['activo', 'en pausa', 'completado', 'archivado']

const TEMPLATES = [
  { id: 'web', name: 'Desarrollo Web', desc: 'Proyecto de desarrollo web fullstack', color: '#3b82f6', tech: 'HTML, CSS, JavaScript',
    tasks: ['Configurar entorno de desarrollo', 'Diseñar mockups/prototipos', 'Crear estructura del proyecto', 'Desarrollar frontend', 'Desarrollar backend/API', 'Integrar base de datos', 'Tests y QA', 'Despliegue y configuración'] },
  { id: 'tesis', name: 'TESIS / TFG', desc: 'Proyecto de investigación y tesis', color: '#8b5cf6', tech: 'Investigación, LaTeX/Word',
    tasks: ['Elegir tema y alcance', 'Revisión bibliográfica', 'Definir metodología', 'Redactar anteproyecto', 'Recopilar datos/resultados', 'Análisis de resultados', 'Redacción del documento final', 'Preparar presentación', 'Revisión y correcciones'] },
  { id: 'curso', name: 'Curso Online', desc: 'Curso o certificación en tecnología', color: '#22c55e', tech: 'Aprendizaje',
    tasks: ['Investigar el curso/certificación', 'Crear plan de estudio', 'Estudiar módulo 1', 'Práctica módulo 1', 'Estudiar módulo 2', 'Práctica módulo 2', 'Examen de simulacro', 'Examen final'] },
  { id: 'movil', name: 'App Móvil', desc: 'Desarrollo de aplicación móvil', color: '#f97316', tech: 'React Native, Flutter',
    tasks: ['Definir features y alcance', 'Configurar entorno (React Native/Flutter)', 'Diseñar UI/UX', 'Desarrollar pantallas principales', 'Integrar APIs/servicios', 'Testing en dispositivos', 'Publicar en App Store/Play Store'] },
  { id: 'data', name: 'Proyecto de Datos', desc: 'Análisis de datos / Machine Learning', color: '#06b6d4', tech: 'Python, pandas, scikit-learn',
    tasks: ['Definir pregunta/hipótesis', 'Recopilar datos', 'Limpieza de datos', 'Análisis exploratorio (EDA)', 'Feature engineering', 'Entrenar modelos', 'Evaluar y comparar modelos', 'Documentar hallazgos'] },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [status, setStatus] = useState('activo')
  const [techStack, setTechStack] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [gitStatuses, setGitStatuses] = useState<Record<number, any>>({})

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.projects.list()
    setProjects(data ?? [])
  }

  async function loadGitStatuses() {
    if (!window.electronAPI) return
    for (const p of projects) {
      if (p.repo_url) {
        try {
          const status = await window.electronAPI.projects.gitStatus(p.id)
          if (status) setGitStatuses(prev => ({ ...prev, [p.id]: status }))
        } catch {}
      }
    }
  }

  useEffect(() => { if (projects.length > 0) loadGitStatuses() }, [projects])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !window.electronAPI) return
    await window.electronAPI.projects.create({ name, description: desc, status, tech_stack: techStack, repo_url: repoUrl, color })
    setName(''); setDesc(''); setTechStack(''); setRepoUrl('')
    setOpen(false)
    loadProjects()
    toast({ title: 'Proyecto creado', description: `"${name}" fue creado exitosamente.` })
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.projects.delete(id)
    loadProjects()
    toast({ title: 'Proyecto eliminado', description: 'El proyecto fue eliminado.' })
  }

  async function handleStatusChange(id: number, newStatus: string) {
    if (!window.electronAPI) return
    await window.electronAPI.projects.update(id, { status: newStatus })
    loadProjects()
  }

  async function createFromTemplate(templateId: string) {
    if (!window.electronAPI) return
    const template = TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    const project = await window.electronAPI.projects.create({
      name: template.name, description: template.desc, status: 'activo',
      tech_stack: template.tech, repo_url: '', color: template.color,
    })
    if (project) {
      for (const taskTitle of template.tasks) {
        await window.electronAPI.tasks.create({ title: taskTitle, description: '', priority: 'media', project_id: project.id } as any)
      }
      toast({ title: 'Proyecto creado desde plantilla', description: `${template.name} con ${template.tasks.length} tareas` })
    }
    setShowTemplates(false)
    loadProjects()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-indigo-500" /> Proyectos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organiza tus proyectos de programación</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
            <DialogTrigger asChild>
              <Button variant="outline"><LayoutTemplate className="h-4 w-4 mr-1" /> Plantilla</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear desde plantilla</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => createFromTemplate(t.id)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Circle className="h-3 w-3" style={{ fill: t.color, color: t.color }} />
                      <span className="font-medium text-sm">{t.name}</span>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{t.tasks.length} tareas</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuevo Proyecto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Proyecto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nombre</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Mi proyecto" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Descripción</label>
                <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción del proyecto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Estado</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Color</label>
                  <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 p-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Stack Tecnológico</label>
                <Input value={techStack} onChange={e => setTechStack(e.target.value)} placeholder="React, Node.js, PostgreSQL" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">URL del Repo</label>
                <Input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/user/repo" />
              </div>
              <Button type="submit" className="w-full">Crear Proyecto</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={FolderKanban}
              title="No hay proyectos"
              description="Crea tu primer proyecto para organizar tu trabajo."
              actionLabel="Crear proyecto"
              onAction={() => setOpen(true)}
            >
              <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} size="sm">
                <LayoutTemplate className="h-4 w-4 mr-1" /> Empezar con plantilla
              </Button>
            </EmptyState>
          </div>
        )}
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3" style={{ fill: project.color, color: project.color }} />
                    <CardTitle className="text-base">{project.name}</CardTitle>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => setDeleteId(project.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar</TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description || 'Sin descripción'}</p>
                <div className="flex items-center gap-2 mb-3">
                  <Select value={project.status} onValueChange={(v) => handleStatusChange(project.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {project.tech_stack && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {project.tech_stack.split(',').map((t: string) => t.trim()).filter(Boolean).map((tech: string) => (
                      <Badge key={tech} variant="secondary" className="text-[10px]">{tech}</Badge>
                    ))}
                  </div>
                )}
                {project.repo_url && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary">
                        <GitBranch className="h-3 w-3" /> {project.repo_url.replace('https://github.com/', '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="flex gap-0.5 ml-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); window.electronAPI?.projects.openInEditor(project.id, 'code') }}
                          className="p-1 rounded text-muted-foreground/50 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                          title="Abrir en VSCode"
                        >
                          <Code2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.electronAPI?.projects.openInEditor(project.id, 'claude') }}
                          className="p-1 rounded text-muted-foreground/50 hover:text-purple-500 hover:bg-purple-500/10 transition-all"
                          title="Abrir en Claude Code"
                        >
                          <Terminal className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {gitStatuses[project.id] && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <GitCommit className="h-3 w-3" />
                          {gitStatuses[project.id].branch}
                        </span>
                        <span>·</span>
                        <span className={`${gitStatuses[project.id].dirty ? 'text-amber-500' : 'text-green-500'}`}>
                          {gitStatuses[project.id].dirty ? `${gitStatuses[project.id].filesChanged} archivos modificados` : 'Clean'}
                        </span>
                        <span>·</span>
                        <span>{gitStatuses[project.id].lastCommit?.message?.slice(0, 30)}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <TemplateLibrary
        type="project"
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onInstantiated={() => { loadProjects() }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Eliminar proyecto"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  )
}
