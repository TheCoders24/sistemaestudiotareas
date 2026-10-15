function register(ipcMain, { app, dialog, mainWindow, shell, fs, path, crypto, getStmt, safeHandle, z }) {
  const FILES_DIR = path.join(app.getPath('userData'), 'attachments')
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true })

  const MIME = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.txt': 'text/plain', '.md': 'text/markdown', '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.zip': 'application/zip' }

  const entitySchema = z.object({ entityType: z.string().min(1), entityId: z.number().int().positive() })

  function resolveWorkspaceId(entityType, entityId) {
    try {
      const table = entityType === 'task' ? 'tasks' : entityType === 'project' ? 'projects' : null
      if (table) {
        const row = getStmt(`SELECT workspace_id FROM ${table} WHERE id = ?`).get(entityId)
        if (row && row.workspace_id) return row.workspace_id
      }
    } catch {}
    const ws = getStmt('SELECT id FROM workspaces ORDER BY id ASC LIMIT 1').get()
    return ws ? ws.id : 1
  }

  function resolvePath(storagePath) {
    return path.isAbsolute(storagePath) ? storagePath : path.join(FILES_DIR, storagePath)
  }

  safeHandle(ipcMain, 'attachments:list', entitySchema, ({ entityType, entityId }) =>
    getStmt('SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').all(entityType, entityId))

  safeHandle(ipcMain, 'attachments:add', entitySchema, async ({ entityType, entityId }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Adjuntar archivo',
      properties: ['openFile'],
      filters: [
        { name: 'Documentos', extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'zip'] },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const fileName = path.basename(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const storedName = crypto.randomUUID() + ext
    const stats = fs.statSync(filePath)
    const mimeType = MIME[ext] || 'application/octet-stream'
    fs.copyFileSync(filePath, path.join(FILES_DIR, storedName))
    const workspaceId = resolveWorkspaceId(entityType, entityId)
    const info = getStmt('INSERT INTO attachments (workspace_id, entity_type, entity_id, file_name, mime_type, size_bytes, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?)').run(workspaceId, entityType, entityId, fileName, mimeType, stats.size, storedName)
    return getStmt('SELECT * FROM attachments WHERE id = ?').get(info.lastInsertRowid)
  })

  safeHandle(ipcMain, 'attachments:open', z.number().int().positive(), (id) => {
    const file = getStmt('SELECT * FROM attachments WHERE id = ?').get(id)
    if (!file) return false
    const filePath = resolvePath(file.storage_path)
    if (fs.existsSync(filePath)) { shell.openPath(filePath); return true }
    return false
  })

  safeHandle(ipcMain, 'attachments:delete', z.number().int().positive(), (id) => {
    const file = getStmt('SELECT * FROM attachments WHERE id = ?').get(id)
    if (!file) return false
    try { fs.unlinkSync(resolvePath(file.storage_path)) } catch {}
    getStmt('DELETE FROM attachments WHERE id = ?').run(id)
    return true
  })
}

module.exports = { register }
