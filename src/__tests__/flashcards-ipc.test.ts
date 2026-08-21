import { describe, it, expect, beforeEach } from 'vitest'

interface FlashcardDeck { id: number; name: string; description: string; card_count: number; created_at: string }
interface Flashcard { id: number; deck_id: number; front: string; back: string; hint: string; difficulty: number; ease_factor: number; repetitions: number; interval: number; next_review: string; created_at: string }

function mockDb() {
  const decks: FlashcardDeck[] = []
  const cards: Flashcard[] = []
  let deckId = 0
  let cardId = 0

  const api = {
    flashcards: {
      decks: {
        list: async () => decks,
        create: async (data: { name: string; description?: string }) => {
          const deck: FlashcardDeck = { id: ++deckId, name: data.name, description: data.description || '', card_count: 0, created_at: new Date().toISOString() }
          decks.push(deck)
          return deck
        },
        delete: async (id: number) => {
          const idx = decks.findIndex(d => d.id === id)
          if (idx === -1) throw new Error('Deck not found')
          decks.splice(idx, 1)
          for (let i = cards.length - 1; i >= 0; i--) { if (cards[i].deck_id === id) cards.splice(i, 1) }
          return true
        },
      },
      cards: {
        list: async (deckId: number) => cards.filter(c => c.deck_id === deckId),
        create: async (data: { deck_id: number; front: string; back: string; hint?: string }) => {
          const card: Flashcard = {
            id: ++cardId, deck_id: data.deck_id, front: data.front, back: data.back, hint: data.hint || '',
            difficulty: 0, ease_factor: 2.5, repetitions: 0, interval: 0,
            next_review: new Date().toISOString(), created_at: new Date().toISOString(),
          }
          cards.push(card)
          const deck = decks.find(d => d.id === data.deck_id)
          if (deck) deck.card_count = cards.filter(c => c.deck_id === deck.id).length
          return card
        },
        delete: async (id: number) => {
          const idx = cards.findIndex(c => c.id === id)
          if (idx === -1) throw new Error('Flashcard not found')
          cards.splice(idx, 1)
          return true
        },
        getDue: async (deckId: number) => {
          const now = new Date()
          return cards.filter(c => c.deck_id === deckId && new Date(c.next_review) <= now)
        },
        review: async (data: { id: number; ease: number }) => {
          const card = cards.find(c => c.id === data.id)
          if (!card) throw new Error('Flashcard not found')
          if (![0, 1, 2, 3, 4, 5].includes(data.ease)) throw new Error('Invalid ease value')
          card.repetitions += 1
          card.ease_factor = Math.max(1.3, card.ease_factor + (0.1 - (3 - data.ease) * (0.08 + (3 - data.ease) * 0.02)))
          card.interval = card.repetitions === 1 ? 1 : card.repetitions === 2 ? 6 : Math.round(card.interval * card.ease_factor)
          card.next_review = new Date(Date.now() + card.interval * 86400000).toISOString()
          return { ...card }
        },
      },
      stats: {
        deck: async (deckId: number) => {
          const deckCards = cards.filter(c => c.deck_id === deckId)
          return {
            total: deckCards.length,
            due: deckCards.filter(c => new Date(c.next_review) <= new Date()).length,
            reviewed: deckCards.filter(c => c.repetitions > 0).length,
          }
        },
      },
    },
  }
  return api
}

beforeEach(() => {
  window.electronAPI = mockDb() as any
})

