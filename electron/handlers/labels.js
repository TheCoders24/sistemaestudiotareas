function register(ipcMain, { getStmt, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'labels:list', schemas.labels.list, (wsId) => {
    return getStmt('SELECT * FROM labels WHERE workspace_id = ? ORDER BY name ASC').all(wsId || 0)
  })
  safeHandle(ipcMain, 'labels:create', z.object({
    workspaceId: z.number(),
    name: z.string().min(1).max(500),
    color: z.string().optional().nullable(),
  }).passthrough(), (data) => {
    const result = getStmt('INSERT INTO labels (workspace_id, name, color) VALUES (?, ?, ?)').run(data.workspaceId, data.name, data.color || '#6366f1')
    return getStmt('SELECT * FROM labels WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'labels:delete', schemas.labels.delete, (id) => {
    getStmt('DELETE FROM task_labels WHERE label_id = ?').run(id)
    getStmt('DELETE FROM labels WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'labels:addToTask', schemas.labels.addToTask, ({ taskId, labelId }) => {
    getStmt('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)').run(taskId, labelId)
    return true
  })
  safeHandle(ipcMain, 'labels:removeFromTask', schemas.labels.removeFromTask, ({ taskId, labelId }) => {
    getStmt('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?').run(taskId, labelId)
    return true
  })
  safeHandle(ipcMain, 'labels:getByTask', schemas.labels.getByTask, (taskId) => {
    return getStmt('SELECT l.* FROM labels l JOIN task_labels tl ON l.id = tl.label_id WHERE tl.task_id = ? ORDER BY l.name ASC').all(taskId)
  })
}

module.exports = { register }
