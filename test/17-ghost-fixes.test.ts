/**
 * ============================================================================
 *  17-ghost-fixes.test.ts — Fixes de funciones "fantasma"
 * ============================================================================
 *
 *  Cubre funcionalidad que existía en la UI pero nunca producía datos:
 *
 *    A. `labels:create` / `labels:list` (handlers/labels.js)
 *       Antes `create` exigía `workspaceId` (el TagPicker no lo enviaba → la
 *       etiqueta nunca se creaba) y `list` sin workspace buscaba en id 0.
 *    B. `calculateStreaks` (components/Gamification/SubjectStreaks.tsx)
 *       Las rachas se calculan por materia (`course_id`); antes se agrupaban
 *       por `project_id`, por lo que las rachas por materia salían vacías.
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/17-ghost-fixes.test.ts
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import { calculateStreaks } from '../src/components/Gamification/SubjectStreaks'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')
const electronRoot = path.resolve(__dirname, '../electron')
const { safeHandle, voidSchema, z } = require(path.join(electronRoot, 'core', 'safe-handle'))
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

beforeAll(() => {
  db = new DatabaseSync(':memory:')
  ;(db as any).transaction = (fn: any) => fn
  db.exec(`CREATE TABLE labels (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#6366f1', created_at TEXT DEFAULT (datetime('now')))`)
  db.exec(`CREATE TABLE task_labels (task_id INTEGER NOT NULL, label_id INTEGER NOT NULL, PRIMARY KEY (task_id, label_id))`)
  const ipc = makeStubIpcMain()
  const deps: any = {
    getStmt: (sql: string) => db.prepare(sql),
    safeHandle,
    schemas,
    voidSchema,
    z,
  }
  require(path.join(electronRoot, 'handlers', 'labels')).register(ipc, deps)
  ;(globalThis as any).__ipc = ipc
})

function ipc() { return (globalThis as any).__ipc }

describe('A · labels:create / labels:list', () => {
  it('crea una etiqueta sin workspaceId (TagPicker)', async () => {
    const tag = await ipc().invoke('labels:create', { name: 'Importante', color: '#ef4444' })
    expect(tag.name).toBe('Importante')
    expect(tag.color).toBe('#ef4444')
    expect(tag.workspace_id).toBe(1)
  })

  it('usa color por defecto', async () => {
    const tag = await ipc().invoke('labels:create', { name: 'Sin color' })
    expect(tag.color).toBe('#6366f1')
  })

  it('list sin argumento devuelve todas las etiquetas', async () => {
    const all = await ipc().invoke('labels:list')
    expect(all.length).toBe(2)
  })

  it('list filtra por workspace cuando se indica', async () => {
    await ipc().invoke('labels:create', { name: 'Otra', workspaceId: 2 })
    expect((await ipc().invoke('labels:list', 1)).length).toBe(2)
    expect((await ipc().invoke('labels:list', 2)).length).toBe(1)
  })

  it('asocia etiquetas a tareas y las recupera', async () => {
    const labels = await ipc().invoke('labels:list')
    const first = labels[0]
    await ipc().invoke('labels:addToTask', 10, first.id)
    const byTask = await ipc().invoke('labels:getByTask', 10)
    expect(byTask.map((l: any) => l.id)).toContain(first.id)
  })
})

describe('B · calculateStreaks (rachas por materia)', () => {
  function startedAtDaysAgo(n: number): string {
    const d = new Date()
    d.setUTCHours(12, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - n)
    return d.toISOString()
  }

  const sessions: any = [
    { id: 1, course_id: 1, duration: 25, started_at: startedAtDaysAgo(0) },
    { id: 2, course_id: 1, duration: 30, started_at: startedAtDaysAgo(1) },
    { id: 3, course_id: 1, duration: 25, started_at: startedAtDaysAgo(2) },
    { id: 4, course_id: 2, duration: 25, started_at: startedAtDaysAgo(0) },
  ]

  it('cuenta racha actual y mejor racha de 3 días', () => {
    const r = calculateStreaks(sessions, 1)
    expect(r.current).toBe(3)
    expect(r.best).toBe(3)
  })

  it('aísla los minutos por materia en el heatmap', () => {
    const r = calculateStreaks(sessions, 1)
    expect(r.heatmap.length).toBe(30)
    const todayCell = r.heatmap[r.heatmap.length - 1]
    expect(todayCell.minutes).toBe(25)
  })

  it('devuelve 0 para una materia sin sesiones', () => {
    const r = calculateStreaks(sessions, 99)
    expect(r.current).toBe(0)
    expect(r.best).toBe(0)
  })
})
