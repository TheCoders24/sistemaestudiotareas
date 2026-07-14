import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Timer, CheckSquare, Zap, Flame, TrendingUp, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export default function WeeklyReviewPage() {
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getWeeklyReport().then(setReport)
    }
  }, [])

  if (!report) return (
    <div className="max-w-3xl mx-auto text-center py-16 text-muted-foreground">
      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>Cargando reporte semanal...</p>
    </div>
  )

  const daysSince = Math.ceil((Date.now() - new Date(report.weekStart).getTime()) / 86400000)
  const weekLabel = `Últimos ${Math.min(daysSince, 7)} días`

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-indigo-500" /> Reporte Semanal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{weekLabel}</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="py-4 text-center">
              <Timer className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <span className="text-2xl font-bold block">{report.pomodoros}</span>
              <span className="text-xs text-muted-foreground">Pomodoros</span>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="py-4 text-center">
              <CheckSquare className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <span className="text-2xl font-bold block">{report.tasksCompleted}</span>
              <span className="text-xs text-muted-foreground">Tareas</span>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="py-4 text-center">
              <Zap className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
              <span className="text-2xl font-bold block">{report.xpEarned}</span>
              <span className="text-xs text-muted-foreground">XP Ganados</span>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="py-4 text-center">
              <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <span className="text-2xl font-bold block">{report.streakMax}</span>
              <span className="text-xs text-muted-foreground">Racha máx</span>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardContent className="py-6">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Resumen de la semana
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Pomodoros completados</span>
                  <span className="text-red-500 font-medium">{report.pomodoros}</span>
                </div>
                <Progress value={Math.min((report.pomodoros / 15) * 100, 100)} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Meta semanal: 15</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Tareas completadas</span>
                  <span className="text-green-500 font-medium">{report.tasksCompleted}</span>
                </div>
                <Progress value={Math.min((report.tasksCompleted / 20) * 100, 100)} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Meta semanal: 20</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>XP ganados</span>
                  <span className="text-yellow-500 font-medium">{report.xpEarned}</span>
                </div>
                <Progress value={Math.min((report.xpEarned / 500) * 100, 100)} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Meta semanal: 500 XP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}