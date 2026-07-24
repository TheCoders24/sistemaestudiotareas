import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Copy, Check, Plus, LogIn, Play, Trophy, Flame, Zap, UserPlus, Clock, Star, Medal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const AVATARS = ['🐱', '🦊', '🐺', '🦉']

const FAKE_USERS = [
  { name: 'Luna', xp: 4850, streak: 45, avatar: '🦉' },
  { name: 'Mateo', xp: 4200, streak: 38, avatar: '🐺' },
  { name: 'Camila', xp: 3980, streak: 32, avatar: '🐱' },
  { name: 'Santiago', xp: 3650, streak: 28, avatar: '🦊' },
  { name: 'Valentina', xp: 3200, streak: 25, avatar: '🦉' },
  { name: 'Diego', xp: 2900, streak: 22, avatar: '🐺' },
  { name: 'Sofia', xp: 2550, streak: 19, avatar: '🐱' },
  { name: 'Lucas', xp: 2100, streak: 15, avatar: '🦊' },
  { name: 'Isabella', xp: 1800, streak: 12, avatar: '🦉' },
  { name: 'Tomás', xp: 1400, streak: 8, avatar: '🐺' },
]

const XP_PER_LEVEL = 500

function getLevel(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

function getCurrentXp(xp: number) {
  return xp % XP_PER_LEVEL
}

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const PARTNER_MESSAGES = [
  'Estudiando con energía',
  'Haciendo un break',
  'Concentrado',
  'Repasando flashcards',
  'Terminando pomodoro',
]

export default function SocialPage() {
  const [avatar, setAvatar] = useState(() => localStorage.getItem('social_avatar') || '🐱')
  const [username, setUsername] = useState(() => localStorage.getItem('social_username') || '')
  const [inRoom, setInRoom] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [partnerConnected, setPartnerConnected] = useState(false)
  const [leaderboardTab, setLeaderboardTab] = useState('semanal')
  const [copied, setCopied] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [partnerTimerSeconds, setPartnerTimerSeconds] = useState(0)
  const [partnerStatus, setPartnerStatus] = useState(PARTNER_MESSAGES[0])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const partnerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getXp().then(d => setXp(d.total)).catch(() => {})
      window.electronAPI.getStreak('daily_study').then(s => { if (s) setStreak(s.current) }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('social_avatar', avatar)
  }, [avatar])

  useEffect(() => {
    localStorage.setItem('social_username', username)
  }, [username])

  const level = getLevel(xp)
  const currentXp = getCurrentXp(xp)

  const leaderboardData = FAKE_USERS.map((u, i) => ({
    ...u,
    xp: leaderboardTab === 'semanal' ? Math.floor(u.xp * 0.15) :
        leaderboardTab === 'mensual' ? Math.floor(u.xp * 0.5) :
        u.xp,
    rank: i + 1,
  }))

  const me = { name: username || 'Yo', xp, streak, avatar, rank: -1 }
  const fullLeaderboard = [...leaderboardData, me]
    .sort((a, b) => b.xp - a.xp)
    .map((u, i) => ({ ...u, rank: i + 1 }))

  const myRank = fullLeaderboard.find(u => u.name === (username || 'Yo'))?.rank || fullLeaderboard.length

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const handleShareStreak = useCallback(async () => {
    const text = `🔥 Racha de ${streak} días en EstudioApp! #EstudioApp`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [streak])

  const handleCreateRoom = () => {
    const code = generateRoomCode()
    setRoomCode(code)
    setInRoom(true)
    setPartnerConnected(false)
    setTimeout(() => {
      setPartnerConnected(true)
      setPartnerStatus(PARTNER_MESSAGES[0])
    }, 2000 + Math.random() * 3000)
  }

  const handleJoinRoom = () => {
    if (joinCode.length === 6) {
      setRoomCode(joinCode)
      setInRoom(true)
      setPartnerConnected(true)
      setPartnerStatus(PARTNER_MESSAGES[0])
    }
  }

  const handleLeaveRoom = () => {
    setInRoom(false)
    setRoomCode('')
    setPartnerConnected(false)
    setTimerRunning(false)
    setTimerSeconds(0)
    setPartnerTimerSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)
    if (partnerRef.current) clearInterval(partnerRef.current)
  }

  const handleStartTogether = () => {
    if (timerRunning) return
    setTimerRunning(true)
    setTimerSeconds(0)
    setPartnerTimerSeconds(0)

    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1)
    }, 1000)

    partnerRef.current = setInterval(() => {
      setPartnerTimerSeconds(prev => prev + 1)
      if (Math.random() < 0.05) {
        setPartnerStatus(PARTNER_MESSAGES[Math.floor(Math.random() * PARTNER_MESSAGES.length)])
      }
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (partnerRef.current) clearInterval(partnerRef.current)
    }
  }, [])

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" />
            Social
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Conectá con otros estudiantes y competí</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="mb-6 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
            <CardContent className="py-5">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-4xl">{avatar}</div>
                  <div className="flex gap-1">
                    {AVATARS.map(a => (
                      <button key={a} onClick={() => setAvatar(a)}
                        className={`text-xl p-1 rounded-lg transition-all ${a === avatar ? 'bg-indigo-500/20 ring-2 ring-indigo-500/40 scale-110' : 'opacity-60 hover:opacity-100'}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Tu nombre..."
                      className="max-w-[200px] h-8 text-sm font-semibold"
                    />
                    <Badge className="bg-indigo-500/20 text-indigo-600 hover:bg-indigo-500/20">Nivel {level}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-orange-500">
                        <Flame className="h-4 w-4" />
                        <span className="text-lg font-bold">{streak}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Racha días</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-yellow-500">
                        <Zap className="h-4 w-4" />
                        <span className="text-lg font-bold">{xp}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">XP total</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-indigo-500">
                        <Star className="h-4 w-4" />
                        <span className="text-lg font-bold">{level}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Nivel</p>
                    </div>
                  </div>
                  <Progress value={(currentXp / XP_PER_LEVEL) * 100} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">{currentXp} / {XP_PER_LEVEL} XP al siguiente nivel</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <Button onClick={handleShareStreak} variant="outline" className="w-full gap-2 border-orange-500/30 text-orange-600 hover:bg-orange-500/10">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? '¡Copiado!' : `Compartir Racha: 🔥 ${streak} días`}
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Estudiar Juntos</span>
              </div>

              {!inRoom ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-accent/50 border border-border">
                    <p className="text-xs font-medium mb-2">Crear sala</p>
                    <p className="text-[10px] text-muted-foreground mb-3">Generá un código y compartilo</p>
                    <Button onClick={handleCreateRoom} size="sm" className="w-full gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Crear Sala
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/50 border border-border">
                    <p className="text-xs font-medium mb-2">Unirse a sala</p>
                    <div className="flex gap-2 mb-3">
                      <Input
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Código de 6 dígitos"
                        className="h-8 text-sm font-mono text-center"
                        maxLength={6}
                      />
                    </div>
                    <Button onClick={handleJoinRoom} size="sm" variant="outline" className="w-full gap-1.5"
                      disabled={joinCode.length !== 6}>
                      <LogIn className="h-3.5 w-3.5" /> Unirse
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/20">
                        Sala: {roomCode}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger>
                          <Copy className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" onClick={async () => {
                            try { await navigator.clipboard.writeText(roomCode) } catch {}
                          }} />
                        </TooltipTrigger>
                        <TooltipContent>Copiar código</TooltipContent>
                      </Tooltip>
                    </div>
                    <Button onClick={handleLeaveRoom} size="sm" variant="ghost" className="text-xs text-muted-foreground">
                      Salir
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-accent/30 border border-border text-center">
                      <div className="text-3xl mb-1">{avatar}</div>
                      <p className="text-xs font-medium">{username || 'Yo'}</p>
                      <p className="text-[10px] text-green-500 mt-1">Conectado</p>
                      <div className="mt-2">
                        <p className="text-2xl font-mono font-bold">{formatTime(timerSeconds)}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-accent/30 border border-border text-center">
                      <div className="text-3xl mb-1">{partnerConnected ? '🐺' : '❓'}</div>
                      <p className="text-xs font-medium">{partnerConnected ? 'Compañero' : 'Esperando...'}</p>
                      <p className={`text-[10px] mt-1 ${partnerConnected ? 'text-green-500' : 'text-yellow-500'}`}>
                        {partnerConnected ? 'Conectado' : 'Buscando'}
                      </p>
                      <div className="mt-2">
                        <p className="text-2xl font-mono font-bold">{partnerConnected ? formatTime(partnerTimerSeconds) : '--:--'}</p>
                      </div>
                      {partnerConnected && (
                        <p className="text-[9px] text-muted-foreground mt-1 italic">{partnerStatus}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    {!timerRunning ? (
                      <Button onClick={handleStartTogether} className="gap-2" disabled={!partnerConnected}>
                        <Play className="h-4 w-4" /> Empezar juntos
                      </Button>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-600 text-sm py-1 px-3">
                        <Clock className="h-3.5 w-3.5 mr-1" /> Estudiando...
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Leaderboard</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">Tu posición: #{myRank}</Badge>
              </div>

              <Tabs value={leaderboardTab} onValueChange={setLeaderboardTab}>
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="semanal" className="flex-1 text-xs">Semanal</TabsTrigger>
                  <TabsTrigger value="mensual" className="flex-1 text-xs">Mensual</TabsTrigger>
                  <TabsTrigger value="total" className="flex-1 text-xs">Todo el tiempo</TabsTrigger>
                </TabsList>

                <TabsContent value={leaderboardTab} className="mt-0">
                  <div className="space-y-1.5">
                    {fullLeaderboard.slice(0, 10).map((entry, i) => {
                      const emoji = rankEmoji(entry.rank)
                      const isMe = entry.name === (username || 'Yo')
                      return (
                        <motion.div
                          key={entry.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                            isMe ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-accent/50'
                          }`}
                        >
                          <div className="w-6 text-center">
                            {emoji ? (
                              <span className="text-lg">{emoji}</span>
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground">#{entry.rank}</span>
                            )}
                          </div>
                          <span className="text-xl">{entry.avatar}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-medium truncate ${isMe ? 'text-indigo-600 font-bold' : ''}`}>
                                {entry.name}
                              </span>
                              {isMe && <Badge className="text-[8px] bg-indigo-500/20 text-indigo-600 hover:bg-indigo-500/20">Tú</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={(entry.xp / (fullLeaderboard[0]?.xp || 1)) * 100} className="h-1.5 flex-1" />
                              <span className="text-[10px] text-muted-foreground shrink-0">{entry.xp} XP</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-orange-500 shrink-0">
                            <Flame className="h-3 w-3" />
                            {entry.streak}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TooltipProvider>
  )
}
