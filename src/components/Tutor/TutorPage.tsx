import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Brain, Send, Loader, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import type { StudyTopic } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function TutorPage() {
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadTopics() }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadTopics() {
    const data = await window.electronAPI?.study.topics.list()
    if (data) setTopics(data)
  }

  async function handleSend() {
    if (!input.trim() || !selectedTopicId || loading) return
    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await window.electronAPI?.ai.tutor(
        Number(selectedTopicId),
        input,
        messages.map(m => ({ role: m.role, content: m.content }))
      )
      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }])
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleSelectTopic(topicId: string) {
    setSelectedTopicId(topicId)
    setMessages([])
    const topic = topics.find(t => t.id === Number(topicId))
    if (topic) {
      setMessages([{
        role: 'assistant',
        content: `¡Hola! Soy tu tutor IA para "${topic.name}". Hacé cualquier pregunta sobre este tema y te ayudaré con gusto. 📚`
      }])
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" /> Tutor IA
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tutor inteligente basado en tus temas de estudio</p>
        </div>
        {topics.length > 0 && (
          <div className="w-64">
            <Select value={selectedTopicId} onValueChange={handleSelectTopic}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un tema" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!selectedTopicId ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Brain className="h-12 w-12 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tutor IA</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-2">
              Seleccioná un tema de estudio para empezar a conversar con el tutor IA.
            </p>
            <p className="text-xs text-muted-foreground">
              El tutor solo responderá con información de tus materiales de estudio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="h-[60vh] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-500/10' : 'bg-purple-500/10'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4 text-indigo-500" /> : <Sparkles className="h-4 w-4 text-purple-500" />}
                </div>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-500/10 text-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Loader className="h-4 w-4 text-purple-500 animate-spin" />
                </div>
                <div className="bg-muted p-3 rounded-xl text-sm text-muted-foreground">
                  Pensando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hacé una pregunta sobre el tema..."
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              El tutor responde solo con el contenido de tus materiales de estudio.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
