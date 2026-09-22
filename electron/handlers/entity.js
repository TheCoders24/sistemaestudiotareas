const ALLOWED_ENTITY_TYPES = new Set([
  'task', 'note', 'project', 'kanban_card', 'study_topic',
  'flashcard', 'habit', 'goal', 'course', 'exam', 'snippet',
])

function register(ipcMain, { getStmt, getDb, safeHandle, schemas, z }) {
  const linkSchema = z.object({ 0: z.enum([...ALLOWED_ENTITY_TYPES]), 1: z.number(), 2: z.enum([...ALLOWED_ENTITY_TYPES]), 3: z.number() }).transform(a => ({ fromType: a[0], fromId: a[1], toType: a[2], toId: a[3] }))
  const getSchema = z.object({ 0: z.enum([...ALLOWED_ENTITY_TYPES]), 1: z.number() }).transform(a => ({ type: a[0], id: a[1] }))

  function createLink({ fromType, fromId, toType, toId }) {
    getStmt('INSERT OR IGNORE INTO entity_links (from_type, from_id, to_type, to_id) VALUES (?, ?, ?, ?)').run(fromType, fromId, toType, toId)
    return true
  }

  function getLinks({ type, id }) {
    const links = getStmt('SELECT * FROM entity_links WHERE (from_type = ? AND from_id = ?) OR (to_type = ? AND to_id = ?)').all(type, id, type, id)
    const result = []
    for (const link of links) {
      const targetType = link.from_type === type ? link.to_type : link.from_type
      const targetId = link.from_type === type ? link.to_id : link.from_id
      if (!ALLOWED_ENTITY_TYPES.has(targetType)) continue
      try { const row = getDb().prepare(`SELECT id, name FROM ${targetType}s WHERE id = ?`).get(targetId); if (row) result.push({ ...row, linkType: targetType }) } catch {}
    }
    return result
  }

  safeHandle(ipcMain, 'entity:link', linkSchema, createLink)
  safeHandle(ipcMain, 'db:linkEntities', linkSchema, createLink)
  safeHandle(ipcMain, 'entity:getLinks', getSchema, getLinks)
  safeHandle(ipcMain, 'db:getEntityLinks', getSchema, getLinks)
}

module.exports = { register }