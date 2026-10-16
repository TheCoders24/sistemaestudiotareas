/**
 * ============================================================================
 *  19-templates.test.ts — Plantillas (Fase 5)
 * ============================================================================
 *
 *  Verifica el handler `templates:instantiate` (electron/handlers/templates.js):
 *
 *    A. Plantilla de proyecto → crea el proyecto con tokens resueltos.
 *    B. Plantilla de tablero kanban → crea tarjetas reales.
 *    C. Plan de estudio → crea curso + temas + mazo de flashcards + meta.
 *    D. Transaccionalidad: si falla a mitad, hace rollback completo.
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/19-templates.test.ts
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')
const electronRoot = path.resolve(__dirname, '../electron')
const { safeHandle, voidSchema, z } = require(path.join(electronRoot, 'core', 'safe-handle'))
const schemas = require(path.join(electronRoot, 'core', 'schemas'))

let db: any
let ipc: any

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

function insertTemplate(id: number, type: string, name: string, payload: unknown) {
  db.prepare('INSERT INTO templates (id, type, name, description, payload, is_builtin) VALUES (?, ?, ?, ?, ?, 1)')
    .run(id, type, name, '', JSON.stringify(payload))
}

beforeAll(() => {
  db = new DatabaseSync(':memory:')
  db.transaction = (fn: any) => () => {
    db.exec('BEGIN')
    try {
      const result = fn()
      db.exec('COMMIT')
      return result
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }
  db.exec(`CREATE TABLE templates (id INTEGER PRIMARY KEY, type TEXT, name TEXT, description TEXT, payload TEXT, is_builtin INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`)
  db.exec(`CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', color TEXT, status TEXT, workspace_id INTEGER)`)
  db.exec(`CREATE TABLE courses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, color TEXT, term TEXT, workspace_id INTEGER)`)
  db.exec(`CREATE TABLE kanban_columns (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, color TEXT, wip_limit INTEGER, position INTEGER, workspace_id INTEGER)`)
  db.exec(`CREATE TABLE kanban_cards (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '', column_type TEXT, position INTEGER, priority TEXT, tags TEXT, workspace_id INTEGER)`)
  db.exec(`CREATE TABLE study_topics (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', order_position INTEGER, course_id INTEGER, workspace_id INTEGER)`)
  db.exec(`CREATE TABLE flashcard_decks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', course_id INTEGER)`)
  db.exec(`CREATE TABLE goals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, type TEXT, target INTEGER, metric TEXT, workspace_id INTEGER)`)

  insertTemplate(1, 'project', 'Proyecto de Tesis', { project: { name: '{{name}}', description: '{{description}}', color: '#6366f1' } })
  insertTemplate(2, 'kanban_board', 'Tablero Ágil', { kanbanCards: [
    { title: 'Backlog', column_type: 'pendiente' },
    { title: 'En curso', column_type: 'progreso' },
  ] })
  insertTemplate(3, 'study_plan', 'Repaso 30 Días', {
    course: { name: '{{name}}', color: '#6366f1' },
    studyTopics: [
      { name: 'Semana 1', order_position: 1 },
      { name: 'Semana 2', order_position: 2 },
    ],
    flashcardDecks: [{ name: '{{name}} - Flashcards' }],
    goal: { title: 'Repaso diario', type: 'daily', target: 1, metric: 'pomodoros' },
  })
  insertTemplate(4, 'project', 'Rota a propósito', { project: { name: 'Proyecto huérfano' }, studyTopics: [{ name: null }] })

  ipc = makeStubIpcMain()
  const deps: any = { getStmt: (sql: string) => db.prepare(sql), getDb: () => db, safeHandle, schemas, voidSchema, z }
  require(path.join(electronRoot, 'handlers', 'templates')).register(ipc, deps)
})

describe('Fase 5 · templates:instantiate', () => {
  it('crea un proyecto resolviendo los tokens', async () => {
    const res = await ipc.invoke('templates:instantiate', { templateId: 1, params: { name: 'Mi Tesis', description: 'TFG', workspace_id: 1 } })
    expect(res.projects.length).toBe(1)
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(res.projects[0])
    expect(project.name).toBe('Mi Tesis')
    expect(project.description).toBe('TFG')
  })

  it('crea las tarjetas de un tablero kanban', async () => {
    const res = await ipc.invoke('templates:instantiate', { templateId: 2, params: { workspace_id: 1 } })
    expect(res.kanbanCards.length).toBe(2)
    const cards = db.prepare('SELECT * FROM kanban_cards').all()
    expect(cards.map((c: any) => c.column_type).sort()).toEqual(['pendiente', 'progreso'])
  })

  it('crea curso, temas, mazo y meta desde un plan de estudio', async () => {
    const res = await ipc.invoke('templates:instantiate', { templateId: 3, params: { name: 'Anatomía', workspace_id: 1 } })
    expect(res.courses.length).toBe(1)
    expect(res.studyTopics.length).toBe(2)
    expect(res.flashcardDecks.length).toBe(1)
    expect(res.goals.length).toBe(1)

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(res.courseId)
    expect(course.name).toBe('Anatomía')

    const topics = db.prepare('SELECT * FROM study_topics WHERE course_id = ?').all(res.courseId)
    expect(topics.length).toBe(2)
    const deck = db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(res.flashcardDecks[0])
    expect(deck.course_id).toBe(res.courseId)
    expect(deck.name).toBe('Anatomía - Flashcards')
  })

  it('hace rollback completo si falla a mitad', async () => {
    const before = db.prepare('SELECT COUNT(*) as c FROM projects').get().c
    await expect(
      ipc.invoke('templates:instantiate', { templateId: 4, params: { workspace_id: 1 } })
    ).rejects.toThrow()
    const after = db.prepare('SELECT COUNT(*) as c FROM projects').get().c
    expect(after).toBe(before)
  })
})
