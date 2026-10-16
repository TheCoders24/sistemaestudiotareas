import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Calendar, TrendingUp } from 'lucide-react'

const PET_STATES: Record<string, string> = {
  new: '🐣',
  learning: '🐤',
  expert: '🦅',
  master: '🐲',
}

const PET_MOODS: Record<string, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  sleeping: '😴',
}

const HAPPY_MESSAGES = ['¡Sigue así!', '¡Eres increíble!', '¡Más XP para ti!', '¡No te detengas!', '¡Genial!']
const NEUTRAL_MESSAGES = ['¿Me extrañaste?', 'Hora de estudiar', '¿Volvemos?']
const SAD_MESSAGES = ['No me ignores...', 'Necesito tu ayuda', '¿Dónde estabas?']
const SLEEPING_MESSAGES = ['zzZ...']

const XP_PER_LEVEL = 500

function getPetState(level: number): string {
  if (level >= 20) return 'master'
  if (level >= 10) return 'expert'
  if (level >= 3) return 'learning'
  return 'new'
}

function getPetMood(lastStudyDate: string | null): string {
  if (!lastStudyDate) return 'neutral'
  const now = new Date()
  const last = new Date(lastStudyDate)
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'happy'
  if (diffDays === 1) return 'neutral'
  if (diffDays === 2) return 'sad'
  return 'sleeping'
}

function getMoodMessage(mood: string): string {
  const msgs = mood === 'happy' ? HAPPY_MESSAGES :
               mood === 'neutral' ? NEUTRAL_MESSAGES :
               mood === 'sad' ? SAD_MESSAGES :
               SLEEPING_MESSAGES
  return msgs[Math.floor(Math.random() * msgs.length)]
}

export default function AvatarPet({ inline = false }: { inline?: boolean }) {
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [lastStudyDate, setLastStudyDate] = useState<string | null>(() => localStorage.getItem('pet_lastStudyDate'))
  const [, setShowTooltip] = useState(false)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.gamification.xp.get().then(d => {
        setXp(d.total)
        setLevel(d.level)
      }).catch(() => {})
      window.electronAPI.pomodoro.sessions.list().then((list: any[]) => {
        const latest = list?.[0]?.started_at
        if (latest) setLastStudyDate(latest.split('T')[0])
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('pet_lastStudyDate', lastStudyDate || '')
  }, [lastStudyDate])

  const petState = getPetState(level)
  const petMood = getMoodMessage(getPetMood(lastStudyDate))
  const mood = getPetMood(lastStudyDate)
  const emoji = PET_STATES[petState]
  const moodEmoji = PET_MOODS[mood]
  const currentXp = xp % XP_PER_LEVEL

  const bounceAnimation = mood === 'happy'
    ? { y: [0, -8, 0], transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' as const } }
    : mood === 'sad'
    ? { y: [0, 2, 0], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' as const } }
    : mood === 'sleeping'
    ? { opacity: [1, 0.5, 1], transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' as const } }
    : {}

  if (inline) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 border border-border">
        <motion.div animate={bounceAnimation} className="text-3xl cursor-pointer select-none">
          {emoji}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Nivel {level}</span>
            <span className="text-xs">{moodEmoji}</span>
          </div>
          <Progress value={(currentXp / XP_PER_LEVEL) * 100} className="h-1.5 mt-1" />
          <p className="text-[10px] text-muted-foreground mt-0.5 italic">{petMood}</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-4 right-4 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              animate={bounceAnimation}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              className="relative cursor-pointer select-none"
              onClick={() => setShowTooltip(prev => !prev)}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/30 flex items-center justify-center text-3xl shadow-lg hover:shadow-xl transition-shadow">
                {emoji}
              </div>
              <div className="absolute -top-1 -right-1 text-sm">
                {moodEmoji}
              </div>
              <AnimatePresence>
                {mood === 'happy' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded-full shadow-md whitespace-nowrap border"
                  >
                    ✨
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="w-56 p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-xs font-semibold">Mascota</p>
                  <p className="text-[10px] text-muted-foreground">{moodEmoji} {petMood}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <TrendingUp className="h-3 w-3 text-indigo-500" />
                <span>Nivel {level}</span>
              </div>
              <Progress value={(currentXp / XP_PER_LEVEL) * 100} className="h-1.5" />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{currentXp} / {XP_PER_LEVEL} XP</span>
                <span>{petState === 'new' ? 'Huevo' : petState === 'learning' ? 'Pollito' : petState === 'expert' ? 'Águila' : 'Dragón'}</span>
              </div>
              {lastStudyDate && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t">
                  <Calendar className="h-3 w-3" />
                  <span>Último estudio: {lastStudyDate}</span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
