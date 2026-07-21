import { useState, useEffect } from 'react'
import { NotebookPen, CalendarDays, Brain, Target, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import ReactMarkdown from 'react-markdown'
import { safeIpc } from '@/lib/ipc'
import type { DailyLog } from '@/types'

export default function DailyLogPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentLog, setCurrentLog] = useState<DailyLog | null>(null)
  const [content, setContent] = useState('')
  const [focus, setFocus] = useState('')
  const [blockers, setBlockers] = useState('')
  const [tomorrowPlan, setTomorrowPlan] = useState('')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadLogs() }, [])
  useEffect(() => { loadLogForDate(selectedDate) }, [selectedDate])

  async function loadLogs() {
    if (!window.electronAPI) return
    const data = await safeIpc<DailyLog[]>('getDailyLogs')
    setLogs(data ?? [])
  }

  async function loadLogForDate(date: string) {
    if (!window.electronAPI) return
    const log = await safeIpc<DailyLog>('getDailyLog', date)
    setCurrentLog(log)
    if (log) {
      setContent(log.content)
      setFocus(log.focus)
      setBlockers(log.blockers)
      setTomorrowPlan(log.tomorrow_plan)
    } else {
      setContent('')
      setFocus('')
      setBlockers('')
      setTomorrowPlan('')
    }
  }

  async function handleSave() {
    if (!window.electronAPI) return
    setSaving(true)
    if (currentLog) {
      await safeIpc('updateDailyLog', currentLog.id, { content, focus, blockers, tomorrow_plan: tomorrowPlan })
    } else {
      await safeIpc('createDailyLog', { date: selectedDate, content, focus, blockers, tomorrow_plan: tomorrowPlan })
    }
    loadLogs()
    loadLogForDate(selectedDate)
    setSaving(false)
    toast({ title: 'Diario guardado', description: `Entrada del ${selectedDate} actualizada.` })
  }

  function getDates(): string[] {
    const dates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  const hasLog = (date: string) => logs.some(l => l.date === date && l.content)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <NotebookPen className="h-6 w-6 text-indigo-500" /> Diario
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registra tu día a día como programador</p>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {getDates().map(date => {
          const active = date === selectedDate
          const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
          const d = new Date(date + 'T12:00:00')
          const dayName = dayNames[d.getDay()]
          const dayNum = d.getDate()
          const isToday = date === new Date().toISOString().split('T')[0]
          return (
            <Button
              key={date}
              variant={active ? 'default' : hasLog(date) ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSelectedDate(date)}
              className={`flex-col py-3 h-auto min-w-[60px] ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <span className="text-xs">{dayName}</span>
              <span className="text-lg font-bold">{dayNum}</span>
              {hasLog(date) && <span className="text-[8px] text-green-400">●</span>}
            </Button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Content */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-500" /> ¿Qué trabajé hoy?
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)} className="text-xs">
                {preview ? 'Editar' : 'Previsualizar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {preview ? (
              <div className="prose prose-sm dark:prose-invert max-w-none min-h-[120px] p-3 rounded-md bg-muted/50">
                <ReactMarkdown>{content || '*Sin contenido*'}</ReactMarkdown>
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Escribe en markdown lo que trabajaste hoy..."
                className="min-h-[120px]"
              />
            )}
          </CardContent>
        </Card>

        {/* Focus */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" /> ¿En qué me enfoqué?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={focus}
              onChange={e => setFocus(e.target.value)}
              placeholder="Ej: Terminar el módulo de autenticación, refactorizar el Kanban..."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Blockers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Bloqueos / Problemas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={blockers}
              onChange={e => setBlockers(e.target.value)}
              placeholder="¿Qué problemas tuve? ¿Qué me bloqueó?"
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Tomorrow plan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-500" /> Plan para mañana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={tomorrowPlan}
              onChange={e => setTomorrowPlan(e.target.value)}
              placeholder="¿Qué voy a hacer mañana?"
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : '💾 Guardar entrada del día'}
        </Button>
      </div>

      {/* Recent entries */}
      {logs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Entradas recientes</h2>
          <div className="space-y-2">
            {logs.slice(0, 5).map(log => (
              <Card key={log.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedDate(log.date)}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{log.date}</span>
                    <span className="text-muted-foreground truncate">{log.content?.slice(0, 100)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
