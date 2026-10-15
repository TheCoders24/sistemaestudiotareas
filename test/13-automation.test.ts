/**
 * ============================================================================
 *  13-automation.test.ts — Automatizaciones de punta a punta
 * ============================================================================
 *
 *  Verifica que las mutaciones de tareas/proyectos publiquen eventos de
 *  dominio en el bus y que el AutomationEngine los consuma:
 *
 *    A. Integración OutboxDispatcher + AutomationEngine sobre SQLite real
 *       (un `task.created` dispara una acción `task.set.priority`).
 *    B. Los handlers de tareas emiten eventos vía `outbox.emit`.
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/13-automation.test.ts
 * ============================================================================
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')
const electronRoot = path.resolve(__dirname, '../electron')
const { safeHandle, voidSchema, z } = require(path.join(electronRoot, 'core', 'safe-handle'))
const { InMemoryEventBus } = require(path.join(electronRoot, 'core', 'event-bus'))
const { OutboxDispatcher, OUTBOX_SQL, ACTIVITY_LOG_SQL } = require(path.join(electronRoot, 'core', 'outbox'))
const AutomationEngine = require(path.join(electronRoot, 'core', 'automation-engine'))
const schemas = require(path.join(electronRoot, 'core', 'schemas'))

let db: any

function makeStubIpcMain() {
  const handlers = new Map<string, (...args: any[]) => Promise<any>>()
  return {
    handle: (ch: string, fn: (...args: any[]) => Promise<any>) => { handlers.set(ch, fn) },
    removeHandler: (ch: string) => { handlers.delete(ch) },
    invoke: async (ch: string, ...args: any[]) => {
      const fn = handlers.get(ch)
      if (!fn) throw new Error(`No handler for channel ${ch}`)
      return fn({}, ...args)
    },
  }
}

function register(mod: string, ipc: any, extra: Record<string, any> = {}) {
  const deps: any = {
    getStmt: (sql: string) => db.prepare(sql),
    getDb: () => db,
    safeHandle,
    schemas: {},
    voidSchema,
    z,
    wsFilter: () => '',
    wsParams: () => [],
    safeUpdate: () => {},
    addXp: () => {},
    updateChallengeProgress: () => {},
    ...extra,
  }
  require(path.join(electronRoot, 'handlers', mod)).register(ipc, deps)
  return ipc
}

describe('A · OutboxDispatcher + AutomationEngine', () => {
  it('un evento task.created dispara la acción task.set.priority', async () => {
    const coreDb = new DatabaseSync(':memory:')
    coreDb.exec(OUTBOX_SQL)
    coreDb.exec(ACTIVITY_LOG_SQL)
    coreDb.exec(`CREATE TABLE IF NOT EXISTS automation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER,
      name TEXT,
      enabled INTEGER DEFAULT 1,
      trigger TEXT,
      conditions_json TEXT DEFAULT '[]',
      actions_json TEXT DEFAULT '[]',
      created_at TEXT,
      updated_at TEXT
    )`)
    coreDb.exec(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      column_id INTEGER,
      priority TEXT,
      workspace_id INTEGER,
      completed INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT
    )`)

    const eventBus = new InMemoryEventBus()
    const outbox = new OutboxDispatcher(eventBus)
    outbox.init(coreDb)
    const engine = new AutomationEngine(eventBus, () => coreDb)
    await engine.init()

    coreDb.prepare(`INSERT INTO automation_rules
      (workspace_id, name, enabled, trigger, conditions_json, actions_json)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      null,
      'Priorizar tareas nuevas',
      1,
      'task.created',
      '[]',
      JSON.stringify([{ type: 'task.set.priority', payload: { priority: 'alta' } }])
    )
    coreDb.prepare('INSERT INTO tasks (id, title, priority) VALUES (?, ?, ?)').run(1, 'T', 'media')
    await engine.loadRules()

    await outbox.emit(coreDb, 'task.created', { taskId: 1, priority: 'media' })

    const task = coreDb.prepare('SELECT * FROM tasks WHERE id = 1').get()
    expect(task.priority).toBe('alta')
  })
})

describe('B · handlers/tasks emite eventos de dominio', () => {
  let ipc: any
  let emit: any
  let addActivity: any

  beforeAll(() => {
    db = new DatabaseSync(':memory:')
    db.exec(`CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      priority TEXT,
      due_date TEXT,
      reminder TEXT,
      project_id INTEGER,
      repeat TEXT,
      tags TEXT,
      completed INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      position INTEGER,
      workspace_id INTEGER,
      updated_at TEXT
    )`)
    ipc = makeStubIpcMain()
    emit = vi.fn(async () => {})
    addActivity = vi.fn()
    register('tasks', ipc, { outbox: { emit, addActivity }, schemas })
  })

  it('db:createTask emite task.created con el id creado', async () => {
    const created = await ipc.invoke('db:createTask', { title: 'T', priority: 'media' })
    const call = emit.mock.calls.find((c: any[]) => c[1] === 'task.created')
    expect(call).toBeTruthy()
    expect(call[2].taskId).toBe(created.id)
  })

  it('db:toggleTask al completar emite task.updated y task.completed', async () => {
    const created = await ipc.invoke('db:createTask', { title: 'Toggle', priority: 'media' })
    emit.mockClear()
    await ipc.invoke('db:toggleTask', created.id)
    const types = emit.mock.calls.map((c: any[]) => c[1])
    expect(types).toContain('task.updated')
    expect(types).toContain('task.completed')
  })
})
