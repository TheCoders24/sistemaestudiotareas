function register(ipcMain, { getStmt, getDb, safeHandle, schemas, z }) {
  const linkSchema = z.object({ 0: z.string(), 1: z.number(), 2: z.string(), 3: z.number() }).transform(a => ({ fromType: a[0], fromId: a[1], toType: a[2], toId: a[3] }))
  const getSchema = z.object({ 0: z.string(), 1: z.number() }).transform(a => ({ type: a[0], id: a[1] }))

  function createLink({ fromType, fromId, toType, toId }) {
    getStmt('INSERT OR IGNORE INTO entity_links (from_type, from_id, to_type, to_id) VALUES (?, ?, ?, ?)').run(fromType, fromId, toType, toId)
    return true
  }

  function getLinks({ type, id }) {
    const links = getStmt('SELECT * FROM entity_links WHERE (from_type = ? AND from_id = ?) OR (to_type = ? AND to_id = ?)').all(type, id, type, id)
    const result = []
    for (const link of links) {
      if (link.from_type === type && link.from_id === id) {
        try { const row = getDb().prepare(`SELECT id, name FROM ${link.to_type}s WHERE id = ?`).get(link.to_id); if (row) result.push({ ...row, linkType: link.to_type }) } catch {}
      } else {
        try { const row = getDb().prepare(`SELECT id, name FROM ${link.from_type}s WHERE id = ?`).get(link.from_id); if (row) result.push({ ...row, linkType: link.from_type }) } catch {}
      }
    }
    return result
  }

  safeHandle(ipcMain, 'entity:link', linkSchema, createLink)
  safeHandle(ipcMain, 'db:linkEntities', linkSchema, createLink)
  safeHandle(ipcMain, 'entity:getLinks', getSchema, getLinks)
  safeHandle(ipcMain, 'db:getEntityLinks', getSchema, getLinks)
}

module.exports = { register }