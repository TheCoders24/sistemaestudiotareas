/**
 * ============================================================================
 *  22-wifi-sync.test.ts — Sincronización WiFi local (electron/handlers/sync.js)
 * ============================================================================
 *
 *  Cubre el merge genérico usado por la sincronización LAN:
 *
 *    A. `mergeSyncData` inserta filas nuevas y actualiza las existentes por PK.
 *    B. Soporta tablas cuya PK no se llama `id` (p. ej. `settings.key`).
 *    C. Ignora tablas que no están en ALL_TABLES (whitelist anti-inyección).
 *    D. `exportAllData` incluye `_exportDate` y las tablas presentes.
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/22-wifi-sync.test.ts
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')
const electronRoot = path.resolve(__dirname, '../electron')
const { mergeSyncData, exportAllData } = require(path.join(electronRoot, 'handlers', 'sync'))

let db: any

function makeDb() {
  db = new DatabaseSync(':memory:')
  ;(db as any).transaction = (fn: any) => fn
  db.exec(`CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT, completed INTEGER DEFAULT 0)`)
  db.exec(`CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)`)
  db.exec(`CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT)`)
}

describe('WiFi Sync · mergeSyncData genérico', () => {
  beforeEach(() => makeDb())

  it('inserta filas nuevas y actualiza las existentes por id', () => {
    mergeSyncData(null, () => db, {
      _exportDate: 'x',
      tasks: [{ id: 1, title: 'uno' }, { id: 2, title: 'dos' }],
    })
    expect(db.prepare('SELECT COUNT(*) c FROM tasks').get().c).toBe(2)

    mergeSyncData(null, () => db, { tasks: [{ id: 2, title: 'dos editado' }] })
    expect(db.prepare('SELECT title FROM tasks WHERE id = 2').get().title).toBe('dos editado')
    expect(db.prepare('SELECT COUNT(*) c FROM tasks').get().c).toBe(2)
  })

  it('soporta tablas con PK que no se llama id (settings.key)', () => {
    mergeSyncData(null, () => db, { settings: [{ key: 'tema', value: 'oscuro' }] })
    expect(db.prepare("SELECT value FROM settings WHERE key = 'tema'").get().value).toBe('oscuro')

    mergeSyncData(null, () => db, { settings: [{ key: 'tema', value: 'claro' }] })
    expect(db.prepare('SELECT COUNT(*) c FROM settings').get().c).toBe(1)
    expect(db.prepare("SELECT value FROM settings WHERE key = 'tema'").get().value).toBe('claro')
  })

  it('ignora tablas que no están en ALL_TABLES (whitelist)', () => {
    mergeSyncData(null, () => db, { evil_table: [{ id: 1, x: 1 }], notes: [{ id: 1, title: 'ok' }] })
    expect(() => db.prepare('SELECT * FROM evil_table').all()).toThrow()
    expect(db.prepare('SELECT COUNT(*) c FROM notes').get().c).toBe(1)
  })

  it('ignora columnas que no existen en la tabla destino', () => {
    mergeSyncData(null, () => db, { tasks: [{ id: 5, title: 'seguro', columna_falsa: 'x' }] })
    expect(db.prepare('SELECT title FROM tasks WHERE id = 5').get().title).toBe('seguro')
  })

  it('exportAllData incluye _exportDate y las tablas presentes', () => {
    db.prepare('INSERT INTO tasks (id, title) VALUES (1, ?)').run('hola')
    const data = exportAllData(() => db)
    expect(typeof data._exportDate).toBe('string')
    expect(Array.isArray(data.tasks)).toBe(true)
    expect(data.tasks.length).toBe(1)
  })
})
