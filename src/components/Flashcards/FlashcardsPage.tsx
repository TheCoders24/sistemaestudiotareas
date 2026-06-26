import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Plus, Trash2, BookOpen, RotateCcw, ThumbsUp, ThumbsDown, ChevronRight, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { safeIpc } from '@/lib/ipc'
import type { FlashcardDeck, Flashcard } from '@/types'

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [studyMode, setStudyMode] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ total: 0, due: 0, reviewed: 0 })
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckDesc, setNewDeckDesc] = useState('')
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [deckToDelete, setDeckToDelete] = useState<number | null>(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddDeck, setShowAddDeck] = useState(false)

  useEffect(() => { loadDecks() }, [])

  async function loadDecks() {
    const d = await safeIpc<FlashcardDeck[]>('getFlashcardDecks')
    if (d) setDecks(d)
  }

  async function selectDeck(id: number) {
    setSelectedDeck(id)
    setStudyMode(false)
    setCurrentIndex(0)
    setFlipped(false)
    const [c, du, s] = await Promise.all([
      safeIpc<Flashcard[]>('getFlashcards', id),
      safeIpc<Flashcard[]>('getDueFlashcards', id),
      safeIpc<any>('getFlashcardStats', id),
    ])
    if (c) setCards(c)
    if (du) setDueCards(du)
    if (s) setStats(s)
  }

  async function createDeck() {
    const name = newDeckName.trim()
    if (!name) return
    await safeIpc('createFlashcardDeck', { name, description: newDeckDesc } as Partial<FlashcardDeck>)
    setNewDeckName(''); setNewDeckDesc(''); setShowAddDeck(false)
    loadDecks()
  }

  async function addCard() {
    if (!selectedDeck || !newFront.trim() || !newBack.trim()) return
    await safeIpc('createFlashcard', { deck_id: selectedDeck, front: newFront, back: newBack } as Partial<Flashcard>)
    setNewFront(''); setNewBack(''); setShowAddCard(false)
    if (selectedDeck) selectDeck(selectedDeck)
  }

  async function handleReview(rating: number) {
    if (!dueCards[currentIndex]) return
    await safeIpc('reviewFlashcard', dueCards[currentIndex].id, rating)
    if (currentIndex < dueCards.length - 1) {
      setCurrentIndex((i) => i + 1)
      setFlipped(false)
    } else {
      setStudyMode(false)
      setCurrentIndex(0)
      setFlipped(false)
      if (selectedDeck) selectDeck(selectedDeck)
    }
  }

  const currentCard = dueCards[currentIndex]

  if (studyMode && dueCards.length > 0) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="flex items-center justify-between mb-6">
          <Badge variant="secondary">{currentIndex + 1} / {dueCards.length}</Badge>
          <Button variant="ghost" size="sm" onClick={() => { setStudyMode(false); setFlipped(false) }}>
            Salir
          </Button>
        </div>
        <motion.div
          key={currentCard?.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="cursor-pointer"
          onClick={() => setFlipped(!flipped)}
        >
          <Card className="min-h-[300px] flex items-center justify-center p-8">
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">{flipped ? 'Respuesta' : 'Pregunta'}</p>
              <p className="text-xl font-medium whitespace-pre-wrap">
                {flipped ? currentCard?.back : currentCard?.front}
              </p>
              <p className="text-xs text-muted-foreground mt-4">Haz clic para voltear</p>
            </CardContent>
          </Card>
        </motion.div>
        {flipped && (
          <div className="flex justify-center gap-3 mt-6">
            <Button variant="outline" size="lg" onClick={() => handleReview(1)} className="gap-2">
              <ThumbsDown className="h-5 w-5 text-red-500" /> Difícil
            </Button>
            <Button variant="outline" size="lg" onClick={() => handleReview(3)} className="gap-2">
              <RotateCcw className="h-5 w-5 text-yellow-500" /> Regular
            </Button>
            <Button variant="outline" size="lg" onClick={() => handleReview(5)} className="gap-2">
              <ThumbsUp className="h-5 w-5 text-green-500" /> Fácil
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-indigo-500" /> Flashcards</h1>
        <Dialog open={showAddDeck} onOpenChange={setShowAddDeck}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo mazo</Button></DialogTrigger>
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

      {!selectedDeck && decks.length === 0 && (
        <EmptyState icon={Brain} title="Sin mazos" description="Crea tu primer mazo de flashcards para empezar a estudiar" />
      )}

      {!selectedDeck && decks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {decks.map((deck) => (
            <Card key={deck.id} className="cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={() => selectDeck(deck.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{deck.name}</p>
                  {deck.description && <p className="text-xs text-muted-foreground">{deck.description}</p>}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedDeck && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDeck(null)}>← Volver</Button>
            <h2 className="text-lg font-semibold flex-1">{decks.find((d) => d.id === selectedDeck)?.name}</h2>
            <Badge variant="secondary">{stats.total} tarjetas</Badge>
            {stats.due > 0 && <Badge>{stats.due} para repasar</Badge>}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-indigo-500">{stats.due}</p><p className="text-xs text-muted-foreground">Para repasar</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{stats.reviewed}</p><p className="text-xs text-muted-foreground">Repasados hoy</p></CardContent></Card>
          </div>

          {dueCards.length > 0 && (
            <Button size="lg" className="w-full mb-6 gap-2" onClick={() => { setStudyMode(true); setCurrentIndex(0); setFlipped(false) }}>
              <BookOpen className="h-5 w-5" /> Estudiar ({dueCards.length})
            </Button>
          )}

          <div className="flex items-center gap-2 mb-3">
            <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Añadir tarjeta</Button></DialogTrigger>
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
            <ConfirmDialog
              title="Eliminar mazo"
              description="Se eliminarán todas las tarjetas de este mazo."
              onConfirm={async () => { if (deckToDelete) { await safeIpc('deleteFlashcardDeck', deckToDelete); setDeckToDelete(null); setSelectedDeck(null); loadDecks() } }}
            >
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeckToDelete(selectedDeck)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </ConfirmDialog>
          </div>

          <div className="space-y-2">
            {cards.map((card) => (
              <Card key={card.id}>
                <CardContent className="p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{card.front}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.back}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">Intervalo: {card.interval}d</Badge>
                      <Badge variant="outline" className="text-[10px]">Facilidad: {card.ease.toFixed(1)}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={async () => { await safeIpc('deleteFlashcard', card.id); selectDeck(selectedDeck) }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
