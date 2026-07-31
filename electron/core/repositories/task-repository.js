const { getDb } = require('../../database')
const { TaskNotFoundError, WorkspaceNotFoundError, ok, fail } = require('../result')

class TaskRepository {
  findById(id) {
    const db = getDb()
    const row = db.prepare(`
      SELECT id, workspace_id AS workspaceId, project_id AS projectId,
             parent_task_id AS parentTaskId, title, description, priority,
             completed_at AS completedAt, due_at AS dueAt,
             estimated_minutes AS estimatedMinutes, actual_minutes AS actualMinutes,
             position, archived_at AS archivedAt, created_at AS createdAt,
             updated_at AS updatedAt
      FROM tasks WHERE id = ?
    `).get(id)
    return row || null
  }

  save(task) {
    const db = getDb()
    db.prepare(`
      INSERT INTO tasks (id, workspace_id, project_id, parent_task_id, title, description, priority, completed_at, due_at, estimated_minutes, actual_minutes, position, archived_at, created_at, updated_at)
      VALUES (@id, @workspaceId, @projectId, @parentTaskId, @title, @description, @priority, @completedAt, @dueAt, @estimatedMinutes, @actualMinutes, @position, @archivedAt, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        workspace_id = excluded.workspace_id, project_id = excluded.project_id,
        parent_task_id = excluded.parent_task_id, title = excluded.title,
        description = excluded.description, priority = excluded.priority,
        completed_at = excluded.completed_at, due_at = excluded.due_at,
        estimated_minutes = excluded.estimated_minutes, actual_minutes = excluded.actual_minutes,
        position = excluded.position, archived_at = excluded.archived_at,
        updated_at = excluded.updated_at
    `).run(task)
  }

  delete(id) {
    const db = getDb()
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  }

  findByProjectId(projectId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, project_id AS projectId,
             parent_task_id AS parentTaskId, title, description, priority,
             completed_at AS completedAt, due_at AS dueAt,
             estimated_minutes AS estimatedMinutes, actual_minutes AS actualMinutes,
             position, archived_at AS archivedAt, created_at AS createdAt,
             updated_at AS updatedAt
      FROM tasks WHERE project_id = ? ORDER BY position ASC
    `).all(projectId)
  }

  findByWorkspaceId(workspaceId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, project_id AS projectId,
             parent_task_id AS parentTaskId, title, description, priority,
             completed_at AS completedAt, due_at AS dueAt,
             estimated_minutes AS estimatedMinutes, actual_minutes AS actualMinutes,
             position, archived_at AS archivedAt, created_at AS createdAt,
             updated_at AS updatedAt
      FROM tasks WHERE workspace_id = ? ORDER BY position ASC
    `).all(workspaceId)
  }
}

module.exports = { TaskRepository }
