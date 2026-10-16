/**
 * ============================================================================
 *  18-roadmap-gaps.test.ts — Cierres de brechas del roadmap
 * ============================================================================
 *
 *    A. Filtrado de navegación por perfil de usuario
 *       (constants/tabs.ts → getVisibleTabs / getVisibleHubs)
 *    B. `populateSearchIndex` indexa study_topics y flashcards
 *       (handlers/search.js)
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/18-roadmap-gaps.test.ts
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import { HUBS, TABS, getVisibleTabs, getVisibleHubs } from '../src/constants/tabs'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')
const electronRoot = path.resolve(__dirname, '../electron')
const { populateSearchIndex } = require(path.join(electronRoot, 'handlers', 'search'))

describe('A · navegación por perfil', () => {
  it('custom muestra todos los hubs y tabs', () => {
    expect(getVisibleHubs('custom').length).toBe(HUBS.length)
    expect(getVisibleTabs('custom').length).toBe(TABS.length)
  })

  it('student oculta tabs de desarrollo', () => {
    const ids = getVisibleTabs('student').map(t => t.id)
    expect(ids).not.toContain('snippets')
    expect(ids).not.toContain('automation')
    expect(ids).toContain('cursos')
  })

  it('developer oculta tabs de estudio y no deja hubs vacíos', () => {
    const hubs = getVisibleHubs('developer')
    const ids = hubs.flatMap(h => h.tabs.map(t => t.id))
    expect(ids).not.toContain('cursos')
    expect(ids).not.toContain('flashcards')
    expect(ids).toContain('snippets')
    for (const hub of hubs) expect(hub.tabs.length).toBeGreaterThan(0)
  })

  it('un perfil desconocido se comporta como custom', () => {
    expect(getVisibleTabs('desconocido').length).toBe(TABS.length)
  })
})

describe('B · populateSearchIndex', () => {
  let db: any

  beforeAll(() => {
    db = new DatabaseSync(':memory:')
    ;(db as any).transaction = (fn: any) => fn
    db.exec(`CREATE TABLE search_index (entity_type TEXT, entity_id TEXT, workspace_id TEXT, title TEXT, body TEXT, tags TEXT)`)
    db.exec(`CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT, description TEXT, tags TEXT, workspace_id INTEGER, deleted INTEGER DEFAULT 0)`)
    db.exec(`CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT, content TEXT, workspace_id INTEGER, deleted INTEGER DEFAULT 0)`)
    db.exec(`CREATE TABLE snippets (id INTEGER PRIMARY KEY, title TEXT, code TEXT, description TEXT, tags TEXT, workspace_id INTEGER)`)
    db.exec(`CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT, description TEXT, workspace_id INTEGER, deleted INTEGER DEFAULT 0)`)
    db.exec(`CREATE TABLE habits (id INTEGER PRIMARY KEY, name TEXT, workspace_id INTEGER, deleted INTEGER DEFAULT 0)`)
    db.exec(`CREATE TABLE daily_logs (id INTEGER PRIMARY KEY, date TEXT, content TEXT, focus TEXT, blockers TEXT, workspace_id INTEGER)`)
    db.exec(`CREATE TABLE study_topics (id INTEGER PRIMARY KEY, name TEXT, description TEXT, workspace_id INTEGER)`)
    db.exec(`CREATE TABLE flashcards (id INTEGER PRIMARY KEY, front TEXT, back TEXT)`)
    db.prepare(`INSERT INTO study_topics (id, name, description, workspace_id) VALUES (1, 'Derivadas', 'Reglas de derivación', 1)`).run()
    db.prepare(`INSERT INTO flashcards (id, front, back) VALUES (1, '¿Derivada de x^2?', '2x')`).run()
    populateSearchIndex(() => db)
  })

  function countByType(type: string): number {
    return db.prepare('SELECT COUNT(*) as c FROM search_index WHERE entity_type = ?').get(type).c
  }

  it('indexa los temas de estudio', () => {
    expect(countByType('topic')).toBe(1)
    const row = db.prepare("SELECT title FROM search_index WHERE entity_type = 'topic'").get()
    expect(row.title).toBe('Derivadas')
  })

  it('indexa las flashcards', () => {
    expect(countByType('flashcard')).toBe(1)
    const row = db.prepare("SELECT title, body FROM search_index WHERE entity_type = 'flashcard'").get()
    expect(row.title).toBe('¿Derivada de x^2?')
    expect(row.body).toBe('2x')
  })
})
