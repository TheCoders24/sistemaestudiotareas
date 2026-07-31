const { getDb } = require('../../database')
const { TaskNotFoundError, WorkspaceNotFoundError, ok, fail } = require('../result')

class WorkspaceRepository {
  findById(id) {
    const db = getDb()
    const row = db.prepare(`
      SELECT id, name, icon, color, is_default AS isDefault, sort_order AS sortOrder,
             deleted, created_at AS createdAt, updated_at AS updatedAt
      FROM workspaces WHERE id = ? AND deleted = 0
    `).get(id)
    return row || null
  }

  findAll() {
    const db = getDb()
    return db.prepare(`
      SELECT id, name, icon, color, is_default AS isDefault, sort_order AS sortOrder,
             deleted, created_at AS createdAt, updated_at AS updatedAt
      FROM workspaces WHERE deleted = 0 ORDER BY sort_order ASC
    `).all()
  }

  save(workspace) {
    const db = getDb()
    db.prepare(`
      INSERT INTO workspaces (id, name, icon, color, is_default, sort_order, created_at, updated_at)
      VALUES (@id, @name, @icon, @color, @isDefault, @sortOrder, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, icon = excluded.icon, color = excluded.color,
        is_default = excluded.is_default, sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `).run(workspace)
  }

  delete(id) {
    const db = getDb()
    db.prepare('UPDATE workspaces SET deleted = 1 WHERE id = ?').run(id)
  }

  getDefault() {
    const db = getDb()
    const row = db.prepare('SELECT id FROM workspaces WHERE is_default = 1 AND deleted = 0').get()
    return row || null
  }

  count() {
    const db = getDb()
    const row = db.prepare('SELECT COUNT(*) as count FROM workspaces WHERE deleted = 0').get()
    return row.count
  }
}

module.exports = { WorkspaceRepository }
