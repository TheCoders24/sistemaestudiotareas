require('v8-compile-cache')
const { app, BrowserWindow, ipcMain, Notification, dialog, shell, Tray, Menu, nativeImage, globalShortcut, session } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const { initDatabase, deferDbInit, getDb, closeDatabase, getDbPath } = require('./database')
const { InMemoryEventBus } = require('./core/event-bus')
const { OutboxDispatcher } = require('./core/outbox')
const windowManager = require('./core/window-manager')
const logger = require('./core/logger')
const notificationManager = require('./core/notification-manager')
const sessionManager = require('./core/session-manager')
const AutomationEngine = require('./core/automation-engine')
const { StartupProfiler } = require('./core/startup-profiler')
const { SmartPreload } = require('./core/smart-preload')
const { PerformanceMonitor } = require('./core/performance-monitor')
const { PerformanceModes } = require('./core/performance-modes')
const { PinLock } = require('./core/pin-lock')
const { PluginSystem } = require('./core/plugin-system')
const { Encryption, DbEncryption } = require('./core/encryption')
const { safeHandle, voidSchema, z } = require('./core/safe-handle')
const schemas = require('./core/schemas')
const eventBus = new InMemoryEventBus()
const outbox = new OutboxDispatcher(eventBus)
const startupProfiler = new StartupProfiler()
logger.init()
logger.info('main.js loaded, pid:', process.pid)

// Auto-updater configuration
autoUpdater.logger = logger
autoUpdater.checkForUpdatesAndNotify()

autoUpdater.on('update-available', (info) => {
  logger.info('Update available:', info.version)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:available', info)
  }
})

autoUpdater.on('update-downloaded', (info) => {
  logger.info('Update downloaded:', info.version)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:downloaded', info)
  }
})

autoUpdater.on('error', (err) => {
  logger.error('Auto-updater error:', err.message)
})

let automationEngine, smartPreload, performanceMonitor, performanceModes, pinLock, pluginSystem, encryption, dbEncryption

process.on('unhandledRejection', reason => {
  logger.error('Unhandled Rejection:', reason)
})
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error)
})

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256 --optimize-for-size')
app.commandLine.appendSwitch('no-proxy-server')
app.commandLine.appendSwitch('enable-features', 'V8CompileHints')

let mainWindow
let boundsSaveTimeout
const stmts = new Map()
const LRU_MAX = 200
function getStmt(sql) {
  if (stmts.has(sql)) {
    const stmt = stmts.get(sql)
    stmts.delete(sql)
    stmts.set(sql, stmt)
    return stmt
  }
  if (stmts.size >= LRU_MAX) {
    const oldest = stmts.keys().next().value
    stmts.get(oldest).finalize()
    stmts.delete(oldest)
  }
  const stmt = getDb().prepare(sql)
  stmts.set(sql, stmt)
  return stmt
}

function wsFilter(wsId) {
  return wsId ? ' AND workspace_id = ?' : ''
}
function wsParams(wsId) {
  return wsId ? [wsId] : []
}

