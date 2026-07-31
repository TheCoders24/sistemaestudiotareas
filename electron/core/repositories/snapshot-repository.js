const { getDb } = require('../../database')

class SnapshotRepository {
  create(workspaceId, entityType, entityId, reason, payload) {
    const db = getDb()
    const id = `${entityType}_${entityId}_${Date.now()}`
    db.prepare(`
      INSERT INTO snapshots (id, workspace_id, entity_type, entity_id, reason, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspaceId, entityType, entityId, reason, JSON.stringify(payload), new Date().toISOString())
    return id
  }

  findByEntity(entityType, entityId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, entity_type AS entityType,
             entity_id AS entityId, reason, payload_json AS payloadJson,
             created_at AS createdAt
      FROM snapshots
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
    `).all(entityType, entityId)
  }

  deleteOlderThan(days) {
    const db = getDb()
    const cutoff = new Date(Date.now() - days * 86400000).toISOString()
    db.prepare('DELETE FROM snapshots WHERE created_at < ?').run(cutoff)
  }
}

module.exports = { SnapshotRepository }
