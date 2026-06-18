import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'

const DEFAULT_TOPICS = [
  { parent_id: null, name: 'Fundamentos de Programacion', description: 'Variables, tipos, condicionales, loops', order_position: 0 },
  { parent_id: null, name: 'Estructuras de Datos', description: 'Arrays, listas, pilas, colas, arboles', order_position: 1 },
  { parent_id: null, name: 'Algoritmos', description: 'Busqueda, ordenamiento, recursion', order_position: 2 },
  { parent_id: null, name: 'Frontend', description: 'HTML, CSS, JavaScript, React', order_position: 3 },
  { parent_id: null, name: 'Backend', description: 'APIs, bases de datos, servidores', order_position: 4 },
  { parent_id: null, name: 'Git y Control de Versiones', description: 'Git, GitHub, branching', order_position: 5 },
]

interface Topic {
  id: number
  parent_id: number | null
  name: string
  description: string
  order_position: number
}

export default function StudyMap({ darkMode }: { darkMode: boolean }) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formParent, setFormParent] = useState('')

  useEffect(() => { loadTopics() }, [])

  async function loadTopics() {
    if (!window.electronAPI) {
      setTopics(DEFAULT_TOPICS.map((t, i) => ({ ...t, id: i + 1 })))
      return
    }
    let data = await window.electronAPI.getStudyTopics()
    if (data.length === 0) {
      for (const topic of DEFAULT_TOPICS) {
        await window.electronAPI.createStudyTopic(topic as any)
      }
      data = await window.electronAPI.getStudyTopics()
    }
    setTopics(data)
    const exp: Record<number, boolean> = {}
    data.forEach((t: Topic) => { exp[t.id] = true })
    setExpanded(exp)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    if (window.electronAPI) {
      await window.electronAPI.createStudyTopic({
        name: formName, description: formDesc,
        parent_id: formParent ? Number(formParent) : null,
        order_position: topics.length,
      } as any)
    }
    setFormName(''); setFormDesc(''); setFormParent('')
    setShowAddForm(false)
    loadTopics()
    toast({ title: 'Tema creado', description: `"${formName}" agregado.` })
  }

  async function handleCreateClick() {
    if (!formName.trim()) return
    if (window.electronAPI) {
      await window.electronAPI.createStudyTopic({
        name: formName, description: formDesc,
        parent_id: formParent ? Number(formParent) : null,
        order_position: topics.length,
      } as any)
    }
    setFormName(''); setFormDesc(''); setFormParent('')
    setShowAddForm(false)
    loadTopics()
    toast({ title: 'Tema creado', description: `"${formName}" agregado.` })
  }

  async function handleDelete(id: number) {
    if (window.electronAPI) await window.electronAPI.deleteStudyTopic(id)
    loadTopics()
  }

  function getChildren(parentId: number | null) {
    return topics.filter(t => t.parent_id === parentId)
  }

  function renderTopic(topic: Topic, depth = 0) {
    const children = getChildren(topic.id)
    const hasChildren = children.length > 0
    const isExpanded = expanded[topic.id]

    return (
      <div key={topic.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-accent/50 group cursor-pointer"
          style={{ marginLeft: depth * 24 }}
          onClick={() => { if (hasChildren) setExpanded({ ...expanded, [topic.id]: !isExpanded }) }}
        >
          {hasChildren ? (
            <span className="text-muted-foreground w-4">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          ) : (
            <span className="text-muted-foreground/50 w-4 text-xs">•</span>
          )}

          <span className="text-sm font-medium">{topic.name}</span>
          {topic.description && (
            <span className="text-xs text-muted-foreground ml-2 hidden md:inline">{topic.description}</span>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(topic.id) }}
            className="ml-auto text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {isExpanded && hasChildren && (
          <div>{children.map(child => renderTopic(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  const rootTopics = topics.filter(t => t.parent_id === null)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-500" /> Mapa de Estudio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organiza tu ruta de aprendizaje</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showAddForm ? 'Cerrar' : 'Añadir Tema'}
        </Button>
      </div>

      {showAddForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate}>
            <CardContent className="pt-4 space-y-3">
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre del tema" autoFocus required />
              <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descripción" />
              <Select value={formParent} onValueChange={setFormParent}>
                <SelectTrigger><SelectValue placeholder="Tema raíz (sin padre)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tema raíz (sin padre)</SelectItem>
                  {topics.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="submit" className="w-full">✓ Crear Tema</Button>
            </CardContent>
          </form>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4 space-y-1">
          {rootTopics.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No hay temas. ¡Crea tu primer tema!</p>
          )}
          {rootTopics.map(topic => renderTopic(topic))}
        </CardContent>
      </Card>
    </div>
  )
}