function safeUpdate(table, id, data) {
  const { ALLOWED_COLUMNS } = require('./utils')
  const allowed = ALLOWED_COLUMNS[table]
  if (!allowed) throw new Error(`Unknown table: ${table}`)
  const keys = Object.keys(data).filter(k => allowed.includes(k) && k !== 'id')
  if (keys.length === 0) return
  const sets = keys.map(k => `${k} = @${k}`).join(', ')
  const filtered = { id }
  for (const k of keys) filtered[k] = data[k]
  getStmt(`UPDATE ${table} SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(filtered)
}

function calcNextDueDate(currentDueDate, repeat) {
  if (!currentDueDate) return null
  const date = new Date(currentDueDate)
  if (isNaN(date.getTime())) return null
  const now = new Date()
  while (date <= now) {
    if (repeat === 'daily') date.setDate(date.getDate() + 1)
    else if (repeat === 'weekly') date.setDate(date.getDate() + 7)
    else if (repeat === 'monthly') date.setMonth(date.getMonth() + 1)
    else if (repeat === 'yearly') date.setFullYear(date.getFullYear() + 1)
    else return null
  }
  return date.toISOString().split('T')[0]
}

function validate(val, type) {
  if (type === 'string') return typeof val === 'string' ? val : ''
  if (type === 'number') return typeof val === 'number' ? val : 0
  if (type === 'int') return Number.isInteger(val) ? val : 0
  return val
}

async function createWindow() {
  const win = await windowManager.create()
  mainWindow = win

  win.webContents.on('console-message', event => {
    const { level, message, lineNumber, sourceId } = event
    const map = ['info', 'error', 'warn', 'info']
    const fn = logger[map[level]] || logger.info
    fn('[RENDERER]', `[${sourceId}:${lineNumber}]`, message)
  })
  win.webContents.on('unhandled-rejection', (event, promise, reason) => {
    logger.error('RENDERER UNHANDLED REJECTION:', reason)
  })
  win.webContents.on('crashed', (event, killed) => {
    logger.error('RENDERER CRASHED, killed:', killed)
  })
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logger.error('RENDERER FAIL LOAD:', errorCode, errorDescription, validatedURL)
  })

  eventBus.subscribe('app.started', async () => {
    const session = await sessionManager.restore()
    if (session && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('session:restored', session)
    }
  })
}

let tray = null
function createTray() {
  try {
    const iconSize = process.platform === 'darwin' ? 16 : 24
    const canvas = Buffer.alloc(iconSize * iconSize * 4)
    for (let i = 0; i < iconSize * iconSize; i++) {
      const offset = i * 4
      canvas[offset] = 99
      canvas[offset + 1] = 102
      canvas[offset + 2] = 241
      canvas[offset + 3] = 255
    }
    const img = nativeImage.createFromBuffer(canvas, { width: iconSize, height: iconSize })
    tray = new Tray(img)
    tray.setToolTip('EstudioApp')
    updateTrayMenu()
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  } catch (e) { logger.error('Tray creation:', e) }
}

function updateTrayMenu() {
  if (!tray) return
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir EstudioApp',
      click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } }
    },
    { type: 'separator' },
    {
      label: 'Iniciar Pomodoro',
      click: () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('tray:action', 'pomodoro') }
    },
    {
      label: 'Nueva Tarea',
      click: () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('tray:action', 'new-task') }
    },
    {
      label: 'Nueva Nota',
      click: () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('tray:action', 'new-note') }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => { app.quit() }
    },
  ])
  tray.setContextMenu(contextMenu)
}

const { doAutoBackup } = require('./core/auto-backup')

let ipcHandlersRegistered = false
let essentialHandlersRegistered = false
let nonEssentialHandlersRegistered = false

function registerIpcHandlers() {
  registerEssentialIpcHandlers()
  registerNonEssentialIpcHandlers()
}

function registerEssentialIpcHandlers() {
  if (essentialHandlersRegistered) {
    logger.warn('registerEssentialIpcHandlers called more than once. Skipping.')
    return
  }
  essentialHandlersRegistered = true

  const coreDeps = { getStmt, getDb, safeUpdate, wsFilter, wsParams, validate, safeHandle, schemas, voidSchema, z, app, mainWindow, dialog, shell, fs, path, crypto, globalShortcut, updateTrayMenu, notificationManager, outbox }

  require('./handlers/settings').register(ipcMain, coreDeps)
  require('./handlers/workspaces').register(ipcMain, coreDeps)
  require('./handlers/tasks').register(ipcMain, coreDeps)
  require('./handlers/notes').register(ipcMain, coreDeps)

  safeHandle(ipcMain, 'tray:updateMenu', voidSchema(), () => { updateTrayMenu(); return true })
  safeHandle(ipcMain, 'notification:show', z.object({ title: z.string().min(1), body: z.string().min(1), severity: z.string().optional() }), ({ title, body, severity }) => {
    notificationManager.show(title, body, severity)
    return true
  })
  safeHandle(ipcMain, 'session:save', z.object({ activeTab: z.string().optional(), sidebarOpen: z.boolean().optional(), scrollPositions: z.record(z.number()).optional() }).passthrough(), (state) => {
    sessionManager.save(state)
    return true
  })
  safeHandle(ipcMain, 'session:restore', voidSchema(), () => { return sessionManager.restore() })

  // Auto-updater IPC handlers
  safeHandle(ipcMain, 'update:check', voidSchema(), async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { available: !!result?.updateInfo }
    } catch (e) {
      logger.error('Update check failed:', e.message)
      return { error: e.message }
    }
  })
  safeHandle(ipcMain, 'update:download', voidSchema(), async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (e) {
      logger.error('Update download failed:', e.message)
      return { error: e.message }
    }
  })
  safeHandle(ipcMain, 'update:install', voidSchema(), async () => {
    autoUpdater.quitAndInstall()
    return { success: true }
  })
}

function registerNonEssentialIpcHandlers() {
  if (nonEssentialHandlersRegistered) {
    logger.warn('registerNonEssentialIpcHandlers called more than once. Skipping.')
    return
  }
  nonEssentialHandlersRegistered = true

  const coreDeps = { getStmt, getDb, safeUpdate, wsFilter, wsParams, validate, safeHandle, schemas, voidSchema, z, app, mainWindow, dialog, shell, fs, path, crypto, globalShortcut, updateTrayMenu, notificationManager, outbox }

  const { addXp, updateChallengeProgress } = require('./handlers/gamification').register(ipcMain, { getStmt, safeHandle, schemas, voidSchema, z })

  const allDeps = { ...coreDeps, addXp, updateChallengeProgress }
  const depExtra = { ...allDeps, automationEngine, startupProfiler, performanceModes, performanceMonitor, smartPreload, pinLock, pluginSystem, encryption, mainWindow }

  require('./handlers/projects').register(ipcMain, allDeps)
  require('./handlers/kanban').register(ipcMain, allDeps)
  require('./handlers/pomodoro').register(ipcMain, allDeps)
  require('./handlers/study').register(ipcMain, depExtra)
  require('./handlers/goals').register(ipcMain, allDeps)
  require('./handlers/habits').register(ipcMain, allDeps)
  require('./handlers/snippets').register(ipcMain, allDeps)
  require('./handlers/dailylogs').register(ipcMain, allDeps)
  require('./handlers/flashcards').register(ipcMain, allDeps)
  require('./handlers/automation').register(ipcMain, depExtra)
  require('./handlers/labels').register(ipcMain, allDeps)
  require('./handlers/trash').register(ipcMain, allDeps)
  require('./handlers/search').register(ipcMain, allDeps)
  require('./handlers/studyfiles').register(ipcMain, allDeps)
  require('./handlers/newmodules').register(ipcMain, depExtra)
  require('./handlers/sync').register(ipcMain, allDeps)
  require('./handlers/backup').register(ipcMain, allDeps)
  require('./handlers/courses').register(ipcMain, allDeps)
  require('./handlers/templates').register(ipcMain, allDeps)
  require('./handlers/exams').register(ipcMain, allDeps)
  require('./handlers/snippets-execute').register(ipcMain, allDeps)
  require('./handlers/ai').register(ipcMain, allDeps)
  require('./handlers/entity').register(ipcMain, allDeps)

  safeHandle(ipcMain, 'db:importICSEvents', z.object({ events: z.array(z.object({ title: z.string(), description: z.string().optional(), startDate: z.string() })) }), ({ events }) => {
    const results = []
    for (const evt of events) {
      const task = { title: evt.title, description: evt.description || '', priority: 'media', due_date: evt.startDate, repeat: null }
      const result = getDb().prepare('INSERT INTO tasks (title, description, priority, due_date, repeat) VALUES (?, ?, ?, ?, ?)').run(task.title, task.description, task.priority, task.due_date, task.repeat)
      results.push({ id: result.lastInsertRowid, title: evt.title })
    }
    return results
  })
}

async function bootstrap() {
  try {
    logger.info('bootstrap started, pid:', process.pid)

    initDatabase()
    startupProfiler.mark('db-opened')
    outbox.init(getDb())
    startupProfiler.mark('migrations-completed')
    setTimeout(deferDbInit, 100)
    setTimeout(async () => {
      try {
        logger.info('populating search index')
        require('./handlers/search').populateSearchIndex(getDb)
      } catch (e) {
        logger.error('background task failed:', e)
      }
    }, 1000)

    logger.info('creating window...')
    await createWindow()
    logger.info('window created')
    startupProfiler.mark('window-created')

    logger.info('registering essential IPC handlers...')
    registerEssentialIpcHandlers()
    logger.info('essential IPC handlers registered')

    createTray()

    startupProfiler.mark('shell-rendered')
    startupProfiler.measure('app-start', 'shell-rendered', 'Startup total (to window)')

    eventBus.publish({
      id: crypto.randomUUID(),
      type: 'app.started',
      occurredAt: new Date().toISOString(),
      aggregateId: null,
      payload: {},
      metadata: { startupMs: startupProfiler.getTotalMs() },
    })

    setImmediate(() => {
      registerNonEssentialIpcHandlers()
      logger.info('non-essential IPC handlers registered')

      smartPreload = new SmartPreload(getDb, { level: 'basic' })
      performanceModes = new PerformanceModes('balanceado')
      performanceMonitor = new PerformanceMonitor({ eventBus, getDb })
      pinLock = new PinLock(
        (key) => { const r = getStmt('SELECT value FROM settings WHERE key = ?').get(key); return r ? r.value : null },
        (key, value) => { getStmt('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value) }
      )
      encryption = new Encryption(app.getPath('userData'))
      dbEncryption = new DbEncryption(encryption, getDb)
      pluginSystem = new PluginSystem({ getDb, eventBus, logger })
      pluginSystem.init().catch(() => {})
      startupProfiler.mark('settings-loaded')
      automationEngine = new AutomationEngine(eventBus, getDb)
      automationEngine.init()

      setInterval(() => {
        try {
          const db = getDb()
          if (db) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_active', ?)").run(new Date().toISOString())
        } catch {}
      }, 60000)
      setInterval(() => outbox.dispatchPending(), 30000)

      const updateConfig = path.join(process.resourcesPath, 'app-update.yml')
      if (fs.existsSync(updateConfig)) {
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
          safeHandle(ipcMain, 'updater:check', voidSchema(), () => { autoUpdater.checkForUpdates().catch(() => {}) })
          safeHandle(ipcMain, 'updater:install', voidSchema(), () => { autoUpdater.quitAndInstall() })
          setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}) }, 5000)
        } catch {}
      }

      const SHORTCUTS = {
        'CmdOrCtrl+Shift+N': 'new-note',
        'CmdOrCtrl+Shift+T': 'new-task',
        'CmdOrCtrl+Shift+P': 'pomodoro',
        'CmdOrCtrl+Shift+F': 'search',
      }
      for (const [accelerator, action] of Object.entries(SHORTCUTS)) {
        globalShortcut.register(accelerator, () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show()
            mainWindow.focus()
            mainWindow.webContents.send('tray:action', action)
          }
        })
      }
    })
  } catch (error) {
    logger.error('bootstrap failed:', error)
  }
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  logger.warn('Another instance is already running. Quitting.')
  app.quit()
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length === 0) return
    const win = windows[0]
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady()
    .then(() => bootstrap())
    .catch(error => {
      logger.error('Fatal bootstrap error:', error)
    })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) bootstrap()
  })

  setInterval(() => doAutoBackup({ getStmt, getDb, app, fs, path, logger }), 3600000)

  setInterval(() => {
    try {
      const now = new Date().toISOString().slice(0, 19)
      const soon = new Date(Date.now() + 60000).toISOString().slice(0, 19)
      const tasks = getStmt("SELECT id, title, reminder FROM tasks WHERE deleted = 0 AND completed = 0 AND reminder IS NOT NULL AND reminder >= ? AND reminder < ?").all(now, soon)
      for (const t of tasks) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('reminder:notification', { id: t.id, title: t.title })
        }
        if (Notification.isSupported()) {
          new Notification({ title: '\u23F0 Recordatorio de tarea', body: t.title }).show()
        }
      }
    } catch (e) { /* silent */ }
  }, 30000)

  setInterval(() => {
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const recurringTasks = getStmt("SELECT * FROM tasks WHERE deleted = 0 AND completed = 1 AND repeat IS NOT NULL AND repeat != ''").all()
      for (const task of recurringTasks) {
        const existing = getStmt("SELECT id FROM tasks WHERE title = ? AND deleted = 0 AND completed = 0 AND parent_task_id = ? AND date(created_at) = ?").get(task.title, task.id, today)
        if (existing) continue
        const newDueDate = calcNextDueDate(task.due_date, task.repeat)
        if (!newDueDate) continue
        getStmt("INSERT INTO tasks (title, description, priority, due_date, project_id, repeat, tags, parent_task_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
          task.title, task.description || '', task.priority || 'media', newDueDate, task.project_id, task.repeat, task.tags || '', task.id
        )
      }
    } catch (e) { /* silent */ }
  }, 60000)

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })

  app.on('window-all-closed', () => {
    closeDatabase()
    if (process.platform !== 'darwin') app.quit()
  })
}
