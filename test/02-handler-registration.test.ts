/**
 * ============================================================================
 *  02-handler-registration.test.ts — Registro de los 26 módulos de handlers
 * ============================================================================
 *
 *  ¿Qué prueba este archivo? Que TODOS los módulos de `electron/handlers/`
 *  se registran sin errores sobre un `ipcMain` stub, igual que hace
 *  `electron/main.js` en `registerIpcHandlers()`. Si un módulo tuviera un
 *  schema roto, una dependencia mal nombrada o un require fallido, este test
 *  lo detecta de inmediato (fue exactamente el fallo de bootstrap original:
 *  "all IPC handlers registered" nunca se logueaba).
 *
 *  También verifica que existan canales CRÍTICOS conocidos (los que usa el
 *  renderer a diario), para blindar contra regresiones del contrato IPC.
 *
 *  Cómo ejecutarlo:
 *    npm test -- 02-handler-registration
 * ============================================================================
 */

import { describe, it, expect, vi, beforeAll } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

// Los módulos re-registran canales en cada test; silenciamos el WARN ruidoso.
beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

const require = createRequire(import.meta.url)
const electronRoot = path.resolve(__dirname, '../electron')
const { safeHandle, voidSchema, z } = require(path.join(electronRoot, 'core', 'safe-handle'))
const schemas = require(path.join(electronRoot, 'core', 'schemas'))

/** Misma secuencia de registro que `main.js`. */
const HANDLER_MODULES = [
  'tasks', 'projects', 'workspaces', 'notes', 'kanban', 'pomodoro', 'study',
  'goals', 'habits', 'snippets', 'dailylogs', 'flashcards', 'automation', 'labels',
  'trash', 'search', 'settings', 'studyfiles', 'newmodules', 'sync', 'backup',
  'courses', 'templates', 'exams', 'snippets-execute', 'ai',
]

/** Módulos que reciben `depExtra` (con los engines de la main). */
const EXTRA_DEP_MODULES = new Set(['automation', 'study', 'newmodules'])

function makeStubIpcMain() {
  const channels = new Set<string>()
  return {
    handle: (ch: string) => { channels.add(ch) },
    removeHandler: (ch: string) => { channels.delete(ch) },
    _channels: channels,
  }
}

function buildDeps(ipcMain: any) {
  const coreDeps: any = {
    getStmt: () => ({ get: () => ({}), all: () => [], run: () => ({ changes: 1 }) }),
    getDb: () => ({ prepare: () => ({ get: () => ({}), all: () => [], run: () => ({}) }) }),
    safeUpdate: () => {},
    wsFilter: () => () => true,
    wsParams: () => ({}),
    validate: () => {},
    safeHandle,
    schemas,
    voidSchema,
    z,
    app: { getPath: () => '' },
    mainWindow: {},
    dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }), showSaveDialog: async () => null },
    shell: {},
    fs: require('node:fs'),
    path,
    crypto: {},
    globalShortcut: {},
    updateTrayMenu: () => {},
    notificationManager: {},
  }
  const gam = require(path.join(electronRoot, 'handlers', 'gamification')).register(ipcMain, { ...coreDeps, z })
  const allDeps = { ...coreDeps, ...gam }
  const depExtra = {
    ...allDeps,
    automationEngine: {}, startupProfiler: {}, performanceModes: {}, performanceMonitor: {},
    smartPreload: {}, pinLock: {}, pluginSystem: {}, encryption: {}, mainWindow: {},
  }
  return { allDeps, depExtra }
}

describe('PASO 1 · Cada módulo de handlers se registra sin lanzar', () => {
  for (const mod of HANDLER_MODULES) {
    it(`${mod}.register(ipcMain, deps) no lanza`, () => {
      const ipcMain = makeStubIpcMain()
      const { allDeps, depExtra } = buildDeps(ipcMain)
      const deps = EXTRA_DEP_MODULES.has(mod) ? depExtra : allDeps
      const handler = require(path.join(electronRoot, 'handlers', mod))
      expect(() => handler.register(ipcMain, deps)).not.toThrow()
    })
  }
})

