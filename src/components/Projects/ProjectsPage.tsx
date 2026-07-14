import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Trash2, ExternalLink, FolderKanban, GitBranch,
  MoreHorizontal, Circle
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
import { safeIpc } from '@/lib/ipc'
import type { Project } from '@/types'

const STATUS_OPTIONS = ['activo', 'en pausa', 'completado', 'archivado']
const STATUS_COLORS: Record<string, string> = {
  activo: 'bg-green-500/20 text-green-400 border-green-500/30',
  'en pausa': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  archivado: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

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

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    if (!window.electronAPI) return
    const data = await safeIpc<Project[]>('getProjects')
    setProjects(data ?? [])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !window.electronAPI) return
    await safeIpc('createProject', { name, description: desc, status, tech_stack: techStack, repo_url: repoUrl, color })
    setName(''); setDesc(''); setTechStack(''); setRepoUrl('')
    setOpen(false)
    loadProjects()
    toast({ title: 'Proyecto creado', description: `"${name}" fue creado exitosamente.` })
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    await safeIpc('deleteProject', id)
    loadProjects()
    toast({ title: 'Proyecto eliminado', description: 'El proyecto fue eliminado.' })
  }

  async function handleStatusChange(id: number, newStatus: string) {
    if (!window.electronAPI) return
    await safeIpc('updateProject', id, { status: newStatus })
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={FolderKanban}
              title="No hay proyectos"
              description="Crea tu primer proyecto para organizar tu trabajo."
              actionLabel="Crear proyecto"
              onAction={() => setOpen(true)}
            />
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
                  <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary">
                    <GitBranch className="h-3 w-3" /> {project.repo_url.replace('https://github.com/', '')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
