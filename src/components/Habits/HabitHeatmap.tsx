import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

export default function HabitHeatmap({ habitId, color }: { habitId: number; color: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const today = new Date()

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getHabitLogs(habitId).then(setLogs)
    }
  }, [habitId])

  const weeks = 13
  const cells: { date: string; day: number; completed: boolean }[] = []
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (weeks * 7 - 1))
  startDate.setDate(startDate.getDate() - startDate.getDay())

  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const ds = d.toISOString().split('T')[0]
    const log = logs.find(l => l.date === ds)
    cells.push({ date: ds, day: d.getDay(), completed: log?.completed === 1 })
  }

  const weeksArr: typeof cells[] = []
  for (let w = 0; w < weeks; w++) {
    weeksArr.push(cells.slice(w * 7, (w + 1) * 7))
  }

  return (
    <div className="flex gap-0.5">
      {weeksArr.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {week.map((cell, di) => (
            <div
              key={di}
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: cell.completed ? color : 'hsl(var(--muted))' }}
              title={`${cell.date}: ${cell.completed ? 'Completado' : 'Sin completar'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
