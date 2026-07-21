import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Plus, Trash2, BookOpen, RotateCcw, ThumbsUp, ThumbsDown,
  ChevronRight, BarChart3, Download, Upload, Star, X,
  Keyboard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { InfoBox } from '@/components/ui/info-box'
import { useTranslate } from '@/lib/translate'
interface FlashcardDeck { id: number; name: string; description: string; card_count: number; created_at: string }
interface Flashcard { id: number; deck_id: number; front: string; back: string; hint: string; difficulty: number; ease_factor: number; ease: number; repetitions: number; interval: number; reviews: number; next_review: string; created_at: string }

export default function FlashcardsPage() {
  const t = useTranslate()
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [studyMode, setStudyMode] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ total: 0, due: 0, reviewed: 0 })
  const [retentionStats, setRetentionStats] = useState({ total: 0, easy: 0, hard: 0, retentionRate: 0 })
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckDesc, setNewDeckDesc] = useState('')
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [deckToDelete, setDeckToDelete] = useState<number | null>(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddDeck, setShowAddDeck] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [previewFront, setPreviewFront] = useState('')
  const [previewBack, setPreviewBack] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [allDueCount, setAllDueCount] = useState(0)
  const [studyComplete, setStudyComplete] = useState(false)
  const studyContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadDecks() }, [])

  useEffect(() => {
    if (studyMode) {
      function handleKey(e: KeyboardEvent) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f) }
        if (e.key === '1') handleReview(1)
        if (e.key === '2') handleReview(3)
        if (e.key === '3') handleReview(5)
        if (e.key === 'Escape') { setStudyMode(false); setFlipped(false); setCurrentIndex(0) }
      }
      window.addEventListener('keydown', handleKey)
      return () => window.removeEventListener('keydown', handleKey)
    }
  }, [studyMode, currentIndex, flipped, dueCards.length])

  async function loadDecks() {
    const d = await ((window.electronAPI as any).getFlashcardDecks() as Promise<FlashcardDeck[]>)
    if (d) {
      setDecks(d)
      let totalDue = 0
      for (const deck of d) {
        const s = await ((window.electronAPI as any).getFlashcardStats(deck.id) as Promise<{ total: number; due: number; reviewed: number } | null>)
        if (s) totalDue += s.due
      }
      setAllDueCount(totalDue)
    }
  }

  async function selectDeck(id: number) {
    setSelectedDeck(id)
    setStudyMode(false)
    setCurrentIndex(0)
    setFlipped(false)
    setStudyComplete(false)
    const [c, du, s, r] = await Promise.all([
      (window.electronAPI as any).getFlashcards(id) as Promise<Flashcard[]>,
      (window.electronAPI as any).getDueFlashcards(id) as Promise<Flashcard[]>,
      (window.electronAPI as any).getFlashcardStats(id) as Promise<any>,
      (window.electronAPI as any).getRetentionStats(id) as Promise<any>,
    ])
    if (c) setCards(c)
    if (du) setDueCards(du)
    if (s) setStats(s)
    if (r) setRetentionStats(r)
  }

  async function createDeck() {
    const name = newDeckName.trim()
    if (!name) return
    await (window.electronAPI as any).createFlashcardDeck({ name, description: newDeckDesc })
    setNewDeckName(''); setNewDeckDesc(''); setShowAddDeck(false)
    loadDecks()
  }

  async function addCard() {
    if (!selectedDeck || !newFront.trim() || !newBack.trim()) return
    await (window.electronAPI as any).createFlashcard({ deck_id: selectedDeck, front: newFront, back: newBack })
    setNewFront(''); setNewBack(''); setShowAddCard(false)
    if (selectedDeck) selectDeck(selectedDeck)
  }

  const handleReview = useCallback(async (rating: number) => {
    if (!dueCards[currentIndex]) return
    const wasLastCard = currentIndex >= dueCards.length - 1
    await (window.electronAPI as any).reviewFlashcard(dueCards[currentIndex].id, rating)
    if (!wasLastCard) {
      setCurrentIndex(i => i + 1)
      setFlipped(false)
    } else {
      setStudyComplete(true)
      setTimeout(() => {
        setStudyMode(false)
        setCurrentIndex(0)
        setFlipped(false)
        setStudyComplete(false)
        if (selectedDeck) selectDeck(selectedDeck)
      }, 2000)
    }
  }, [dueCards, currentIndex, selectedDeck])

  function addBulkCards() {
    const lines = previewFront.split('\n').filter(l => l.trim())
    const backs = previewBack.split('\n').filter(l => l.trim())
    const count = Math.min(lines.length, backs.length)
    if (count === 0) return
    Promise.all(
      Array.from({ length: count }, (_, i) =>
        (window.electronAPI as any).createFlashcard({ deck_id: selectedDeck!, front: lines[i], back: backs[i] })
      )
    ).then(() => {
      setPreviewFront(''); setPreviewBack(''); setShowPreview(false)
      if (selectedDeck) selectDeck(selectedDeck)
      toast({ title: `${count} tarjetas creadas` })
    })
  }

  async function exportDeck(deckId: number) {
    const deck = decks.find(d => d.id === deckId)
    if (!deck) return
    const c = await ((window.electronAPI as any).getFlashcards(deckId) as Promise<Flashcard[]>)
    if (!c) return
    const data = { name: deck.name, description: deck.description, cards: c.map(card => ({ front: card.front, back: card.back })) }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${deck.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Mazo exportado' })
  }

  function importDeck() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.cards || !Array.isArray(data.cards)) throw new Error('Formato inválido')
        const deck = await ((window.electronAPI as any).createFlashcardDeck({ name: data.name || 'Importado', description: data.description || '' }) as Promise<FlashcardDeck>)
        if (deck) {
          for (const card of data.cards) {
            await (window.electronAPI as any).createFlashcard({ deck_id: deck.id, front: card.front, back: card.back })
          }
          loadDecks()
          toast({ title: `Mazo importado: ${data.cards.length} tarjetas` })
        }
      } catch (err) {
        toast({ title: 'Error al importar', description: 'Formato JSON inválido', variant: 'destructive' })
      }
    }
    input.click()
  }

  const currentCard = dueCards[currentIndex]
  const progressPercent = dueCards.length > 0 ? (currentIndex / dueCards.length) * 100 : 0

  // Study mode (full screen)
  if (studyMode && dueCards.length > 0) {
    return (
      <div ref={studyContainerRef} className="max-w-lg mx-auto text-center" tabIndex={0}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs gap-1">
              <Star className="h-3 w-3" /> {currentIndex + 1} / {dueCards.length}
            </Badge>
            {dueCards.length - currentIndex - 1 > 0 && (
              <span className="text-xs text-muted-foreground">
                ({dueCards.length - currentIndex - 1} restantes)
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setStudyMode(false); setFlipped(false); setCurrentIndex(0) }}>
            Salir <kbd className="ml-1 text-[10px] bg-muted px-1 rounded">Esc</kbd>
          </Button>
        </div>

        <Progress value={progressPercent} className="mb-6 h-1.5" />

        <AnimatePresence mode="wait">
          {studyComplete ? (
            <motion.div
              key="complete"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-16"
            >
              <span className="text-4xl block mb-4">🎉</span>
              <h2 className="text-xl font-bold">Repaso completado!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {dueCards.length} tarjetas repasadas
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={currentCard?.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="cursor-pointer"
              onClick={() => setFlipped(!flipped)}
            >
              <Card className={cn(
                "min-h-[320px] flex items-center justify-center p-8 transition-colors",
                flipped ? "border-green-500/30" : "border-indigo-500/30"
              )}>
                <CardContent className="text-center">
                  <Badge variant="outline" className="text-[10px] mb-4">
                    {flipped ? 'Respuesta' : 'Pregunta'} <kbd className="ml-1 text-[9px] bg-muted px-1 rounded">Space</kbd>
                  </Badge>
                  <p className="text-xl font-medium whitespace-pre-wrap">
                    {flipped ? currentCard?.back : currentCard?.front}
                  </p>
                  <p className="text-xs text-muted-foreground mt-6">
                    {flipped ? 'Califica tu respuesta' : 'Haz clic o presiona espacio para voltear'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {flipped && !studyComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-3 mt-6"
          >
            <Button variant="outline" size="lg" onClick={() => handleReview(1)} className="gap-2 flex-1 max-w-[130px]">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              <span className="hidden sm:inline">Difícil</span>
              <kbd className="text-[10px] bg-muted px-1 rounded">1</kbd>
            </Button>
            <Button variant="outline" size="lg" onClick={() => handleReview(3)} className="gap-2 flex-1 max-w-[130px]">
              <RotateCcw className="h-5 w-5 text-yellow-500" />
              <span className="hidden sm:inline">Regular</span>
              <kbd className="text-[10px] bg-muted px-1 rounded">2</kbd>
            </Button>
            <Button variant="outline" size="lg" onClick={() => handleReview(5)} className="gap-2 flex-1 max-w-[130px]">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              <span className="hidden sm:inline">Fácil</span>
              <kbd className="text-[10px] bg-muted px-1 rounded">3</kbd>
            </Button>
          </motion.div>
        )}

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          <span>Space=Voltear · 1=Difícil · 2=Regular · 3=Fácil · Esc=Salir</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-indigo-500" /> {t('flashcards.title')}
          </h1>
          {allDueCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {allDueCount} tarjetas para repasar en total
            </p>
          )}
        </div>
        <InfoBox title={t('flashcards.title')} storageKey="tutorial_flashcards" className="mb-4">
          <p>Tarjetas de estudio con repaso espaciado. Crea mazos con preguntas y respuestas, y el sistema te las muestra cuando las necesitas repasar.
            Califica cada tarjeta como <strong>Fácil</strong>, <strong>Medio</strong> o <strong>Difícil</strong> y el algoritmo programa la próxima revisión.
          </p>
        </InfoBox>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={importDeck}>
            <Upload className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Dialog open={showAddDeck} onOpenChange={setShowAddDeck}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo mazo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo mazo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nombre del mazo" value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} />
                <Input placeholder="Descripción (opcional)" value={newDeckDesc} onChange={(e) => setNewDeckDesc(e.target.value)} />
                <Button onClick={createDeck}>Crear</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Deck list */}
      {!selectedDeck && decks.length === 0 && (
        <EmptyState icon={Brain} title="Sin mazos" description="Crea tu primer mazo de flashcards para empezar a estudiar" />
      )}

      {!selectedDeck && decks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {decks.map((deck) => {
            return (
              <Card key={deck.id} className="cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={() => selectDeck(deck.id)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{deck.name}</p>
                    {deck.description && <p className="text-xs text-muted-foreground truncate">{deck.description}</p>}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Deck detail */}
      {selectedDeck && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDeck(null)}>← Volver</Button>
            <h2 className="text-lg font-semibold flex-1 truncate">{decks.find((d) => d.id === selectedDeck)?.name}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportDeck(selectedDeck)} title="Exportar mazo">
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowStats(!showStats)} title="Estadísticas">
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeckToDelete(selectedDeck)} title="Eliminar mazo">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.total}</p><p className="text-[10px] text-muted-foreground">Total</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-indigo-500">{stats.due}</p><p className="text-[10px] text-muted-foreground">Repasar</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-green-500">{stats.reviewed}</p><p className="text-[10px] text-muted-foreground">Hoy</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-blue-500">{retentionStats.retentionRate}%</p><p className="text-[10px] text-muted-foreground">Retención</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-yellow-500">{retentionStats.hard}</p><p className="text-[10px] text-muted-foreground">Difíciles</p></CardContent></Card>
          </div>

          {/* Study button */}
          {dueCards.length > 0 && (
            <Button size="lg" className="w-full mb-4 gap-2" onClick={() => { setStudyMode(true); setCurrentIndex(0); setFlipped(false); setStudyComplete(false) }}>
              <BookOpen className="h-5 w-5" /> Estudiar ({dueCards.length} tarjetas)
            </Button>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mb-4">
            <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Añadir tarjeta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva tarjeta</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pregunta (anverso)</p>
                    <Textarea value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="Ej: ¿Qué es una variable?" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Respuesta (reverso)</p>
                    <Textarea value={newBack} onChange={(e) => setNewBack(e.target.value)} placeholder="Ej: Es un espacio en memoria..." />
                  </div>
                  <Button onClick={addCard}>Añadir</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Carga masiva</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader><DialogTitle>Carga masiva</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Preguntas (una por línea)</p>
                    <Textarea value={previewFront} onChange={(e) => setPreviewFront(e.target.value)} rows={5} placeholder="Pregunta 1&#10;Pregunta 2&#10;Pregunta 3" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Respuestas (una por línea, mismo orden)</p>
                    <Textarea value={previewBack} onChange={(e) => setPreviewBack(e.target.value)} rows={5} placeholder="Respuesta 1&#10;Respuesta 2&#10;Respuesta 3" />
                  </div>
                  {previewFront.split('\n').filter(l => l.trim()).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Se crearán {Math.min(previewFront.split('\n').filter(l => l.trim()).length, previewBack.split('\n').filter(l => l.trim()).length)} tarjetas
                    </p>
                  )}
                  <Button onClick={addBulkCards}>Crear tarjetas</Button>
                </div>
              </DialogContent>
            </Dialog>

            <ConfirmDialog
              open={deckToDelete !== null}
              onOpenChange={(open) => { if (!open) setDeckToDelete(null) }}
              title="Eliminar mazo"
              description="Se eliminarán todas las tarjetas de este mazo."
              onConfirm={async () => { if (deckToDelete) { await (window.electronAPI as any).deleteFlashcardDeck(deckToDelete); setDeckToDelete(null); setSelectedDeck(null); loadDecks() } }}
            />
          </div>

          {/* Retention stats chart */}
          {showStats && retentionStats.total > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" /> Estadísticas de retención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-24 mb-2">
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-green-500">{retentionStats.easy}</span>
                    <div className="w-8 bg-green-500/40 rounded-t" style={{ height: `${retentionStats.total > 0 ? (retentionStats.easy / retentionStats.total) * 100 : 0}%` }} />
                    <span className="text-[10px] text-muted-foreground">Fáciles</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-red-500">{retentionStats.hard}</span>
                    <div className="w-8 bg-red-500/40 rounded-t" style={{ height: `${retentionStats.total > 0 ? (retentionStats.hard / retentionStats.total) * 100 : 0}%` }} />
                    <span className="text-[10px] text-muted-foreground">Difíciles</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-blue-500">{retentionStats.retentionRate}%</span>
                    <div className="w-8 bg-blue-500/40 rounded-t" style={{ height: `${retentionStats.retentionRate}%` }} />
                    <span className="text-[10px] text-muted-foreground">Retención</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cards list */}
          <div className="space-y-2">
            {cards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Este mazo está vacío. Añade tu primera tarjeta.</p>
            ) : (
              cards.map((card) => (
                <Card key={card.id}>
                  <CardContent className="p-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{card.front}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.back}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {card.interval > 0 ? `Próximo: ${new Date(card.next_review).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : 'Nueva'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">Facilidad: {card.ease.toFixed(1)}</Badge>
                        {card.repetitions > 0 && (
                          <Badge variant="outline" className="text-[10px]">Reps: {card.repetitions}</Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={async () => { await (window.electronAPI as any).deleteFlashcard(card.id); selectDeck(selectedDeck) }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
