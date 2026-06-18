const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('path')
const notifier = require('node-notifier')
const { initDatabase, getDb, closeDatabase } = require('./database')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
  })

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  initDatabase()
  createWindow()
  registerIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})

function registerIpcHandlers() {
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
  ipcMain.handle('db:getTasks', () => {
    return getDb().prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()
  })
  ipcMain.handle('db:createTask', (_, task) => {
    const stmt = getDb().prepare('INSERT INTO tasks (title, description, priority, due_date, reminder, project_id) VALUES (@title, @description, @priority, @due_date, @reminder, @project_id)')
    const result = stmt.run(task)
    return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateTask', (_, id, data) => {
    const sets = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    data.id = id
    getDb().prepare(`UPDATE tasks SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(data)
    return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteTask', (_, id) => {
    getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:toggleTask', (_, id) => {
    getDb().prepare('UPDATE tasks SET completed = CASE WHEN completed THEN 0 ELSE 1 END, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  })

  // Kanban
  ipcMain.handle('db:getKanbanCards', () => {
    return getDb().prepare('SELECT * FROM kanban_cards ORDER BY position ASC').all()
  })
  ipcMain.handle('db:createKanbanCard', (_, card) => {
    const maxPos = getDb().prepare('SELECT COALESCE(MAX(position), -1) + 1 as pos FROM kanban_cards WHERE column_type = ?').get(card.column_type)
    card.position = maxPos.pos
    const stmt = getDb().prepare('INSERT INTO kanban_cards (title, description, column_type, position, priority, tags, due_date, project_id) VALUES (@title, @description, @column_type, @position, @priority, @tags, @due_date, @project_id)')
    const result = stmt.run(card)
    return getDb().prepare('SELECT * FROM kanban_cards WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateKanbanCard', (_, id, data) => {
    const sets = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    data.id = id
    getDb().prepare(`UPDATE kanban_cards SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(data)
    return getDb().prepare('SELECT * FROM kanban_cards WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteKanbanCard', (_, id) => {
    getDb().prepare('DELETE FROM kanban_cards WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:moveKanbanCard', (_, id, column, position) => {
    getDb().prepare('UPDATE kanban_cards SET column_type = ?, position = ?, updated_at = datetime(\'now\') WHERE id = ?').run(column, position, id)
    return getDb().prepare('SELECT * FROM kanban_cards WHERE id = ?').get(id)
  })

  // Pomodoro
  ipcMain.handle('db:getPomodoroSessions', (_, date) => {
    if (date) {
      return getDb().prepare("SELECT * FROM pomodoro_sessions WHERE date(started_at) = ? ORDER BY started_at DESC").all(date)
    }
    return getDb().prepare('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC').all()
  })
  ipcMain.handle('db:createPomodoroSession', (_, session) => {
    const stmt = getDb().prepare('INSERT INTO pomodoro_sessions (task_id, project_id, duration, started_at, ended_at) VALUES (@task_id, @project_id, @duration, @started_at, @ended_at)')
    const result = stmt.run(session)
    return getDb().prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(result.lastInsertRowid)
  })

  // Study Topics
  ipcMain.handle('db:getStudyTopics', () => {
    return getDb().prepare('SELECT * FROM study_topics ORDER BY order_position ASC').all()
  })
  ipcMain.handle('db:createStudyTopic', (_, topic) => {
    const stmt = getDb().prepare('INSERT INTO study_topics (parent_id, name, description, order_position) VALUES (@parent_id, @name, @description, @order_position)')
    const result = stmt.run(topic)
    return getDb().prepare('SELECT * FROM study_topics WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateStudyTopic', (_, id, data) => {
    const sets = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    data.id = id
    getDb().prepare(`UPDATE study_topics SET ${sets} WHERE id = @id`).run(data)
    return getDb().prepare('SELECT * FROM study_topics WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteStudyTopic', (_, id) => {
    getDb().prepare('DELETE FROM study_topics WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:toggleStudyProgress', (_, topicId, date) => {
    const existing = getDb().prepare('SELECT * FROM study_progress WHERE topic_id = ? AND date = ?').get(topicId, date)
    if (existing) {
      getDb().prepare('DELETE FROM study_progress WHERE id = ?').run(existing.id)
      return false
    } else {
      getDb().prepare('INSERT INTO study_progress (topic_id, date) VALUES (?, ?)').run(topicId, date)
      return true
    }
  })

  // Notes
  ipcMain.handle('db:getNotes', () => {
    return getDb().prepare('SELECT * FROM notes ORDER BY updated_at DESC').all()
  })
  ipcMain.handle('db:createNote', (_, note) => {
    const stmt = getDb().prepare('INSERT INTO notes (title, content, project_id) VALUES (@title, @content, @project_id)')
    const result = stmt.run(note)
    return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateNote', (_, id, data) => {
    const sets = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    data.id = id
    getDb().prepare(`UPDATE notes SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(data)
    return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteNote', (_, id) => {
    getDb().prepare('DELETE FROM notes WHERE id = ?').run(id)
    return true
  })

  // Goals
  ipcMain.handle('db:getGoals', () => {
    return getDb().prepare('SELECT * FROM goals ORDER BY created_at DESC').all()
  })
  ipcMain.handle('db:createGoal', (_, goal) => {
    const stmt = getDb().prepare('INSERT INTO goals (title, type, target, metric) VALUES (@title, @type, @target, @metric)')
    const result = stmt.run(goal)
    return getDb().prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateGoal', (_, id, data) => {
    const sets = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    data.id = id
    getDb().prepare(`UPDATE goals SET ${sets} WHERE id = @id`).run(data)
    return getDb().prepare('SELECT * FROM goals WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteGoal', (_, id) => {
    getDb().prepare('DELETE FROM goals WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:addGoalProgress', (_, goalId, date, value) => {
    const existing = getDb().prepare('SELECT * FROM goal_progress WHERE goal_id = ? AND date = ?').get(goalId, date)
    if (existing) {
      getDb().prepare('UPDATE goal_progress SET value = ? WHERE id = ?').run(value, existing.id)
    } else {
      getDb().prepare('INSERT INTO goal_progress (goal_id, date, value) VALUES (?, ?, ?)').run(goalId, date, value)
    }
    return true
  })

  // Streaks
  ipcMain.handle('db:getStreak', (_, name) => {
    return getDb().prepare('SELECT * FROM streaks WHERE name = ?').get(name)
  })
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
    if (streak.updated_at === yesterday) {
      current += 1
    } else {
      current = 1
    }

    const max = Math.max(current, streak.max)
    getDb().prepare('UPDATE streaks SET current = ?, max = ?, updated_at = ? WHERE name = ?').run(current, max, today, name)
    return { current, max }
  })

  // Statistics
  ipcMain.handle('db:getStats', (_, period) => {
    const today = new Date().toISOString().split('T')[0]
    let dateFilter = "date('now')"

    if (period === 'week') dateFilter = "date('now', '-7 days')"
    else if (period === 'month') dateFilter = "date('now', '-30 days')"

    const pomodoroCount = getDb().prepare(
      `SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total FROM pomodoro_sessions WHERE date(started_at) >= ${dateFilter}`
    ).get()

    const tasksCompleted = getDb().prepare(
      `SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND updated_at >= ${dateFilter}`
    ).get()

    const tasksTotal = getDb().prepare('SELECT COUNT(*) as count FROM tasks').get()

    const dailyPomodoros = getDb().prepare(
      "SELECT date(started_at) as date, COUNT(*) as count FROM pomodoro_sessions WHERE date(started_at) >= ? GROUP BY date(started_at) ORDER BY date"
    ).all(period === 'week' ? new Date(Date.now() - 7*86400000).toISOString().split('T')[0] : new Date(Date.now() - 30*86400000).toISOString().split('T')[0])

    return { pomodoroCount, tasksCompleted, tasksTotal, dailyPomodoros }
  })

  // Notifications
  ipcMain.handle('notification:show', (_, title, body) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    } else {
      notifier.notify({ title, message: body, sound: true, wait: false })
    }
    return true
  })

  // Projects
  ipcMain.handle('db:getProjects', () => {
    return getDb().prepare('SELECT * FROM projects ORDER BY created_at DESC').all()
  })
  ipcMain.handle('db:createProject', (_, project) => {
    const stmt = getDb().prepare('INSERT INTO projects (name, description, status, tech_stack, repo_url, color) VALUES (@name, @description, @status, @tech_stack, @repo_url, @color)')
    const result = stmt.run(project)
    return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateProject', (_, id, data) => {
    const sets = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    data.id = id
    getDb().prepare(`UPDATE projects SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(data)
    return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteProject', (_, id) => {
    getDb().prepare('DELETE FROM projects WHERE id = ?').run(id)
    return true
  })

  // Daily Logs
  ipcMain.handle('db:getDailyLogs', () => {
    return getDb().prepare('SELECT * FROM daily_logs ORDER BY date DESC').all()
  })
  ipcMain.handle('db:getDailyLog', (_, date) => {
    return getDb().prepare('SELECT * FROM daily_logs WHERE date = ?').get(date)
  })
  ipcMain.handle('db:createDailyLog', (_, log) => {
    const stmt = getDb().prepare('INSERT OR REPLACE INTO daily_logs (date, content, focus, blockers, tomorrow_plan) VALUES (@date, @content, @focus, @blockers, @tomorrow_plan)')
    const result = stmt.run(log)
    return getDb().prepare('SELECT * FROM daily_logs WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateDailyLog', (_, id, data) => {
    const sets = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    data.id = id
    getDb().prepare(`UPDATE daily_logs SET ${sets} WHERE id = @id`).run(data)
    return getDb().prepare('SELECT * FROM daily_logs WHERE id = ?').get(id)
  })

  // Snippets
  ipcMain.handle('db:getSnippets', () => {
    return getDb().prepare('SELECT * FROM snippets ORDER BY created_at DESC').all()
  })
  ipcMain.handle('db:createSnippet', (_, snippet) => {
    const stmt = getDb().prepare('INSERT INTO snippets (title, code, language, description, tags, project_id) VALUES (@title, @code, @language, @description, @tags, @project_id)')
    const result = stmt.run(snippet)
    return getDb().prepare('SELECT * FROM snippets WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateSnippet', (_, id, data) => {
    const sets = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    data.id = id
    getDb().prepare(`UPDATE snippets SET ${sets} WHERE id = @id`).run(data)
    return getDb().prepare('SELECT * FROM snippets WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteSnippet', (_, id) => {
    getDb().prepare('DELETE FROM snippets WHERE id = ?').run(id)
    return true
  })

  // Habits
  ipcMain.handle('db:getHabits', () => {
    return getDb().prepare('SELECT * FROM habits ORDER BY created_at DESC').all()
  })
  ipcMain.handle('db:createHabit', (_, habit) => {
    const stmt = getDb().prepare('INSERT INTO habits (name, icon, color, frequency) VALUES (@name, @icon, @color, @frequency)')
    const result = stmt.run(habit)
    return getDb().prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:deleteHabit', (_, id) => {
    getDb().prepare('DELETE FROM habits WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:getHabitLogs', (_, habitId) => {
    return getDb().prepare('SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC').all(habitId)
  })
  ipcMain.handle('db:toggleHabitLog', (_, habitId, date) => {
    const existing = getDb().prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habitId, date)
    if (existing) {
      getDb().prepare('DELETE FROM habit_logs WHERE id = ?').run(existing.id)
      return false
    } else {
      getDb().prepare('INSERT INTO habit_logs (habit_id, date, completed) VALUES (?, ?, 1)').run(habitId, date)
      return true
    }
  })

  // Export/Import
  ipcMain.handle('db:exportData', () => {
    const tables = ['settings', 'projects', 'tasks', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags']
    const data = {}
    for (const table of tables) {
      data[table] = getDb().prepare(`SELECT * FROM ${table}`).all()
    }
    return data
  })
  ipcMain.handle('db:importData', (_, data) => {
    const tables = ['settings', 'projects', 'tasks', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags']
    const tx = getDb().transaction(() => {
      for (const table of tables) {
        getDb().prepare(`DELETE FROM ${table}`).run()
        if (data[table] && data[table].length > 0) {
          const columns = Object.keys(data[table][0]).join(', ')
          const placeholders = Object.keys(data[table][0]).map(k => `@${k}`).join(', ')
          const stmt = getDb().prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
          for (const row of data[table]) {
            stmt.run(row)
          }
        }
      }
    })
    tx()
    return true
  })
}
