const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const { getStmt, addXp, updateChallengeProgress, computeXp, getWeekStart, validate } = require('./database')

function dynamicUpdate(table, id, data) {
  const keys = Object.keys(data).filter(k => k !== 'id')
  if (keys.length === 0) return null
  const setClause = keys.map(k => `${k} = @${k}`).join(', ')
  const params = { id }
  for (const k of keys) params[k] = data[k]
  getStmt(`UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = @id`).run(params)
  return getStmt(`SELECT * FROM ${table} WHERE id = ?`).get(id)
}

// -- Settings --
router.get('/settings/:key', (req, res) => {
  const row = getStmt('SELECT value FROM settings WHERE key = ?').get(req.params.key)
  res.json(row ? row.value : null)
})
router.put('/settings/:key', (req, res) => {
  getStmt('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, req.body.value)
  res.json(true)
})

// -- XP --
router.get('/xp', (req, res) => res.json(computeXp()))
router.post('/xp/add', (req, res) => res.json(addXp(req.body.amount, req.body.reason)))
router.get('/xp/history/:days', (req, res) => {
  const days = parseInt(req.params.days, 10) || 7
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const rows = getStmt("SELECT date(created_at) as date, SUM(amount) as xp FROM xp_log WHERE created_at >= ? GROUP BY date(date) ORDER BY date").all(since)
  res.json(rows)
})
router.get('/achievements', (req, res) => {
  const rows = getStmt("SELECT a.*, ua.unlocked_at IS NOT NULL as unlocked FROM achievements a LEFT JOIN user_achievements ua ON a.id = ua.achievement_id ORDER BY a.id").all()
  res.json(rows)
})
router.post('/achievements/check', (req, res) => {
  const db = getStmt('').database  // hack to get db
  const totalXp = getStmt('SELECT COALESCE(SUM(amount), 0) as t FROM xp_log').get().t
  const pomodoroCount = getStmt('SELECT COUNT(*) as c FROM pomodoro_sessions').get().c
  const tasksDone = getStmt('SELECT COUNT(*) as c FROM tasks WHERE completed = 1').get().c
  const notesCount = getStmt('SELECT COUNT(*) as c FROM notes WHERE deleted = 0').get().c
  const snippetsCount = getStmt('SELECT COUNT(*) as c FROM snippets').get().c
  const projectsCount = getStmt('SELECT COUNT(*) as c FROM projects WHERE deleted = 0').get().c
  const streakDays = getStmt("SELECT COALESCE(MAX(max), 0) as m FROM streaks WHERE name = 'daily_study'").get().m
  const appStreakDays = getStmt("SELECT COALESCE(MAX(max), 0) as m FROM streaks WHERE name = 'app_usage'").get().m

  const checks = [
    { key: 'first_pomodoro', cond: pomodoroCount >= 1 },
    { key: 'ten_pomodoros', cond: pomodoroCount >= 10 },
    { key: 'fifty_pomodoros', cond: pomodoroCount >= 50 },
    { key: 'first_task', cond: tasksDone >= 1 },
    { key: 'ten_tasks', cond: tasksDone >= 10 },
    { key: 'first_note', cond: notesCount >= 1 },
    { key: 'first_streak_3', cond: streakDays >= 3 },
    { key: 'first_streak_7', cond: streakDays >= 7 },
    { key: 'first_streak_30', cond: streakDays >= 30 },
    { key: 'ten_notes', cond: notesCount >= 10 },
    { key: 'fifty_notes', cond: notesCount >= 50 },
    { key: 'ten_snippets', cond: snippetsCount >= 10 },
    { key: 'five_projects', cond: projectsCount >= 5 },
    { key: 'hundred_tasks', cond: tasksDone >= 100 },
    { key: 'seven_day_streak_app', cond: appStreakDays >= 7 },
  ]

  const unlocked = []
  for (const check of checks) {
    if (check.cond) {
      const ach = getStmt("SELECT id, xp_reward FROM achievements WHERE key = ?").get(check.key)
      if (ach) {
        const already = getStmt("SELECT id FROM user_achievements WHERE achievement_id = ?").get(ach.id)
        if (!already) {
          getStmt('INSERT INTO user_achievements (achievement_id) VALUES (?)').run(ach.id)
          if (ach.xp_reward > 0) addXp(ach.xp_reward, `logro: ${check.key}`)
          unlocked.push(check.key)
        }
      }
    }
  }
  // First weekly challenge achievement
  const weeklyDone = getStmt("SELECT COUNT(*) as c FROM user_challenges WHERE completed = 1").get().c
  const firstWeekly = getStmt("SELECT id, xp_reward FROM achievements WHERE key = 'first_weekly_challenge'").get()
  if (firstWeekly && weeklyDone >= 1) {
    const already = getStmt("SELECT id FROM user_achievements WHERE achievement_id = ?").get(firstWeekly.id)
    if (!already) {
      getStmt('INSERT INTO user_achievements (achievement_id) VALUES (?)').run(firstWeekly.id)
      if (firstWeekly.xp_reward > 0) addXp(firstWeekly.xp_reward, 'logro: primer desaf\u00edo semanal')
      unlocked.push('first_weekly_challenge')
    }
  }

  res.json({ unlocked })
})

// -- Tasks --
router.get('/tasks', (req, res) => {
  const rows = getStmt("SELECT * FROM tasks WHERE deleted = 0 ORDER BY position ASC, created_at DESC").all()
  res.json(rows)
})
router.get('/tasks-with-subtasks', (req, res) => {
  const tasks = getStmt("SELECT * FROM tasks WHERE deleted = 0 ORDER BY position ASC, created_at DESC").all()
  const subtasks = getStmt("SELECT * FROM subtasks ORDER BY position ASC").all()
  const grouped = {}
  for (const s of subtasks) {
    if (!grouped[s.task_id]) grouped[s.task_id] = []
    grouped[s.task_id].push(s)
  }
  res.json(tasks.map(t => ({ ...t, subtasks: grouped[t.id] || [] })))
})
router.post('/tasks', (req, res) => {
  const t = req.body
  const result = getStmt(`INSERT INTO tasks (title, description, priority, due_date, reminder, project_id, repeat, tags) VALUES (@title, @description, @priority, @due_date, @reminder, @project_id, @repeat, @tags)`).run({
    title: t.title, description: t.description || '', priority: t.priority || 'media',
    due_date: t.due_date || null, reminder: t.reminder || null,
    project_id: t.project_id || null, repeat: t.repeat || null, tags: t.tags || ''
  })
  res.json(getStmt('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid))
})
router.put('/tasks/:id', (req, res) => res.json(dynamicUpdate('tasks', req.params.id, req.body)))
router.put('/tasks/:id/toggle', (req, res) => {
  const task = getStmt('SELECT completed FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.status(404).json(null)
  const wasNotCompleted = !task.completed
  const updated = getStmt("UPDATE tasks SET completed = CASE WHEN completed THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?").run(req.params.id)
  if (wasNotCompleted) {
    addXp(5, 'tarea completada')
    updateChallengeProgress('task', 1)
  }
  res.json(getStmt('SELECT * FROM tasks WHERE id = ?').get(req.params.id))
})
router.delete('/tasks/:id', (req, res) => {
  getStmt("UPDATE tasks SET deleted = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id)
  res.json(true)
})
router.post('/tasks/reorder', (req, res) => {
  const { orderedIds } = req.body
  const txn = getStmt('').database.transaction(() => {
    for (let i = 0; i < orderedIds.length; i++) {
      getStmt("UPDATE tasks SET position = ?, updated_at = datetime('now') WHERE id = ?").run(i, orderedIds[i])
    }
  })
  txn()
  res.json(true)
})

// -- Tags --
router.post('/tasks/:id/tags', (req, res) => {
  const task = getStmt('SELECT tags FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.json(false)
  const tag = req.body.tag
  const current = task.tags ? task.tags.split(',').map(s => s.trim()).filter(Boolean) : []
  if (!current.includes(tag)) {
    current.push(tag)
    getStmt('UPDATE tasks SET tags = ? WHERE id = ?').run(current.join(','), req.params.id)
  }
  res.json(true)
})
router.delete('/tasks/:id/tags/:tag', (req, res) => {
  const task = getStmt('SELECT tags FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.json(false)
  const current = task.tags ? task.tags.split(',').map(s => s.trim()).filter(Boolean) : []
  const filtered = current.filter(t => t !== req.params.tag)
  getStmt('UPDATE tasks SET tags = ? WHERE id = ?').run(filtered.join(','), req.params.id)
  res.json(true)
})
router.get('/tasks/tag/:tag', (req, res) => {
  const rows = getStmt("SELECT * FROM tasks WHERE deleted = 0 AND ',' || tags || ',' LIKE '%,' || ? || ',%' ORDER BY position ASC, created_at DESC").all(req.params.tag)
  res.json(rows)
})

// -- Kanban --
router.get('/kanban', (req, res) => {
  const rows = getStmt('SELECT * FROM kanban_cards ORDER BY position ASC').all()
  res.json(rows)
})
router.post('/kanban', (req, res) => {
  const c = req.body
  const pos = getStmt("SELECT COALESCE(MAX(position), -1) + 1 as pos FROM kanban_cards WHERE column_type = ?").get(c.column_type || 'pendiente')
  const result = getStmt("INSERT INTO kanban_cards (title, description, column_type, position, priority, tags, due_date, project_id) VALUES (@title, @description, @column_type, @position, @priority, @tags, @due_date, @project_id)").run({
    title: c.title, description: c.description || '', column_type: c.column_type || 'pendiente',
    position: pos.pos, priority: c.priority || 'media', tags: c.tags || '',
    due_date: c.due_date || null, project_id: c.project_id || null
  })
  res.json(getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(result.lastInsertRowid))
})
router.put('/kanban/:id', (req, res) => {
  const data = req.body
  const keys = Object.keys(data).filter(k => k !== 'id')
  if (keys.length === 0) return res.json(getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(req.params.id))
  const setClause = keys.map(k => `${k} = @${k}`).join(', ')
  const params = { id: parseInt(req.params.id) }
  for (const k of keys) params[k] = data[k]
  getStmt(`UPDATE kanban_cards SET ${setClause}, updated_at = datetime('now') WHERE id = @id`).run(params)
  res.json(getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(params.id))
})
router.delete('/kanban/:id', (req, res) => {
  getStmt('DELETE FROM kanban_cards WHERE id = ?').run(req.params.id)
  res.json(true)
})
router.put('/kanban/:id/move', (req, res) => {
  const { column, position } = req.body
  getStmt("UPDATE kanban_cards SET column_type = ?, position = ?, updated_at = datetime('now') WHERE id = ?").run(column, position, req.params.id)
  res.json(getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(req.params.id))
})

// -- Pomodoro --
router.get('/pomodoros', (req, res) => {
  let rows
  if (req.query.date) {
    rows = getStmt("SELECT * FROM pomodoro_sessions WHERE date(started_at) = ? ORDER BY started_at DESC").all(req.query.date)
  } else {
    rows = getStmt('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC').all()
  }
  res.json(rows)
})
router.post('/pomodoros', (req, res) => {
  const s = req.body
  const result = getStmt("INSERT INTO pomodoro_sessions (task_id, project_id, duration, started_at, ended_at) VALUES (?, ?, ?, ?, ?)").run(
    s.task_id || null, s.project_id || null, s.duration, s.started_at, s.ended_at
  )
  addXp(10, 'pomodoro completado')
  updateChallengeProgress('pomodoro', 1)
  res.json(getStmt('SELECT * FROM pomodoro_sessions WHERE id = ?').get(result.lastInsertRowid))
})

// -- Study Topics --
router.get('/study-topics', (req, res) => {
  const rows = getStmt('SELECT * FROM study_topics ORDER BY order_position ASC').all()
  res.json(rows)
})
router.post('/study-topics', (req, res) => {
  const t = req.body
  const result = getStmt("INSERT INTO study_topics (parent_id, name, description, order_position) VALUES (?, ?, ?, COALESCE((SELECT MAX(order_position) + 1 FROM study_topics), 0))").run(
    t.parent_id || null, t.name, t.description || ''
  )
  res.json(getStmt('SELECT * FROM study_topics WHERE id = ?').get(result.lastInsertRowid))
})
router.put('/study-topics/:id', (req, res) => {
  const data = req.body
  const keys = Object.keys(data).filter(k => k !== 'id')
  if (keys.length === 0) return res.json(getStmt('SELECT * FROM study_topics WHERE id = ?').get(req.params.id))
  const setClause = keys.map(k => `${k} = @${k}`).join(', ')
  const params = { id: parseInt(req.params.id) }
  for (const k of keys) params[k] = data[k]
  getStmt(`UPDATE study_topics SET ${setClause} WHERE id = @id`).run(params)
  res.json(getStmt('SELECT * FROM study_topics WHERE id = ?').get(params.id))
})
router.delete('/study-topics/:id', (req, res) => {
  getStmt('DELETE FROM study_topics WHERE id = ?').run(req.params.id)
  res.json(true)
})
router.put('/study-topics/:id/level', (req, res) => {
  getStmt("UPDATE study_topics SET study_level = ?, study_level_updated_at = datetime('now') WHERE id = ?").run(req.body.level, req.params.id)
  res.json(true)
})
router.put('/study-topics/:id/move', (req, res) => {
  const { direction } = req.body
  const current = getStmt('SELECT id, order_position, parent_id FROM study_topics WHERE id = ?').get(req.params.id)
  if (!current) return res.json(false)
  const pid = current.parent_id
  let other
  if (direction === 'up') {
    other = getStmt("SELECT id, order_position FROM study_topics WHERE (parent_id = ? OR (parent_id IS NULL AND ? IS NULL)) AND order_position < ? ORDER BY order_position DESC LIMIT 1").all(pid, pid, current.order_position)
  } else {
    other = getStmt("SELECT id, order_position FROM study_topics WHERE (parent_id = ? OR (parent_id IS NULL AND ? IS NULL)) AND order_position > ? ORDER BY order_position ASC LIMIT 1").all(pid, pid, current.order_position)
  }
  if (!other || other.length === 0) return res.json(false)
  const swap = other[0]
  getStmt('UPDATE study_topics SET order_position = ? WHERE id = ?').run(swap.order_position, current.id)
  getStmt('UPDATE study_topics SET order_position = ? WHERE id = ?').run(current.order_position, swap.id)
  res.json(true)
})
router.get('/study-stats', (req, res) => {
  const levels = getStmt('SELECT study_level, COUNT(*) as count FROM study_topics GROUP BY study_level').all()
  const total = getStmt('SELECT COUNT(*) as total FROM study_topics').get()
  res.json({ levels, total: total.total })
})

// -- Study Progress --
router.post('/study-progress/toggle', (req, res) => {
  const { topicId, date } = req.body
  const existing = getStmt("SELECT id FROM study_progress WHERE topic_id = ? AND date = ?").get(topicId, date)
  if (existing) {
    getStmt('DELETE FROM study_progress WHERE id = ?').run(existing.id)
    res.json(false)
  } else {
    getStmt("INSERT INTO study_progress (topic_id, date, completed) VALUES (?, ?, 1)").run(topicId, date)
    res.json(true)
  }
})

// -- Study Files --
router.get('/study-files/:topicId', (req, res) => {
  const rows = getStmt('SELECT * FROM study_files WHERE topic_id = ? ORDER BY created_at DESC').all(req.params.topicId)
  res.json(rows)
})
router.post('/study-files/upload/:topicId', (req, res) => {
  if (!req.file) return res.status(400).json(null)
  const uploadsDir = path.join(__dirname, '..', 'uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  const ext = path.extname(req.file.originalname)
  const storedName = uuidv4() + ext
  fs.renameSync(req.file.path, path.join(uploadsDir, storedName))
  const result = getStmt('INSERT INTO study_files (topic_id, original_name, stored_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?)').run(
    req.params.topicId, req.file.originalname, storedName, req.file.size, req.file.mimetype
  )
  res.json(getStmt('SELECT * FROM study_files WHERE id = ?').get(result.lastInsertRowid))
})
router.delete('/study-files/:id', (req, res) => {
  const file = getStmt('SELECT * FROM study_files WHERE id = ?').get(req.params.id)
  if (!file) return res.json(false)
  const filePath = path.join(__dirname, '..', 'uploads', file.stored_name)
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch (e) {}
  getStmt('DELETE FROM study_files WHERE id = ?').run(req.params.id)
  res.json(true)
})
router.get('/study-files/:id/download', (req, res) => {
  const file = getStmt('SELECT * FROM study_files WHERE id = ?').get(req.params.id)
  if (!file) return res.status(404).json(null)
  const filePath = path.join(__dirname, '..', 'uploads', file.stored_name)
  res.download(filePath, file.original_name)
})

// -- Notes --
router.get('/notes', (req, res) => {
  const rows = getStmt("SELECT * FROM notes WHERE deleted = 0 ORDER BY updated_at DESC").all()
  res.json(rows)
})
router.post('/notes', (req, res) => {
  const n = req.body
  const result = getStmt("INSERT INTO notes (title, content, project_id) VALUES (?, ?, ?)").run(n.title || 'Sin t\u00edtulo', n.content || '', n.project_id || null)
  addXp(3, 'nota creada')
  updateChallengeProgress('note', 1)
  res.json(getStmt('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid))
})
router.put('/notes/:id', (req, res) => res.json(dynamicUpdate('notes', req.params.id, req.body)))
router.delete('/notes/:id', (req, res) => {
  getStmt("UPDATE notes SET deleted = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id)
  res.json(true)
})

// -- Goals --
router.get('/goals', (req, res) => {
  const rows = getStmt('SELECT * FROM goals ORDER BY created_at DESC').all()
  res.json(rows)
})
router.post('/goals', (req, res) => {
  const g = req.body
  const result = getStmt("INSERT INTO goals (title, type, target, metric) VALUES (?, ?, ?, ?)").run(g.title, g.type, g.target, g.metric)
  res.json(getStmt('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid))
})
router.put('/goals/:id', (req, res) => {
  const data = req.body
  const keys = Object.keys(data).filter(k => k !== 'id')
  if (keys.length === 0) return res.json(getStmt('SELECT * FROM goals WHERE id = ?').get(req.params.id))
  const setClause = keys.map(k => `${k} = @${k}`).join(', ')
  const params = { id: parseInt(req.params.id) }
  for (const k of keys) params[k] = data[k]
  getStmt(`UPDATE goals SET ${setClause} WHERE id = @id`).run(params)
  res.json(getStmt('SELECT * FROM goals WHERE id = ?').get(params.id))
})
router.delete('/goals/:id', (req, res) => {
  getStmt('DELETE FROM goals WHERE id = ?').run(req.params.id)
  res.json(true)
})
router.get('/goals/:id/progress/:date', (req, res) => {
  const row = getStmt("SELECT COALESCE(SUM(value), 0) as total FROM goal_progress WHERE goal_id = ? AND date = ?").get(req.params.id, req.params.date)
  res.json(row.total)
})
router.post('/goals/:id/progress', (req, res) => {
  const { date, value } = req.body
  const existing = getStmt("SELECT id FROM goal_progress WHERE goal_id = ? AND date = ?").get(req.params.id, date)
  if (existing) {
    getStmt('UPDATE goal_progress SET value = ? WHERE id = ?').run(value, existing.id)
  } else {
    getStmt("INSERT INTO goal_progress (goal_id, date, value) VALUES (?, ?, ?)").run(req.params.id, date, value)
  }
  res.json(true)
})

// -- Streaks --
router.get('/streaks/:name', (req, res) => {
  const row = getStmt('SELECT * FROM streaks WHERE name = ?').get(req.params.name)
  res.json(row || null)
})
router.post('/streaks/:name/update', (req, res) => {
  const name = req.params.name
  const today = new Date().toISOString().split('T')[0]
  let existing = getStmt('SELECT * FROM streaks WHERE name = ?').get(name)
  if (!existing) {
    getStmt("INSERT INTO streaks (name, current, max, updated_at) VALUES (?, 1, 1, ?)").run(name, today)
    existing = { current: 1, max: 1 }
  } else {
    const updated = existing.updated_at ? existing.updated_at.split('T')[0] : ''
    let current = existing.current
    if (updated === today) {
      // already updated today, return as-is
    } else if (updated === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
      current++
    } else {
      current = 1
    }
    const max = Math.max(current, existing.max)
    getStmt('UPDATE streaks SET current = ?, max = ?, updated_at = ? WHERE id = ?').run(current, max, today, existing.id)
    existing = { current, max }
  }
  addXp(20, 'racha actualizada')
  updateChallengeProgress('streak', 1)

  // also update app_usage streak
  const appStreak = getStmt('SELECT * FROM streaks WHERE name = ?').get('app_usage')
  if (appStreak) {
    const appUpdated = appStreak.updated_at ? appStreak.updated_at.split('T')[0] : ''
    let appCurrent = appStreak.current
    if (appUpdated === today) {
    } else if (appUpdated === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
      appCurrent++
    } else {
      appCurrent = 1
    }
    const appMax = Math.max(appCurrent, appStreak.max)
    getStmt('UPDATE streaks SET current = ?, max = ?, updated_at = ? WHERE id = ?').run(appCurrent, appMax, today, appStreak.id)
  } else {
    getStmt("INSERT INTO streaks (name, current, max, updated_at) VALUES ('app_usage', 1, 1, ?)").run(today)
  }

  res.json(existing)
})

// -- Statistics --
router.get('/stats/:period', (req, res) => {
  const period = req.params.period
  let filter
  if (period === 'week') filter = "datetime('now', '-7 days')"
  else if (period === 'month') filter = "datetime('now', '-30 days')"
  else filter = "datetime('now', '-7 days')"

  const pomCount = getStmt(`SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total FROM pomodoro_sessions WHERE started_at >= ${filter}`).get()
  const tasksDone = getStmt(`SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND updated_at >= ${filter}`).get()
  const tasksTotal = getStmt('SELECT COUNT(*) as count FROM tasks WHERE deleted = 0').get()
  const dailyPomodoros = getStmt(`SELECT date(started_at) as date, COUNT(*) as count FROM pomodoro_sessions WHERE started_at >= ${filter} GROUP BY date(started_at) ORDER BY date`).all()

  res.json({ pomodoroCount: pomCount, tasksCompleted: tasksDone, tasksTotal, dailyPomodoros })
})

// -- Projects --
router.get('/projects', (req, res) => {
  const rows = getStmt("SELECT * FROM projects WHERE deleted = 0 ORDER BY created_at DESC").all()
  res.json(rows)
})
router.post('/projects', (req, res) => {
  const p = req.body
  const result = getStmt("INSERT INTO projects (name, description, status, tech_stack, repo_url, color) VALUES (?, ?, ?, ?, ?, ?)").run(
    p.name, p.description || '', p.status || 'activo', p.tech_stack || '', p.repo_url || '', p.color || '#6366f1'
  )
  addXp(15, 'proyecto creado')
  res.json(getStmt('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid))
})
router.put('/projects/:id', (req, res) => res.json(dynamicUpdate('projects', req.params.id, req.body)))
router.delete('/projects/:id', (req, res) => {
  getStmt("UPDATE projects SET deleted = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id)
  res.json(true)
})

// -- Daily Logs --
router.get('/daily-logs', (req, res) => {
  const rows = getStmt('SELECT * FROM daily_logs ORDER BY date DESC').all()
  res.json(rows)
})
router.get('/daily-logs/:date', (req, res) => {
  const row = getStmt('SELECT * FROM daily_logs WHERE date = ?').get(req.params.date)
  res.json(row || null)
})
router.post('/daily-logs', (req, res) => {
  const d = req.body
  getStmt("INSERT OR REPLACE INTO daily_logs (date, content, focus, blockers, tomorrow_plan) VALUES (?, ?, ?, ?, ?)").run(
    d.date, d.content || '', d.focus || '', d.blockers || '', d.tomorrow_plan || ''
  )
  res.json(getStmt('SELECT * FROM daily_logs WHERE date = ?').get(d.date))
})
router.put('/daily-logs/:id', (req, res) => {
  const data = req.body
  const keys = Object.keys(data).filter(k => k !== 'id')
  if (keys.length === 0) return res.json(getStmt('SELECT * FROM daily_logs WHERE id = ?').get(req.params.id))
  const setClause = keys.map(k => `${k} = @${k}`).join(', ')
  const params = { id: parseInt(req.params.id) }
  for (const k of keys) params[k] = data[k]
  getStmt(`UPDATE daily_logs SET ${setClause} WHERE id = @id`).run(params)
  res.json(getStmt('SELECT * FROM daily_logs WHERE id = ?').get(params.id))
})

// -- Snippets --
router.get('/snippets', (req, res) => {
  const rows = getStmt('SELECT * FROM snippets ORDER BY created_at DESC').all()
  res.json(rows)
})
router.post('/snippets', (req, res) => {
  const s = req.body
  const result = getStmt("INSERT INTO snippets (title, code, language, description, tags, project_id) VALUES (?, ?, ?, ?, ?, ?)").run(
    s.title, s.code || '', s.language || 'text', s.description || '', s.tags || '', s.project_id || null
  )
  addXp(3, 'snippet creado')
  updateChallengeProgress('note', 1)
  res.json(getStmt('SELECT * FROM snippets WHERE id = ?').get(result.lastInsertRowid))
})
router.put('/snippets/:id', (req, res) => {
  const data = req.body
  const keys = Object.keys(data).filter(k => k !== 'id')
  if (keys.length === 0) return res.json(getStmt('SELECT * FROM snippets WHERE id = ?').get(req.params.id))
  const setClause = keys.map(k => `${k} = @${k}`).join(', ')
  const params = { id: parseInt(req.params.id) }
  for (const k of keys) params[k] = data[k]
  getStmt(`UPDATE snippets SET ${setClause} WHERE id = @id`).run(params)
  res.json(getStmt('SELECT * FROM snippets WHERE id = ?').get(params.id))
})
router.delete('/snippets/:id', (req, res) => {
  getStmt('DELETE FROM snippets WHERE id = ?').run(req.params.id)
  res.json(true)
})

// -- Habits --
router.get('/habits', (req, res) => {
  const rows = getStmt('SELECT * FROM habits ORDER BY created_at DESC').all()
  res.json(rows)
})
router.post('/habits', (req, res) => {
  const h = req.body
  const result = getStmt("INSERT INTO habits (name, icon, color, frequency) VALUES (?, ?, ?, ?)").run(h.name, h.icon || 'check', h.color || '#6366f1', h.frequency || 'daily')
  res.json(getStmt('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid))
})
router.put('/habits/:id', (req, res) => {
  const data = req.body
  const keys = Object.keys(data).filter(k => k !== 'id')
  if (keys.length === 0) return res.json(getStmt('SELECT * FROM habits WHERE id = ?').get(req.params.id))
  const setClause = keys.map(k => `${k} = @${k}`).join(', ')
  const params = { id: parseInt(req.params.id) }
  for (const k of keys) params[k] = data[k]
  getStmt(`UPDATE habits SET ${setClause} WHERE id = @id`).run(params)
  res.json(getStmt('SELECT * FROM habits WHERE id = ?').get(params.id))
})
router.delete('/habits/:id', (req, res) => {
  getStmt('DELETE FROM habits WHERE id = ?').run(req.params.id)
  res.json(true)
})
router.get('/habits/:id/logs', (req, res) => {
  const rows = getStmt('SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC').all(req.params.id)
  res.json(rows)
})
router.post('/habits/:id/toggle', (req, res) => {
  const { date } = req.body
  const existing = getStmt("SELECT id FROM habit_logs WHERE habit_id = ? AND date = ?").get(req.params.id, date)
  if (existing) {
    getStmt('DELETE FROM habit_logs WHERE id = ?').run(existing.id)
    res.json(false)
  } else {
    getStmt("INSERT INTO habit_logs (habit_id, date, completed) VALUES (?, ?, 1)").run(req.params.id, date)
    res.json(true)
  }
})

// -- Subtasks --
router.get('/subtasks/:taskId', (req, res) => {
  const rows = getStmt('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(req.params.taskId)
  res.json(rows)
})
router.post('/subtasks', (req, res) => {
  const s = req.body
  const pos = getStmt("SELECT COALESCE(MAX(position), -1) + 1 as pos FROM subtasks WHERE task_id = ?").get(s.task_id)
  const result = getStmt("INSERT INTO subtasks (task_id, title, position) VALUES (?, ?, ?)").run(s.task_id, s.title, pos.pos)
  res.json(getStmt('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid))
})
router.put('/subtasks/:id/toggle', (req, res) => {
  getStmt("UPDATE subtasks SET completed = CASE WHEN completed THEN 0 ELSE 1 END WHERE id = ?").run(req.params.id)
  res.json(getStmt('SELECT * FROM subtasks WHERE id = ?').get(req.params.id))
})
router.delete('/subtasks/:id', (req, res) => {
  getStmt('DELETE FROM subtasks WHERE id = ?').run(req.params.id)
  res.json(true)
})

// -- Trash --
router.post('/trash/soft-delete', (req, res) => {
  const { type, id } = req.body
  const tableMap = { task: 'tasks', note: 'notes', project: 'projects' }
  const table = tableMap[type]
  if (!table) return res.json(false)
  getStmt(`UPDATE ${table} SET deleted = 1, updated_at = datetime('now') WHERE id = ?`).run(id)
  res.json(true)
})
router.get('/trash', (req, res) => {
  const tasks = getStmt("SELECT id, title, 'task' as type, deleted, updated_at FROM tasks WHERE deleted = 1 ORDER BY updated_at DESC").all()
  const notes = getStmt("SELECT id, title, 'note' as type, deleted, updated_at FROM notes WHERE deleted = 1 ORDER BY updated_at DESC").all()
  const projects = getStmt("SELECT id, name as title, 'project' as type, deleted, updated_at FROM projects WHERE deleted = 1 ORDER BY updated_at DESC").all()
  res.json({ tasks, notes, projects })
})
router.post('/trash/restore', (req, res) => {
  const { type, id } = req.body
  const tableMap = { task: 'tasks', note: 'notes', project: 'projects' }
  const table = tableMap[type]
  if (!table) return res.json(false)
  getStmt(`UPDATE ${table} SET deleted = 0, updated_at = datetime('now') WHERE id = ?`).run(id)
  res.json(true)
})
router.post('/trash/permanent', (req, res) => {
  const { type, id } = req.body
  const tableMap = { task: 'tasks', note: 'notes', project: 'projects' }
  const table = tableMap[type]
  if (!table) return res.json(false)
  getStmt(`DELETE FROM ${table} WHERE id = ?`).run(id)
  res.json(true)
})
router.post('/trash/empty', (req, res) => {
  getStmt("DELETE FROM tasks WHERE deleted = 1").run()
  getStmt("DELETE FROM notes WHERE deleted = 1").run()
  getStmt("DELETE FROM projects WHERE deleted = 1").run()
  res.json(true)
})

// -- Entity Links --
router.post('/entity-links', (req, res) => {
  const { fromType, fromId, toType, toId } = req.body
  getStmt('INSERT OR IGNORE INTO entity_links (from_type, from_id, to_type, to_id) VALUES (?, ?, ?, ?)').run(fromType, fromId, toType, toId)
  res.json(true)
})
router.get('/entity-links/:type/:id', (req, res) => {
  const { type, id } = req.params
  const links = getStmt("SELECT * FROM entity_links WHERE (from_type = ? AND from_id = ?) OR (to_type = ? AND to_id = ?)").all(type, id, type, id)
  const result = []
  for (const link of links) {
    if (link.from_type === type && link.from_id == id) {
      const other = getStmt(`SELECT * FROM ${link.to_type}s WHERE id = ?`).get(link.to_id)
      if (other) result.push({ ...other, linkType: link.to_type })
    } else {
      const other = getStmt(`SELECT * FROM ${link.from_type}s WHERE id = ?`).get(link.from_id)
      if (other) result.push({ ...other, linkType: link.from_type })
    }
  }
  res.json(result)
})

// -- Challenges --
router.get('/challenges', (req, res) => {
  const weekStart = getWeekStart()
  const rows = getStmt("SELECT c.*, COALESCE(uc.progress, 0) as progress, COALESCE(uc.completed, 0) as completed, c.requirement_count as target FROM challenges c LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.week_start = ? ORDER BY c.id").all(weekStart)
  res.json(rows)
})

// -- Flashcards --
router.get('/flashcard-decks', (req, res) => {
  const rows = getStmt("SELECT d.*, (SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id) as card_count FROM flashcard_decks d ORDER BY d.created_at DESC").all()
  res.json(rows)
})
router.post('/flashcard-decks', (req, res) => {
  const { name, description } = req.body
  const result = getStmt("INSERT INTO flashcard_decks (name, description) VALUES (?, ?)").run(name, description || '')
  res.json({ id: result.lastInsertRowid, name, description: description || '', card_count: 0 })
})
router.delete('/flashcard-decks/:id', (req, res) => {
  getStmt('DELETE FROM flashcard_decks WHERE id = ?').run(req.params.id)
  res.json(true)
})
router.get('/flashcards/:deckId', (req, res) => {
  const rows = getStmt('SELECT * FROM flashcards WHERE deck_id = ? ORDER BY next_review ASC').all(req.params.deckId)
  res.json(rows)
})
router.post('/flashcards', (req, res) => {
  const { deck_id, front, back, hint } = req.body
  const result = getStmt("INSERT INTO flashcards (deck_id, front, back, hint) VALUES (?, ?, ?, ?)").run(deck_id, front, back, hint || '')
  res.json({ id: result.lastInsertRowid, deck_id, front, back, hint: hint || '' })
})
router.delete('/flashcards/:id', (req, res) => {
  getStmt('DELETE FROM flashcards WHERE id = ?').run(req.params.id)
  res.json(true)
})
router.get('/flashcards/:deckId/due', (req, res) => {
  const rows = getStmt("SELECT * FROM flashcards WHERE deck_id = ? AND next_review <= datetime('now') ORDER BY next_review ASC").all(req.params.deckId)
  res.json(rows)
})
router.post('/flashcards/:id/review', (req, res) => {
  const card = getStmt('SELECT * FROM flashcards WHERE id = ?').get(req.params.id)
  if (!card) return res.status(404).json(null)
  const ease = req.body.ease || 0
  let repetitions = card.repetitions
  let interval = card.interval
  let easeFactor = card.ease_factor

  if (ease >= 2) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 3
    else interval = Math.round(interval * easeFactor)
    repetitions++
  } else {
    repetitions = 0
    interval = 0
  }
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (2 - ease) * 0.08))
  getStmt("UPDATE flashcards SET repetitions = ?, interval = ?, ease_factor = ?, next_review = datetime('now', '+' || ? || ' days') WHERE id = ?").run(repetitions, interval, easeFactor, interval, req.params.id)
  res.json(getStmt('SELECT * FROM flashcards WHERE id = ?').get(req.params.id))
})
router.get('/flashcard-stats/:deckId', (req, res) => {
  const total = getStmt('SELECT COUNT(*) as c FROM flashcards WHERE deck_id = ?').get(req.params.deckId).c
  const due = getStmt("SELECT COUNT(*) as c FROM flashcards WHERE deck_id = ? AND next_review <= datetime('now')").get(req.params.deckId).c
  const reviewed = getStmt('SELECT COUNT(*) as c FROM flashcards WHERE deck_id = ? AND repetitions > 0').get(req.params.deckId).c
  res.json({ total, due, reviewed })
})
router.get('/retention-stats', (req, res) => {
  const total = getStmt('SELECT COUNT(*) as c FROM flashcards').get().c
  if (total === 0) return res.json({ total: 0, easy: 0, hard: 0, retentionRate: 0 })
  const easy = getStmt("SELECT COUNT(*) as c FROM flashcards WHERE ease_factor >= 2.5 AND repetitions > 0").get().c
  const hard = getStmt("SELECT COUNT(*) as c FROM flashcards WHERE ease_factor < 2.0 AND repetitions > 0").get().c
  res.json({ total, easy, hard, retentionRate: total > 0 ? Math.round((easy / total) * 100) : 0 })
})

// -- Weekly Report --
router.get('/weekly-report', (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const pomodoros = getStmt("SELECT COUNT(*) as c FROM pomodoro_sessions WHERE started_at >= ?").get(weekAgo).c
  const tasksCompleted = getStmt("SELECT COUNT(*) as c FROM tasks WHERE completed = 1 AND updated_at >= ?").get(weekAgo).c
  const xpEarned = getStmt("SELECT COALESCE(SUM(amount), 0) as t FROM xp_log WHERE created_at >= ?").get(weekAgo).t
  const streakMax = getStmt("SELECT COALESCE(MAX(max), 0) as m FROM streaks WHERE name = 'daily_study'").get().m
  const weekStart = getWeekStart()
  getStmt("INSERT OR REPLACE INTO weekly_reports (week_start, pomodoros, tasks_completed, xp_earned, streak_max) VALUES (?, ?, ?, ?, ?)").run(weekStart, pomodoros, tasksCompleted, xpEarned, streakMax)
  res.json({ weekStart, pomodoros, tasksCompleted, xpEarned, streakMax })
})

// -- Search --
router.get('/search', (req, res) => {
  const q = req.query.q
  if (!q || q.trim() === '') return res.json([])
  const like = `%${q}%`
  const results = []
  const queries = [
    { sql: "SELECT id, title as name, 'tarea' as type FROM tasks WHERE deleted = 0 AND (title LIKE ? OR description LIKE ?) LIMIT 10", params: [like, like] },
    { sql: "SELECT id, title as name, 'nota' as type FROM notes WHERE deleted = 0 AND (title LIKE ? OR content LIKE ?) LIMIT 10", params: [like, like] },
    { sql: "SELECT id, title as name, 'snippet' as type FROM snippets WHERE title LIKE ? OR description LIKE ? OR code LIKE ? LIMIT 10", params: [like, like, like] },
    { sql: "SELECT id, name, 'proyecto' as type FROM projects WHERE deleted = 0 AND (name LIKE ? OR description LIKE ?) LIMIT 10", params: [like, like] },
    { sql: "SELECT id, name, 'h\u00e1bito' as type FROM habits WHERE name LIKE ? LIMIT 10", params: [like] },
    { sql: "SELECT id, date as name, 'diario' as type FROM daily_logs WHERE content LIKE ? OR focus LIKE ? LIMIT 10", params: [like, like] },
  ]
  for (const qry of queries) {
    const rows = getStmt(qry.sql).all(...qry.params)
    results.push(...rows)
  }
  res.json(results)
})

// -- Dashboard --
router.get('/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const pomodorosToday = getStmt("SELECT COUNT(*) as c FROM pomodoro_sessions WHERE date(started_at) = ?").get(today).c
  const tasksToday = getStmt("SELECT COUNT(*) as c FROM tasks WHERE completed = 1 AND date(updated_at) = ?").get(today).c
  const tasksPending = getStmt("SELECT COUNT(*) as c FROM tasks WHERE deleted = 0 AND completed = 0").get().c
  const upcomingTasks = getStmt("SELECT id, title, due_date FROM tasks WHERE deleted = 0 AND due_date IS NOT NULL AND due_date >= date('now') ORDER BY due_date ASC LIMIT 5").all()
  const xp = computeXp()
  const streakRow = getStmt("SELECT current, max FROM streaks WHERE name = 'daily_study'").get()
  const streak = streakRow ? { current: streakRow.current, max: streakRow.max } : { current: 0, max: 0 }
  const totalPomodoros = getStmt('SELECT COUNT(*) as c FROM pomodoro_sessions').get().c
  const totalTasks = getStmt("SELECT COUNT(*) as c FROM tasks WHERE deleted = 0 AND completed = 1").get().c
  res.json({ pomodorosToday, tasksToday, tasksPending, upcomingTasks, xp, streak, totalPomodoros, totalTasks })
})

// -- Activity Feed --
router.get('/activity-feed', (req, res) => {
  const activities = []
  const recentTasks = getStmt("SELECT id, title, 'tarea' as type, updated_at as time FROM tasks WHERE deleted = 0 ORDER BY updated_at DESC LIMIT 5").all()
  for (const t of recentTasks) activities.push({ id: t.id, title: t.title, type: 'tarea', time: t.time, text: `Tarea actualizada: ${t.title}` })
  const recentNotes = getStmt("SELECT id, title, 'nota' as type, updated_at as time FROM notes WHERE deleted = 0 ORDER BY updated_at DESC LIMIT 5").all()
  for (const n of recentNotes) activities.push({ id: n.id, title: n.title, type: 'nota', time: n.time, text: `Nota actualizada: ${n.title || 'Sin t\u00edtulo'}` })
  const recentPomodoros = getStmt("SELECT id, duration, 'pomodoro' as type, started_at as time FROM pomodoro_sessions ORDER BY started_at DESC LIMIT 5").all()
  for (const p of recentPomodoros) activities.push({ id: p.id, title: `${p.duration}min`, type: 'pomodoro', time: p.time, text: `Pomodoro completado` })
  const recentXp = getStmt("SELECT id, amount, reason, 'xp' as type, created_at as time FROM xp_log ORDER BY created_at DESC LIMIT 5").all()
  for (const x of recentXp) activities.push({ id: x.id, title: `+${x.amount} XP`, type: 'xp', time: x.time, text: `${x.reason}` })
  activities.sort((a, b) => new Date(b.time) - new Date(a.time))
  res.json(activities.slice(0, 10))
})

// -- Habit Stats --
router.get('/habit-stats', (req, res) => {
  const habits = getStmt('SELECT * FROM habits ORDER BY created_at DESC').all()
  const today = new Date().toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const result = []
  for (const h of habits) {
    const totalDays = getStmt('SELECT COUNT(DISTINCT date) as c FROM habit_logs WHERE habit_id = ?').get(h.id).c
    const thisMonth = getStmt("SELECT COUNT(DISTINCT date) as c FROM habit_logs WHERE habit_id = ? AND date >= ?").get(h.id, monthAgo).c
    const todayDone = getStmt("SELECT id FROM habit_logs WHERE habit_id = ? AND date = ?").get(h.id, today) ? true : false
    result.push({ ...h, totalDays, thisMonth, todayDone })
  }
  res.json(result)
})

// -- Export --
router.get('/export', (req, res) => {
  const tables = ['settings', 'projects', 'tasks', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'study_files', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags']
  const data = {}
  for (const t of tables) {
    data[t] = getStmt(`SELECT * FROM ${t}`).all()
  }
  res.json(data)
})
router.post('/import', (req, res) => {
  const tables = ['settings', 'projects', 'tasks', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'study_files', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags']
  const data = req.body
  const db = getStmt('').database
  const txn = db.transaction(() => {
    for (const t of tables) {
      if (data[t] && Array.isArray(data[t])) {
        getStmt(`DELETE FROM ${t}`).run()
        for (const row of data[t]) {
          const keys = Object.keys(row)
          const placeholders = keys.map(k => `@${k}`).join(', ')
          getStmt(`INSERT INTO ${t} (${keys.join(', ')}) VALUES (${placeholders})`).run(row)
        }
      }
    }
  })
  txn()
  res.json(true)
})

// -- Backups --
router.get('/backups', (req, res) => {
  const backupsDir = path.join(__dirname, '..', 'backups')
  if (!fs.existsSync(backupsDir)) return res.json([])
  const files = fs.readdirSync(backupsDir).filter(f => f.startsWith('backup-') && f.endsWith('.json')).sort().reverse()
  const result = files.map(f => {
    const stats = fs.statSync(path.join(backupsDir, f))
    return { filename: f, date: f.replace('backup-', '').replace('.json', ''), size: stats.size }
  })
  res.json(result)
})
router.post('/backups/restore/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'backups', req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).json(false)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const allTables = ['settings', 'projects', 'tasks', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'study_files', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags', 'xp_log', 'achievements', 'user_achievements', 'challenges', 'user_challenges', 'weekly_reports', 'subtasks', 'entity_links', 'flashcard_decks', 'flashcards']
  const db = getStmt('').database
  const txn = db.transaction(() => {
    for (const t of allTables) {
      if (data[t] && Array.isArray(data[t])) {
        getStmt(`DELETE FROM ${t}`).run()
        for (const row of data[t]) {
          const keys = Object.keys(row)
          const placeholders = keys.map(k => `@${k}`).join(', ')
          getStmt(`INSERT INTO ${t} (${keys.join(', ')}) VALUES (${placeholders})`).run(row)
        }
      }
    }
  })
  txn()
  res.json(true)
})

module.exports = router
