import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Calendar, Link2, PenLine, FileText, CheckCircle2, Clock, Trash2, Plus, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'

interface ParsedEvent {
  title: string
  start: string
  end: string
  description: string
  selected: boolean
}

interface ImportHistoryEntry {
  date: string
  source: string
  eventCount: number
}

interface ManualForm {
  title: string
  date: string
  time: string
  duration: string
  description: string
}

const STORAGE_KEY = 'calendar_import_history'

function loadHistory(): ImportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveHistory(history: ImportHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

function parseICS(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = []
  const lines = text.split(/\r?\n/)
  let current: Partial<ParsedEvent> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
    } else if (line === 'END:VEVENT') {
      if (current.title) {
        events.push({
          title: current.title || 'Sin título',
          start: current.start || '',
          end: current.end || '',
          description: current.description || '',
          selected: true,
        })
      }
      current = {}
    } else {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':')
      const baseKey = key?.split(';')[0]

      if (baseKey === 'SUMMARY') current.title = value
      else if (baseKey === 'DTSTART') {
        current.start = parseICSDate(value)
      } else if (baseKey === 'DTEND') {
        current.end = parseICSDate(value)
      } else if (baseKey === 'DESCRIPTION') {
        current.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',')
      }
    }
  }
  return events
}

function parseICSDate(val: string): string {
  const clean = val.replace(/[^0-9T]/g, '')
  if (clean.length >= 15) {
    const y = clean.slice(0, 4)
    const m = clean.slice(4, 6)
    const d = clean.slice(6, 8)
    const h = clean.slice(9, 11)
    const min = clean.slice(11, 13)
    return `${y}-${m}-${d}T${h}:${min}`
  }
  if (clean.length >= 8) {
    const y = clean.slice(0, 4)
    const m = clean.slice(4, 6)
    const d = clean.slice(6, 8)
    return `${y}-${m}-${d}`
  }
  return val
}

function formatDateTime(dt: string): string {
  if (!dt) return '-'
  try {
    const d = new Date(dt)
    if (isNaN(d.getTime())) return dt
    return d.toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dt
  }
}

