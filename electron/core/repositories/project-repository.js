const { getDb } = require('../../database')

class ProjectRepository {
  findById(id) {
    const db = getDb()
    const row = db.prepare(`
      SELECT id, workspace_id AS workspaceId, parent_id AS parentId, name, description,
             status, priority, color, icon, archived_at AS archivedAt,
             created_at AS createdAt, updated_at AS updatedAt
      FROM projects WHERE id = ?
    `).get(id)
    return row || null
  }

  findByWorkspaceId(workspaceId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, parent_id AS parentId, name, description,
             status, priority, color, icon, archived_at AS archivedAt,
             created_at AS createdAt, updated_at AS updatedAt
      FROM projects WHERE workspace_id = ? ORDER BY name ASC
    `).all(workspaceId)
  }

  save(project) {
    const db = getDb()
    db.prepare(`
      INSERT INTO projects (id, workspace_id, parent_id, name, description, status, priority, color, icon, archived_at, created_at, updated_at)
      VALUES (@id, @workspaceId, @parentId, @name, @description, @status, @priority, @color, @icon, @archivedAt, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        workspace_id = excluded.workspace_id, parent_id = excluded.parent_id,
        name = excluded.name, description = excluded.description,
        status = excluded.status, priority = excluded.priority,
        color = excluded.color, icon = excluded.icon,
        archived_at = excluded.archived_at, updated_at = excluded.updated_at
    `).run(project)
  }

  delete(id) {
    const db = getDb()
    db.prepare('UPDATE projects SET archived_at = ? WHERE id = ?').run(new Date().toISOString(), id)
  }

  archive(id) {
    const db = getDb()
    db.prepare('UPDATE projects SET archived_at = ? WHERE id = ?').run(new Date().toISOString(), id)
  }

  updateStatus(id, status) {
    const db = getDb()
    db.prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), id)
  }
}

module.exports = { ProjectRepository }
