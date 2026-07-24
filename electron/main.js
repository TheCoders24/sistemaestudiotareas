const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { initDatabase, deferDbInit, getDb, closeDatabase, getDbPath } = require('./database')

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256 --optimize-for-size')
app.commandLine.appendSwitch('no-proxy-server')
app.commandLine.appendSwitch('enable-features', 'V8CompileHints')

let mainWindow
let boundsSaveTimeout
const stmts = {}
function getStmt(sql) {
  if (!stmts[sql]) stmts[sql] = getDb().prepare(sql)
  return stmts[sql]
}

const ALLOWED_COLUMNS = {
  tasks: ['title', 'description', 'completed', 'priority', 'due_date', 'reminder', 'project_id', 'repeat', 'tags', 'position'],
  kanban_cards: ['title', 'description', 'column_type', 'position', 'priority', 'tags', 'due_date', 'project_id', 'deleted'],
  notes: ['title', 'content', 'project_id', 'deleted'],
  projects: ['name', 'description', 'status', 'tech_stack', 'repo_url', 'color', 'deleted'],
  study_topics: ['parent_id', 'name', 'description', 'resource_url', 'order_position', 'study_level', 'study_level_updated_at'],
  snippets: ['title', 'code', 'language', 'description', 'tags', 'project_id', 'deleted'],
  habits: ['name', 'icon', 'color', 'frequency', 'deleted'],
  daily_logs: ['content', 'focus', 'blockers', 'tomorrow_plan'],
  goals: ['title', 'type', 'target', 'metric', 'deleted'],
}

function safeUpdate(table, id, data) {
  const allowed = ALLOWED_COLUMNS[table]
  if (!allowed) throw new Error(`Unknown table: ${table}`)
  const keys = Object.keys(data).filter(k => allowed.includes(k) && k !== 'id')
  if (keys.length === 0) return
  const sets = keys.map(k => `${k} = @${k}`).join(', ')
  const filtered = { id }
  for (const k of keys) filtered[k] = data[k]
  getStmt(`UPDATE ${table} SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(filtered)
}

function createWindow() {
  const savedBounds = loadWindowBounds()

  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1400,
    height: savedBounds?.height ?? 900,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    setTimeout(deferDbInit, 100)
    if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.on('resize', () => {
    clearTimeout(boundsSaveTimeout)
    boundsSaveTimeout = setTimeout(saveWindowBounds, 500)
  })
  mainWindow.on('move', () => {
    clearTimeout(boundsSaveTimeout)
    boundsSaveTimeout = setTimeout(saveWindowBounds, 500)
  })

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.webContents.on('unhandled-rejection', (event, promise, reason) => {
    console.error('[RENDERER UNHANDLED REJECTION]', reason)
  })
}

function loadWindowBounds() {
  try {
    const db = getDb()
    if (!db) return null
    const row = getStmt("SELECT value FROM settings WHERE key = 'window_bounds'").get()
    if (row) return JSON.parse(row.value)
  } catch {}
  return null
}

function saveWindowBounds() {
  try {
    if (!mainWindow) return
    const bounds = mainWindow.getBounds()
    getStmt("INSERT OR REPLACE INTO settings (key, value) VALUES ('window_bounds', ?)").run(JSON.stringify(bounds))
  } catch {}
}

app.whenReady().then(() => {
  initDatabase()
  createWindow()
  registerIpcHandlers()

  // Auto-updater
  try {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on('update-available', () => {
      if (mainWindow) mainWindow.webContents.send('updater:status', { status: 'available' })
    })
    autoUpdater.on('download-progress', (progress) => {
      if (mainWindow) mainWindow.webContents.send('updater:status', { status: 'downloading', percent: Math.round(progress.percent) })
    })
    autoUpdater.on('update-downloaded', () => {
      if (mainWindow) mainWindow.webContents.send('updater:status', { status: 'downloaded' })
    })
    autoUpdater.on('error', () => {})
    ipcMain.handle('updater:check', () => { autoUpdater.checkForUpdates().catch(() => {}) })
    ipcMain.handle('updater:install', () => { autoUpdater.quitAndInstall() })
    // Check on startup (delayed)
    setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}) }, 5000)
  } catch {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})

function validate(val, type) {
  if (type === 'string') return typeof val === 'string' ? val : ''
  if (type === 'number') return typeof val === 'number' ? val : 0
  if (type === 'int') return Number.isInteger(val) ? val : 0
  return val
}

function doAutoBackup() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const lastBackup = getStmt("SELECT value FROM settings WHERE key = 'last_auto_backup'").get()
    if (lastBackup && lastBackup.value === today) return
    const fs = require('fs')
    const backupDir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','study_progress','study_files','notes','goals','goal_progress','streaks','daily_logs','snippets','habits','habit_logs','tags','xp_log','achievements','user_achievements','challenges','user_challenges','weekly_reports','subtasks','entity_links']
    const data = {}
    for (const t of tables) { try { data[t] = getStmt(`SELECT * FROM ${t}`).all() } catch { data[t] = [] } }
    fs.writeFileSync(path.join(backupDir, `backup-${today}.json`), JSON.stringify(data, null, 2))
    const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-')).sort().reverse()
    if (backups.length > 30) { for (let i = 30; i < backups.length; i++) fs.unlinkSync(path.join(backupDir, backups[i])) }
    getStmt("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_auto_backup', ?)").run(today)
  } catch (e) { console.error('[AutoBackup]', e) }
}

// Run auto-backup check every hour
setInterval(doAutoBackup, 3600000)

// Reminder checker: runs every 30s, sends notification for tasks with reminders within the next 30s
setInterval(() => {
  try {
    const now = new Date().toISOString().slice(0, 19)
    const soon = new Date(Date.now() + 60000).toISOString().slice(0, 19)
    const tasks = getStmt("SELECT id, title, reminder FROM tasks WHERE deleted = 0 AND completed = 0 AND reminder IS NOT NULL AND reminder >= ? AND reminder < ?").all(now, soon)
    for (const t of tasks) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`window.__reminderNotification?.('${t.title.replace(/'/g, "\\'")}')`)
      }
      if (Notification.isSupported()) {
        new Notification({ title: '⏰ Recordatorio de tarea', body: t.title }).show()
      }
    }
  } catch (e) { /* silent */ }
}, 30000)

