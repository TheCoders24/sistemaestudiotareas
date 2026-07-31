/**
 * ============================================================================
 *  03-preload-shape.test.ts — Forma del preload expuesto a `window.electronAPI`
 * ============================================================================
 *
 *  ¿Qué prueba este archivo? Que `electron/preload.js` realmente expone la API
 *  anidada que el renderer usa. En lugar de duplicar la estructura a mano, este
 *  test CARGA el preload real mockeando `electron` y captura el objeto que
 *  `contextBridge.exposeInMainWorld('electronAPI', ...)` registra.
 *
 *  Verifica dos cosas:
 *    1. Todos los namespaces y métodos anidados existen (settings, tasks,
 *       subtasks, kanban, flashcards, study, gamification, app.notification…).
 *    2. El preload ENVUELVE bien los argumentos cuando el handler espera un
 *       objeto plano (p.ej. `notification.show(title, body)` debe invocar
 *       `notification:show` con `{ title, body }`, NO con args separados).
 *
 *  Este test es la "red de seguridad" del arreglo de preload.js que rompía
 *  `templates.instantiate` y `notification.show`.
 *
 *  Cómo ejecutarlo:
 *    npm test -- 03-preload-shape
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { loadPreload, type PreloadHarness } from './helpers/loadPreload'

let harness: PreloadHarness
let api: any = null

beforeAll(() => {
  harness = loadPreload()
  api = harness.api
})

describe('PASO 1 · El preload se carga y expone `electronAPI`', () => {
  it('exposeInMainWorld fue llamado (electronAPI existe)', () => {
    expect(api).toBeTruthy()
  })
})

describe('PASO 2 · Todos los namespaces de primer nivel existen', () => {
  const namespaces = [
    'settings', 'workspaces', 'projects', 'tasks', 'subtasks', 'kanban', 'notes',
    'habits', 'goals', 'snippets', 'flashcards', 'study', 'pomodoro', 'search',
    'gamification', 'streaks', 'dailyLogs', 'trash', 'export', 'searchReindex',
    'backup', 'events', 'app', 'wifiSync', 'utils', 'dashboard', 'stats',
    'labels', 'activity', 'session', 'automation', 'courses', 'templates',
    'exams', 'examSimulations', 'ai', 'profiler', 'perf', 'perfMonitor',
    'preload', 'pin', 'plugins', 'encryption',
  ]
  for (const ns of namespaces) {
    it(`electronAPI.${ns} existe`, () => {
      expect(api[ns]).toBeTruthy()
    })
  }
})

describe('PASO 3 · Métodos anidados clave existen', () => {
  const chains = [
    ['settings', 'get'], ['settings', 'set'],
    ['tasks', 'list'], ['tasks', 'listWithSubtasks'], ['tasks', 'create'],
    ['tasks', 'dependencies', 'get'], ['tasks', 'dependencies', 'add'],
    ['tasks', 'comments', 'list'], ['tasks', 'timeTracking', 'start'],
    ['subtasks', 'create'],
    ['kanban', 'cards', 'move'], ['kanban', 'columns', 'list'],
    ['notes', 'folders', 'list'],
    ['habits', 'logs', 'toggle'], ['habits', 'stats'],
    ['goals', 'progress', 'get'],
    ['flashcards', 'decks', 'list'], ['flashcards', 'cards', 'getDue'],
    ['flashcards', 'cards', 'review'], ['flashcards', 'stats', 'retention'],
    ['flashcards', 'streak', 'subjects'],
    ['study', 'topics', 'setLevel'], ['study', 'files', 'pickAndUpload'],
    ['study', 'files', 'open'], ['study', 'stats'],
    ['pomodoro', 'sessions', 'list'],
    ['gamification', 'xp', 'get'], ['gamification', 'xp', 'history'],
    ['gamification', 'achievements', 'list'], ['gamification', 'challenges', 'list'],
    ['streaks', 'get'],
    ['dailyLogs', 'get'],
    ['trash', 'softDelete'], ['trash', 'empty'],
    ['export', 'data'], ['export', 'importJSON'],
    ['backup', 'list'],
    ['events', 'onTrayAction'],
    ['app', 'notification', 'show'], ['app', 'shortcuts', 'register'],
    ['app', 'updater', 'check'],
    ['wifiSync', 'connect'], ['wifiSync', 'pull'], ['wifiSync', 'push'],
    ['dashboard', 'get'], ['dashboard', 'activityFeed'],
    ['stats', 'get'], ['stats', 'weeklyReport'],
    ['activity', 'list'],
    ['session', 'save'],
    ['automation', 'list'],
    ['courses', 'list'],
    ['templates', 'instantiate'],
    ['exams', 'gpa'],
    ['ai', 'tutor'], ['ai', 'generateFlashcards'], ['ai', 'validateKey'],
    ['pin', 'set'], ['pin', 'verify'],
  ]
  for (const chain of chains) {
    it(`electronAPI.${chain.join('.')} es una función`, () => {
      let node: any = api
      for (const key of chain) node = node?.[key]
      expect(typeof node).toBe('function')
    })
  }
})

describe('PASO 4 · El preload envuelve argumentos para handlers con objeto plano', () => {
  beforeAll(() => { harness.invoked.length = 0 })

  it('notification.show(title, body, severity) -> {title, body, severity}', async () => {
    await api.app.notification.show('Título', 'Cuerpo', 'error')
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('notification:show')
    expect(call.args).toEqual([{ title: 'Título', body: 'Cuerpo', severity: 'error' }])
  })

  it('templates.instantiate(id, params) -> {templateId, params}', async () => {
    await api.templates.instantiate(3, { name: 'X' })
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('templates:instantiate')
    expect(call.args).toEqual([{ templateId: 3, params: { name: 'X' } }])
  })

  it('flashcards.cards.review(id, ease) -> {id, ease}', async () => {
    await api.flashcards.cards.review(7, 5)
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('db:reviewFlashcard')
    expect(call.args).toEqual([{ id: 7, ease: 5 }])
  })

  it('ai.tutor(topicId, message, history) -> {topicId, message, history}', async () => {
    await api.ai.tutor(9, 'hola', [{ role: 'user' }])
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('ai:tutor')
    expect(call.args).toEqual([{ topicId: 9, message: 'hola', history: [{ role: 'user' }] }])
  })

  it('ai.generateFlashcards(sourceType, sourceId) -> {sourceType, sourceId}', async () => {
    await api.ai.generateFlashcards('topic', 5)
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('ai:generateFlashcards')
    expect(call.args).toEqual([{ sourceType: 'topic', sourceId: 5 }])
  })

  it('wifiSync.connect(ip) -> {ip}', async () => {
    await api.wifiSync.connect('192.168.1.5')
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('wifi-sync:connect')
    expect(call.args).toEqual([{ ip: '192.168.1.5' }])
  })

  it('app.shortcuts.register(accel, action) -> {accelerator, action}', async () => {
    await api.app.shortcuts.register('CmdOrCtrl+K', 'x')
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('shortcuts:register')
    expect(call.args).toEqual([{ accelerator: 'CmdOrCtrl+K', action: 'x' }])
  })
})

describe('PASO 5 · El preload pasa args separados para handlers tupla', () => {
  it('settings.get(key) -> invoke("db:getSetting", key)', async () => {
    await api.settings.get('theme')
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('db:getSetting')
    expect(call.args).toEqual(['theme'])
  })

  it('settings.set(key, value) -> invoke("db:setSetting", key, value)', async () => {
    await api.settings.set('theme', 'dark')
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('db:setSetting')
    expect(call.args).toEqual(['theme', 'dark'])
  })

  it('search(query) -> invoke("db:search", query)', async () => {
    await api.search('type')
    const call = harness.invoked[harness.invoked.length - 1]
    expect(call.channel).toBe('db:search')
    expect(call.args).toEqual(['type'])
  })
})
