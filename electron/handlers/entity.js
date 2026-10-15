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

  const labelColumnCache = new Map()

  function labelColumn(db, table) {
    if (labelColumnCache.has(table)) return labelColumnCache.get(table)
    let column = null
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
      column = cols.includes('name') ? 'name' : cols.includes('title') ? 'title' : null
    } catch { column = null }
    labelColumnCache.set(table, column)
    return column
  }

  function getLinks({ type, id }) {
    const links = getStmt('SELECT * FROM entity_links WHERE (from_type = ? AND from_id = ?) OR (to_type = ? AND to_id = ?)').all(type, id, type, id)
    const result = []
    const db = getDb()
    for (const link of links) {
      const targetType = link.from_type === type ? link.to_type : link.from_type
      const targetId = link.from_type === type ? link.to_id : link.from_id
      if (!ALLOWED_ENTITY_TYPES.has(targetType)) continue
      const table = `${targetType}s`
      const column = labelColumn(db, table)
      if (!column) continue
      try {
        const row = db.prepare(`SELECT id, ${column} AS name FROM ${table} WHERE id = ?`).get(targetId)
        if (row) result.push({ ...row, linkType: targetType })
      } catch {}
    }
    return result
  }

  safeHandle(ipcMain, 'entity:link', linkSchema, createLink)
  safeHandle(ipcMain, 'db:linkEntities', linkSchema, createLink)
  safeHandle(ipcMain, 'entity:getLinks', getSchema, getLinks)
  safeHandle(ipcMain, 'db:getEntityLinks', getSchema, getLinks)
}

module.exports = { register }