function registerIpcHandlers() {
  doAutoBackup()

  // Gamification: XP
  function addXp(amount, reason) {
    const oldTotal = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get().total
    getStmt('INSERT INTO xp_log (amount, reason) VALUES (?, ?)').run(amount, reason)
    const totalRow = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get()
    const total = totalRow.total
    const level = Math.floor(total / 100) + 1
    const oldLevel = Math.floor(oldTotal / 100) + 1
    const nextLevelXp = level * 100
    const currentXp = total - ((level - 1) * 100)
    // Update challenge progress for XP type
    updateChallengeProgress('xp', amount)
    return { total, level, currentXp, nextLevelXp, leveledUp: level > oldLevel }
  }

  ipcMain.handle('xp:get', () => {
    const totalRow = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get()
    const total = totalRow.total
    const level = Math.floor(total / 100) + 1
    return { total, level, currentXp: total - ((level - 1) * 100), nextLevelXp: level * 100 }
  })

  ipcMain.handle('xp:add', (_, amount, reason) => addXp(amount, reason))

  ipcMain.handle('xp:getHistory', (_, days = 7) => {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    return getStmt("SELECT date(created_at) as date, SUM(amount) as xp FROM xp_log WHERE created_at >= ? GROUP BY date(created_at) ORDER BY date").all(since)
  })

  ipcMain.handle('xp:getAchievements', () => {
    return getStmt(`SELECT a.*, ua.unlocked_at IS NOT NULL as unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
      ORDER BY a.id`).all()
  })

  ipcMain.handle('xp:checkAchievements', async () => {
    const unlocked = []
    const totalRow = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get()
    const totalXp = totalRow.total
    const oldLevel = Math.floor(totalXp / 100) + 1
    const pomodoroCount = getStmt('SELECT COUNT(*) as count FROM pomodoro_sessions').get().count
    const tasksDone = getStmt('SELECT COUNT(*) as count FROM tasks WHERE completed = 1').get().count
    const notesCount = getStmt('SELECT COUNT(*) as count FROM notes WHERE deleted = 0').get().count
    const snippetsCount = getStmt('SELECT COUNT(*) as count FROM snippets').get().count
    const projectsCount = getStmt('SELECT COUNT(*) as count FROM projects WHERE deleted = 0').get().count
    const streak = getStmt("SELECT current FROM streaks WHERE name = 'daily_study'").get()
    const streakDays = streak ? streak.current : 0
    const appStreak = getStmt("SELECT current FROM streaks WHERE name = 'app_usage'").get()
    const appStreakDays = appStreak ? appStreak.current : 0

    const checks = [
      { key: 'first_pomodoro', condition: pomodoroCount >= 1 },
      { key: 'ten_pomodoros', condition: pomodoroCount >= 10 },
      { key: 'fifty_pomodoros', condition: pomodoroCount >= 50 },
      { key: 'first_task', condition: tasksDone >= 1 },
      { key: 'ten_tasks', condition: tasksDone >= 10 },
      { key: 'hundred_tasks', condition: tasksDone >= 100 },
      { key: 'first_note', condition: notesCount >= 1 },
      { key: 'ten_notes', condition: notesCount >= 10 },
      { key: 'fifty_notes', condition: notesCount >= 50 },
      { key: 'ten_snippets', condition: snippetsCount >= 10 },
      { key: 'five_projects', condition: projectsCount >= 5 },
      { key: 'first_streak_3', condition: streakDays >= 3 },
      { key: 'first_streak_7', condition: streakDays >= 7 },
      { key: 'first_streak_30', condition: streakDays >= 30 },
      { key: 'seven_day_streak_app', condition: appStreakDays >= 7 },
    ]

    for (const check of checks) {
      const achievement = getStmt('SELECT * FROM achievements WHERE key = ?').get(check.key)
      if (!achievement) continue
      const alreadyUnlocked = getStmt('SELECT id FROM user_achievements WHERE achievement_id = ?').get(achievement.id)
      if (check.condition && !alreadyUnlocked) {
        getStmt('INSERT INTO user_achievements (achievement_id) VALUES (?)').run(achievement.id)
        if (achievement.xp_reward > 0) addXp(achievement.xp_reward, `logro: ${achievement.name}`)
        unlocked.push(achievement)
      }
    }
    const newTotal = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get().total
    const newLevel = Math.floor(newTotal / 100) + 1
    return { unlocked, leveledUp: newLevel > oldLevel, newLevel }
  })

  // Settings
  ipcMain.handle('db:getSetting', (_, key) => {
    const row = getStmt('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : null
  })
  ipcMain.handle('db:setSetting', (_, key, value) => {
    getStmt('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    return true
  })

  // Tasks
  ipcMain.handle('db:getTasks', () => {
    return getStmt('SELECT * FROM tasks WHERE deleted = 0 ORDER BY position ASC, created_at DESC').all()
  })
  ipcMain.handle('db:reorderTasks', (_, orderedIds) => {
    const tx = getDb().transaction(() => {
      orderedIds.forEach((id, index) => {
        getStmt('UPDATE tasks SET position = ?, updated_at = datetime(\'now\') WHERE id = ?').run(index, id)
      })
    })
    tx()
    return true
  })
  ipcMain.handle('db:createTask', (_, task) => {
    task.project_id = task.project_id ?? null
    task.repeat = task.repeat || null
    task.tags = task.tags || ''
    const stmt = getStmt('INSERT INTO tasks (title, description, priority, due_date, reminder, project_id, repeat, tags) VALUES (@title, @description, @priority, @due_date, @reminder, @project_id, @repeat, @tags)')
    const result = stmt.run(task)
    return getStmt('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateTask', (_, id, data) => {
    safeUpdate('tasks', id, data)
    return getStmt('SELECT * FROM tasks WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteTask', (_, id) => {
    getStmt('UPDATE tasks SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:getTasksWithSubtasks', () => {
    const tasks = getStmt('SELECT * FROM tasks WHERE deleted = 0 ORDER BY position ASC, created_at DESC').all()
    const subtasks = getStmt('SELECT * FROM subtasks ORDER BY position ASC').all()
    const map = {}
    for (const s of subtasks) {
      if (!map[s.task_id]) map[s.task_id] = []
      map[s.task_id].push(s)
    }
    return tasks.map(t => ({ ...t, subtasks: map[t.id] || [] }))
  })
  ipcMain.handle('db:toggleTask', (_, id) => {
    const task = getStmt('SELECT * FROM tasks WHERE id = ?').get(id)
    getStmt('UPDATE tasks SET completed = CASE WHEN completed THEN 0 ELSE 1 END, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    if (task && !task.completed) {
      addXp(5, 'tarea completada')
      updateChallengeProgress('task', 1)
    }
    return getStmt('SELECT * FROM tasks WHERE id = ?').get(id)
  })

  // Tags
  ipcMain.handle('db:addTagToTask', (_, taskId, tag) => {
    if (!taskId || !tag) return false
    const task = getStmt('SELECT tags FROM tasks WHERE id = ?').get(taskId)
    if (!task) return false
    const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    if (!tags.includes(tag)) {
      tags.push(tag)
      getStmt('UPDATE tasks SET tags = ?, updated_at = datetime(\'now\') WHERE id = ?').run(tags.join(','), taskId)
    }
    return true
  })
  ipcMain.handle('db:removeTagFromTask', (_, taskId, tag) => {
    if (!taskId || !tag) return false
    const task = getStmt('SELECT tags FROM tasks WHERE id = ?').get(taskId)
    if (!task) return false
    const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const filtered = tags.filter(t => t !== tag)
    getStmt('UPDATE tasks SET tags = ?, updated_at = datetime(\'now\') WHERE id = ?').run(filtered.join(','), taskId)
    return true
  })
  ipcMain.handle('db:getTasksByTag', (_, tag) => {
    if (!tag) return []
    return getStmt("SELECT * FROM tasks WHERE deleted = 0 AND ',' || tags || ',' LIKE '%,' || ? || ',%' ORDER BY position ASC, created_at DESC").all(tag)
  })

  // Kanban
  ipcMain.handle('db:getKanbanCards', () => {
    return getStmt('SELECT * FROM kanban_cards WHERE deleted = 0 ORDER BY position ASC').all()
  })
  ipcMain.handle('db:createKanbanCard', (_, card) => {
    const maxPos = getStmt('SELECT COALESCE(MAX(position), -1) + 1 as pos FROM kanban_cards WHERE column_type = ?').get(card.column_type)
    card.position = maxPos.pos
    card.project_id = card.project_id ?? null
    const stmt = getStmt('INSERT INTO kanban_cards (title, description, column_type, position, priority, tags, due_date, project_id) VALUES (@title, @description, @column_type, @position, @priority, @tags, @due_date, @project_id)')
    const result = stmt.run(card)
    return getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateKanbanCard', (_, id, data) => {
    safeUpdate('kanban_cards', id, data)
    return getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteKanbanCard', (_, id) => {
    getStmt('UPDATE kanban_cards SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:moveKanbanCard', (_, id, column, position) => {
    getStmt('UPDATE kanban_cards SET column_type = ?, position = ?, updated_at = datetime(\'now\') WHERE id = ?').run(column, position, id)
    return getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(id)
  })

  // Pomodoro
  ipcMain.handle('db:getPomodoroSessions', (_, date) => {
    if (date) {
      return getStmt("SELECT * FROM pomodoro_sessions WHERE date(started_at) = ? ORDER BY started_at DESC").all(date)
    }
    return getStmt('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC').all()
  })
  ipcMain.handle('db:createPomodoroSession', (_, session) => {
    session.project_id = session.project_id ?? null
    const stmt = getStmt('INSERT INTO pomodoro_sessions (task_id, project_id, duration, started_at, ended_at) VALUES (@task_id, @project_id, @duration, @started_at, @ended_at)')
    const result = stmt.run(session)
    addXp(10, 'pomodoro completado')
    updateChallengeProgress('pomodoro', 1)
    return getStmt('SELECT * FROM pomodoro_sessions WHERE id = ?').get(result.lastInsertRowid)
  })

  // Study Topics
  ipcMain.handle('db:getStudyTopics', () => {
    return getStmt('SELECT * FROM study_topics ORDER BY order_position ASC').all()
  })
  ipcMain.handle('db:createStudyTopic', (_, topic) => {
    const stmt = getStmt('INSERT INTO study_topics (parent_id, name, description, order_position) VALUES (@parent_id, @name, @description, @order_position)')
    const result = stmt.run(topic)
    return getStmt('SELECT * FROM study_topics WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateStudyTopic', (_, id, data) => {
    safeUpdate('study_topics', id, data)
    return getStmt('SELECT * FROM study_topics WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteStudyTopic', (_, id) => {
    getStmt('DELETE FROM study_topics WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:setStudyLevel', (_, topicId, level) => {
    getStmt("UPDATE study_topics SET study_level = ?, study_level_updated_at = datetime('now') WHERE id = ?").run(level, topicId)
    return true
  })
  ipcMain.handle('db:getStudyStats', () => {
    const rows = getStmt('SELECT study_level, COUNT(*) as count FROM study_topics GROUP BY study_level').all()
    const total = getStmt('SELECT COUNT(*) as total FROM study_topics').get()
    return { levels: rows, total: total.total }
  })
  ipcMain.handle('db:moveStudyTopic', (_, id, direction) => {
    const current = getStmt('SELECT id, order_position, parent_id FROM study_topics WHERE id = ?').get(id)
    if (!current) return false
    const pid = current.parent_id
    let other
    if (direction === 'up') {
      other = getStmt('SELECT id, order_position FROM study_topics WHERE (parent_id = ? OR (parent_id IS NULL AND ? IS NULL)) AND order_position < ? ORDER BY order_position DESC LIMIT 1').all(pid, pid, current.order_position)
    } else {
      other = getStmt('SELECT id, order_position FROM study_topics WHERE (parent_id = ? OR (parent_id IS NULL AND ? IS NULL)) AND order_position > ? ORDER BY order_position ASC LIMIT 1').all(pid, pid, current.order_position)
    }
    if (!other || other.length === 0) return false
    const swap = other[0]
    getStmt('UPDATE study_topics SET order_position = ? WHERE id = ?').run(swap.order_position, current.id)
    getStmt('UPDATE study_topics SET order_position = ? WHERE id = ?').run(current.order_position, swap.id)
    return true
  })

  // Study Files
  const FILES_DIR = path.join(app.getPath('userData'), 'study_files')
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true })

  ipcMain.handle('study:pickAndUploadFile', async (_, topicId) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar archivo',
      properties: ['openFile'],
      filters: [
        { name: 'Documentos', extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm'] },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const originalName = path.basename(filePath)
    const ext = path.extname(filePath)
    const storedName = crypto.randomUUID() + ext
    const stats = fs.statSync(filePath)
    const mimeType = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.txt': 'text/plain', '.md': 'text/markdown', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }[ext.toLowerCase()] || 'application/octet-stream'
    const destPath = path.join(FILES_DIR, storedName)
    fs.copyFileSync(filePath, destPath)
    getStmt('INSERT INTO study_files (topic_id, original_name, stored_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?)').run(topicId, originalName, storedName, stats.size, mimeType)
    return getStmt('SELECT * FROM study_files WHERE stored_name = ?').get(storedName)
  })

  ipcMain.handle('study:getTopicFiles', (_, topicId) => {
    return getStmt('SELECT * FROM study_files WHERE topic_id = ? ORDER BY created_at DESC').all(topicId)
  })

  ipcMain.handle('study:deleteFile', (_, fileId) => {
    const file = getStmt('SELECT * FROM study_files WHERE id = ?').get(fileId)
    if (!file) return false
    const filePath = path.join(FILES_DIR, file.stored_name)
    try { fs.unlinkSync(filePath) } catch {}
    getStmt('DELETE FROM study_files WHERE id = ?').run(fileId)
    return true
  })

  ipcMain.handle('study:openFile', (_, fileId) => {
    const file = getStmt('SELECT * FROM study_files WHERE id = ?').get(fileId)
    if (!file) return false
    const filePath = path.join(FILES_DIR, file.stored_name)
    if (fs.existsSync(filePath)) {
      shell.openPath(filePath)
      return true
    }
    return false
  })

  // Notes
  ipcMain.handle('db:getNotes', () => {
    return getStmt('SELECT * FROM notes WHERE deleted = 0 ORDER BY updated_at DESC').all()
  })
  ipcMain.handle('db:createNote', (_, note) => {
    note.project_id = note.project_id ?? null
    const stmt = getStmt('INSERT INTO notes (title, content, project_id) VALUES (@title, @content, @project_id)')
    const result = stmt.run(note)
    addXp(3, 'nota creada')
    updateChallengeProgress('note', 1)
    return getStmt('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateNote', (_, id, data) => {
    safeUpdate('notes', id, data)
    return getStmt('SELECT * FROM notes WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteNote', (_, id) => {
    getStmt('UPDATE notes SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })

  // Goals
  ipcMain.handle('db:getGoals', () => {
    return getStmt('SELECT * FROM goals WHERE deleted = 0 ORDER BY created_at DESC').all()
  })
  ipcMain.handle('db:createGoal', (_, goal) => {
    const stmt = getStmt('INSERT INTO goals (title, type, target, metric) VALUES (@title, @type, @target, @metric)')
    const result = stmt.run(goal)
    return getStmt('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateGoal', (_, id, data) => {
    safeUpdate('goals', id, data)
    return getStmt('SELECT * FROM goals WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteGoal', (_, id) => {
    getStmt('UPDATE goals SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:getGoalProgress', (_, goalId, today) => {
    const row = getStmt('SELECT COALESCE(SUM(value), 0) as total FROM goal_progress WHERE goal_id = ? AND date = ?').get(goalId, today)
    return row ? row.total : 0
  })

  ipcMain.handle('db:addGoalProgress', (_, goalId, date, value) => {
    const existing = getStmt('SELECT * FROM goal_progress WHERE goal_id = ? AND date = ?').get(goalId, date)
    if (existing) {
      getStmt('UPDATE goal_progress SET value = ? WHERE id = ?').run(value, existing.id)
    } else {
      getStmt('INSERT INTO goal_progress (goal_id, date, value) VALUES (?, ?, ?)').run(goalId, date, value)
    }
    return true
  })

  // Streaks
  ipcMain.handle('db:getStreak', (_, name) => {
    return getStmt('SELECT * FROM streaks WHERE name = ?').get(name)
  })
  ipcMain.handle('db:updateStreak', (_, name) => {
    const today = new Date().toISOString().split('T')[0]
    const streak = getStmt('SELECT * FROM streaks WHERE name = ?').get(name)

    if (!streak) {
      getStmt('INSERT INTO streaks (name, current, max, updated_at) VALUES (?, 1, 1, ?)').run(name, today)
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
    getStmt('UPDATE streaks SET current = ?, max = ?, updated_at = ? WHERE name = ?').run(current, max, today, name)
    addXp(20, 'racha actualizada')
    updateChallengeProgress('streak', 1)

    // Also update app_usage streak
    const usageStreak = getStmt("SELECT * FROM streaks WHERE name = 'app_usage'").get()
    if (!usageStreak) {
      getStmt("INSERT INTO streaks (name, current, max, updated_at) VALUES ('app_usage', 1, 1, ?)").run(today)
    } else if (usageStreak.updated_at !== today) {
      const usageYesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      let usageCurrent = 1
      if (usageStreak.updated_at === usageYesterday) usageCurrent = usageStreak.current + 1
      getStmt("UPDATE streaks SET current = ?, max = MAX(max, ?), updated_at = ? WHERE name = 'app_usage'").run(usageCurrent, usageCurrent, today)
    }

    return { current, max }
  })

  // Statistics
  ipcMain.handle('db:getStats', (_, period) => {
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

  // Notifications
  ipcMain.handle('notification:show', (_, title, body) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    } else {
      const notifier = require('node-notifier')
      notifier.notify({ title, message: body, sound: true, wait: false })
    }
    return true
  })

  // Projects
  ipcMain.handle('db:getProjects', () => {
    return getStmt('SELECT * FROM projects WHERE deleted = 0 ORDER BY created_at DESC').all()
  })
  ipcMain.handle('db:createProject', (_, project) => {
    const stmt = getStmt('INSERT INTO projects (name, description, status, tech_stack, repo_url, color) VALUES (@name, @description, @status, @tech_stack, @repo_url, @color)')
    const result = stmt.run(project)
    addXp(15, 'proyecto creado')
    return getStmt('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateProject', (_, id, data) => {
    safeUpdate('projects', id, data)
    return getStmt('SELECT * FROM projects WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteProject', (_, id) => {
    getStmt('UPDATE projects SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })

  // Daily Logs
  ipcMain.handle('db:getDailyLogs', () => {
    return getStmt('SELECT * FROM daily_logs ORDER BY date DESC').all()
  })
  ipcMain.handle('db:getDailyLog', (_, date) => {
    return getStmt('SELECT * FROM daily_logs WHERE date = ?').get(date)
  })
  ipcMain.handle('db:createDailyLog', (_, log) => {
    const stmt = getStmt('INSERT OR REPLACE INTO daily_logs (date, content, focus, blockers, tomorrow_plan) VALUES (@date, @content, @focus, @blockers, @tomorrow_plan)')
    const result = stmt.run(log)
    return getStmt('SELECT * FROM daily_logs WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateDailyLog', (_, id, data) => {
    safeUpdate('daily_logs', id, data)
    return getStmt('SELECT * FROM daily_logs WHERE id = ?').get(id)
  })

  // Snippets
  ipcMain.handle('db:getSnippets', () => {
    return getStmt('SELECT * FROM snippets ORDER BY created_at DESC').all()
  })
  ipcMain.handle('db:createSnippet', (_, snippet) => {
    snippet.project_id = snippet.project_id ?? null
    const stmt = getStmt('INSERT INTO snippets (title, code, language, description, tags, project_id) VALUES (@title, @code, @language, @description, @tags, @project_id)')
    const result = stmt.run(snippet)
    addXp(3, 'snippet creado')
    updateChallengeProgress('note', 1)
    return getStmt('SELECT * FROM snippets WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateSnippet', (_, id, data) => {
    safeUpdate('snippets', id, data)
    return getStmt('SELECT * FROM snippets WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteSnippet', (_, id) => {
    getStmt('DELETE FROM snippets WHERE id = ?').run(id)
    return true
  })

  // Habits
  ipcMain.handle('db:getHabits', () => {
    return getStmt('SELECT * FROM habits WHERE deleted = 0 ORDER BY created_at DESC').all()
  })
  ipcMain.handle('db:createHabit', (_, habit) => {
    const stmt = getStmt('INSERT INTO habits (name, icon, color, frequency) VALUES (@name, @icon, @color, @frequency)')
    const result = stmt.run(habit)
    return getStmt('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:updateHabit', (_, id, data) => {
    safeUpdate('habits', id, data)
    return getStmt('SELECT * FROM habits WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteHabit', (_, id) => {
    getStmt('UPDATE habits SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  ipcMain.handle('db:getHabitLogs', (_, habitId) => {
    return getStmt('SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC').all(habitId)
  })
  ipcMain.handle('db:getAllHabitLogs', () => {
    return getStmt('SELECT * FROM habit_logs ORDER BY date DESC').all()
  })
  ipcMain.handle('db:toggleHabitLog', (_, habitId, date) => {
    const existing = getStmt('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habitId, date)
    if (existing) {
      getStmt('DELETE FROM habit_logs WHERE id = ?').run(existing.id)
      return false
    } else {
      getStmt('INSERT INTO habit_logs (habit_id, date, completed) VALUES (?, ?, 1)').run(habitId, date)
      return true
    }
  })

  // Subtasks
  ipcMain.handle('db:getSubtasks', (_, taskId) => {
    return getStmt('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(taskId)
  })
  ipcMain.handle('db:createSubtask', (_, subtask) => {
    const maxPos = getStmt('SELECT COALESCE(MAX(position), -1) + 1 as pos FROM subtasks WHERE task_id = ?').get(subtask.task_id)
    subtask.position = maxPos.pos
    const stmt = getStmt('INSERT INTO subtasks (task_id, title, position) VALUES (@task_id, @title, @position)')
    const result = stmt.run(subtask)
    return getStmt('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid)
  })
  ipcMain.handle('db:toggleSubtask', (_, id) => {
    getStmt('UPDATE subtasks SET completed = CASE WHEN completed THEN 0 ELSE 1 END WHERE id = ?').run(id)
    return getStmt('SELECT * FROM subtasks WHERE id = ?').get(id)
  })
  ipcMain.handle('db:deleteSubtask', (_, id) => {
    getStmt('DELETE FROM subtasks WHERE id = ?').run(id)
    return true
  })

  // Trash / Soft Delete
  ipcMain.handle('db:softDeleteItem', (_, type, id) => {
    const tables = { task: 'tasks', note: 'notes', project: 'projects' }
    const table = tables[type]
    if (table) getStmt(`UPDATE ${table} SET deleted = 1, updated_at = datetime('now') WHERE id = ?`).run(id)
    return true
  })
  ipcMain.handle('db:getTrashItems', () => {
    const tasks = getStmt("SELECT id, title, updated_at FROM tasks WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const notes = getStmt("SELECT id, title, updated_at FROM notes WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const projects = getStmt("SELECT id, name as title, updated_at FROM projects WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const kanbanCards = getStmt("SELECT id, title, updated_at FROM kanban_cards WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const habits = getStmt("SELECT id, name as title, updated_at FROM habits WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const goals = getStmt("SELECT id, title, updated_at FROM goals WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const snippets = getStmt("SELECT id, title, updated_at FROM snippets WHERE deleted = 1 ORDER BY updated_at DESC").all()
    return { tasks, notes, projects, kanbanCards, habits, goals, snippets }
  })
  ipcMain.handle('db:restoreItem', (_, type, id) => {
    const tables = { task: 'tasks', note: 'notes', project: 'projects', kanban: 'kanban_cards', habit: 'habits', goal: 'goals', snippet: 'snippets' }
    const table = tables[type]
    if (table) getStmt(`UPDATE ${table} SET deleted = 0, updated_at = datetime('now') WHERE id = ?`).run(id)
    return true
  })
  ipcMain.handle('db:deleteItemPermanent', (_, type, id) => {
    const tables = { task: 'tasks', note: 'notes', project: 'projects', kanban: 'kanban_cards', habit: 'habits', goal: 'goals', snippet: 'snippets' }
    const table = tables[type]
    if (table) getStmt(`DELETE FROM ${table} WHERE id = ?`).run(id)
    return true
  })
  ipcMain.handle('db:emptyTrash', () => {
    getStmt("DELETE FROM tasks WHERE deleted = 1").run()
    getStmt("DELETE FROM notes WHERE deleted = 1").run()
    getStmt("DELETE FROM projects WHERE deleted = 1").run()
    getStmt("DELETE FROM kanban_cards WHERE deleted = 1").run()
    getStmt("DELETE FROM habits WHERE deleted = 1").run()
    getStmt("DELETE FROM goals WHERE deleted = 1").run()
    getStmt("DELETE FROM snippets WHERE deleted = 1").run()
    return true
  })
  // Auto-clean trash older than 30 days
  try { getStmt("DELETE FROM tasks WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM notes WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM projects WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM kanban_cards WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM habits WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM goals WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM snippets WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}

  // Entity Links
  ipcMain.handle('db:linkEntities', (_, fromType, fromId, toType, toId) => {
    getStmt('INSERT OR IGNORE INTO entity_links (from_type, from_id, to_type, to_id) VALUES (?, ?, ?, ?)').run(fromType, fromId, toType, toId)
    return true
  })
  ipcMain.handle('db:getEntityLinks', (_, type, id) => {
    const links = getStmt('SELECT * FROM entity_links WHERE (from_type = ? AND from_id = ?) OR (to_type = ? AND to_id = ?)').all(type, id, type, id)
    const result = []
    for (const link of links) {
      if (link.from_type === type && link.from_id === id) {
        const row = getStmt(`SELECT 'id' as id, 'name' as name FROM ${link.to_type}s WHERE id = ?`).get(link.to_id)
        if (row) result.push({ ...row, linkType: link.to_type })
      } else {
        const row = getStmt(`SELECT 'id' as id, 'name' as name FROM ${link.from_type}s WHERE id = ?`).get(link.from_id)
        if (row) result.push({ ...row, linkType: link.from_type })
      }
    }
    return result
  })

  function getWeekStart() {
    const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  }

  function updateChallengeProgress(type, amount) {
    try {
      const weekStart = getWeekStart()
      const challenges = getStmt('SELECT * FROM challenges WHERE requirement_type = ?').all(type)
      for (const c of challenges) {
        let uc = getStmt('SELECT * FROM user_challenges WHERE challenge_id = ? AND week_start = ?').get(c.id, weekStart)
        if (!uc) {
          getStmt('INSERT INTO user_challenges (challenge_id, progress, week_start) VALUES (?, ?, ?)').run(c.id, amount, weekStart)
          uc = { progress: amount }
        } else {
          const newProgress = uc.progress + amount
          getStmt('UPDATE user_challenges SET progress = ? WHERE id = ?').run(newProgress, uc.id)
          uc.progress = newProgress
        }
        if (!uc.completed && uc.progress >= c.requirement_count) {
          getStmt("UPDATE user_challenges SET completed = 1, completed_at = datetime('now') WHERE id = ?").run(uc.id)
          addXp(c.xp_reward, `desafío: ${c.name}`)
          const achievement = getStmt("SELECT * FROM achievements WHERE key = 'first_weekly_challenge'").get()
          if (achievement) {
            const already = getStmt('SELECT id FROM user_achievements WHERE achievement_id = ?').get(achievement.id)
            if (!already) {
              getStmt('INSERT INTO user_achievements (achievement_id) VALUES (?)').run(achievement.id)
              if (achievement.xp_reward > 0) addXp(achievement.xp_reward, `logro: ${achievement.name}`)
            }
          }
        }
      }
    } catch (e) { console.error('[ChallengeProgress]', e) }
  }

  // Challenges
  ipcMain.handle('db:getChallenges', () => {
    const weekStart = getWeekStart()
    return getStmt(`SELECT c.*, COALESCE(uc.progress, 0) as progress, COALESCE(uc.completed, 0) as completed, c.requirement_count as target
      FROM challenges c
      LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.week_start = ?
      ORDER BY c.id`).all(weekStart)
  })

  // Flashcards
  ipcMain.handle('db:getFlashcardDecks', () => {
    return getDb().prepare('SELECT d.*, (SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id) as card_count FROM flashcard_decks d ORDER BY d.created_at DESC').all()
  })

  ipcMain.handle('db:createFlashcardDeck', (_, { name, description }) => {
    if (!name || typeof name !== 'string') throw new Error('Invalid deck name')
    const stmt = getDb().prepare('INSERT INTO flashcard_decks (name, description) VALUES (?, ?)')
    const result = stmt.run(name, description || '')
    return { id: result.lastInsertRowid, name, description, card_count: 0 }
  })

  ipcMain.handle('db:deleteFlashcardDeck', (_, id) => {
    if (!id || typeof id !== 'number') throw new Error('Invalid id')
    getDb().prepare('DELETE FROM flashcard_decks WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:getFlashcards', (_, deckId) => {
    if (!deckId || typeof deckId !== 'number') throw new Error('Invalid deckId')
    return getDb().prepare('SELECT * FROM flashcards WHERE deck_id = ? ORDER BY next_review ASC').all(deckId)
  })

  ipcMain.handle('db:createFlashcard', (_, { deck_id, front, back, hint }) => {
    if (!deck_id || !front || !back) throw new Error('Missing required fields')
    const stmt = getDb().prepare('INSERT INTO flashcards (deck_id, front, back, hint) VALUES (?, ?, ?, ?)')
    const result = stmt.run(deck_id, front, back, hint || '')
    return { id: result.lastInsertRowid, deck_id, front, back, hint: hint || '' }
  })

  ipcMain.handle('db:deleteFlashcard', (_, id) => {
    if (!id || typeof id !== 'number') throw new Error('Invalid id')
    getDb().prepare('DELETE FROM flashcards WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:getDueFlashcards', (_, deckId) => {
    if (!deckId || typeof deckId !== 'number') throw new Error('Invalid deckId')
    return getDb().prepare("SELECT * FROM flashcards WHERE deck_id = ? AND next_review <= datetime('now') ORDER BY next_review ASC").all(deckId)
  })

  ipcMain.handle('db:reviewFlashcard', (_, { id, ease }) => {
    if (!id || typeof id !== 'number') throw new Error('Invalid id')
    if (![0, 1, 2, 3].includes(ease)) throw new Error('Invalid ease value (0-3)')
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

  ipcMain.handle('db:getFlashcardStats', (_, deckId) => {
    if (!deckId || typeof deckId !== 'number') throw new Error('Invalid deckId')
    const total = getDb().prepare('SELECT COUNT(*) as c FROM flashcards WHERE deck_id = ?').get(deckId).c
    const due = getDb().prepare("SELECT COUNT(*) as c FROM flashcards WHERE deck_id = ? AND next_review <= datetime('now')").get(deckId).c
    const reviewed = getDb().prepare('SELECT COUNT(*) as c FROM flashcards WHERE deck_id = ? AND repetitions > 0').get(deckId).c
    return { total, due, reviewed }
  })

  ipcMain.handle('db:getRetentionStats', () => {
    const total = getDb().prepare('SELECT COUNT(*) as c FROM flashcards').get().c
    const easy = getDb().prepare("SELECT COUNT(*) as c FROM flashcards WHERE ease_factor >= 2.5 AND repetitions > 0").get().c
    const hard = getDb().prepare("SELECT COUNT(*) as c FROM flashcards WHERE ease_factor < 2.0 AND repetitions > 0").get().c
    const retentionRate = total > 0 ? Math.round((easy / total) * 100) : 0
    return { total, easy, hard, retentionRate }
  })

  ipcMain.handle('db:getFlashcardReviewStats', () => {
    const today = new Date().toISOString().split('T')[0]
    const totalDue = db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE next_review <= datetime("now")').get().count
    const reviewedToday = db.prepare(`SELECT COUNT(*) as count FROM flashcards WHERE date(next_review) <= date("now") AND date(next_review) >= date("${today}", "-1 day") AND repetitions > 0`).get().count
    const totalCards = db.prepare('SELECT COUNT(*) as count FROM flashcards').get().count
    const retention = totalCards > 0 ? Math.round((reviewedToday / Math.max(totalCards, 1)) * 100) : 0
    const streakRow = db.prepare(`SELECT value FROM settings WHERE key = 'flashcard_streak'`).get()
    const streak = streakRow ? parseInt(streakRow.value) : 0
    return { totalDue, reviewedToday, totalCards, retention, streak }
  })

  ipcMain.handle('db:getUpcomingFlashcardReviews', () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const count = db.prepare(`SELECT COUNT(*) as count FROM flashcards WHERE date(next_review) = date("${dateStr}")`).get().count
      days.push({ date: dateStr, count, label: date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }) })
    }
    return days
  })

  ipcMain.handle('db:updateFlashcardStreak', (_, { studied }) => {
    const row = db.prepare(`SELECT value FROM settings WHERE key = 'flashcard_streak'`).get()
    let streak = row ? parseInt(row.value) : 0
    const lastDateRow = db.prepare(`SELECT value FROM settings WHERE key = 'flashcard_streak_date'`).get()
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
      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('flashcard_streak', '${streak}')`).run()
      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('flashcard_streak_date', '${today}')`).run()
    }
    return { streak }
  })

  ipcMain.handle('db:getSubjectStreaks', () => {
    const projects = db.prepare('SELECT id, name, color FROM projects WHERE deleted = 0').all()
    const streaks = projects.map(p => {
      const sessions = db.prepare(`SELECT date(started_at) as day FROM pomodoro_sessions WHERE project_id = ? ORDER BY day DESC`, p.id).all()
      let current = 0, max = 0, temp = 0
      const days = [...new Set(sessions.map(s => s.day))].sort().reverse()
      const today = new Date().toISOString().split('T')[0]
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

  ipcMain.handle('db:importICSEvents', (_, { events }) => {
    const results = []
    for (const evt of events) {
      const task = { title: evt.title, description: evt.description || '', priority: 'media', due_date: evt.startDate, repeat: null }
      const result = db.prepare('INSERT INTO tasks (title, description, priority, due_date, repeat) VALUES (?, ?, ?, ?, ?)').run(task.title, task.description, task.priority, task.due_date, task.repeat)
      results.push({ id: result.lastInsertRowid, title: evt.title })
    }
    return results
  })

  // Weekly Report
  ipcMain.handle('db:getWeeklyReport', () => {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const pomodoros = getStmt("SELECT COUNT(*) as count FROM pomodoro_sessions WHERE date(started_at) >= ? AND date(started_at) <= ?").get(weekAgo, today)
    const tasksDone = getStmt("SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND updated_at >= ?").get(weekAgo)
    const xp = getStmt("SELECT COALESCE(SUM(amount), 0) as total FROM xp_log WHERE date(created_at) >= ? AND date(created_at) <= ?").get(weekAgo, today)
    const streak = getStmt("SELECT MAX(max) as max FROM streaks").get()
    getStmt("INSERT OR REPLACE INTO weekly_reports (week_start, pomodoros, tasks_completed, xp_earned, streak_max) VALUES (?, ?, ?, ?, ?)").run(weekAgo, pomodoros.count, tasksDone.count, xp.total, streak?.max || 0)
    return { weekStart: weekAgo, pomodoros: pomodoros.count, tasksCompleted: tasksDone.count, xpEarned: xp.total, streakMax: streak?.max || 0 }
  })

  // Global Search
  ipcMain.handle('db:search', (_, query) => {
    const q = `%${validate(query, 'string')}%`
    const results = []
    try {
      const tasks = getStmt('SELECT id, title as name, \'tarea\' as type FROM tasks WHERE title LIKE ? OR description LIKE ? AND deleted = 0 LIMIT 10').all(q, q)
      results.push(...tasks)
    } catch {}
    try {
      const notes = getStmt('SELECT id, title as name, \'nota\' as type FROM notes WHERE title LIKE ? OR content LIKE ? AND deleted = 0 LIMIT 10').all(q, q)
      results.push(...notes)
    } catch {}
    try {
      const snippets = getStmt('SELECT id, title as name, \'snippet\' as type FROM snippets WHERE title LIKE ? OR description LIKE ? OR code LIKE ? LIMIT 10').all(q, q)
      results.push(...snippets)
    } catch {}
    try {
      const projects = getStmt('SELECT id, name, \'proyecto\' as type FROM projects WHERE name LIKE ? OR description LIKE ? AND deleted = 0 LIMIT 10').all(q, q)
      results.push(...projects)
    } catch {}
    try {
      const habits = getStmt("SELECT id, name, 'hábito' as type FROM habits WHERE name LIKE ? AND deleted = 0 LIMIT 10").all(q)
      results.push(...habits)
    } catch {}
    try {
      const logs = getStmt("SELECT id, date as name, 'diario' as type FROM daily_logs WHERE content LIKE ? OR focus LIKE ? LIMIT 10").all(q, q)
      results.push(...logs)
    } catch {}
    return results
  })

  // Dashboard
  ipcMain.handle('db:getDashboard', () => {
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

  // Activity Feed
  ipcMain.handle('db:getActivityFeed', () => {
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

  // Habit Stats
  ipcMain.handle('db:getHabitStats', () => {
    const habits = getStmt('SELECT * FROM habits WHERE deleted = 0').all()
    const today = new Date().toISOString().split('T')[0]
    return habits.map(h => {
      const totalDays = getStmt("SELECT COUNT(DISTINCT date) as count FROM habit_logs WHERE habit_id = ? AND completed = 1").get(h.id).count
      const thisMonth = getStmt("SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND completed = 1 AND date >= date('now', '-30 days')").get(h.id).count
      const todayDone = getStmt("SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND date = ? AND completed = 1").get(h.id, today).count
      return { ...h, totalDays, thisMonth, todayDone: todayDone > 0 }
    })
  })

  // Export/Import
  ipcMain.handle('db:exportData', () => {
    const tables = ['settings', 'projects', 'tasks', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'study_files', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags']
    const data = {}
    for (const table of tables) {
      try {
        data[table] = getStmt(`SELECT * FROM ${table}`).all()
      } catch (e) {
        data[table] = []
      }
    }
    return data
  })
  ipcMain.handle('db:importData', (_, data) => {
    const tables = ['settings', 'projects', 'tasks', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'study_files', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags']
    const tx = getDb().transaction(() => {
      for (const table of tables) {
        try {
          getStmt(`DELETE FROM ${table}`).run()
          if (data[table] && data[table].length > 0) {
            const columns = Object.keys(data[table][0]).join(', ')
            const placeholders = Object.keys(data[table][0]).map(k => `@${k}`).join(', ')
            const stmt = getStmt(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
            for (const row of data[table]) {
              stmt.run(row)
            }
          }
        } catch (e) {
          console.error(`Error importing ${table}:`, e)
        }
      }
    })
    tx()
    return true
  })

  // Backups (auto-backup files from userData)
  ipcMain.handle('db:listBackups', () => {
    const fs = require('fs')
    const backupDir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(backupDir)) return []
    return fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f))
        const date = f.replace('backup-', '').replace('.json', '')
        return { date, filename: f, size: stat.size }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  })
  ipcMain.handle('db:restoreBackup', (_, filename) => {
    const fs = require('fs')
    const backupPath = path.join(app.getPath('userData'), 'backups', filename)
    if (!fs.existsSync(backupPath)) throw new Error('Backup not found')
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
    const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','study_progress','study_files','notes','goals','goal_progress','streaks','daily_logs','snippets','habits','habit_logs','tags','xp_log','achievements','user_achievements','challenges','user_challenges','weekly_reports','subtasks','entity_links']
    const tx = getDb().transaction(() => {
      for (const table of tables) {
        try {
          getStmt(`DELETE FROM ${table}`).run()
          if (data[table] && data[table].length > 0) {
            const columns = Object.keys(data[table][0]).join(', ')
            const placeholders = Object.keys(data[table][0]).map(k => `@${k}`).join(', ')
            const stmt = getStmt(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
            for (const row of data[table]) stmt.run(row)
          }
        } catch (e) { console.error(`Error restoring ${table}:`, e) }
      }
    })
    tx()
    return true
  })

let syncServer = null
let syncUdpBroadcast = null
const SYNC_PORT = 27345
const SYNC_HTTP_PORT = 27346

ipcMain.handle('wifi-sync:start', () => {
  if (syncServer) return { ok: true, port: SYNC_HTTP_PORT }
  const http = require('http')
  const os = require('os')

  syncServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

    if (req.method === 'GET' && req.url === '/sync') {
      const data = exportAllData()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
      return
    }

    if (req.method === 'POST' && req.url === '/sync') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const incoming = JSON.parse(body)
          mergeSyncData(incoming)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: e.message }))
        }
      })
      return
    }

    if (req.method === 'GET' && req.url === '/info') {
      const hostname = os.hostname()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ name: hostname, app: 'EstudioApp', version: '1.0.0' }))
      return
    }

    res.writeHead(404)
    res.end()
  })

  syncServer.listen(SYNC_HTTP_PORT, '0.0.0.0', () => {
    console.log(`[WiFi Sync] Server on port ${SYNC_HTTP_PORT}`)
  })

  const dgram = require('dgram')
  syncUdpBroadcast = dgram.createSocket('udp4')
  syncUdpBroadcast.bind(() => {
    syncUdpBroadcast.setBroadcast(true)
    const hostname = os.hostname()
    const msg = JSON.stringify({ app: 'EstudioApp', name: hostname, port: SYNC_HTTP_PORT })
    setInterval(() => {
      const buf = Buffer.from(msg)
      syncUdpBroadcast.send(buf, 0, buf.length, SYNC_PORT, '255.255.255.255')
    }, 3000)
    const startupMsg = Buffer.from(msg)
    syncUdpBroadcast.send(startupMsg, 0, startupMsg.length, SYNC_PORT, '255.255.255.255')
  })

  syncUdpBroadcast.on('message', (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString())
      if (data.app === 'EstudioApp' && data.name !== os.hostname()) {
        if (mainWindow) mainWindow.webContents.send('wifi-sync:device-found', { ...data, ip: rinfo.address })
      }
    } catch {}
  })
  syncUdpBroadcast.bind(SYNC_PORT)

  return { ok: true, port: SYNC_HTTP_PORT }
})

ipcMain.handle('wifi-sync:stop', () => {
  if (syncServer) { syncServer.close(); syncServer = null }
  if (syncUdpBroadcast) { syncUdpBroadcast.close(); syncUdpBroadcast = null }
  return { ok: true }
})

ipcMain.handle('wifi-sync:discover', () => {
  const os = require('os')
  const interfaces = os.networkInterfaces()
  const addresses = []
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ ip: iface.address, name })
      }
    }
  }
  return addresses
})

ipcMain.handle('wifi-sync:connect', async (_, { ip }) => {
  const http = require('http')
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${ip}:${SYNC_HTTP_PORT}/info`, { timeout: 5000 }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid response')) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
})

ipcMain.handle('wifi-sync:pull', async (_, { ip }) => {
  const http = require('http')
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${ip}:${SYNC_HTTP_PORT}/sync`, { timeout: 30000 }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try { mergeSyncData(JSON.parse(body)); resolve({ ok: true }) }
        catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
})

ipcMain.handle('wifi-sync:push', async (_, { ip }) => {
  const http = require('http')
  const data = exportAllData()
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data)
    const req = http.request({
      hostname: ip, port: SYNC_HTTP_PORT, path: '/sync', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      timeout: 30000
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve({ ok: true }) } })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.write(postData)
    req.end()
  })
})

function exportAllData() {
  const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','notes','goals','daily_logs','snippets','habits','habit_logs','subtasks']
  const data = {}
  for (const table of tables) {
    try { data[table] = getDb().prepare(`SELECT * FROM ${table}`).all() } catch { data[table] = [] }
  }
  data._exportDate = new Date().toISOString()
  return data
}

function mergeSyncData(incoming) {
  const tables = Object.keys(incoming).filter(k => !k.startsWith('_'))
  const tx = getDb().transaction(() => {
    for (const table of tables) {
      if (!incoming[table] || !incoming[table].length) continue
      try {
        const existing = getDb().prepare(`SELECT * FROM ${table}`).all()
        const existingIds = new Set(existing.map(r => r.id))
        const incomingIds = new Set(incoming[table].map(r => r.id))
        for (const row of incoming[table]) {
          if (existingIds.has(row.id)) {
            const cols = Object.keys(row).filter(k => k !== 'id')
            const sets = cols.map(c => `${c} = @${c}`).join(', ')
            if (sets) getStmt(`UPDATE ${table} SET ${sets} WHERE id = @id`).run(row)
          } else {
            const columns = Object.keys(row).join(', ')
            const placeholders = Object.keys(row).map(k => `@${k}`).join(', ')
            getStmt(`INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`).run(row)
          }
        }
      } catch (e) { console.error(`Merge error ${table}:`, e) }
    }
  })
  tx()
}

ipcMain.handle('db:exportData', () => {
  return exportAllData()
})

ipcMain.handle('db:restoreFromJSON', (_, jsonData) => {
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
  const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','notes','goals','daily_logs','snippets','habits','habit_logs','subtasks']
  const tx = getDb().transaction(() => {
    for (const table of tables) {
      try {
        getDb().prepare(`DELETE FROM ${table}`).run()
        if (data[table] && data[table].length > 0) {
          const columns = Object.keys(data[table][0]).join(', ')
          const placeholders = Object.keys(data[table][0]).map(k => `@${k}`).join(', ')
          const stmt = getDb().prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
          for (const row of data[table]) stmt.run(row)
        }
      } catch (e) { console.error(`Error restoring ${table}:`, e) }
    }
  })
  tx()
  return true
})