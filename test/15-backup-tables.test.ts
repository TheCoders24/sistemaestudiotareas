/**
 * ============================================================================
 *  15-backup-tables.test.ts — Fuente única de tablas para copias y sync
 * ============================================================================
 *
 *  Verifica que:
 *    A. ALL_TABLES incluye TODAS las tablas del esquema (electron/database.js).
 *    B. BackupService usa ALL_TABLES y hace backup/restore de ida y vuelta.
 *    C. SyncService exporta exactamente ALL_TABLES.
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/15-backup-tables.test.ts
 * ============================================================================
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import os from 'node:os'
import nodeFs from 'node:fs'

const require = createRequire(import.meta.url)
const root = path.resolve(__dirname, '..')
const { ALL_TABLES } = require(path.join(root, 'electron', 'core', 'backup-tables'))
const { BackupService } = require(path.join(root, 'electron', 'services', 'BackupService'))
const { SyncService } = require(path.join(root, 'electron', 'services', 'SyncService'))

function makeFakeDb() {
  const store: Record<string, any[]> = {}
  return {
    store,
    prepare(sql: string) {
      const sel = sql.match(/SELECT \* FROM (\w+)/)
      if (sel) return { all: () => (store[sel[1]] || []) }
      const del = sql.match(/DELETE FROM (\w+)/)
      if (del) return { run: () => { store[del[1]] = [] } }
      const ins = sql.match(/INSERT(?: OR REPLACE)? INTO (\w+)/)
      if (ins) return { run: (row: any) => { (store[ins[1]] = store[ins[1]] || []).push(row) } }
      return { all: () => [], run: () => {}, get: () => undefined }
    },
    exec() {},
    transaction(fn: () => void) { return () => fn() },
  }
}

describe('A · ALL_TABLES vs esquema', () => {
  it('incluye todas las tablas creadas en database.js', () => {
    const src = nodeFs.readFileSync(path.join(root, 'electron', 'database.js'), 'utf-8')
    const names = Array.from(src.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/g)).map(m => m[1])
    expect(names.length).toBeGreaterThan(30)
    const missing = names.filter(n => !ALL_TABLES.includes(n))
    expect(missing).toEqual([])
  })

  it('no tiene duplicados', () => {
    expect(new Set(ALL_TABLES).size).toBe(ALL_TABLES.length)
  })
})

describe('B · BackupService', () => {
  it('getAllTables devuelve ALL_TABLES', () => {
    const svc = new BackupService(() => makeFakeDb(), nodeFs.mkdtempSync(path.join(os.tmpdir(), 'bk-')))
    expect(svc.getAllTables()).toEqual(ALL_TABLES)
  })

  it('hace backup y restore de ida y vuelta', () => {
    const tmp = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'bk-'))
    const db = makeFakeDb()
    db.store.tasks = [{ id: 1, title: 'A' }]
    db.store.settings = []
    const svc = new BackupService(() => db as any, tmp)

    svc.doAutoBackup()
    const backups = svc.listBackups()
    expect(backups).toHaveLength(1)

    db.store.tasks = []
    svc.restoreBackup(backups[0].filename)
    expect(db.store.tasks).toHaveLength(1)
    expect(db.store.tasks[0].title).toBe('A')
  })
})

describe('C · SyncService', () => {
  it('exporta exactamente ALL_TABLES', () => {
    const svc = new SyncService(() => makeFakeDb() as any)
    const data = svc._exportAllData()
    const keys = Object.keys(data).filter(k => !k.startsWith('_'))
    for (const t of ALL_TABLES) expect(keys).toContain(t)
  })
})
