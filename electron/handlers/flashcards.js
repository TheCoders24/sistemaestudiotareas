function register(ipcMain, { getStmt, getDb, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getFlashcardDecks', z.number().int().positive().optional(), (wsId) => {
    return getDb().prepare(`SELECT d.*, (SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id) as card_count FROM flashcard_decks d${wsId ? ' WHERE d.workspace_id = ?' : ''} ORDER BY d.created_at DESC`).all(...(wsId ? [wsId] : []))
  })
  safeHandle(ipcMain, 'db:createFlashcardDeck', z.object({
    name: z.string().min(1).max(500),
    description: z.string().optional().nullable(),
  }).passthrough(), ({ name, description }) => {
    const stmt = getDb().prepare('INSERT INTO flashcard_decks (name, description) VALUES (?, ?)')
    const result = stmt.run(name, description || '')
    return { id: result.lastInsertRowid, name, description, card_count: 0 }
  })
  safeHandle(ipcMain, 'db:deleteFlashcardDeck', z.number().int().positive(), (id) => {
    getDb().prepare('DELETE FROM flashcard_decks WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'db:getFlashcards', z.number().int().positive(), (deckId) => {
    return getDb().prepare('SELECT * FROM flashcards WHERE deck_id = ? ORDER BY next_review ASC').all(deckId)
  })
  safeHandle(ipcMain, 'db:createFlashcard', z.object({
    deck_id: z.number().int().positive(),
    front: z.string().min(1),
    back: z.string().min(1),
    hint: z.string().optional().nullable(),
  }).passthrough(), ({ deck_id, front, back, hint }) => {
    const stmt = getDb().prepare('INSERT INTO flashcards (deck_id, front, back, hint) VALUES (?, ?, ?, ?)')
    const result = stmt.run(deck_id, front, back, hint || '')
    return { id: result.lastInsertRowid, deck_id, front, back, hint: hint || '' }
  })
  safeHandle(ipcMain, 'db:deleteFlashcard', z.number().int().positive(), (id) => {
    getDb().prepare('DELETE FROM flashcards WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'db:getDueFlashcards', z.number().int().positive(), (deckId) => {
    return getDb().prepare("SELECT * FROM flashcards WHERE deck_id = ? AND next_review <= datetime('now') ORDER BY next_review ASC").all(deckId)
  })
  safeHandle(ipcMain, 'db:reviewFlashcard', z.object({
    id: z.number().int().positive(),
    ease: z.number().int().min(0).max(3),
  }), ({ id, ease }) => {
    const card = getDb().prepare('SELECT * FROM flashcards WHERE id = ?').get(id)
    if (!card) throw new Error('Flashcard not found')
    let { repetitions, interval, ease_factor } = card
    const qualityMap = [0, 1, 2, 3]
    const q = qualityMap[ease]
    if (q >= 2) {
      repetitions += 1
      if (repetitions === 1) interval = 1
      else if (repetitions === 2) interval = 6
      else interval = Math.round(interval * ease_factor)
    } else {
      repetitions = 0
      interval = 1
    }
    ease_factor = Math.max(1.3, ease_factor + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02)))
    getDb().prepare('UPDATE flashcards SET repetitions = ?, interval = ?, ease_factor = ?, next_review = datetime("now", "+" || ? || " days") WHERE id = ?')
      .run(repetitions, interval, ease_factor, interval, id)
    return { ...card, repetitions, interval, ease_factor }
  })
  safeHandle(ipcMain, 'db:getFlashcardStats', z.number().int().positive(), (deckId) => {
    const total = getDb().prepare('SELECT COUNT(*) as c FROM flashcards WHERE deck_id = ?').get(deckId).c
    const due = getDb().prepare("SELECT COUNT(*) as c FROM flashcards WHERE deck_id = ? AND next_review <= datetime('now')").get(deckId).c
    const reviewed = getDb().prepare('SELECT COUNT(*) as c FROM flashcards WHERE deck_id = ? AND repetitions > 0').get(deckId).c
    return { total, due, reviewed }
  })
  safeHandle(ipcMain, 'db:getRetentionStats', voidSchema(), () => {
    const total = getDb().prepare('SELECT COUNT(*) as c FROM flashcards').get().c
    const easy = getDb().prepare("SELECT COUNT(*) as c FROM flashcards WHERE ease_factor >= 2.5 AND repetitions > 0").get().c
    const hard = getDb().prepare("SELECT COUNT(*) as c FROM flashcards WHERE ease_factor < 2.0 AND repetitions > 0").get().c
    const retentionRate = total > 0 ? Math.round((easy / total) * 100) : 0
    return { total, easy, hard, retentionRate }
  })
  safeHandle(ipcMain, 'db:getFlashcardReviewStats', voidSchema(), () => {
    const today = new Date().toISOString().split('T')[0]
    const totalDue = getDb().prepare('SELECT COUNT(*) as count FROM flashcards WHERE next_review <= datetime("now")').get().count
    const reviewedToday = getDb().prepare(`SELECT COUNT(*) as count FROM flashcards WHERE date(next_review) <= date("now") AND date(next_review) >= date("${today}", "-1 day") AND repetitions > 0`).get().count
    const totalCards = getDb().prepare('SELECT COUNT(*) as count FROM flashcards').get().count
    const retention = totalCards > 0 ? Math.round((reviewedToday / Math.max(totalCards, 1)) * 100) : 0
    const streakRow = getDb().prepare(`SELECT value FROM settings WHERE key = 'flashcard_streak'`).get()
    const streak = streakRow ? parseInt(streakRow.value) : 0
    return { totalDue, reviewedToday, totalCards, retention, streak }
  })
  safeHandle(ipcMain, 'db:getUpcomingFlashcardReviews', voidSchema(), () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const count = getDb().prepare(`SELECT COUNT(*) as count FROM flashcards WHERE date(next_review) = date("${dateStr}")`).get().count
      days.push({ date: dateStr, count, label: date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }) })
    }
    return days
  })
  safeHandle(ipcMain, 'db:updateFlashcardStreak', z.object({ studied: z.boolean().optional() }).passthrough(), ({ studied }) => {
    const row = getDb().prepare(`SELECT value FROM settings WHERE key = 'flashcard_streak'`).get()
    let streak = row ? parseInt(row.value) : 0
    const lastDateRow = getDb().prepare(`SELECT value FROM settings WHERE key = 'flashcard_streak_date'`).get()
    const lastDate = lastDateRow ? lastDateRow.value : null
    const today = new Date().toISOString().split('T')[0]
    if (studied) {
      if (lastDate === today) return { streak }
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      if (lastDate === yesterdayStr) {
        streak += 1
      } else {
        streak = 1
      }
      getDb().prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('flashcard_streak', '${streak}')`).run()
      getDb().prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('flashcard_streak_date', '${today}')`).run()
    }
    return { streak }
  })
  safeHandle(ipcMain, 'db:getSubjectStreaks', voidSchema(), () => {
    const projects = getDb().prepare('SELECT id, name, color FROM projects WHERE deleted = 0').all()
    const streaks = projects.map(p => {
      const sessions = getDb().prepare(`SELECT date(started_at) as day FROM pomodoro_sessions WHERE project_id = ? ORDER BY day DESC`, p.id).all()
      let current = 0, max = 0, temp = 0
      const days = [...new Set(sessions.map(s => s.day))].sort().reverse()
      let checkDate = new Date()
      for (const day of days) {
        const checkStr = checkDate.toISOString().split('T')[0]
        if (day === checkStr) { temp++; checkDate.setDate(checkDate.getDate() - 1) }
        else break
      }
      current = temp
      temp = 0
      for (let i = 0; i < days.length; i++) {
        if (i === 0) { temp = 1 } else {
          const prev = new Date(days[i - 1])
          const curr = new Date(days[i])
          const diff = (prev - curr) / (1000 * 60 * 60 * 24)
          if (diff === 1) temp++
          else { max = Math.max(max, temp); temp = 1 }
        }
      }
      max = Math.max(max, temp)
      const heatmap = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        const count = sessions.filter(s => s.day === ds).length
        heatmap.push({ date: ds, count })
      }
      return { ...p, current, max, heatmap }
    })
    return streaks
  })
}

module.exports = { register }
