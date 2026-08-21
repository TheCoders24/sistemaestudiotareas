import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Play, Flame, TrendingUp, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCardSkeleton } from '@/components/ui/loading-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import ForgettingCurve from './ForgettingCurve'

interface Deck { id: number; name: string; card_count: number }
interface ReviewStats { totalDue: number; reviewedToday: number; totalCards: number; retention: number; streak: number }
interface UpcomingDay { date: string; count: number; label: string }

export default function ReviewDashboard() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<number>(0)
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!window.electronAPI) return
      try {
        const d = await (window.electronAPI.flashcards.decks.list()) || []
        setDecks(d)
        if (d.length > 0) setSelectedDeck(d[0].id)
        const s = await (window.electronAPI.flashcards.stats.reviews())
        if (s) setStats(s)
        const u = await (window.electronAPI.flashcards.stats.upcoming())
        if (u) setUpcoming(u)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const maxUpcoming = Math.max(...upcoming.map(u => u.count), 1)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <StatsCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-indigo-500" />
            <h1 className="text-2xl font-bold">Repaso Inteligente</h1>
          </div>
          <div className="flex items-center gap-2">
            {decks.length > 0 && (
              <select value={selectedDeck} onChange={e => setSelectedDeck(Number(e.target.value))} className="h-9 rounded-md border bg-background px-3 text-sm">
                {decks.map(d => <option key={d.id} value={d.id}>{d.name} ({d.card_count} cards)</option>)}
              </select>
            )}
            {(stats?.totalDue ?? 0) > 0 && (
              <Button onClick={() => (window as any).__setActiveTab?.('flashcards')} className="gap-2">
                <Play className="h-4 w-4" /> Repasar ({stats?.totalDue})
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-orange-500">{stats?.totalDue ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Pendientes hoy</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-green-500">{stats?.reviewedToday ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Repasados hoy</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="py-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" opacity={0.1} strokeWidth={4} />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#3b82f6" strokeWidth={4} strokeDasharray={`${(stats?.retention ?? 0) * 1.257} 125.7`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                </svg>
                <span className="text-2xl font-bold text-blue-500">{stats?.retention ?? 0}%</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Retención</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="py-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-6 w-6 text-red-500" />
                <span className="text-3xl font-bold text-red-500">{stats?.streak ?? 0}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Racha de repaso</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Curva del Olvido</span>
            </div>
            <ForgettingCurve
              retention={stats?.retention ?? 75}
              interval={7}
              reviews={stats?.reviewedToday ?? 3}
              easeFactor={2.5}
            />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Próximos 7 días</span>
            </div>
            <div className="flex items-end gap-2 h-24">
              {upcoming.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-indigo-500/80 transition-all" style={{ height: `${(day.count / maxUpcoming) * 100}%`, minHeight: day.count > 0 ? 4 : 1 }} />
                  <span className="text-[10px] text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {stats?.totalDue === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <EmptyState icon={Brain} title="¡Todo al día!" description="No hay tarjetas pendientes de repaso. Creá más flashcards o volvé mañana." />
        </motion.div>
      )}
    </div>
  )
}
