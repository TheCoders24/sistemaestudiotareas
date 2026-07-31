import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, CheckSquare, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton } from '@/components/ui/loading-skeleton'
import { useTranslate } from '@/lib/translate'

interface Task {
  id: number; title: string; description: string; completed: number
  priority: string; due_date: string | null; tags?: string
  project_id: number | null; created_at: string
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const PRIORITY_COLOR: Record<string, string> = {
  alta: 'bg-red-500', media: 'bg-yellow-500', baja: 'bg-green-500',
}
const PRIORITY_TEXT: Record<string, string> = {
  alta: 'text-red-400', media: 'text-yellow-400', baja: 'text-green-400',
}

export default function TaskCalendarView() {
  const t = useTranslate()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [expandedPanel, setExpandedPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    if (!window.electronAPI) return
    const data = await window.electronAPI.tasks.list()
    setTasks(data.filter((task: any) => !task.deleted))
    setLoading(false)
  }

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const calendarDays = useMemo(() => {
    const days: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = []
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, month: currentMonth - 1, year: currentYear, isCurrentMonth: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month: currentMonth, year: currentYear, isCurrentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: currentMonth + 1, year: currentYear, isCurrentMonth: false })
    }
    return days
  }, [currentMonth, currentYear, firstDayOfMonth, daysInMonth, daysInPrevMonth])

  const weekDays = useMemo(() => {
    if (!isMobile) return null
    const startOfWeek = today.getDate() - today.getDay()
    const days: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentYear, currentMonth, startOfWeek + i)
      days.push({ day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), isCurrentMonth: d.getMonth() === currentMonth })
    }
    return days
  }, [currentMonth, currentYear, isMobile])

  function formatDateKey(day: number, month: number, year: number): string {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
  }

  function getTasksForDay(day: number, month: number, year: number): Task[] {
    const key = formatDateKey(day, month, year)
    return tasks.filter(task => task.due_date === key)
  }

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return []
    return tasks.filter(task => task.due_date === selectedDate)
  }, [selectedDate, tasks])

  const isToday = (day: number, month: number, year: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  function goToToday() {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(formatDateKey(today.getDate(), today.getMonth(), today.getFullYear()))
    setExpandedPanel(true)
  }

  function handleDayClick(day: number, month: number, year: number) {
    const key = formatDateKey(day, month, year)
    setSelectedDate(key)
    setExpandedPanel(true)
  }

  function renderDayCell(dayInfo: { day: number; month: number; year: number; isCurrentMonth: boolean }, index: number) {
    const dayTasks = getTasksForDay(dayInfo.day, dayInfo.month, dayInfo.year)
    const todayCheck = isToday(dayInfo.day, dayInfo.month, dayInfo.year)
    const isSelected = selectedDate === formatDateKey(dayInfo.day, dayInfo.month, dayInfo.year)
    const hasTasks = dayTasks.length > 0
    const priorityDots = dayTasks.slice(0, 3).map(task => task.priority)

    return (
      <motion.div
        key={`${dayInfo.year}-${dayInfo.month}-${dayInfo.day}-${index}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.01 }}
        onClick={() => handleDayClick(dayInfo.day, dayInfo.month, dayInfo.year)}
        className={`
          min-h-[70px] md:min-h-[80px] p-1.5 rounded-lg border cursor-pointer transition-all duration-150
          ${isSelected ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/30' : ''}
          ${todayCheck && !isSelected ? 'border-indigo-500/60 bg-indigo-500/10 ring-2 ring-indigo-500/20' : ''}
          ${!isSelected && !todayCheck && hasTasks ? 'bg-accent/50 border-border hover:bg-accent/80' : ''}
          ${!isSelected && !todayCheck && !hasTasks ? 'border-border/40 hover:bg-accent/30' : ''}
          ${!dayInfo.isCurrentMonth ? 'opacity-30' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${todayCheck ? 'text-indigo-500 font-bold' : ''} ${!dayInfo.isCurrentMonth ? 'text-muted-foreground/40' : ''}`}>
            {dayInfo.day}
          </span>
          {dayTasks.length > 0 && (
            <span className="text-[9px] text-muted-foreground/60">{dayTasks.length}</span>
          )}
        </div>
        <div className="flex gap-1 flex-wrap mt-1">
          {priorityDots.map((priority, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLOR[priority] || 'bg-gray-500'}`} />
          ))}
          {dayTasks.length > 3 && (
            <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 3}</span>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-indigo-500" />
              Calendario de Tareas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Vista mensual de tareas por fecha</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              <Clock className="h-3.5 w-3.5 mr-1" />
              Hoy
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[150px] text-center">
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-3">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_SHORT.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>
              {loading ? (
                <ListSkeleton rows={5} />
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {(isMobile ? (weekDays || calendarDays.slice(0, 7)) : calendarDays).map((dayInfo, i) => (
                    renderDayCell(dayInfo, i)
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Alta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500" /> Media
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Baja
            </span>
          </div>
        </div>

        <AnimatePresence>
          {expandedPanel && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 320 }}
              exit={{ opacity: 0, width: 0 }}
              className="hidden md:block"
            >
              <Card className="w-[320px]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Seleccioná un día'}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedPanel(false)}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin tareas este día</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTasks.map(task => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-2.5 rounded-lg border ${task.completed ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${PRIORITY_COLOR[task.priority] || 'bg-gray-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                              )}
                            </div>
                            {task.completed && (
                              <CheckSquare className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[9px] ${PRIORITY_TEXT[task.priority] || ''}`}>
                              {task.priority}
                            </Badge>
                            {task.tags && task.tags.split(',').map(s => s.trim()).filter(Boolean).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[9px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {expandedPanel && selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 overflow-hidden"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sin tareas este día</p>
                ) : (
                  <div className="space-y-2">
                    {selectedTasks.map(task => (
                      <div key={task.id} className={`p-2.5 rounded-lg border ${task.completed ? 'opacity-50' : ''}`}>
                        <div className="flex items-start gap-2">
                          <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${PRIORITY_COLOR[task.priority] || 'bg-gray-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                          {task.completed && <CheckSquare className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] ${PRIORITY_TEXT[task.priority] || ''}`}>
                            {task.priority}
                          </Badge>
                          {task.tags && task.tags.split(',').map(s => s.trim()).filter(Boolean).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
