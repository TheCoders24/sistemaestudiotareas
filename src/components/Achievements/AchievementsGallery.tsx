import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Lock, Timer, CheckSquare, StickyNote, Flame, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const ICON_MAP: Record<string, typeof Trophy> = { trophy: Trophy, timer: Timer, 'check-circle': CheckSquare, 'check-square': CheckSquare, 'sticky-note': StickyNote, flame: Flame, zap: Zap }

export default function AchievementsGallery() {
  const [achievements, setAchievements] = useState<any[]>([])
  const xpRef = { current: 0 }

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getAchievements().then(setAchievements)
    window.electronAPI.getXp().then(x => { xpRef.current = x.total })
  }, [])

  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Logros
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {unlockedCount} / {achievements.length} desbloqueados
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {achievements.map((a, i) => {
          const Icon = ICON_MAP[a.icon] || Trophy
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`relative overflow-hidden ${a.unlocked ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20' : 'opacity-60'}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${a.unlocked ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted text-muted-foreground'}`}>
                      {a.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{a.unlocked ? a.name : '???'}</span>
                        {a.unlocked && <Badge className="text-[10px] bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/20">+{a.xp_reward} XP</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.unlocked ? a.description : 'Sigue usando la app para descubrir este logro'}
                      </p>
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
