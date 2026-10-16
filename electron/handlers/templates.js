function register(ipcMain, { getStmt, getDb, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'templates:list', z.string().optional(), (type) => {
    if (type) return getStmt('SELECT * FROM templates WHERE type = ? ORDER BY is_builtin DESC, name ASC').all(type)
    return getStmt('SELECT * FROM templates ORDER BY type, is_builtin DESC, name ASC').all()
  })
  safeHandle(ipcMain, 'templates:create', schemas.templates.create, (data) => {
    const result = getStmt('INSERT INTO templates (type, name, description, payload, is_builtin) VALUES (@type, @name, @description, @payload, 0)').run(data)
    return getStmt('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'templates:instantiate', schemas.templates.instantiate, ({ templateId, params }) => {
    const template = getStmt('SELECT * FROM templates WHERE id = ?').get(templateId)
    if (!template) throw new Error('Template not found')
    const payload = JSON.parse(template.payload)
    const workspaceId = params.workspace_id || 1
    const result = { projects: [], courses: [], kanbanColumns: [], kanbanCards: [], studyTopics: [], flashcardDecks: [], goals: [] }

    const tx = getDb().transaction(() => {
      if (payload.project) {
        const r = getStmt('INSERT INTO projects (name, description, color, status, workspace_id) VALUES (?, ?, ?, ?, ?)').run(
          resolveTokens(payload.project.name, params),
          resolveTokens(payload.project.description || '', params),
          payload.project.color || '#6366f1',
          payload.project.status || 'active',
          workspaceId
        )
        result.projects.push(r.lastInsertRowid)
      }

      if (payload.course) {
        const r = getStmt('INSERT INTO courses (name, color, term, workspace_id) VALUES (?, ?, ?, ?)').run(
          resolveTokens(payload.course.name, params),
          payload.course.color || '#6366f1',
          payload.course.term || null,
          workspaceId
        )
        result.courseId = r.lastInsertRowid
        result.courses.push(r.lastInsertRowid)
      }

      if (Array.isArray(payload.kanbanColumns)) {
        let position = 0
        for (const col of payload.kanbanColumns) {
          const r = getStmt('INSERT INTO kanban_columns (name, type, color, wip_limit, position, workspace_id) VALUES (?, ?, ?, ?, ?, ?)').run(
            resolveTokens(col.name, params),
            col.type || 'custom',
            col.color || '#6366f1',
            col.wip_limit || 0,
            col.position ?? position,
            workspaceId
          )
          result.kanbanColumns.push(r.lastInsertRowid)
          position++
        }
      }

      if (Array.isArray(payload.kanbanCards)) {
        let position = 0
        for (const cardPayload of payload.kanbanCards) {
          const r = getStmt('INSERT INTO kanban_cards (title, description, column_type, position, priority, tags, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            resolveTokens(cardPayload.title, params),
            resolveTokens(cardPayload.description || '', params),
            cardPayload.column_type || 'pendiente',
            position,
            cardPayload.priority || 'media',
            cardPayload.tags || '',
            workspaceId
          )
          result.kanbanCards.push(r.lastInsertRowid)
          position++
        }
      }

      if (Array.isArray(payload.studyTopics)) {
        for (const t of payload.studyTopics) {
          const r = getStmt('INSERT INTO study_topics (name, description, order_position, course_id, workspace_id) VALUES (?, ?, ?, ?, ?)').run(
            resolveTokens(t.name, params),
            resolveTokens(t.description || '', params),
            t.order_position || 0,
            t.course_id ?? result.courseId ?? null,
            workspaceId
          )
          result.studyTopics.push(r.lastInsertRowid)
        }
      }

      if (Array.isArray(payload.flashcardDecks)) {
        for (const deck of payload.flashcardDecks) {
          const r = getStmt('INSERT INTO flashcard_decks (name, description, course_id) VALUES (?, ?, ?)').run(
            resolveTokens(deck.name, params),
            resolveTokens(deck.description || '', params),
            result.courseId ?? null
          )
          result.flashcardDecks.push(r.lastInsertRowid)
        }
      }

      if (payload.goal) {
        const r = getStmt('INSERT INTO goals (title, type, target, metric, workspace_id) VALUES (?, ?, ?, ?, ?)').run(
          resolveTokens(payload.goal.title, params),
          payload.goal.type || 'daily',
          payload.goal.target || 1,
          payload.goal.metric || 'pomodoros',
          workspaceId
        )
        result.goals.push(r.lastInsertRowid)
      }
    })
    tx()
    return result
  })
  safeHandle(ipcMain, 'templates:delete', z.number().int().positive(), (id) => {
    getStmt('DELETE FROM templates WHERE id = ? AND is_builtin = 0').run(id)
    return true
  })
}
function resolveTokens(str, params) {
  if (typeof str !== 'string') return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`)
}
module.exports = { register }
