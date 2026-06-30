const { app, BrowserWindow, ipcMain, Notification, dialog, session } = require('electron')
const path = require('path')
const fs = require('fs')
const notifier = require('node-notifier')
const { autoUpdater } = require('electron-updater')
const { initDatabase, getDb, closeDatabase } = require('./database')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://localhost:*; font-src 'self' data:;",
        ],
      },
    })
  })

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.webContents.on('unhandled-rejection', (_event, _promise, reason) => {
    console.error('[RENDERER UNHANDLED REJECTION]', reason)
  })
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update:available', info)
  })
  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) mainWindow.webContents.send('update:downloadProgress', progress)
  })
  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) mainWindow.webContents.send('update:downloaded')
  })
  autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('update:error', err.message)
  })
}

app.commandLine.appendSwitch('disable-http-cache')
app.commandLine.appendSwitch('enable-features', 'UseSkiaRenderer')

app.whenReady().then(() => {
  initDatabase()
  createWindow()
  registerIpcHandlers()
  setupAutoUpdater()

  if (!process.argv.includes('--dev') && process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdates().catch(() => {})
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})

const ALLOWED_COLUMNS = {
  tasks: ['title', 'description', 'completed', 'priority', 'due_date', 'reminder', 'project_id', 'recurrence_rule', 'recurrence_end'],
  kanban_cards: ['title', 'description', 'column_type', 'position', 'priority', 'tags', 'due_date', 'project_id'],
  study_topics: ['parent_id', 'name', 'description', 'order_position'],
  notes: ['title', 'content', 'project_id', 'notebook_id'],
  goals: ['title', 'type', 'target', 'metric'],
  goal_progress: ['value'],
  daily_logs: ['date', 'content', 'focus', 'blockers', 'tomorrow_plan'],
  snippets: ['title', 'code', 'language', 'description', 'tags', 'project_id'],
  projects: ['name', 'description', 'status', 'tech_stack', 'repo_url', 'color'],
  tags: ['name', 'color'],
  flashcard_decks: ['name', 'description'],
  flashcards: ['deck_id', 'front', 'back', 'ease', 'interval', 'repetitions', 'next_review'],
  subtasks: ['task_id', 'title', 'completed', 'position'],
  notebooks: ['parent_id', 'name', 'description', 'color'],
  templates: ['name', 'entity_type', 'content'],
}

const REQUIRED_FIELDS = {
  tasks: ['title'],
  kanban_cards: ['title', 'column_type'],
  study_topics: ['name'],
  notes: ['title'],
  goals: ['title', 'type', 'target', 'metric'],
  daily_logs: ['date'],
  snippets: ['title', 'code'],
  projects: ['name'],
  habits: ['name'],
  tags: ['name'],
  flashcard_decks: ['name'],
  flashcards: ['deck_id', 'front', 'back'],
  subtasks: ['task_id', 'title'],
  notebooks: ['name'],
  templates: ['name', 'entity_type', 'content'],
}

function validateInput(table, data) {
  const allowed = ALLOWED_COLUMNS[table]
  if (!allowed) throw new Error(`Invalid table: ${table}`)
  const cleaned = {}
  for (const key of Object.keys(data)) {
    if (allowed.includes(key)) {
      if (typeof data[key] === 'string') cleaned[key] = data[key].slice(0, 10000)
      else cleaned[key] = data[key]
    }
  }
  const required = REQUIRED_FIELDS[table] || []
  for (const field of required) {
    if (!cleaned[field] || (typeof cleaned[field] === 'string' && cleaned[field].trim() === '')) {
      throw new Error(`Campo requerido: ${field}`)
    }
  }
  return cleaned
}

function safeHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      console.error(`[IPC Error] ${args[0] || 'unknown'}:`, err)
      throw err
    }
  }
}

function buildUpdate(table, id, data) {
  const cleaned = validateInput(table, data)
  const sets = Object.keys(cleaned).map(k => `${k} = @${k}`).join(', ')
  cleaned.id = id
  return { cleaned, sets }
}

