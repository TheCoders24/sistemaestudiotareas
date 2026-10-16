function register(ipcMain, { getStmt, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'labels:list', schemas.labels.list, (wsId) => {
    if (wsId) return getStmt('SELECT * FROM labels WHERE workspace_id = ? ORDER BY name ASC').all(wsId)
    return getStmt('SELECT * FROM labels ORDER BY name ASC').all()
  })
  safeHandle(ipcMain, 'labels:create', z.object({
    name: z.string().min(1).max(500),
    color: z.string().optional().nullable(),
    workspaceId: z.number().int().positive().optional(),
    workspace_id: z.number().int().positive().optional(),
  }).passthrough(), (data) => {
    const wsId = data.workspaceId ?? data.workspace_id ?? 1
    const result = getStmt('INSERT INTO labels (workspace_id, name, color) VALUES (?, ?, ?)').run(wsId, data.name, data.color || '#6366f1')
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
