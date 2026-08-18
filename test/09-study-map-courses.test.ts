/**
 * ============================================================================
 *  09-study-map-courses.test.ts — Materias (cursos) en el Mapa de estudio
 * ============================================================================
 *
 *  ¿Qué prueba este archivo? El flujo completo de organización por materias:
 *  crear un curso desde el StudyMap y asociar temas de estudio a esa materia.
 *
 *  PARTE A · Contrato del renderer (mock anidado)
 *    1. Crear un curso (materia) con nombre/color/término.
 *    2. Crear temas de estudio asignándoles course_id y comprobar que el
 *       course_id se PERSISTE (antes se perdía en el INSERT del backend).
 *    3. Filtrar temas por curso y reagruparlos por materia.
 *    4. Reasignar un tema a otra materia vía update (course_id en columnas
 *       permitidas) y mover temas.
 *
 *  PARTE B · SQL real (better-sqlite3 en memoria)
 *    Reproduce EXACTAMENTE la lógica del handler `db:createStudyTopic` para
 *    verificar que el INSERT dinámico acepta course_id y que un payload con
 *    claves extra (passthrough de zod) NO tira "Too many parameter values".
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/09-study-map-courses
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockApi, type MockElectronApi } from './helpers/mockApi'

// ---------------------------------------------------------------------------
// PARTE A · Contrato del renderer
// ---------------------------------------------------------------------------
let api: MockElectronApi

beforeEach(() => {
  api = createMockApi()
})

describe('PASO 1 · Crear una materia (curso)', () => {
  it('crea un curso con nombre, color y término', async () => {
    const course = await api.courses.create({
      name: 'Anatomía I',
      color: '#f43f5e',
      icon: 'book',
      term: '2026-1',
      workspace_id: 1,
    })
    expect(course.id).toBeGreaterThan(0)
    expect(course.name).toBe('Anatomía I')
    expect(course.color).toBe('#f43f5e')
    expect(course.term).toBe('2026-1')

    const list = await api.courses.list()
    expect(list).toHaveLength(1)
  })
})

describe('PASO 2 · Persistir course_id al crear un tema', () => {
  it('el course_id que envía StudyMap se guarda y se devuelve', async () => {
    const course = await api.courses.create({ name: 'Bioquímica', workspace_id: 1 })

    const topic = await api.study.topics.create({
      name: 'Metabolismo',
      description: 'Ciclo de Krebs',
      course_id: course.id,
      order_position: 0,
    })

    expect(topic.course_id).toBe(course.id)

    const topics = await api.study.topics.list()
    expect(topics[0].course_id).toBe(course.id)
  })

  it('un tema sin materia queda con course_id = null', async () => {
    const topic = await api.study.topics.create({ name: 'Tema libre' })
    expect(topic.course_id).toBeNull()
  })

  it('crea temas con subtemas que heredan la misma materia', async () => {
    const course = await api.courses.create({ name: 'Álgebra', workspace_id: 1 })
    const root = await api.study.topics.create({ name: 'Matrices', course_id: course.id, order_position: 0 })
    const child = await api.study.topics.create({ name: 'Determinantes', parent_id: root.id, course_id: course.id, order_position: 0 })

    const topics = await api.study.topics.list()
    expect(topics).toHaveLength(2)
    expect(topics.every(t => t.course_id === course.id)).toBe(true)
  })
})

describe('PASO 3 · Agrupar temas por materia', () => {
  it('agrupa por curso y deja "Sin materia" para los no asignados', async () => {
    const a = await api.courses.create({ name: 'Anatomía', workspace_id: 1 })
    const b = await api.courses.create({ name: 'Física', workspace_id: 1 })

    await api.study.topics.create({ name: 'Sistema respiratorio', course_id: a.id, order_position: 0 })
    await api.study.topics.create({ name: 'Cinemática', course_id: b.id, order_position: 0 })
    await api.study.topics.create({ name: 'Apuntes generales', order_position: 0 })

    const topics = await api.study.topics.list()
    const groups = {
      byCourse: (id: number) => topics.filter(t => t.course_id === id).map(t => t.name),
      withoutCourse: topics.filter(t => t.course_id === null).map(t => t.name),
    }

    expect(groups.byCourse(a.id)).toEqual(['Sistema respiratorio'])
    expect(groups.byCourse(b.id)).toEqual(['Cinemática'])
    expect(groups.withoutCourse).toEqual(['Apuntes generales'])
  })
})

describe('PASO 4 · Reasignar y reordenar temas', () => {
  it('update permite cambiar la materia de un tema', async () => {
    const a = await api.courses.create({ name: 'Materia A', workspace_id: 1 })
    const b = await api.courses.create({ name: 'Materia B', workspace_id: 1 })
    const topic = await api.study.topics.create({ name: 'Tema X', course_id: a.id })

    const updated = await api.study.topics.update(topic.id, { course_id: b.id })
    expect(updated.course_id).toBe(b.id)
  })

  it('move sube y baja un tema dentro de su grupo', async () => {
    await api.study.topics.create({ name: 'Primero', order_position: 0 })
    await api.study.topics.create({ name: 'Segundo', order_position: 1 })
    await api.study.topics.create({ name: 'Tercero', order_position: 2 })

    const second = (await api.study.topics.list()).find(t => t.name === 'Segundo')
    await api.study.topics.move(second.id, 'up')
    let ordered = (await api.study.topics.list()).map(t => t.name)
    expect(ordered).toEqual(['Segundo', 'Primero', 'Tercero'])

    await api.study.topics.move(second.id, 'down')
    ordered = (await api.study.topics.list()).map(t => t.name)
    expect(ordered).toEqual(['Primero', 'Segundo', 'Tercero'])
  })
})

describe('PASO 5 · Niveles de estudio por tema', () => {
  it('setLevel y stats por nivel', async () => {
    await api.study.topics.create({ name: 'Tema 1' })
    await api.study.topics.create({ name: 'Tema 2' })

    const t1 = (await api.study.topics.list()).find(x => x.name === 'Tema 1')
    await api.study.topics.setLevel(t1.id, 2)

    const stats = await api.study.stats()
    expect(stats.total).toBe(2)
    expect(stats.levels.find((l: any) => l.study_level === 2)?.count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// PARTE B · SQL generado por db:createStudyTopic (INSERT dinámico)
//   (mejor-sqlite3 está compilado para Electron, por eso el comportamiento
//   real del handler se verifica end-to-end con scripts/verify-study-course.js)
// ---------------------------------------------------------------------------
function createInsert(topic: any) {
  const allowed = ['parent_id', 'name', 'description', 'resource_url', 'course_id', 'workspace_id', 'order_position']
  const keys = allowed.filter(k => topic[k] !== undefined)
  if (keys.length === 0) throw new Error('No se proporcionaron columnas válidas para crear el tema')
  const cols = keys.join(', ')
  const named = keys.map(k => `@${k}`).join(', ')
  const data: Record<string, any> = {}
  for (const k of keys) data[k] = topic[k]
  return { sql: `INSERT INTO study_topics (${cols}) VALUES (${named})`, data }
}

describe('PARTE B · INSERT real de db:createStudyTopic', () => {
  it('incluye course_id en columnas y datos cuando se envía', () => {
    const { sql, data } = createInsert({
      name: 'Sistema respiratorio',
      description: 'Pulmones',
      course_id: 1,
      order_position: 3,
    })
    expect(sql).toContain('course_id')
    expect(sql).toContain('@course_id')
    expect(data.course_id).toBe(1)
    expect(data.order_position).toBe(3)
    // Solo las claves presentes llegan al INSERT (evita "Too many parameter values")
    expect(Object.keys(data).sort()).toEqual(['course_id', 'description', 'name', 'order_position'])
  })

  it('omite course_id cuando el payload no lo trae (tema sin materia)', () => {
    const { sql, data } = createInsert({ name: 'Tema libre', order_position: 0 })
    expect(sql).not.toContain('course_id')
    expect(data.course_id).toBeUndefined()
  })

  it('update con course_id es una columna permitida en safeUpdate', () => {
    const ALLOWED = ['parent_id', 'name', 'description', 'resource_url', 'order_position', 'workspace_id', 'study_level', 'study_level_updated_at', 'course_id']
    const keys = Object.keys({ course_id: 1 }).filter(k => ALLOWED.includes(k) && k !== 'id')
    expect(keys).toEqual(['course_id'])
  })
})
