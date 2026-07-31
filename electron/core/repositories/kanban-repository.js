const { getDb } = require('../../database')

class KanbanRepository {
  findById(id) {
    const db = getDb()
    const row = db.prepare(`
      SELECT id, workspace_id AS workspaceId, project_id AS projectId, name, color,
             position, wip_limit AS wipLimit, created_at AS createdAt, updated_at AS updatedAt
      FROM kanban_columns WHERE id = ?
    `).get(id)
    return row || null
  }

  findByProjectId(projectId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, project_id AS projectId, name, color,
             position, wip_limit AS wipLimit, created_at AS createdAt, updated_at AS updatedAt
      FROM kanban_columns WHERE project_id = ? ORDER BY position ASC
    `).all(projectId)
  }

  save(column) {
    const db = getDb()
    db.prepare(`
      INSERT INTO kanban_columns (id, workspace_id, project_id, name, color, position, wip_limit, created_at, updated_at)
      VALUES (@id, @workspaceId, @projectId, @name, @color, @position, @wipLimit, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        workspace_id = excluded.workspace_id, project_id = excluded.project_id,
        name = excluded.name, color = excluded.color, position = excluded.position,
        wip_limit = excluded.wip_limit, updated_at = excluded.updated_at
    `).run(column)
  }

  delete(id) {
    const db = getDb()
    db.prepare('DELETE FROM kanban_columns WHERE id = ?').run(id)
  }

  findCardById(id) {
    const db = getDb()
    const row = db.prepare(`
      SELECT id, column_id AS columnId, task_id AS taskId, title, description, position,
             priority, due_at AS dueAt, labels_json AS labelsJson,
             created_at AS createdAt, updated_at AS updatedAt
      FROM kanban_cards WHERE id = ?
    `).get(id)
    return row || null
  }

  findCardsByColumnId(columnId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, column_id AS columnId, task_id AS taskId, title, description, position,
             priority, due_at AS dueAt, labels_json AS labelsJson,
             created_at AS createdAt, updated_at AS updatedAt
      FROM kanban_cards WHERE column_id = ? ORDER BY position ASC
    `).all(columnId)
  }

  saveCard(card) {
    const db = getDb()
    db.prepare(`
      INSERT INTO kanban_cards (id, column_id, task_id, title, description, position, priority, due_at, labels_json, created_at, updated_at)
      VALUES (@id, @columnId, @taskId, @title, @description, @position, @priority, @dueAt, @labelsJson, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        column_id = excluded.column_id, task_id = excluded.task_id,
        title = excluded.title, description = excluded.description,
        position = excluded.position, priority = excluded.priority,
        due_at = excluded.due_at, labels_json = excluded.labels_json,
        updated_at = excluded.updated_at
    `).run(card)
  }

  deleteCard(id) {
    const db = getDb()
    db.prepare('DELETE FROM kanban_cards WHERE id = ?').run(id)
  }

  moveCard(id, columnId, position) {
    const db = getDb()
    db.prepare('UPDATE kanban_cards SET column_id = ?, position = ?, updated_at = ? WHERE id = ?')
      .run(columnId, position, new Date().toISOString(), id)
  }
}

module.exports = { KanbanRepository }
