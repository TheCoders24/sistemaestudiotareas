function register(ipcMain, { getStmt, app, globalShortcut, mainWindow, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getSetting', schemas.settings.get, (key) => {
    const row = getStmt('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : null
  })
  safeHandle(ipcMain, 'db:setSetting', schemas.settings.set, ({ key, value }) => {
    getStmt('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    return true
  })
  safeHandle(ipcMain, 'app:getAutoStart', voidSchema(), () => {
    return app.getLoginItemSettings().openAtLogin
  })
  safeHandle(ipcMain, 'app:setAutoStart', z.boolean(), (enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return true
  })
  safeHandle(ipcMain, 'shortcuts:register', z.object({ accelerator: z.string(), action: z.string() }), ({ accelerator, action }) => {
    try {
      globalShortcut.register(accelerator, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show()
          mainWindow.focus()
          mainWindow.webContents.send('tray:action', action)
        }
      })
      return true
    } catch { return false }
  })
  safeHandle(ipcMain, 'shortcuts:unregister', z.string(), (accelerator) => {
    globalShortcut.unregister(accelerator)
    return true
  })
}

module.exports = { register }
