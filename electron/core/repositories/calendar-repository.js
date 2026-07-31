const { getDb } = require('../../database')

class CalendarEventRepository {
  findById(id) {
    const db = getDb()
    const row = db.prepare(`
      SELECT id, workspace_id AS workspaceId, project_id AS projectId, title,
             description, status, priority, due_at AS dueAt,
             estimated_minutes AS estimatedMinutes, labels_json AS labelsJson,
             created_at AS createdAt, updated_at AS updatedAt
      FROM study_topics WHERE id = ?
    `).get(id)
    return row || null
  }

  findByWorkspaceId(workspaceId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, project_id AS projectId, title,
             description, status, priority, due_at AS dueAt,
             estimated_minutes AS estimatedMinutes, labels_json AS labelsJson,
             created_at AS createdAt, updated_at AS updatedAt
      FROM study_topics WHERE workspace_id = ? ORDER BY due_at ASC
    `).all(workspaceId)
  }

  findByDateRange(startDate, endDate) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, project_id AS projectId, title,
             description, status, priority, due_at AS dueAt,
             estimated_minutes AS estimatedMinutes, labels_json AS labelsJson,
             created_at AS createdAt, updated_at AS updatedAt
      FROM study_topics
      WHERE due_at >= ? AND due_at <= ?
      ORDER BY due_at ASC
    `).all(startDate, endDate)
  }

  save(event) {
    const db = getDb()
    db.prepare(`
      INSERT INTO study_topics (id, workspace_id, project_id, title, description, status, priority, due_at, estimated_minutes, labels_json, created_at, updated_at)
      VALUES (@id, @workspaceId, @projectId, @title, @description, @status, @priority, @dueAt, @estimatedMinutes, @labelsJson, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        workspace_id = excluded.workspace_id, project_id = excluded.project_id,
        title = excluded.title, description = excluded.description,
        status = excluded.status, priority = excluded.priority,
        due_at = excluded.due_at, estimated_minutes = excluded.estimated_minutes,
        labels_json = excluded.labels_json, updated_at = excluded.updated_at
    `).run(event)
  }

  delete(id) {
    const db = getDb()
    db.prepare('DELETE FROM study_topics WHERE id = ?').run(id)
  }
}

module.exports = { CalendarEventRepository }
