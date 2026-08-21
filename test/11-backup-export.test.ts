/**
 * ============================================================================
 *  08-backup-export.test.ts — Backup/export completo (handlers reales)
 * ============================================================================
 *
 *  Prueba los handlers de backup de `electron/handlers/backup.js` y el módulo
 *  `electron/core/auto-backup.js` sobre una base SQLite REAL (`node:sqlite`),
 *  no un mock. Verifica:
 *
 *    1. `export.data()` cubre TODAS las tablas de `ALL_TABLES` (antes solo 13,
 *       se perdían xp_log, achievements, retos, informes, subtareas, etc.).
 *    2. Roundtrip export → importJSON y export → import restauran los datos.
 *    3. `doAutoBackup` escribe un archivo por día, deduplica y respeta la
 *       retención; `backup.list()` lo lista y `backup.restore()` lo restaura.
 *    4. Casos de error (archivo inexistente, JSON inválido).
 *
 *  Cómo ejecutarlo:
 *    npm test -- 08-backup-export
 * ============================================================================
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')
const electronRoot = path.resolve(__dirname, '../electron')
const { safeHandle, voidSchema, z } = require(path.join(electronRoot, 'core', 'safe-handle'))
const backupModule = require(path.join(electronRoot, 'handlers', 'backup'))
const { doAutoBackup } = require(path.join(electronRoot, 'core', 'auto-backup'))
const { ALL_TABLES } = require(path.join(electronRoot, 'core', 'backup-tables'))

let ipc: any
let db: any
let tmpDir: string

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

function makeDb() {
  const d: any = new DatabaseSync(':memory:')
  d.transaction = (fn: any) => fn
  d.exec(`CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)`)
  d.exec(`CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT, priority TEXT, completed INTEGER DEFAULT 0, deleted INTEGER DEFAULT 0)`)
  d.exec(`CREATE TABLE xp_log (id INTEGER PRIMARY KEY, amount INTEGER, reason TEXT, created_at TEXT)`)
  d.exec(`CREATE TABLE habit_logs (id INTEGER PRIMARY KEY, habit_id INTEGER, date TEXT, completed INTEGER)`)
  return d
}

function depsFor(tmp: string) {
  return {
    getStmt: (sql: string) => db.prepare(sql),
    getDb: () => db,
    app: { getPath: () => tmp },
    fs,
    path,
    safeHandle,
    schemas: {},
    voidSchema,
    z,
  }
}

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'))
  db = makeDb()
  ipc = makeStubIpcMain()
  backupModule.register(ipc, depsFor(tmpDir))
})

afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
})

describe('PASO 1 · export.data() cubre todas las tablas', () => {
  it('incluye las 33 tablas de ALL_TABLES más _exportDate', async () => {
    const data = await ipc.invoke('db:exportData')
    for (const table of ALL_TABLES) {
      expect(data).toHaveProperty(table)
      expect(Array.isArray(data[table])).toBe(true)
    }
    expect(typeof data._exportDate).toBe('string')
  })

  it('las tablas que antes se perdían ahora están presentes', async () => {
    const data = await ipc.invoke('db:exportData')
    const antesPerdidas = ['xp_log', 'achievements', 'challenges', 'weekly_reports', 'subtasks', 'entity_links', 'flashcard_decks', 'flashcards', 'study_progress', 'goal_progress', 'tags', 'time_entries']
    for (const t of antesPerdidas) {
      expect(data).toHaveProperty(t)
    }
  })
})

describe('PASO 2 · Roundtrip export → importJSON', () => {
  it('restaura filas de varias tablas tras modificar la base', async () => {
    db.prepare('INSERT INTO tasks (id, title, priority, completed, deleted) VALUES (1, ?, ?, 0, 0)').run('Estudiar', 'alta')
    db.prepare('INSERT INTO xp_log (id, amount, reason, created_at) VALUES (1, 50, ?, ?)').run('tarea', new Date().toISOString().split('T')[0])
    db.prepare('INSERT INTO habit_logs (id, habit_id, date, completed) VALUES (1, 1, ?, 1)').run('2026-07-20')

    const exported = await ipc.invoke('db:exportData')

    db.prepare('DELETE FROM tasks').run()
    db.prepare('DELETE FROM xp_log').run()
    db.prepare('UPDATE habit_logs SET completed = 0').run()

    expect(await ipc.invoke('db:restoreFromJSON', exported)).toBe(true)

    expect(db.prepare('SELECT * FROM tasks').all()).toHaveLength(1)
    expect(db.prepare('SELECT * FROM tasks').all()[0].title).toBe('Estudiar')
    expect(db.prepare('SELECT * FROM xp_log').all()[0].amount).toBe(50)
    expect(db.prepare('SELECT * FROM habit_logs').all()[0].completed).toBe(1)
  })
})

describe('PASO 3 · Roundtrip export → import (db:importData)', () => {
  it('restaura los datos vía db:importData', async () => {
    db.prepare('DELETE FROM tasks').run()
    db.prepare('DELETE FROM xp_log').run()
    db.prepare('DELETE FROM habit_logs').run()
    db.prepare('INSERT INTO tasks (id, title, priority, completed, deleted) VALUES (7, ?, ?, 1, 0)').run('Matemática', 'media')

    const exported = await ipc.invoke('db:exportData')
    db.prepare('DELETE FROM tasks').run()

    expect(await ipc.invoke('db:importData', exported)).toBe(true)
    expect(db.prepare('SELECT * FROM tasks').all()[0].title).toBe('Matemática')
  })
})

describe('PASO 4 · auto-backup diario (core/auto-backup.js)', () => {
  const today = new Date().toISOString().split('T')[0]

  it('crea un archivo por día, lo lista y deduplica', () => {
    db.prepare('DELETE FROM tasks').run()
    db.prepare('INSERT INTO tasks (id, title, priority, completed, deleted) VALUES (9, ?, ?, 0, 0)').run('Pomodoro', 'alta')

    const r1 = doAutoBackup({ ...depsFor(tmpDir), logger: { error: () => {} } })
    expect(r1.skipped).toBe(false)
    expect(r1.filename).toBe(`backup-${today}.json`)

    const filePath = path.join(tmpDir, 'backups', r1.filename)
    expect(fs.existsSync(filePath)).toBe(true)
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    expect(parsed.tasks).toHaveLength(1)
    expect(parsed.xp_log).toEqual([])

    const r2 = doAutoBackup({ ...depsFor(tmpDir), logger: { error: () => {} } })
    expect(r2.skipped).toBe(true)
    const files = fs.readdirSync(path.join(tmpDir, 'backups'))
    expect(files.filter(f => f.startsWith('backup-'))).toHaveLength(1)
  })

  it('backup.list() devuelve el archivo y backup.restore() restaura', async () => {
    const list = await ipc.invoke('db:listBackups')
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list[0].date).toBe(today)
    expect(list[0].filename).toBe(`backup-${today}.json`)
    expect(typeof list[0].size).toBe('number')

    db.prepare('DELETE FROM tasks').run()
    expect(db.prepare('SELECT * FROM tasks').all()).toHaveLength(0)

    expect(await ipc.invoke('db:restoreBackup', list[0].filename)).toBe(true)
    expect(db.prepare('SELECT * FROM tasks').all()).toHaveLength(1)
  })

  it('backup.list() vacío si no hay directorio', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-empty-'))
    const ipc2 = makeStubIpcMain()
    backupModule.register(ipc2, depsFor(empty))
    expect(await ipc2.invoke('db:listBackups')).toEqual([])
    try { fs.rmSync(empty, { recursive: true, force: true }) } catch {}
  })
})

describe('PASO 5 · Casos de error', () => {
  it('restoreBackup con archivo inexistente rechaza', async () => {
    await expect(ipc.invoke('db:restoreBackup', 'no-existe.json')).rejects.toThrow('Backup not found')
  })

  it('restoreFromJSON con JSON inválido rechaza', async () => {
    await expect(ipc.invoke('db:restoreFromJSON', '{ json roto')).rejects.toThrow()
  })
})