// Define batch handler types with their implementations
const BATCH_HANDLERS = [
  {
    name: 'db:getAllTaskTags',
    sql: (ids) => `SELECT tt.task_id, t.* FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id IN (${ids})`,
  },
  {
    name: 'db:getAllNoteTags',
    sql: (ids) => `SELECT nt.note_id, t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id IN (${ids})`,
  },
  {
    name: 'db:getAllSnippetTags',
    sql: (ids) => `SELECT st.snippet_id, t.* FROM tags t JOIN snippet_tags st ON t.id = st.tag_id WHERE st.snippet_id IN (${ids})`,
  },
  {
    name: 'db:getAllSubtasks',
    sql: (ids) => `SELECT * FROM subtasks WHERE task_id IN (${ids}) ORDER BY position ASC`,
  },
  {
    name: 'db:getAllTaskRecurrences',
    sql: (ids) => `SELECT * FROM task_recurrence WHERE task_id IN (${ids})`,
  },
  {
    name: 'db:getAllHabitLogs',
    sql: (ids) => `SELECT * FROM habit_logs WHERE habit_id IN (${ids}) ORDER BY date DESC`,
  },
]

function registerIpcHandlers() {
  const origHandle = ipcMain.handle.bind(ipcMain)
  ipcMain.handle = (channel, fn) => origHandle(channel, safeHandler(fn))

  // Settings
  ipcMain.handle('db:getSetting', (_, key) => {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : null
  })
  ipcMain.handle('db:setSetting', (_, key, value) => {
    getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    return true
  })

  // Tasks
  ipcMain.handle('db:getTasks', () => getDb().prepare('SELECT * FROM tasks ORDER BY created_at DESC').all())
  ipcMain.handle('db:createTask', (_, task) => {
    const cleaned = validateInput('tasks', task)
    cleaned.project_id = cleaned.project_id ?? null
    const stmt = getDb().prepare('INSERT INTO tasks (title, description, priority, due_date, reminder, project_id) VALUES (@title, @description, @priority, @due_date, @reminder, @project_id)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateTask', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('tasks', id, data)
    getDb().prepare(`UPDATE tasks SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteTask', (_, id) => { getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id); return true })
  ipcMain.handle('db:toggleTask', (_, id) => {
    getDb().prepare("UPDATE tasks SET completed = CASE WHEN completed THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?").run(id)
    return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  })

  // Kanban
  ipcMain.handle('db:getKanbanCards', () => getDb().prepare('SELECT * FROM kanban_cards ORDER BY position ASC').all())
  ipcMain.handle('db:createKanbanCard', (_, card) => {
    const cleaned = validateInput('kanban_cards', card)
    const maxPos = getDb().prepare("SELECT COALESCE(MAX(position), -1) + 1 as pos FROM kanban_cards WHERE column_type = ?").get(cleaned.column_type)
    cleaned.position = maxPos.pos
    cleaned.project_id = cleaned.project_id ?? null
    const stmt = getDb().prepare('INSERT INTO kanban_cards (title, description, column_type, position, priority, tags, due_date, project_id) VALUES (@title, @description, @column_type, @position, @priority, @tags, @due_date, @project_id)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM kanban_cards WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateKanbanCard', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('kanban_cards', id, data)
    getDb().prepare(`UPDATE kanban_cards SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM kanban_cards WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteKanbanCard', (_, id) => { getDb().prepare('DELETE FROM kanban_cards WHERE id = ?').run(id); return true })
  ipcMain.handle('db:moveKanbanCard', (_, id, column, position) => {
    getDb().prepare("UPDATE kanban_cards SET column_type = ?, position = ?, updated_at = datetime('now') WHERE id = ?").run(column, position, id)
    return getDb().prepare('SELECT * FROM kanban_cards WHERE id = ?').get(id)
  })

  // Pomodoro
  ipcMain.handle('db:getPomodoroSessions', (_, date) => {
    if (date) return getDb().prepare("SELECT * FROM pomodoro_sessions WHERE started_at >= ? ORDER BY started_at DESC").all(date + 'T00:00:00')
    return getDb().prepare('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC').all()
  })
  ipcMain.handle('db:createPomodoroSession', (_, session) => {
    session.project_id = session.project_id ?? null
    const stmt = getDb().prepare('INSERT INTO pomodoro_sessions (task_id, project_id, duration, started_at, ended_at) VALUES (@task_id, @project_id, @duration, @started_at, @ended_at)')
    const result = stmt.run(session)
    return getDb().prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(result.lastInsertRowid)
  })

  // Study Topics
  ipcMain.handle('db:getStudyTopics', () => getDb().prepare('SELECT * FROM study_topics ORDER BY order_position ASC').all())
  ipcMain.handle('db:createStudyTopic', (_, topic) => {
    const cleaned = validateInput('study_topics', topic)
    const stmt = getDb().prepare('INSERT INTO study_topics (parent_id, name, description, order_position) VALUES (@parent_id, @name, @description, @order_position)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM study_topics WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateStudyTopic', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('study_topics', id, data)
    getDb().prepare(`UPDATE study_topics SET ${sets} WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM study_topics WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteStudyTopic', (_, id) => { getDb().prepare('DELETE FROM study_topics WHERE id = ?').run(id); return true })
  ipcMain.handle('db:toggleStudyProgress', (_, topicId, date) => {
    const existing = getDb().prepare('SELECT * FROM study_progress WHERE topic_id = ? AND date = ?').get(topicId, date)
    if (existing) { getDb().prepare('DELETE FROM study_progress WHERE id = ?').run(existing.id); return false }
    else { getDb().prepare('INSERT INTO study_progress (topic_id, date) VALUES (?, ?)').run(topicId, date); return true }
  })

  // Notes
  ipcMain.handle('db:getNotes', () => getDb().prepare('SELECT * FROM notes ORDER BY updated_at DESC').all())
  ipcMain.handle('db:createNote', (_, note) => {
    const cleaned = validateInput('notes', note)
    cleaned.project_id = cleaned.project_id ?? null
    const stmt = getDb().prepare('INSERT INTO notes (title, content, project_id, notebook_id) VALUES (@title, @content, @project_id, @notebook_id)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateNote', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('notes', id, data)
    getDb().prepare(`UPDATE notes SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteNote', (_, id) => { getDb().prepare('DELETE FROM notes WHERE id = ?').run(id); return true })

  // Goals
  ipcMain.handle('db:getGoals', () => getDb().prepare('SELECT * FROM goals ORDER BY created_at DESC').all())
  ipcMain.handle('db:createGoal', (_, goal) => {
    const cleaned = validateInput('goals', goal)
    const stmt = getDb().prepare('INSERT INTO goals (title, type, target, metric) VALUES (@title, @type, @target, @metric)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateGoal', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('goals', id, data)
    getDb().prepare(`UPDATE goals SET ${sets} WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM goals WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteGoal', (_, id) => { getDb().prepare('DELETE FROM goals WHERE id = ?').run(id); return true })
  ipcMain.handle('db:addGoalProgress', (_, goalId, date, value) => {
    const existing = getDb().prepare('SELECT * FROM goal_progress WHERE goal_id = ? AND date = ?').get(goalId, date)
    if (existing) getDb().prepare('UPDATE goal_progress SET value = ? WHERE id = ?').run(value, existing.id)
    else getDb().prepare('INSERT INTO goal_progress (goal_id, date, value) VALUES (?, ?, ?)').run(goalId, date, value)
    return true
  })

  // Streaks
  ipcMain.handle('db:getStreak', (_, name) => getDb().prepare('SELECT * FROM streaks WHERE name = ?').get(name))
  ipcMain.handle('db:updateStreak', (_, name) => {
    const today = new Date().toISOString().split('T')[0]
    const streak = getDb().prepare('SELECT * FROM streaks WHERE name = ?').get(name)
    if (!streak) {
      getDb().prepare('INSERT INTO streaks (name, current, max, updated_at) VALUES (?, 1, 1, ?)').run(name, today)
      return { current: 1, max: 1 }
    }
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (streak.updated_at === today) return streak
    let current = streak.current
    current = streak.updated_at === yesterday ? current + 1 : 1
    const max = Math.max(current, streak.max)
    getDb().prepare('UPDATE streaks SET current = ?, max = ?, updated_at = ? WHERE name = ?').run(current, max, today, name)
    return { current, max }
  })

  // Statistics
  ipcMain.handle('db:getStats', (_, period) => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 0
    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]
    const cutoff = days > 0 ? cutoffDate : todayStr
    const pomodoroCount = getDb().prepare("SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total FROM pomodoro_sessions WHERE started_at >= ?").get(cutoff + (days > 0 ? '' : 'T00:00:00'))
    const tasksCompleted = getDb().prepare("SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND updated_at >= ?").get(cutoff + (days > 0 ? '' : 'T00:00:00'))
    const tasksTotal = getDb().prepare('SELECT COUNT(*) as count FROM tasks').get()
    const dailyPomodoros = getDb().prepare("SELECT date(started_at) as date, COUNT(*) as count FROM pomodoro_sessions WHERE started_at >= ? GROUP BY date(started_at) ORDER BY date").all(cutoff + (days > 0 ? '' : 'T00:00:00'))
    return { pomodoroCount, tasksCompleted, tasksTotal, dailyPomodoros }
  })

  // Notifications
  ipcMain.handle('notification:show', (_, title, body) => {
    if (Notification.isSupported()) new Notification({ title, body }).show()
    else notifier.notify({ title, message: body, sound: true, wait: false })
    return true
  })

  // Projects
  ipcMain.handle('db:getProjects', () => getDb().prepare('SELECT * FROM projects ORDER BY created_at DESC').all())
  ipcMain.handle('db:createProject', (_, project) => {
    const cleaned = validateInput('projects', project)
    const stmt = getDb().prepare('INSERT INTO projects (name, description, status, tech_stack, repo_url, color) VALUES (@name, @description, @status, @tech_stack, @repo_url, @color)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateProject', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('projects', id, data)
    getDb().prepare(`UPDATE projects SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteProject', (_, id) => { getDb().prepare('DELETE FROM projects WHERE id = ?').run(id); return true })

  // Daily Logs
  ipcMain.handle('db:getDailyLogs', () => getDb().prepare('SELECT * FROM daily_logs ORDER BY date DESC').all())
  ipcMain.handle('db:getDailyLog', (_, date) => getDb().prepare('SELECT * FROM daily_logs WHERE date = ?').get(date))
  ipcMain.handle('db:createDailyLog', (_, log) => {
    const cleaned = validateInput('daily_logs', log)
    const stmt = getDb().prepare('INSERT OR REPLACE INTO daily_logs (date, content, focus, blockers, tomorrow_plan) VALUES (@date, @content, @focus, @blockers, @tomorrow_plan)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM daily_logs WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateDailyLog', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('daily_logs', id, data)
    getDb().prepare(`UPDATE daily_logs SET ${sets} WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM daily_logs WHERE id = ?').get(id)
  })

  // Snippets
  ipcMain.handle('db:getSnippets', () => getDb().prepare('SELECT * FROM snippets ORDER BY created_at DESC').all())
  ipcMain.handle('db:createSnippet', (_, snippet) => {
    const cleaned = validateInput('snippets', snippet)
    cleaned.project_id = cleaned.project_id ?? null
    const stmt = getDb().prepare('INSERT INTO snippets (title, code, language, description, tags, project_id) VALUES (@title, @code, @language, @description, @tags, @project_id)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM snippets WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateSnippet', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('snippets', id, data)
    getDb().prepare(`UPDATE snippets SET ${sets} WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM snippets WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteSnippet', (_, id) => { getDb().prepare('DELETE FROM snippets WHERE id = ?').run(id); return true })

  // Habits
  ipcMain.handle('db:getHabits', () => getDb().prepare('SELECT * FROM habits ORDER BY created_at DESC').all())
  ipcMain.handle('db:createHabit', (_, habit) => {
    const cleaned = validateInput('habits', habit)
    const stmt = getDb().prepare('INSERT INTO habits (name, icon, color, frequency) VALUES (@name, @icon, @color, @frequency)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:deleteHabit', (_, id) => { getDb().prepare('DELETE FROM habits WHERE id = ?').run(id); return true })
  ipcMain.handle('db:getHabitLogs', (_, habitId) => getDb().prepare('SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC').all(habitId))
  ipcMain.handle('db:toggleHabitLog', (_, habitId, date) => {
    const existing = getDb().prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habitId, date)
    if (existing) { getDb().prepare('DELETE FROM habit_logs WHERE id = ?').run(existing.id); return false }
    else { getDb().prepare('INSERT INTO habit_logs (habit_id, date, completed) VALUES (?, ?, 1)').run(habitId, date); return true }
  })

  // Tags
  ipcMain.handle('db:getTags', () => getDb().prepare('SELECT * FROM tags ORDER BY name ASC').all())
  ipcMain.handle('db:createTag', (_, tag) => {
    const cleaned = validateInput('tags', tag)
    const stmt = getDb().prepare('INSERT INTO tags (name, color) VALUES (@name, @color)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:deleteTag', (_, id) => { getDb().prepare('DELETE FROM tags WHERE id = ?').run(id); return true })
  ipcMain.handle('db:getTaskTags', (_, taskId) => getDb().prepare('SELECT t.* FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?').all(taskId))
  ipcMain.handle('db:setTaskTags', (_, taskId, tagIds) => {
    getDb().transaction(() => {
      getDb().prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId)
      const stmt = getDb().prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)')
      for (const tagId of tagIds) stmt.run(taskId, tagId)
    })()
    return true
  })
  ipcMain.handle('db:getNoteTags', (_, noteId) => getDb().prepare('SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?').all(noteId))
  ipcMain.handle('db:setNoteTags', (_, noteId, tagIds) => {
    getDb().transaction(() => {
      getDb().prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId)
      const stmt = getDb().prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)')
      for (const tagId of tagIds) stmt.run(noteId, tagId)
    })()
    return true
  })
  ipcMain.handle('db:getSnippetTags', (_, snippetId) => getDb().prepare('SELECT t.* FROM tags t JOIN snippet_tags st ON t.id = st.tag_id WHERE st.snippet_id = ?').all(snippetId))
  ipcMain.handle('db:setSnippetTags', (_, snippetId, tagIds) => {
    getDb().transaction(() => {
      getDb().prepare('DELETE FROM snippet_tags WHERE snippet_id = ?').run(snippetId)
      const stmt = getDb().prepare('INSERT INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)')
      for (const tagId of tagIds) stmt.run(snippetId, tagId)
    })()
    return true
  })
  ipcMain.handle('db:getTasksByTag', (_, tagId) => getDb().prepare('SELECT ta.* FROM tasks ta JOIN task_tags tt ON ta.id = tt.task_id WHERE tt.tag_id = ? ORDER BY ta.created_at DESC').all(tagId))
  ipcMain.handle('db:getNotesByTag', (_, tagId) => getDb().prepare('SELECT n.* FROM notes n JOIN note_tags nt ON n.id = nt.note_id WHERE nt.tag_id = ? ORDER BY n.updated_at DESC').all(tagId))
  ipcMain.handle('db:getSnippetsByTag', (_, tagId) => getDb().prepare('SELECT s.* FROM snippets s JOIN snippet_tags st ON s.id = st.snippet_id WHERE st.tag_id = ? ORDER BY s.created_at DESC').all(tagId))

  // Flashcards
  ipcMain.handle('db:getFlashcardDecks', () => getDb().prepare('SELECT * FROM flashcard_decks ORDER BY created_at DESC').all())
  ipcMain.handle('db:createFlashcardDeck', (_, deck) => {
    const cleaned = validateInput('flashcard_decks', deck)
    const stmt = getDb().prepare('INSERT INTO flashcard_decks (name, description) VALUES (@name, @description)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:deleteFlashcardDeck', (_, id) => { getDb().prepare('DELETE FROM flashcard_decks WHERE id = ?').run(id); return true })
  ipcMain.handle('db:getFlashcards', (_, deckId) => getDb().prepare('SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at ASC').all(deckId))
  ipcMain.handle('db:createFlashcard', (_, card) => {
    const cleaned = validateInput('flashcards', card)
    const stmt = getDb().prepare('INSERT INTO flashcards (deck_id, front, back) VALUES (@deck_id, @front, @back)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM flashcards WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateFlashcard', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('flashcards', id, data)
    getDb().prepare(`UPDATE flashcards SET ${sets} WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM flashcards WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteFlashcard', (_, id) => { getDb().prepare('DELETE FROM flashcards WHERE id = ?').run(id); return true })
  ipcMain.handle('db:reviewFlashcard', (_, cardId, rating) => {
    const card = getDb().prepare('SELECT * FROM flashcards WHERE id = ?').get(cardId)
    if (!card) throw new Error('Card not found')
    let { ease, interval, repetitions } = card
    if (rating >= 3) {
      if (repetitions === 0) interval = 1
      else if (repetitions === 1) interval = 6
      else interval = Math.round(interval * ease)
      repetitions += 1
    } else { repetitions = 0; interval = 1 }
    ease = Math.max(1.3, ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)))
    const nextReview = new Date(Date.now() + interval * 86400000).toISOString().split('T')[0]
    getDb().prepare('UPDATE flashcards SET ease = ?, interval = ?, repetitions = ?, next_review = ? WHERE id = ?').run(ease, interval, repetitions, nextReview, cardId)
    getDb().prepare('INSERT INTO flashcard_reviews (card_id, rating) VALUES (?, ?)').run(cardId, rating)
    return getDb().prepare('SELECT * FROM flashcards WHERE id = ?').get(cardId)
  })
  ipcMain.handle('db:getDueFlashcards', (_, deckId) => {
    const today = new Date().toISOString().split('T')[0]
    return getDb().prepare("SELECT * FROM flashcards WHERE deck_id = ? AND next_review <= ? ORDER BY next_review ASC").all(deckId, today)
  })
  ipcMain.handle('db:getFlashcardStats', (_, deckId) => {
    const total = getDb().prepare('SELECT COUNT(*) as count FROM flashcards WHERE deck_id = ?').get(deckId)
    const today = new Date().toISOString().split('T')[0]
    const due = getDb().prepare("SELECT COUNT(*) as count FROM flashcards WHERE deck_id = ? AND next_review <= ?").get(deckId, today)
    const reviewed = getDb().prepare("SELECT COUNT(DISTINCT card_id) as count FROM flashcard_reviews WHERE reviewed_at >= ?").get(today)
    return { total: total.count, due: due.count, reviewed: reviewed.count }
  })

  // Subtasks
  ipcMain.handle('db:getSubtasks', (_, taskId) => getDb().prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(taskId))
  ipcMain.handle('db:createSubtask', (_, subtask) => {
    const cleaned = validateInput('subtasks', subtask)
    const stmt = getDb().prepare('INSERT INTO subtasks (task_id, title, position) VALUES (@task_id, @title, @position)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateSubtask', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('subtasks', id, data)
    getDb().prepare(`UPDATE subtasks SET ${sets} WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM subtasks WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteSubtask', (_, id) => { getDb().prepare('DELETE FROM subtasks WHERE id = ?').run(id); return true })
  ipcMain.handle('db:toggleSubtask', (_, id) => {
    getDb().prepare("UPDATE subtasks SET completed = CASE WHEN completed THEN 0 ELSE 1 END WHERE id = ?").run(id)
    return getDb().prepare('SELECT * FROM subtasks WHERE id = ?').get(id)
  })

  // Recurrence
  ipcMain.handle('db:getTaskRecurrence', (_, taskId) => getDb().prepare('SELECT * FROM task_recurrence WHERE task_id = ?').get(taskId) || undefined)
  ipcMain.handle('db:setTaskRecurrence', (_, taskId, data) => {
    data.task_id = taskId
    getDb().prepare('INSERT OR REPLACE INTO task_recurrence (task_id, frequency, interval_days, day_of_week, day_of_month, end_date) VALUES (@task_id, @frequency, @interval_days, @day_of_week, @day_of_month, @end_date)').run(data)
    return true
  })
  ipcMain.handle('db:deleteTaskRecurrence', (_, taskId) => { getDb().prepare('DELETE FROM task_recurrence WHERE task_id = ?').run(taskId); return true })
  ipcMain.handle('db:checkRecurringTasks', () => {
    const today = new Date().toISOString().split('T')[0]
    const rows = getDb().prepare('SELECT r.*, t.title as orig_title, t.description as orig_desc, t.priority as orig_priority FROM task_recurrence r JOIN tasks t ON t.id = r.task_id').all()
    const created = []
    for (const row of rows) {
      if (row.end_date && row.end_date < today) continue
      let shouldCreate = false
      if (row.frequency === 'daily') shouldCreate = true
      else if (row.frequency === 'weekdays') shouldCreate = new Date().getDay() % 6 !== 0
      else if (row.frequency === 'weekly') shouldCreate = new Date().getDay() === (row.day_of_week || 0)
      else if (row.frequency === 'monthly') shouldCreate = new Date().getDate() === (row.day_of_month || 1)
      if (shouldCreate) {
        const result = getDb().prepare("INSERT INTO tasks (title, description, priority, completed, created_at, updated_at) VALUES (@title, @description, @priority, 0, datetime('now'), datetime('now'))").run({ title: row.orig_title, description: row.orig_desc, priority: row.orig_priority })
        const task = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
        created.push(task)
      }
    }
    return created
  })

  // Activity log
  ipcMain.handle('db:getActivityLog', (_, limit) => getDb().prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?').all(limit || 100))
  ipcMain.handle('db:logActivity', (_, entry) => {
    getDb().prepare('INSERT INTO activity_log (entity_type, entity_id, action, description) VALUES (@entity_type, @entity_id, @action, @description)').run(entry)
    return true
  })

  // Notebooks
  ipcMain.handle('db:getNotebooks', () => getDb().prepare('SELECT * FROM notebooks ORDER BY name ASC').all())
  ipcMain.handle('db:createNotebook', (_, notebook) => {
    const cleaned = validateInput('notebooks', notebook)
    const stmt = getDb().prepare('INSERT INTO notebooks (parent_id, name, description, color) VALUES (@parent_id, @name, @description, @color)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM notebooks WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateNotebook', (_, id, data) => {
    const { cleaned, sets } = buildUpdate('notebooks', id, data)
    getDb().prepare(`UPDATE notebooks SET ${sets} WHERE id = @id`).run(cleaned)
    return getDb().prepare('SELECT * FROM notebooks WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteNotebook', (_, id) => { getDb().prepare('DELETE FROM notebooks WHERE id = ?').run(id); return true })

  // Templates
  ipcMain.handle('db:getTemplates', (_, entityType) => {
    if (entityType) return getDb().prepare('SELECT * FROM templates WHERE entity_type = ? ORDER BY name ASC').all(entityType)
    return getDb().prepare('SELECT * FROM templates ORDER BY name ASC').all()
  })
  ipcMain.handle('db:createTemplate', (_, template) => {
    const cleaned = validateInput('templates', template)
    const stmt = getDb().prepare('INSERT INTO templates (name, entity_type, content) VALUES (@name, @entity_type, @content)')
    const result = stmt.run(cleaned)
    return getDb().prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:deleteTemplate', (_, id) => { getDb().prepare('DELETE FROM templates WHERE id = ?').run(id); return true })

  // Backup
  ipcMain.handle('dialog:saveBackup', async (_, data) => {
    const defaultName = `auto-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
      return result.filePath
    }
    return null
  })

  // Auto-updater
  ipcMain.handle('update:check', () => { autoUpdater.checkForUpdates().catch(() => {}); return true })
  ipcMain.handle('update:download', () => { autoUpdater.downloadUpdate().catch(() => {}); return true })
  ipcMain.handle('update:install', () => { autoUpdater.quitAndInstall(); return true })

  // Batch handlers (N+1 prevention)
  const TODAY_STR = () => new Date().toISOString().split('T')[0]
  for (const bh of BATCH_HANDLERS) {
    ipcMain.handle(bh.name, (_, ids, extra) => {
      if (!ids || ids.length === 0) return []
      const placeholders = ids.map(() => '?').join(',')
      const sql = bh.sql(placeholders)
      if (bh.name === 'db:getAllHabitLogs' && extra) {
        return getDb().prepare(sql + ' AND date = ?').all(...ids, extra)
      }
      return getDb().prepare(sql).all(...ids)
    })
  }

  // Export/Import
  const EXPORT_TABLES = ['settings', 'projects', 'tasks', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags', 'task_tags', 'note_tags', 'snippet_tags', 'flashcard_decks', 'flashcards', 'flashcard_reviews', 'subtasks', 'task_recurrence', 'activity_log', 'notebooks', 'templates']

  ipcMain.handle('db:exportData', () => {
    const data = {}
    for (const table of EXPORT_TABLES) {
      try { data[table] = getDb().prepare(`SELECT * FROM ${table}`).all() } catch { data[table] = [] }
    }
    return data
  })

  ipcMain.handle('db:importData', (_, data) => {
    getDb().transaction(() => {
      for (const table of EXPORT_TABLES) {
        try {
          getDb().prepare(`DELETE FROM ${table}`).run()
          if (data[table] && data[table].length > 0) {
            const columns = Object.keys(data[table][0]).join(', ')
            const placeholders = Object.keys(data[table][0]).map(k => `@${k}`).join(', ')
            const stmt = getDb().prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
            for (const row of data[table]) stmt.run(row)
          }
        } catch (e) { console.error(`Error importing ${table}:`, e) }
      }
    })()
    return true
  })
}
