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
    const result = { projects: [], studyTopics: [] }
    const tx = getDb().transaction(() => {
      if (payload.project) {
        const r = getStmt('INSERT INTO projects (name, description, color, status, workspace_id) VALUES (?, ?, ?, ?, ?)').run(
          resolveTokens(payload.project.name, params),
          resolveTokens(payload.project.description || '', params),
          payload.project.color || '#6366f1',
          payload.project.status || 'active',
          params.workspace_id || 1
        )
        result.projects.push(r.lastInsertRowid)
      }
      if (payload.studyTopics && Array.isArray(payload.studyTopics)) {
        for (const t of payload.studyTopics) {
          const r = getStmt('INSERT INTO study_topics (name, description, order_position, workspace_id) VALUES (?, ?, ?, ?)').run(
            resolveTokens(t.name, params),
            resolveTokens(t.description || '', params),
            t.order_position || 0,
            params.workspace_id || 1
          )
          result.studyTopics.push(r.lastInsertRowid)
        }
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
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`)
}
module.exports = { register }
