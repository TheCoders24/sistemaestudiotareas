const { getDb } = require('../../database')

class NoteRepository {
  findById(id) {
    const db = getDb()
    const row = db.prepare(`
      SELECT id, workspace_id AS workspaceId, folder_id AS folderId, project_id AS projectId,
             title, content, archived_at AS archivedAt, created_at AS createdAt,
             updated_at AS updatedAt
      FROM notes WHERE id = ?
    `).get(id)
    return row || null
  }

  findByWorkspaceId(workspaceId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, folder_id AS folderId, project_id AS projectId,
             title, content, archived_at AS archivedAt, created_at AS createdAt,
             updated_at AS updatedAt
      FROM notes WHERE workspace_id = ? ORDER BY updated_at DESC
    `).all(workspaceId)
  }

  findByFolderId(folderId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, folder_id AS folderId, project_id AS projectId,
             title, content, archived_at AS archivedAt, created_at AS createdAt,
             updated_at AS updatedAt
      FROM notes WHERE folder_id = ? ORDER BY updated_at DESC
    `).all(folderId)
  }

  save(note) {
    const db = getDb()
    db.prepare(`
      INSERT INTO notes (id, workspace_id, folder_id, project_id, title, content, archived_at, created_at, updated_at)
      VALUES (@id, @workspaceId, @folderId, @projectId, @title, @content, @archivedAt, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        workspace_id = excluded.workspace_id, folder_id = excluded.folder_id,
        project_id = excluded.project_id, title = excluded.title,
        content = excluded.content, archived_at = excluded.archived_at,
        updated_at = excluded.updated_at
    `).run(note)
  }

  delete(id) {
    const db = getDb()
    db.prepare('UPDATE notes SET archived_at = ? WHERE id = ?').run(new Date().toISOString(), id)
  }

  findFolderById(id) {
    const db = getDb()
    const row = db.prepare(`
      SELECT id, workspace_id AS workspaceId, parent_id AS parentId, name, color, created_at AS createdAt
      FROM note_folders WHERE id = ?
    `).get(id)
    return row || null
  }

  findFoldersByWorkspaceId(workspaceId) {
    const db = getDb()
    return db.prepare(`
      SELECT id, workspace_id AS workspaceId, parent_id AS parentId, name, color, created_at AS createdAt
      FROM note_folders WHERE workspace_id = ? ORDER BY name ASC
    `).all(workspaceId)
  }

  saveFolder(folder) {
    const db = getDb()
    db.prepare(`
      INSERT INTO note_folders (id, workspace_id, parent_id, name, color, created_at)
      VALUES (@id, @workspaceId, @parentId, @name, @color, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        workspace_id = excluded.workspace_id, parent_id = excluded.parent_id,
        name = excluded.name, color = excluded.color
    `).run(folder)
  }

  deleteFolder(id) {
    const db = getDb()
    db.prepare('DELETE FROM note_folders WHERE id = ?').run(id)
  }
}

module.exports = { NoteRepository }
