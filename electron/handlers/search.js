function populateSearchIndex(getDb) {
  try {
    const db = getDb()
    db.exec('DELETE FROM search_index')
    const insert = db.prepare('INSERT INTO search_index (entity_type, entity_id, workspace_id, title, body, tags) VALUES (?, ?, ?, ?, ?, ?)')
    const tx = db.transaction(() => {
      const tasks = db.prepare("SELECT id, title, description, tags, workspace_id FROM tasks WHERE deleted = 0").all()
      for (const t of tasks) insert.run('task', String(t.id), t.workspace_id || '', t.title, t.description || '', t.tags || '')
      const notes = db.prepare("SELECT id, title, content, workspace_id FROM notes WHERE deleted = 0").all()
      for (const n of notes) insert.run('note', String(n.id), n.workspace_id || '', n.title, n.content || '', '')
      const snippets = db.prepare("SELECT id, title, code, description, tags, workspace_id FROM snippets").all()
      for (const s of snippets) insert.run('snippet', String(s.id), s.workspace_id || '', s.title, `${s.description || ''} ${s.code || ''}`, s.tags || '')
      const projects = db.prepare("SELECT id, name, description, workspace_id FROM projects WHERE deleted = 0").all()
      for (const p of projects) insert.run('project', String(p.id), p.workspace_id || '', p.name, p.description || '', '')
      const habits = db.prepare("SELECT id, name, workspace_id FROM habits WHERE deleted = 0").all()
      for (const h of habits) insert.run('habit', String(h.id), h.workspace_id || '', h.name, '', '')
      const logs = db.prepare("SELECT id, date, content, focus, blockers, workspace_id FROM daily_logs").all()
      for (const l of logs) insert.run('dailylog', String(l.id), l.workspace_id || '', l.date, `${l.content || ''} ${l.focus || ''} ${l.blockers || ''}`, '')
      const topics = db.prepare("SELECT id, name, description, workspace_id FROM study_topics").all()
      for (const tp of topics) insert.run('topic', String(tp.id), tp.workspace_id || '', tp.name, tp.description || '', '')
      const cards = db.prepare("SELECT id, front, back FROM flashcards").all()
      for (const c of cards) insert.run('flashcard', String(c.id), '', c.front, c.back || '', '')
    })
    tx()
    return true
  } catch (e) {
    console.log('[FTS5] populate failed:', e.message)
    return false
  }
}

