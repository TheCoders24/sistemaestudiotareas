function register(ipcMain, { getStmt, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'exams:list', z.number().int().positive().optional(), (courseId) => {
    if (courseId) return getStmt('SELECT * FROM exams WHERE course_id = ? ORDER BY date ASC').all(courseId)
    return getStmt('SELECT * FROM exams ORDER BY date ASC').all()
  })
  safeHandle(ipcMain, 'exams:create', schemas.exams.create, (data) => {
    const result = getStmt('INSERT INTO exams (course_id, title, date, weight, study_topic_ids) VALUES (@course_id, @title, @date, @weight, @study_topic_ids)').run(data)
    return getStmt('SELECT * FROM exams WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'exams:update', schemas.exams.update, ({ id, data }) => {
    const allowed = ['title', 'date', 'weight', 'study_topic_ids', 'completed', 'grade_obtained']
    const keys = Object.keys(data).filter(k => allowed.includes(k))
    if (keys.length === 0) return getStmt('SELECT * FROM exams WHERE id = ?').get(id)
    const sets = keys.map(k => `${k} = @${k}`).join(', ')
    getStmt(`UPDATE exams SET ${sets} WHERE id = @id`).run({ ...data, id })
    return getStmt('SELECT * FROM exams WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'exams:delete', z.number().int().positive(), (id) => {
    getStmt('DELETE FROM exams WHERE id = ?').run(id)
    return true
  })
  // Exam simulations
  safeHandle(ipcMain, 'exam_simulations:list', z.number().int().positive().optional(), (deckId) => {
    if (deckId) return getStmt('SELECT * FROM exam_simulations WHERE deck_id = ? ORDER BY created_at DESC LIMIT 50').all(deckId)
    return getStmt('SELECT * FROM exam_simulations ORDER BY created_at DESC LIMIT 50').all()
  })
  safeHandle(ipcMain, 'exam_simulations:create', schemas.examSimulations.create, (data) => {
    const result = getStmt('INSERT INTO exam_simulations (deck_id, course_id, total_questions, correct_answers, wrong_answers, duration_seconds) VALUES (@deck_id, @course_id, @total_questions, @correct_answers, @wrong_answers, @duration_seconds)').run(data)
    return getStmt('SELECT * FROM exam_simulations WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'exams:gpa', z.number().int().positive().optional(), (courseId) => {
    // Calculate GPA for a course or all courses
    if (courseId) {
      const course = getStmt('SELECT * FROM courses WHERE id = ?').get(courseId)
      if (!course) return null
      const exams = getStmt('SELECT * FROM exams WHERE course_id = ? AND completed = 1').all(courseId)
      return calcGpa(course, exams)
    }
    const courses = getStmt('SELECT * FROM courses WHERE archived = 0').all()
    const results = []
    for (const c of courses) {
      const exams = getStmt('SELECT * FROM exams WHERE course_id = ? AND completed = 1').all(c.id)
      results.push(calcGpa(c, exams))
    }
    return results
  })
}
function calcGpa(course, exams) {
  let weightedSum = 0
  let totalWeight = 0
  for (const e of exams) {
    if (e.grade_obtained != null && e.weight) {
      weightedSum += e.grade_obtained * e.weight
      totalWeight += e.weight
    }
  }
  const courseGrade = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : null
  return {
    course_id: course.id,
    course_name: course.name,
    target_grade: course.target_grade,
    course_grade: courseGrade,
    credits: course.credits,
    exams_count: exams.length,
  }
}
module.exports = { register }
