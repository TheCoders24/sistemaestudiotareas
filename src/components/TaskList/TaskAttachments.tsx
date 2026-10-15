import { useState, useEffect } from 'react'
import { Plus, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListSkeleton } from '@/components/ui/loading-skeleton'
import { toast } from '@/components/ui/use-toast'
import type { Attachment } from '@/types'

interface TaskAttachmentsProps {
  taskId: number
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return '🖼️'
  if (mime.startsWith('video/')) return '🎬'
  if (mime.includes('pdf')) return '📄'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('sheet') || mime.includes('excel')) return '📊'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📽️'
  if (mime.includes('text')) return '📃'
  return '📎'
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const [files, setFiles] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (!window.electronAPI) { setLoading(false); return }
      const data = await window.electronAPI.attachments.list('task', taskId)
      if (!active) return
      setFiles(data)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [taskId])

  async function handleAdd() {
    if (!window.electronAPI) return
    setUploading(true)
    try {
      const file = await window.electronAPI.attachments.add('task', taskId)
      if (file) {
        setFiles(prev => [file, ...prev])
        toast({ title: 'Archivo adjuntado' })
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleOpen(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.attachments.open(id)
  }

  async function handleDelete(id: number) {
    if (!window.electronAPI) return
    await window.electronAPI.attachments.delete(id)
    setFiles(prev => prev.filter(f => f.id !== id))
    toast({ title: 'Archivo eliminado' })
  }

  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Adjuntos</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-indigo-500 hover:text-indigo-400"
          onClick={handleAdd} disabled={uploading}>
          <Plus className="h-3 w-3" /> {uploading ? 'Subiendo...' : 'Adjuntar'}
        </Button>
      </div>
      {loading ? (
        <ListSkeleton rows={2} />
      ) : files.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-2">Sin archivos adjuntos</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent text-xs group/file">
              <span className="text-sm">{getFileIcon(file.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <span className="truncate block">{file.file_name}</span>
                <span className="text-[10px] text-muted-foreground">{formatFileSize(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString()}</span>
              </div>
              <button
                onClick={() => handleOpen(file.id)}
                className="p-1 rounded text-muted-foreground/50 hover:text-indigo-500 hover:bg-indigo-500/10 opacity-0 group-hover/file:opacity-100 transition-all"
                aria-label="Abrir archivo"
              >
                <ExternalLink className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleDelete(file.id)}
                className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/file:opacity-100 transition-all"
                aria-label="Eliminar archivo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