function register(ipcMain, { getStmt, getDb, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:search', z.string().min(2), (q) => {
    const results = []
    try {
      const fts = getStmt("SELECT entity_type, entity_id, title, body, rank FROM search_index WHERE search_index MATCH ? ORDER BY rank LIMIT 20").all(SearchQueryParser.toFtsQuery(q))
      for (const r of fts) {
        results.push({ id: parseInt(r.entity_id), name: r.title, type: r.entity_type, _ftsScore: r.rank })
      }
      if (results.length > 0) return results
    } catch {}
    const like = `%${q}%`
    try {
      const tasks = getStmt("SELECT id, title as name, 'tarea' as type FROM tasks WHERE (title LIKE ? OR description LIKE ?) AND deleted = 0 LIMIT 10").all(like, like)
      results.push(...tasks)
    } catch {}
    try {
      const notes = getStmt("SELECT id, title as name, 'nota' as type FROM notes WHERE (title LIKE ? OR content LIKE ?) AND deleted = 0 LIMIT 10").all(like, like)
      results.push(...notes)
    } catch {}
    try {
      const snippets = getStmt("SELECT id, title as name, 'snippet' as type FROM snippets WHERE (title LIKE ? OR description LIKE ? OR code LIKE ?) AND deleted = 0 LIMIT 10").all(like, like, like)
      results.push(...snippets)
    } catch {}
    try {
      const projects = getStmt("SELECT id, name, 'proyecto' as type FROM projects WHERE (name LIKE ? OR description LIKE ?) AND deleted = 0 LIMIT 10").all(like, like)
      results.push(...projects)
    } catch {}
    try {
      const habits = getStmt("SELECT id, name, 'hábito' as type FROM habits WHERE name LIKE ? AND deleted = 0 LIMIT 10").all(like)
      results.push(...habits)
    } catch {}
    try {
      const logs = getStmt("SELECT id, date as name, 'diario' as type FROM daily_logs WHERE content LIKE ? OR focus LIKE ? LIMIT 10").all(like, like)
      results.push(...logs)
    } catch {}
    try {
      const topics = getStmt("SELECT id, name, 'tema' as type FROM study_topics WHERE name LIKE ? OR description LIKE ? LIMIT 10").all(like, like)
      results.push(...topics)
    } catch {}
    try {
      const cards = getStmt("SELECT id, front as name, 'flashcard' as type FROM flashcards WHERE front LIKE ? OR back LIKE ? LIMIT 10").all(like, like)
      results.push(...cards)
    } catch {}
    return results
  })

  safeHandle(ipcMain, 'db:reindexSearch', voidSchema(), () => {
    return populateSearchIndex(getDb)
  })

  safeHandle(ipcMain, 'db:getDashboard', voidSchema(), () => {
    const today = new Date().toISOString().split('T')[0]
    const pomodorosToday = getStmt("SELECT COUNT(*) as count FROM pomodoro_sessions WHERE date(started_at) = ?").get(today)
    const tasksToday = getStmt("SELECT COUNT(*) as count FROM tasks WHERE updated_at >= ? AND completed = 1 AND deleted = 0").get(today)
    const tasksPending = getStmt('SELECT COUNT(*) as count FROM tasks WHERE completed = 0 AND deleted = 0').get()
    const upcomingTasks = getStmt("SELECT id, title, due_date FROM tasks WHERE completed = 0 AND deleted = 0 AND due_date IS NOT NULL ORDER BY due_date ASC LIMIT 5").all()
    const xp = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get()
    const totalXp = xp.total
    const level = Math.floor(totalXp / 100) + 1
    const streak = getStmt("SELECT * FROM streaks WHERE name = 'daily_study'").get()
    const totalPomodoros = getStmt('SELECT COUNT(*) as count FROM pomodoro_sessions').get()
    const totalTasks = getStmt('SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND deleted = 0').get()
    return {
      pomodorosToday: pomodorosToday.count,
      tasksToday: tasksToday.count,
      tasksPending: tasksPending.count,
      upcomingTasks,
      xp: { total: totalXp, level, currentXp: totalXp - ((level - 1) * 100), nextLevelXp: level * 100 },
      streak: streak || { current: 0, max: 0 },
      totalPomodoros: totalPomodoros.count,
      totalTasks: totalTasks.count,
    }
  })

  safeHandle(ipcMain, 'db:getActivityFeed', voidSchema(), () => {
    const feed = []
    const recentTasks = getStmt("SELECT id, title, 'tarea' as type, completed, updated_at as time FROM tasks WHERE deleted = 0 ORDER BY updated_at DESC LIMIT 5").all()
    feed.push(...recentTasks.map(r => ({ ...r, text: r.completed ? 'Completaste la tarea' : 'Actualizaste la tarea' })))
    const recentNotes = getStmt("SELECT id, title, 'nota' as type, updated_at as time FROM notes WHERE deleted = 0 ORDER BY updated_at DESC LIMIT 5").all()
    feed.push(...recentNotes.map(r => ({ ...r, text: 'Creaste la nota' })))
    const recentSessions = getStmt("SELECT id, duration, 'pomodoro' as type, started_at as time FROM pomodoro_sessions ORDER BY started_at DESC LIMIT 5").all()
    feed.push(...recentSessions.map(r => ({ ...r, text: 'Completaste un pomodoro', title: `${Math.round(r.duration / 60)} min` })))
    const recentXp = getStmt("SELECT id, amount, reason, 'xp' as type, created_at as time FROM xp_log ORDER BY created_at DESC LIMIT 5").all()
    feed.push(...recentXp.map(r => ({ ...r, text: `+${r.amount} XP: ${r.reason}`, title: `${r.amount} XP` })))
    feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    return feed.slice(0, 10)
  })

  safeHandle(ipcMain, 'db:getWeeklyReport', voidSchema(), () => {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const pomodoros = getStmt("SELECT COUNT(*) as count FROM pomodoro_sessions WHERE date(started_at) >= ? AND date(started_at) <= ?").get(weekAgo, today)
    const tasksDone = getStmt("SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND updated_at >= ?").get(weekAgo)
    const xp = getStmt("SELECT COALESCE(SUM(amount), 0) as total FROM xp_log WHERE date(created_at) >= ? AND date(created_at) <= ?").get(weekAgo, today)
    const streak = getStmt("SELECT MAX(max) as max FROM streaks").get()
    getStmt("INSERT OR REPLACE INTO weekly_reports (week_start, pomodoros, tasks_completed, xp_earned, streak_max) VALUES (?, ?, ?, ?, ?)").run(weekAgo, pomodoros.count, tasksDone.count, xp.total, streak?.max || 0)
    return { weekStart: weekAgo, pomodoros: pomodoros.count, tasksCompleted: tasksDone.count, xpEarned: xp.total, streakMax: streak?.max || 0 }
  })

  safeHandle(ipcMain, 'activity:list', schemas.activity.list, (limit = 50) => {
    return getStmt('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?').all(limit)
  })

  safeHandle(ipcMain, 'activity:getByEntity', schemas.activity.getByEntity, ({ entityType, entityId }) => {
    return getStmt('SELECT * FROM activity_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').all(entityType, entityId)
  })

  safeHandle(ipcMain, 'db:getStats', schemas.stats.get, (period) => {
    const today = new Date().toISOString().split('T')[0]
    let dateFilter = "date('now')"
    if (period === 'week') dateFilter = "date('now', '-7 days')"
    else if (period === 'month') dateFilter = "date('now', '-30 days')"
    const pomodoroCount = getStmt(
      `SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total FROM pomodoro_sessions WHERE date(started_at) >= ${dateFilter}`
    ).get()
    const tasksCompleted = getStmt(
      `SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND updated_at >= ${dateFilter}`
    ).get()
    const tasksTotal = getStmt('SELECT COUNT(*) as count FROM tasks').get()
    const dailyPomodoros = getStmt(
      "SELECT date(started_at) as date, COUNT(*) as count FROM pomodoro_sessions WHERE date(started_at) >= ? GROUP BY date(started_at) ORDER BY date"
    ).all(period === 'week' ? new Date(Date.now() - 7*86400000).toISOString().split('T')[0] : new Date(Date.now() - 30*86400000).toISOString().split('T')[0])
    const pomodorosByProject = getStmt(
      `SELECT COALESCE(p.name, 'Sin proyecto') as name, COUNT(*) as count
       FROM pomodoro_sessions ps
       LEFT JOIN projects p ON ps.project_id = p.id
       WHERE date(ps.started_at) >= ?
       GROUP BY ps.project_id ORDER BY count DESC`
    ).all(period === 'week' ? new Date(Date.now() - 7*86400000).toISOString().split('T')[0] : new Date(Date.now() - 30*86400000).toISOString().split('T')[0])
    const tasksByPriority = getStmt(
      `SELECT priority, COUNT(*) as count FROM tasks
       WHERE completed = 1 AND updated_at >= ? GROUP BY priority`
    ).all(period === 'week' ? new Date(Date.now() - 7*86400000).toISOString().split('T')[0] : new Date(Date.now() - 30*86400000).toISOString().split('T')[0])
    return { pomodoroCount, tasksCompleted, tasksTotal, dailyPomodoros, pomodorosByProject, tasksByPriority }
  })
}

class SearchQueryParser {
  static toFtsQuery(query) {
    return query.trim().split(/\s+/).filter(Boolean).map(term => `"${term.replace(/"/g, '')}"`).join(' AND ')
  }
}

module.exports = { register, populateSearchIndex }
