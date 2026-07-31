function register(ipcMain, { app, dialog, mainWindow, shell, fs, path, crypto, getStmt, safeHandle, schemas, voidSchema, z }) {
  const FILES_DIR = path.join(app.getPath('userData'), 'study_files')
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true })

  safeHandle(ipcMain, 'study:pickAndUploadFile', z.number().int().positive(), async (topicId) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar archivo',
      properties: ['openFile'],
      filters: [
        { name: 'Documentos', extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm'] },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const originalName = path.basename(filePath)
    const ext = path.extname(filePath)
    const storedName = crypto.randomUUID() + ext
    const stats = fs.statSync(filePath)
    const mimeType = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.txt': 'text/plain', '.md': 'text/markdown', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }[ext.toLowerCase()] || 'application/octet-stream'
    const destPath = path.join(FILES_DIR, storedName)
    fs.copyFileSync(filePath, destPath)
    getStmt('INSERT INTO study_files (topic_id, original_name, stored_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?)').run(topicId, originalName, storedName, stats.size, mimeType)
    return getStmt('SELECT * FROM study_files WHERE stored_name = ?').get(storedName)
  })
  safeHandle(ipcMain, 'study:getTopicFiles', z.number().int().positive(), (topicId) => {
    return getStmt('SELECT * FROM study_files WHERE topic_id = ? ORDER BY created_at DESC').all(topicId)
  })
  safeHandle(ipcMain, 'study:deleteFile', z.number().int().positive(), (fileId) => {
    const file = getStmt('SELECT * FROM study_files WHERE id = ?').get(fileId)
    if (!file) return false
    const filePath = path.join(FILES_DIR, file.stored_name)
    try { fs.unlinkSync(filePath) } catch {}
    getStmt('DELETE FROM study_files WHERE id = ?').run(fileId)
    return true
  })
  safeHandle(ipcMain, 'study:openFile', z.number().int().positive(), (fileId) => {
    const file = getStmt('SELECT * FROM study_files WHERE id = ?').get(fileId)
    if (!file) return false
    const filePath = path.join(FILES_DIR, file.stored_name)
    if (fs.existsSync(filePath)) {
      shell.openPath(filePath)
      return true
    }
    return false
  })
}

module.exports = { register }