describe('PASO 2 · El registro global es completo', () => {
  it('se registran al menos 100 canales IPC en total', () => {
    const ipcMain = makeStubIpcMain()
    const { allDeps, depExtra } = buildDeps(ipcMain)
    for (const mod of HANDLER_MODULES) {
      const deps = EXTRA_DEP_MODULES.has(mod) ? depExtra : allDeps
      require(path.join(electronRoot, 'handlers', mod)).register(ipcMain, deps)
    }
    expect(ipcMain._channels.size).toBeGreaterThanOrEqual(100)
  })
})

describe('PASO 3 · Canales críticos que el renderer usa a diario existen', () => {
  /**
   * Los canales se registran en los 26 módulos Y directamente en main.js
   * (p. ej. notification:show, session:save, db:linkEntities). Para cubrir
   * ambos orígenes también barremos el código fuente de main.js.
   */
  function registeredChannels(): Set<string> {
    const ipcMain = makeStubIpcMain()
    const { allDeps, depExtra } = buildDeps(ipcMain)
    for (const mod of HANDLER_MODULES) {
      const deps = EXTRA_DEP_MODULES.has(mod) ? depExtra : allDeps
      require(path.join(electronRoot, 'handlers', mod)).register(ipcMain, deps)
    }
    const mainSrc = fs.readFileSync(path.join(electronRoot, 'main.js'), 'utf8')
    const direct = new Set<string>()
    for (const m of mainSrc.matchAll(/safeHandle\(\s*ipcMain\s*,\s*'([^']+)'/g)) {
      direct.add(m[1])
    }
    for (const m of mainSrc.matchAll(/safeHandle\(\s*ipcMain\s*,\s*"([^"]+)"/g)) {
      direct.add(m[1])
    }
    for (const ch of direct) ipcMain._channels.add(ch)
    return ipcMain._channels
  }

  const critical = [
    // Settings / bootstrap
    'db:getSetting', 'db:setSetting',
    // Tasks
    'db:getTasks', 'db:createTask', 'db:updateTask', 'db:toggleTask', 'db:reorderTasks',
    'db:addTagToTask', 'db:removeTagFromTask',
    // Subtareas
    'db:getSubtasks', 'db:createSubtask', 'db:toggleSubtask',
    // Kanban
    'db:getKanbanCards', 'db:moveKanbanCard',
    // Flashcards
    'db:getFlashcardDecks', 'db:getFlashcards', 'db:getDueFlashcards', 'db:reviewFlashcard',
    'db:getFlashcardStats', 'db:getRetentionStats', 'db:getFlashcardReviewStats',
    // Estudio
    'db:getStudyTopics', 'db:setStudyLevel', 'db:getStudyStats', 'study:pickAndUploadFile',
    // XP / gamificación
    'xp:get', 'xp:add', 'xp:getHistory', 'xp:getAchievements', 'xp:checkAchievements',
    // Dashboards / stats
    'db:getDashboard', 'db:getActivityFeed', 'db:getStats', 'db:getWeeklyReport',
    // Streaks
    'db:getStreak', 'db:updateStreak',
    // Habit / goals / logs
    'db:getHabitStats', 'db:getGoalProgress', 'db:getDailyLogs',
    // Trash / backup / export
    'db:getTrashItems', 'db:softDeleteItem', 'db:exportData', 'db:listBackups',
    // Busqueda
    'db:search',
    // Módulos nuevos
    'courses:list', 'templates:instantiate', 'exams:list', 'exams:gpa',
    'ai:tutor', 'ai:validateKey', 'ai:generateFlashcards',
    'notification:show', 'session:save', 'db:linkEntities',
  ]

  const channels = registeredChannels()
  for (const ch of critical) {
    it(`existe el canal "${ch}"`, () => {
      expect(channels.has(ch)).toBe(true)
    })
  }
})
