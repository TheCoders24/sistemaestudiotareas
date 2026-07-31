function register(ipcMain, { getStmt, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:softDeleteItem', schemas.trash.softDelete, ({ type, id }) => {
    const tables = { task: 'tasks', note: 'notes', project: 'projects' }
    const table = tables[type]
    if (table) getStmt(`UPDATE ${table} SET deleted = 1, updated_at = datetime('now') WHERE id = ?`).run(id)
    return true
  })
  safeHandle(ipcMain, 'db:getTrashItems', voidSchema(), () => {
    const tasks = getStmt("SELECT id, title, updated_at FROM tasks WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const notes = getStmt("SELECT id, title, updated_at FROM notes WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const projects = getStmt("SELECT id, name as title, updated_at FROM projects WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const kanbanCards = getStmt("SELECT id, title, updated_at FROM kanban_cards WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const habits = getStmt("SELECT id, name as title, updated_at FROM habits WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const goals = getStmt("SELECT id, title, updated_at FROM goals WHERE deleted = 1 ORDER BY updated_at DESC").all()
    const snippets = getStmt("SELECT id, title, updated_at FROM snippets WHERE deleted = 1 ORDER BY updated_at DESC").all()
    return { tasks, notes, projects, kanbanCards, habits, goals, snippets }
  })
  safeHandle(ipcMain, 'db:restoreItem', schemas.trash.restore, ({ type, id }) => {
    const tables = { task: 'tasks', note: 'notes', project: 'projects', kanban: 'kanban_cards', habit: 'habits', goal: 'goals', snippet: 'snippets' }
    const table = tables[type]
    if (table) getStmt(`UPDATE ${table} SET deleted = 0, updated_at = datetime('now') WHERE id = ?`).run(id)
    return true
  })
  safeHandle(ipcMain, 'db:deleteItemPermanent', schemas.trash.deletePermanent, ({ type, id }) => {
    const tables = { task: 'tasks', note: 'notes', project: 'projects', kanban: 'kanban_cards', habit: 'habits', goal: 'goals', snippet: 'snippets' }
    const table = tables[type]
    if (table) getStmt(`DELETE FROM ${table} WHERE id = ?`).run(id)
    return true
  })
  safeHandle(ipcMain, 'db:emptyTrash', voidSchema(), () => {
    getStmt("DELETE FROM tasks WHERE deleted = 1").run()
    getStmt("DELETE FROM notes WHERE deleted = 1").run()
    getStmt("DELETE FROM projects WHERE deleted = 1").run()
    getStmt("DELETE FROM kanban_cards WHERE deleted = 1").run()
    getStmt("DELETE FROM habits WHERE deleted = 1").run()
    getStmt("DELETE FROM goals WHERE deleted = 1").run()
    getStmt("DELETE FROM snippets WHERE deleted = 1").run()
    return true
  })
  try { getStmt("DELETE FROM tasks WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM notes WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM projects WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM kanban_cards WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM habits WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM goals WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
  try { getStmt("DELETE FROM snippets WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')").run() } catch {}
}

module.exports = { register }
