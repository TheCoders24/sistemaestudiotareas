const { getDb } = require('../../database')

class ActivityRepository {
  add(workspaceId, entityType, entityId, action, payload) {
    const db = getDb()
    db.prepare(`
      INSERT INTO activity_log (workspace_id, entity_type, entity_id, action, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(workspaceId, entityType, entityId, action, JSON.stringify(payload), new Date().toISOString())
  }

  findByEntity(entityType, entityId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, entity_type AS entityType,
             entity_id AS entityId, action, payload_json AS payloadJson,
             created_at AS createdAt
      FROM activity_log
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
    `).all(entityType, entityId)
  }

  findRecent(limit) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, entity_type AS entityType,
             entity_id AS entityId, action, payload_json AS payloadJson,
             created_at AS createdAt
      FROM activity_log
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit)
  }

  findByDateRange(start, end) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, entity_type AS entityType,
             entity_id AS entityId, action, payload_json AS payloadJson,
             created_at AS createdAt
      FROM activity_log
      WHERE created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
    `).all(start, end)
  }
}

module.exports = { ActivityRepository }
