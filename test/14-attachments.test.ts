/**
 * ============================================================================
 *  14-attachments.test.ts — Adjuntos genéricos (handlers reales)
 * ============================================================================
 *
 *  Verifica el handler `electron/handlers/attachments.js` sobre SQLite real
 *  (en memoria) y un sistema de ficheros temporal:
 *
 *    A. `attachments:add` copia el archivo y persiste la fila.
 *    B. `attachments:list` devuelve los adjuntos de la entidad.
 *    C. `attachments:open` abre el archivo existente con shell.openPath.
 *    D. `attachments:delete` borra la fila y el archivo del disco.
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/14-attachments.test.ts
 * ============================================================================
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import os from 'node:os'
import nodeFs from 'node:fs'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')
const electronRoot = path.resolve(__dirname, '../electron')
const { safeHandle, voidSchema, z } = require(path.join(electronRoot, 'core', 'safe-handle'))

let db: any
let ipc: any
let shell: any
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

function register(mod: string, ipc: any, extra: Record<string, any> = {}) {
  const deps: any = {
    getStmt: (sql: string) => db.prepare(sql),
    getDb: () => db,
    safeHandle,
    schemas: {},
    voidSchema,
    z,
    ...extra,
  }
  require(path.join(electronRoot, 'handlers', mod)).register(ipc, deps)
  return ipc
}

describe('Adjuntos genéricos de tareas', () => {
  beforeAll(() => {
    tmpDir = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'attach-test-'))
    nodeFs.writeFileSync(path.join(tmpDir, 'doc.pdf'), 'hello')

    db = new DatabaseSync(':memory:')
    db.exec(`CREATE TABLE workspaces (id INTEGER PRIMARY KEY, name TEXT)`)
    db.exec(`CREATE TABLE tasks (id INTEGER PRIMARY KEY, workspace_id INTEGER)`)
    db.exec(`CREATE TABLE attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      storage_path TEXT NOT NULL,
      checksum TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
    db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run(1, 'Personal')
    db.prepare('INSERT INTO tasks (id, workspace_id) VALUES (?, ?)').run(1, 1)

    ipc = makeStubIpcMain()
    shell = { openPath: vi.fn() }
    register('attachments', ipc, {
      fs: nodeFs,
      path,
      crypto: require('node:crypto'),
      app: { getPath: () => tmpDir },
      mainWindow: {},
      shell,
      dialog: { showOpenDialog: vi.fn(async () => ({ canceled: false, filePaths: [path.join(tmpDir, 'doc.pdf')] })) },
    })
  })

  it('A · attachments:add copia el archivo y persiste la fila', async () => {
    const row = await ipc.invoke('attachments:add', { entityType: 'task', entityId: 1 })
    expect(row).toBeTruthy()
    expect(row.file_name).toBe('doc.pdf')
    expect(row.workspace_id).toBe(1)
    expect(nodeFs.existsSync(path.join(tmpDir, 'attachments', row.storage_path))).toBe(true)
  })

  it('B · attachments:list devuelve un adjunto', async () => {
    const rows = await ipc.invoke('attachments:list', { entityType: 'task', entityId: 1 })
    expect(Array.isArray(rows)).toBe(true)
    expect(rows).toHaveLength(1)
  })

  it('C · attachments:open abre el archivo', async () => {
    const rows = await ipc.invoke('attachments:list', { entityType: 'task', entityId: 1 })
    const ok = await ipc.invoke('attachments:open', rows[0].id)
    expect(ok).toBe(true)
    expect(shell.openPath).toHaveBeenCalledTimes(1)
  })

  it('D · attachments:delete borra la fila y el archivo', async () => {
    const rows = await ipc.invoke('attachments:list', { entityType: 'task', entityId: 1 })
    const id = rows[0].id
    const storagePath = rows[0].storage_path
    const ok = await ipc.invoke('attachments:delete', id)
    expect(ok).toBe(true)
    const after = await ipc.invoke('attachments:list', { entityType: 'task', entityId: 1 })
    expect(after).toHaveLength(0)
    expect(nodeFs.existsSync(path.join(tmpDir, 'attachments', storagePath))).toBe(false)
  })
})
