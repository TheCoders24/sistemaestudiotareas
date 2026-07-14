import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, CheckCircle, Clock, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getChallenges().then(setChallenges)
    }
  }, [])

  const weekStart = (() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  })()

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Desafíos Semanales
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Completá desafíos para ganar XP extra esta semana</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {challenges.map((c: any, i: number) => {
          const pct = c.target > 0 ? Math.min((c.progress / c.target) * 100, 100) : 0
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`relative ${c.completed ? 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${c.completed ? 'bg-green-500/20 text-green-500' : 'bg-accent text-muted-foreground'}`}>
                      {c.completed ? <CheckCircle className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{c.name}</span>
                        <Badge variant="outline" className="text-[10px]">+{c.xp_reward} XP</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{c.progress} / {c.target}</span>
                          <span>{Math.round(pct)}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
