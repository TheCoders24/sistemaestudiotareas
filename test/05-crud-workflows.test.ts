/**
 * ============================================================================
 *  05-crud-workflows.test.ts — Flujos de usuario paso a paso (mock anidado)
 * ============================================================================
 *
 *  ¿Qué prueba este archivo? Flujos completos del usuario sobre el mock
 *  anidado de `window.electronAPI` (test/helpers/mockApi.ts), escritos como
 *  pasos de un recorrido real de la app. Complementa a `api-comprehensive`
 *  (CRUD unitario) con escenarios compuestos:
 *
 *    1. Crear una tarea, agregarle subtareas y marcar una como hecha.
 *    2. Etiquetar tareas y filtrarlas por etiqueta.
 *    3. Llevar un hábito diario (toggle) y calcular su racha.
 *    4. Registrar pomodoros y ver el total del día.
 *    5. Acumular XP y comprobar que el dashboard refleja tareas pendientes.
 *    6. Mover tarjetas de kanban entre columnas.
 *    7. Ciclo completo de papelera (borrar suave → restaurar → vaciar).
 *    8. Exportar datos y comprobar que contienen lo creado.
 *
 *  Cómo ejecutarlo:
 *    npm test -- 05-crud-workflows
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockApi, type MockElectronApi } from './helpers/mockApi'

let api: MockElectronApi

beforeEach(() => {
  api = createMockApi()
})

describe('PASO 1 · Tarea con subtareas', () => {
  it('crear tarea → agregar 2 subtareas → tachar una → listar', async () => {
    const task = await api.tasks.create({ title: 'Proyecto X', priority: 'alta' })
    expect(task.id).toBeGreaterThan(0)
    expect(task.completed).toBe(0)

    const sub1 = await api.subtasks.create({ task_id: task.id, title: 'Investigar' })
    const sub2 = await api.subtasks.create({ task_id: task.id, title: 'Implementar' })

    const subs = await api.subtasks.list(task.id)
    expect(subs).toHaveLength(2)

    await api.subtasks.toggle(sub1.id)
    const updated = await api.subtasks.list(task.id)
    expect(updated.find(s => s.id === sub1.id)?.completed).toBe(1)
    expect(updated.find(s => s.id === sub2.id)?.completed).toBe(0)
  })
})

describe('PASO 2 · Etiquetas en tareas', () => {
  it('agregar etiquetas, listar por etiqueta y quitar una', async () => {
    await api.tasks.create({ title: 'A', tags: 'js,react' })
    await api.tasks.create({ title: 'B', tags: 'python' })

    const jsTasks = await api.tasks.getByTag('js')
    expect(jsTasks.map((t: any) => t.title)).toEqual(['A'])

    const taskA = (await api.tasks.list()).find(t => t.title === 'A')
    await api.tasks.addTag(taskA.id, 'urgent')
    expect((await api.tasks.list()).find(t => t.id === taskA.id).tags).toContain('urgent')

    await api.tasks.removeTag(taskA.id, 'js')
    const after = (await api.tasks.list()).find(t => t.id === taskA.id)
    expect(after.tags).not.toContain('js')
    expect(after.tags).toContain('react')
  })
})

describe('PASO 3 · Hábitos y rachas', () => {
  it('toggle diario de un hábito y conteo de registros', async () => {
    const habit = await api.habits.create({ name: 'Leer', icon: 'book' })

    expect(await api.habits.logs.toggle(habit.id, '2026-07-20')).toBe(true)
    expect(await api.habits.logs.toggle(habit.id, '2026-07-21')).toBe(true)
    // Toggle del mismo día lo desmarca
    expect(await api.habits.logs.toggle(habit.id, '2026-07-21')).toBe(false)

    const logs = await api.habits.logs.list(habit.id)
    expect(logs).toHaveLength(1)
  })

  it('primera actualización de racha crea streak actual=1', async () => {
    const streak = await api.streaks.update('daily_study')
    expect(streak.current).toBe(1)
    expect(streak.max).toBe(1)
  })
})

describe('PASO 4 · Pomodoros y XP', () => {
  it('registrar 3 sesiones de pomodoro', async () => {
    await api.pomodoro.sessions.create({ task_id: 1, duration: 25 })
    await api.pomodoro.sessions.create({ task_id: 1, duration: 25 })
    await api.pomodoro.sessions.create({ task_id: 1, duration: 50 })

    const sessions = await api.pomodoro.sessions.list()
    expect(sessions).toHaveLength(3)
  })

  it('agregar XP incrementa el total', async () => {
    expect((await api.gamification.xp.get()).total).toBe(0)
    await api.gamification.xp.add(25, 'tarea completada')
    await api.gamification.xp.add(50, 'hábito cumplido')
    expect((await api.gamification.xp.get()).total).toBe(75)
  })
})

describe('PASO 5 · Dashboard refleja el estado', () => {
  it('crear 3 tareas, completar 1 → tasksPending = 2', async () => {
    const t1 = await api.tasks.create({ title: 'A' })
    await api.tasks.create({ title: 'B' })
    await api.tasks.create({ title: 'C' })
    await api.tasks.toggle(t1.id)

    const dash = await api.dashboard.get()
    expect(dash.tasksPending).toBe(2)
  })
})

describe('PASO 6 · Kanban', () => {
  it('crear tarjeta y moverla de columna', async () => {
    const card = await api.kanban.cards.create({ title: 'Feature', column_type: 'pendiente' })
    expect(card.column_type).toBe('pendiente')

    await api.kanban.cards.move(card.id, 'en-progreso', 0)
    const cards = await api.kanban.cards.list()
    expect(cards[0].column_type).toBe('en-progreso')
    expect(cards[0].position).toBe(0)
  })
})

describe('PASO 7 · Ciclo de papelera', () => {
  it('borrar suave → aparece en papelera → restaurar → listar de nuevo', async () => {
    const task = await api.tasks.create({ title: 'Recuperable' })
    await api.trash.softDelete('task', task.id)

    const trash = await api.trash.list()
    expect(trash.tasks).toHaveLength(1)

    await api.trash.restore('task', task.id)
    expect(await api.tasks.list()).toHaveLength(1)
    expect((await api.trash.list()).tasks).toHaveLength(0)
  })

  it('vaciar papelera elimina definitivamente', async () => {
    const t = await api.tasks.create({ title: 'Borrar' })
    await api.trash.softDelete('task', t.id)
    await api.trash.empty()
    expect((await api.trash.list()).tasks).toHaveLength(0)
  })
})

describe('PASO 8 · Exportación', () => {
  it('export.data() contiene las tareas creadas', async () => {
    await api.tasks.create({ title: 'Exportada' })
    const data = await api.export.data()
    expect(data.tasks).toHaveLength(1)
    expect(data.tasks[0].title).toBe('Exportada')
  })
})
