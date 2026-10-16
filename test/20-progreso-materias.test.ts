/**
 * ============================================================================
 *  20-progreso-materias.test.ts — Dashboard "Progreso por Materia" (Fase 2)
 * ============================================================================
 *
 *  Verifica la agregación pura `buildCourseProgress` (ProgresoMaterias.tsx):
 *  dominio (Study Map) + repasos pendientes (Flashcards) + racha (Rachas) +
 *  promedio de exámenes, combinados en una tarjeta por materia.
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/20-progreso-materias.test.ts
 * ============================================================================
 */

import { describe, it, expect } from 'vitest'
import { buildCourseProgress } from '../src/components/Progress/ProgresoMaterias'

const courses: any = [
  { id: 1, name: 'Anatomía', color: '#6366f1' },
  { id: 2, name: 'Historia', color: '#22c55e' },
]

describe('Fase 2 · buildCourseProgress', () => {
  it('combina dominio, repasos, racha y promedio por materia', () => {
    const topics: any = [
      { id: 1, course_id: 1, study_level: 4 },
      { id: 2, course_id: 1, study_level: 2 },
      { id: 3, course_id: 2, study_level: 5 },
    ]
    const decks: any = [
      { id: 10, course_id: 1 },
      { id: 11, course_id: 1 },
      { id: 12, course_id: 2 },
    ]
    const dueByDeck = new Map<number, number>([[10, 3], [11, 2], [12, 7]])
    const streaks: any = [{ id: 1, current: 5 }, { id: 2, current: 0 }]
    const grades = new Map<number, number | null>([[1, 86], [2, null]])

    const rows = buildCourseProgress(courses, topics, decks, dueByDeck, streaks, grades)

    const anatomia = rows.find(r => r.course.id === 1)!
    expect(anatomia.topicsTotal).toBe(2)
    expect(anatomia.dominio).toBe(60) // (4+2)/2 = 3 → 3/5 = 60%
    expect(anatomia.pendingCards).toBe(5)
    expect(anatomia.streak).toBe(5)
    expect(anatomia.grade).toBe(86)

    const historia = rows.find(r => r.course.id === 2)!
    expect(historia.dominio).toBe(100) // 5/5
    expect(historia.pendingCards).toBe(7)
    expect(historia.streak).toBe(0)
    expect(historia.grade).toBe(null)
  })

  it('devuelve dominio null y sin pendientes cuando la materia no tiene datos', () => {
    const rows = buildCourseProgress(courses, [], [], new Map(), [], new Map())
    expect(rows[0].dominio).toBe(null)
    expect(rows[0].topicsTotal).toBe(0)
    expect(rows[0].pendingCards).toBe(0)
    expect(rows[0].grade).toBe(null)
  })
})