export default function CalendarImport() {
  const [importMethod, setImportMethod] = useState('ics')
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([])
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([])
  const [calendarUrl, setCalendarUrl] = useState('')
  const [manualForm, setManualForm] = useState<ManualForm>({ title: '', date: '', time: '', duration: '60', description: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setImportHistory(loadHistory())
  }, [])

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text.includes('BEGIN:VEVENT')) {
        const events = parseICS(text)
        setParsedEvents(events)
        toast({ title: 'Archivo ICS parseado', description: `${events.length} eventos encontrados` })
      } else {
        toast({ title: 'Formato no válido', description: 'El archivo no parece ser un ICS válido', variant: 'destructive' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function toggleEventSelection(idx: number) {
    setParsedEvents(prev => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e))
  }

  function selectAll() {
    setParsedEvents(prev => prev.map(e => ({ ...e, selected: true })))
  }

  function deselectAll() {
    setParsedEvents(prev => prev.map(e => ({ ...e, selected: false })))
  }

  async function importSelected() {
    const selected = parsedEvents.filter(e => e.selected)
    if (selected.length === 0) {
      toast({ title: 'Sin eventos seleccionados', variant: 'destructive' })
      return
    }
    if (window.electronAPI) {
      for (const event of selected) {
        try {
          await window.electronAPI.createTask?.({
            title: event.title,
            due_date: event.start || null,
            description: event.description,
            priority: 'media',
          })
        } catch {}
      }
    }
    const entry: ImportHistoryEntry = {
      date: new Date().toISOString(),
      source: 'Archivo ICS',
      eventCount: selected.length,
    }
    const newHistory = [entry, ...importHistory].slice(0, 20)
    setImportHistory(newHistory)
    saveHistory(newHistory)
    setParsedEvents([])
    toast({ title: 'Eventos importados', description: `${selected.length} eventos agregados como tareas` })
  }

  function importUrl() {
    if (!calendarUrl.trim()) return
    toast({ title: 'Importación simulada', description: 'La importación por URL requiere integración con OAuth. Por ahora, exporta tu calendario como ICS.' })
  }

  function addManualEvent() {
    if (!manualForm.title.trim() || !manualForm.date) {
      toast({ title: 'Campos requeridos', description: 'Completa al menos título y fecha', variant: 'destructive' })
      return
    }
    const dateTime = manualForm.time
      ? `${manualForm.date}T${manualForm.time}`
      : manualForm.date
    if (window.electronAPI) {
      window.electronAPI.createTask?.({
        title: manualForm.title,
        due_date: dateTime,
        description: manualForm.description,
        priority: 'media',
      })
    }
    const entry: ImportHistoryEntry = {
      date: new Date().toISOString(),
      source: 'Manual',
      eventCount: 1,
    }
    const newHistory = [entry, ...importHistory].slice(0, 20)
    setImportHistory(newHistory)
    saveHistory(newHistory)
    setManualForm({ title: '', date: '', time: '', duration: '60', description: '' })
    toast({ title: 'Evento creado', description: `"${manualForm.title}" agregado como tarea` })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-blue-500" /> Importar Calendario
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Importa eventos de tu calendario externo</p>
      </div>

      <Tabs value={importMethod} onValueChange={setImportMethod}>
        <TabsList className="mb-6">
          <TabsTrigger value="ics" className="gap-1.5">
            <FileText className="h-4 w-4" /> Archivo ICS
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-1.5">
            <Link2 className="h-4 w-4" /> URL de calendario
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-1.5">
            <PenLine className="h-4 w-4" /> Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ics">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-500" /> Importar archivo ICS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Formatos soportados: ICS (iCalendar), exportación de Google Calendar
              </p>
              <input ref={fileInputRef} type="file" accept=".ics" onChange={handleFileUpload} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2 mb-4">
                <Upload className="h-4 w-4" /> Seleccionar archivo ICS
              </Button>

              <AnimatePresence>
                {parsedEvents.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">{parsedEvents.length} eventos encontrados</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll}>Seleccionar todo</Button>
                        <Button variant="outline" size="sm" onClick={deselectAll}>Deseleccionar</Button>
                        <Button size="sm" onClick={importSelected} className="gap-1.5">
                          <ArrowRight className="h-3.5 w-3.5" /> Importar seleccionados ({parsedEvents.filter(e => e.selected).length})
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {parsedEvents.map((event, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            event.selected ? 'bg-indigo-500/5 border-indigo-500/30' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleEventSelection(i)}
                        >
                          <input
                            type="checkbox"
                            checked={event.selected}
                            onChange={() => toggleEventSelection(i)}
                            className="mt-1 h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {formatDateTime(event.start)}
                              </span>
                              {event.end && (
                                <span className="text-[10px] text-muted-foreground">
                                  → {formatDateTime(event.end)}
                                </span>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-500" /> Importar URL de calendario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Pega la URL pública de tu calendario de Google Calendar o servicio similar
              </p>
              <div className="flex gap-2">
                <Input
                  value={calendarUrl}
                  onChange={e => setCalendarUrl(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="flex-1"
                />
                <Button onClick={importUrl} disabled={!calendarUrl.trim()}>
                  Importar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Nota: La importación por URL requiere autenticación OAuth para acceder al calendario. Por ahora, se recomienda exportar como ICS.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PenLine className="h-4 w-4 text-green-500" /> Importar manualmente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">Crea eventos uno por uno para importarlos como tareas</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Título *</label>
                    <Input
                      value={manualForm.title}
                      onChange={e => setManualForm({ ...manualForm, title: e.target.value })}
                      placeholder="Ej: Examen de Matemáticas"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Fecha *</label>
                      <Input
                        type="date"
                        value={manualForm.date}
                        onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Hora</label>
                      <Input
                        type="time"
                        value={manualForm.time}
                        onChange={e => setManualForm({ ...manualForm, time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Duración (minutos)</label>
                    <Input
                      type="number"
                      value={manualForm.duration}
                      onChange={e => setManualForm({ ...manualForm, duration: e.target.value })}
                      min="5"
                      step="5"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Descripción</label>
                    <Textarea
                      value={manualForm.description}
                      onChange={e => setManualForm({ ...manualForm, description: e.target.value })}
                      placeholder="Detalles del evento..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={addManualEvent} className="w-full gap-2">
                    <Plus className="h-4 w-4" /> Crear evento
                  </Button>
                </div>
                <div className="rounded-lg border p-4 bg-muted/30">
                  <p className="text-xs font-medium mb-2">Vista previa</p>
                  {manualForm.title ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{manualForm.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {manualForm.date ? new Date(manualForm.date + 'T' + (manualForm.time || '00:00')).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'}
                      </div>
                      {manualForm.time && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {manualForm.time} ({manualForm.duration} min)
                        </div>
                      )}
                      {manualForm.description && (
                        <p className="text-xs text-muted-foreground mt-2">{manualForm.description}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">Completa el formulario para ver la vista previa</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {importHistory.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Últimas importaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {importHistory.slice(0, 10).map((entry, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-xs font-medium">{entry.source}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(entry.date).toLocaleString('es-ES')} - {entry.eventCount} eventos
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{entry.eventCount} eventos</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