describe('Flashcard IPC handlers', () => {
  it('should create a deck', async () => {
    const deck = await window.electronAPI!.flashcards.decks.create({ name: 'Test Deck' })
    expect(deck.id).toBe(1)
    expect(deck.name).toBe('Test Deck')
    expect(deck.card_count).toBe(0)
  })

  it('should list decks', async () => {
    await window.electronAPI!.flashcards.decks.create({ name: 'Deck A' })
    await window.electronAPI!.flashcards.decks.create({ name: 'Deck B' })
    const decks = await window.electronAPI!.flashcards.decks.list()
    expect(decks).toHaveLength(2)
    expect(decks[0].name).toBe('Deck A')
  })

  it('should delete a deck and its cards', async () => {
    const deck = await window.electronAPI!.flashcards.decks.create({ name: 'To Delete' })
    await window.electronAPI!.flashcards.cards.create({ deck_id: deck.id, front: 'Q1', back: 'A1' })
    await window.electronAPI!.flashcards.decks.delete(deck.id)
    const decks = await window.electronAPI!.flashcards.decks.list()
    expect(decks).toHaveLength(0)
  })

  it('should create and list flashcards in a deck', async () => {
    const deck = await window.electronAPI!.flashcards.decks.create({ name: 'My Deck' })
    await window.electronAPI!.flashcards.cards.create({ deck_id: deck.id, front: 'Q1', back: 'A1' })
    await window.electronAPI!.flashcards.cards.create({ deck_id: deck.id, front: 'Q2', back: 'A2', hint: 'hint2' })
    const cards = await window.electronAPI!.flashcards.cards.list(deck.id)
    expect(cards).toHaveLength(2)
    expect(cards[0].front).toBe('Q1')
    expect(cards[1].hint).toBe('hint2')
  })

  it('should delete a flashcard', async () => {
    const deck = await window.electronAPI!.flashcards.decks.create({ name: 'D' })
    const card = await window.electronAPI!.flashcards.cards.create({ deck_id: deck.id, front: 'Q', back: 'A' })
    await window.electronAPI!.flashcards.cards.delete(card.id)
    const cards = await window.electronAPI!.flashcards.cards.list(deck.id)
    expect(cards).toHaveLength(0)
  })

  it('should return due flashcards', async () => {
    const deck = await window.electronAPI!.flashcards.decks.create({ name: 'D' })
    await window.electronAPI!.flashcards.cards.create({ deck_id: deck.id, front: 'Due', back: 'A1' })
    const due = await window.electronAPI!.flashcards.cards.getDue(deck.id)
    expect(due).toHaveLength(1)
  })

  it('should review a flashcard and update SM-2 parameters', async () => {
    const deck = await window.electronAPI!.flashcards.decks.create({ name: 'D' })
    const card = await window.electronAPI!.flashcards.cards.create({ deck_id: deck.id, front: 'Q', back: 'A' })
    expect(card.repetitions).toBe(0)
    expect(card.ease_factor).toBe(2.5)

    const reviewed = await window.electronAPI!.flashcards.cards.review({ id: card.id, ease: 3 })
    expect(reviewed.repetitions).toBe(1)
    expect(reviewed.interval).toBe(1)
    expect(reviewed.ease_factor).toBeGreaterThan(2.5)
  })

  it('should get flashcard stats', async () => {
    const deck = await window.electronAPI!.flashcards.decks.create({ name: 'Stats' })
    await window.electronAPI!.flashcards.cards.create({ deck_id: deck.id, front: 'F1', back: 'B1' })
    await window.electronAPI!.flashcards.cards.create({ deck_id: deck.id, front: 'F2', back: 'B2' })
    const stats = await window.electronAPI!.flashcards.stats.deck(deck.id)
    expect(stats.total).toBe(2)
    expect(stats.due).toBe(2)
    expect(stats.reviewed).toBe(0)
  })

  it('should handle invalid ease values', async () => {
    const deck = await window.electronAPI!.flashcards.decks.create({ name: 'D' })
    const card = await window.electronAPI!.flashcards.cards.create({ deck_id: deck.id, front: 'Q', back: 'A' })
    await expect(window.electronAPI!.flashcards.cards.review({ id: card.id, ease: 6 })).rejects.toThrow('Invalid ease value')
    await expect(window.electronAPI!.flashcards.cards.review({ id: card.id, ease: -1 })).rejects.toThrow('Invalid ease value')
  })

  it('should handle non-existent card review', async () => {
    await expect(window.electronAPI!.flashcards.cards.review({ id: 999, ease: 2 })).rejects.toThrow('Flashcard not found')
  })
})