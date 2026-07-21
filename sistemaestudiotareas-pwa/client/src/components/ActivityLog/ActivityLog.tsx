import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
export default function ActivityLog() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getActivityFeed().then(setLogs)
    }
  }, [])

  const actionColors: Record<string, string> = {
    created: 'bg-green-500/10 text-green-500',
    completed: 'bg-indigo-500/10 text-indigo-500',
    deleted: 'bg-red-500/10 text-red-500',
    updated: 'bg-blue-500/10 text-blue-500',
    reviewed: 'bg-yellow-500/10 text-yellow-500',
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <History className="h-6 w-6 text-indigo-500" /> Historial de actividad
      </h1>
      {logs.length === 0 && (
        <EmptyState icon={History} title="Sin actividad" description="Tus acciones aparecerán aquí" />
      )}
      <div className="space-y-1">
        {logs.map((log) => (
          <Card key={log.id} className="border-0 border-b rounded-none last:border-b-0">
            <CardContent className="py-2 px-3 flex items-center gap-3">
              <Badge variant="outline" className={`text-[10px] uppercase ${actionColors[log.action] || ''}`}>
                {log.action}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">{log.entity_type}</span>
              <span className="text-xs flex-1 truncate">{log.description}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
