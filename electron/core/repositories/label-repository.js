const { getDb } = require('../../database')

class LabelRepository {
  findById(id) {
    const db = getDb()
    const row = db.prepare(`
      SELECT id, workspace_id AS workspaceId, name, color, created_at AS createdAt
      FROM labels WHERE id = ?
    `).get(id)
    return row || null
  }

  findByWorkspaceId(workspaceId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, name, color, created_at AS createdAt
      FROM labels WHERE workspace_id = ? ORDER BY name ASC
    `).all(workspaceId)
  }

  save(label) {
    const db = getDb()
    db.prepare(`
      INSERT INTO labels (id, workspace_id, name, color, created_at)
      VALUES (@id, @workspaceId, @name, @color, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        workspace_id = excluded.workspace_id, name = excluded.name, color = excluded.color
    `).run(label)
  }

  delete(id) {
    const db = getDb()
    db.prepare('DELETE FROM labels WHERE id = ?').run(id)
  }

  addToTask(labelId, taskId) {
    const db = getDb()
    db.prepare('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)').run(taskId, labelId)
  }

  removeFromTask(labelId, taskId) {
    const db = getDb()
    db.prepare('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?').run(taskId, labelId)
  }

  findByTaskId(taskId) {
    const db = getDb()
    return db.prepare(`
      SELECT l.id, l.workspace_id AS workspaceId, l.name, l.color, l.created_at AS createdAt
      FROM labels l
      INNER JOIN task_labels tl ON tl.label_id = l.id
      WHERE tl.task_id = ?
      ORDER BY l.name ASC
    `).all(taskId)
  }
}

module.exports = { LabelRepository }
