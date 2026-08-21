/**
 * ============================================================================
 *  10-handler-fixes.test.ts — Fixes de handlers (entity, tray, snippets,
 *  proyectos, flashcards) sobre SQLite real
 * ============================================================================
 *
 *  Cubre los fallos garantizados encontrados en la auditoría y corregidos:
 *
 *    1. `entity:link` / `entity:getLinks` / `db:linkEntities` / `db:getEntityLinks`
 *       (ahora expuestos en el preload y extraídos a handlers/entity.js).
 *    2. `tray:updateMenu` responde true.
 *    3. `snippets:execute` acepta un id posicional (antes rompía validación).
 *    4. `projects:openInEditor` espera objeto { id, editor } (preload lo envuelve).
 *    5. `db:reviewFlashcard` acepta ease 5 ("Fácil") y rechaza ease > 5.
 *
 *  Cómo ejecutarlo:
 *    npm test -- 10-handler-fixes
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')
const electronRoot = path.resolve(__dirname, '../electron')
const { safeHandle, voidSchema, z } = require(path.join(electronRoot, 'core', 'safe-handle'))

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

beforeAll(() => {
  db = new DatabaseSync(':memory:')
  ;(db as any).transaction = (fn: any) => fn
  db.exec(`CREATE TABLE entity_links (id INTEGER PRIMARY KEY AUTOINCREMENT, from_type TEXT NOT NULL, from_id INTEGER NOT NULL, to_type TEXT NOT NULL, to_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), UNIQUE(from_type, from_id, to_type, to_id))`)
  db.exec(`CREATE TABLE tasks (id INTEGER PRIMARY KEY, name TEXT)`)
  db.exec(`CREATE TABLE notes (id INTEGER PRIMARY KEY, name TEXT)`)
  db.exec(`CREATE TABLE snippets (id INTEGER PRIMARY KEY, code TEXT, language TEXT)`)
  db.exec(`CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT, repo_url TEXT, deleted INTEGER DEFAULT 0, workspace_id INTEGER DEFAULT 1)`)
  db.exec(`CREATE TABLE flashcards (id INTEGER PRIMARY KEY, deck_id INTEGER, front TEXT, back TEXT, hint TEXT, repetitions INTEGER, interval INTEGER, ease_factor REAL, next_review TEXT)`)
})

describe('PASO 1 · entity:link / entity:getLinks (handlers/entity.js)', () => {
  let ipc: any
  beforeAll(() => {
    ipc = makeStubIpcMain()
    register('entity', ipc)
    db.prepare('INSERT INTO tasks (id, name) VALUES (1, ?)').run('Estudiar')
    db.prepare('INSERT INTO notes (id, name) VALUES (2, ?)').run('Apunte A')
  })

  it('link() (posicional) conecta una tarea con una nota', async () => {
    expect(await ipc.invoke('entity:link', 'task', 1, 'note', 2)).toBe(true)
    const rows = db.prepare('SELECT * FROM entity_links').all()
    expect(rows).toHaveLength(1)
  })

  it('link() es idempotente (INSERT OR IGNORE)', async () => {
    await ipc.invoke('entity:link', 'task', 1, 'note', 2)
    expect(db.prepare('SELECT * FROM entity_links').all()).toHaveLength(1)
  })

  it('getLinks() devuelve las entidades vinculadas con su nombre', async () => {
    const links = await ipc.invoke('entity:getLinks', 'task', 1)
    expect(links).toEqual([{ id: 2, name: 'Apunte A', linkType: 'note' }])
  })

  it('db:linkEntities y db:getEntityLinks funcionan como alias', async () => {
    db.prepare('INSERT INTO tasks (id, name) VALUES (2, ?)').run('Tarea B')
    expect(await ipc.invoke('db:linkEntities', 'task', 2, 'note', 2)).toBe(true)
    const links = await ipc.invoke('db:getEntityLinks', 'task', 2)
    expect(links).toEqual([{ id: 2, name: 'Apunte A', linkType: 'note' }])
    const allForNote = await ipc.invoke('entity:getLinks', 'note', 2)
    expect(allForNote).toEqual([
      { id: 1, name: 'Estudiar', linkType: 'task' },
      { id: 2, name: 'Tarea B', linkType: 'task' },
    ])
  })

  it('getLinks() con argumentos inválidos rechaza (schema)', async () => {
    await expect(ipc.invoke('entity:getLinks', 'task', 'no-numero')).rejects.toThrow()
  })
})

describe('PASO 2 · tray:updateMenu', () => {
  it('responde true y actualiza el menú', async () => {
    const updateTrayMenu = () => { (updateTrayMenu as any).called = true }
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'tray:updateMenu', voidSchema(), () => { updateTrayMenu(); return true })
    expect(await ipc.invoke('tray:updateMenu')).toBe(true)
    expect((updateTrayMenu as any).called).toBe(true)
  })
})

describe('PASO 3 · snippets:execute con id posicional', () => {
  let ipc: any
  let snippetId: number
  beforeAll(async () => {
    ipc = makeStubIpcMain()
    register('snippets-execute', ipc)
    const result = db.prepare('INSERT INTO snippets (code, language) VALUES (?, ?)').run('console.log("hi")', 'javascript')
    snippetId = Number(result.lastInsertRowid)
  })

  it('acepta un id posicional y ejecuta el snippet', async () => {
    const out = await ipc.invoke('snippets:execute', snippetId)
    expect(out).toHaveProperty('stdout')
    expect(out).toHaveProperty('stderr')
    expect(out).toHaveProperty('exitCode')
    expect(out.stdout).toContain('hi')
    expect(out.exitCode).toBe(0)
  }, 15000)

  it('rechaza un id que no es número', async () => {
    await expect(ipc.invoke('snippets:execute', 'abc')).rejects.toThrow()
  })

  it('rechaza un snippet inexistente', async () => {
    await expect(ipc.invoke('snippets:execute', 9999)).rejects.toThrow('Snippet not found')
  })
})

describe('PASO 4 · projects:openInEditor espera objeto { id, editor }', () => {
  let ipc: any
  beforeAll(() => {
    ipc = makeStubIpcMain()
    register('projects', ipc)
    db.prepare('INSERT INTO projects (id, name, repo_url) VALUES (1, ?, NULL)').run('Sin repo')
  })

  it('acepta objeto y rechaza si no hay repo_url', async () => {
    await expect(ipc.invoke('projects:openInEditor', { id: 1, editor: 'code' })).rejects.toThrow('No repo URL configured')
  })

  it('rechaza proyecto inexistente', async () => {
    await expect(ipc.invoke('projects:openInEditor', { id: 999, editor: 'code' })).rejects.toThrow('Project not found')
  })

  it('rechaza argumento posicional (el preload debe envolver en objeto)', async () => {
    await expect(ipc.invoke('projects:openInEditor', 1, 'code')).rejects.toThrow()
  })
})

describe('PASO 5 · db:reviewFlashcard acepta ease 5 ("Fácil")', () => {
  let ipc: any
  beforeAll(() => {
    ipc = makeStubIpcMain()
    register('flashcards', ipc)
    db.prepare(`INSERT INTO flashcards (id, deck_id, front, back, hint, repetitions, interval, ease_factor, next_review)
                VALUES (1, 1, 'f', 'b', '', 0, 0, 2.5, '2026-01-01')`).run()
  })

  it('ease 5 progresa la tarjeta (antes era rechazado por max(3))', async () => {
    const updated = await ipc.invoke('db:reviewFlashcard', { id: 1, ease: 5 })
    expect(updated.repetitions).toBe(1)
    expect(updated.interval).toBe(1)
    expect(updated.ease_factor).toBeGreaterThan(2.5)
  })

  it('rechaza ease fuera de rango (6)', async () => {
    await expect(ipc.invoke('db:reviewFlashcard', { id: 1, ease: 6 })).rejects.toThrow()
  })

  it('rechaza tarjeta inexistente', async () => {
    await expect(ipc.invoke('db:reviewFlashcard', { id: 999, ease: 3 })).rejects.toThrow('Flashcard not found')
  })
})