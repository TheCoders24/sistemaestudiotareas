function register(ipcMain, { startupProfiler, performanceModes, performanceMonitor, smartPreload, pinLock, pluginSystem, encryption, safeHandle, voidSchema, z }) {
  safeHandle(ipcMain, 'profiler:getReport', voidSchema(), () => startupProfiler.getReport())
  safeHandle(ipcMain, 'profiler:reset', voidSchema(), () => { startupProfiler.reset(); return true })

  safeHandle(ipcMain, 'perf:getMode', voidSchema(), () => performanceModes ? performanceModes.modeId : 'balanceado')
  safeHandle(ipcMain, 'perf:setMode', z.string(), (mode) => {
    if (!performanceModes) return false
    const result = performanceModes.setMode(mode)
    if (result && performanceMonitor) {
      if (mode === 'ahorro') performanceMonitor.stop()
      else if (!performanceMonitor.enabled) performanceMonitor.start()
    }
    return result
  })
  safeHandle(ipcMain, 'perf:getConfig', voidSchema(), () => performanceModes ? performanceModes.getConfig() : null)
  safeHandle(ipcMain, 'perf:getModes', voidSchema(), () => performanceModes ? performanceModes.modes : [])

  safeHandle(ipcMain, 'perf:monitor:start', z.number().optional(), (interval) => {
    if (!performanceMonitor) return false
    performanceMonitor.start(interval)
    return true
  })
  safeHandle(ipcMain, 'perf:monitor:stop', voidSchema(), () => {
    if (!performanceMonitor) return false
    performanceMonitor.stop()
    return true
  })
  safeHandle(ipcMain, 'perf:monitor:getReport', voidSchema(), () => performanceMonitor ? performanceMonitor.getReport() : null)
  safeHandle(ipcMain, 'perf:monitor:getLatest', voidSchema(), () => performanceMonitor ? performanceMonitor.getLatestSample() : null)
  safeHandle(ipcMain, 'perf:monitor:collectSample', voidSchema(), () => performanceMonitor ? performanceMonitor.collectSample() : null)

  safeHandle(ipcMain, 'preload:recordTransition', z.object({
    0: z.string(),
    1: z.string(),
    2: z.number().optional(),
  }).transform(a => ({ fromModule: a[0], toModule: a[1], wsId: a[2] })), ({ fromModule, toModule, wsId }) => {
    if (!smartPreload) return false
    smartPreload.recordTransition(fromModule, toModule, wsId)
    return true
  })
  safeHandle(ipcMain, 'preload:getStats', voidSchema(), () => smartPreload ? smartPreload.getStats() : null)
  safeHandle(ipcMain, 'preload:setLevel', z.string(), (level) => {
    if (!smartPreload) return false
    smartPreload.setLevel(level)
    return true
  })

  safeHandle(ipcMain, 'pin:set', z.string(), async (pin) => {
    if (!pinLock) return false
    return pinLock.setPin(pin)
  })
  safeHandle(ipcMain, 'pin:verify', z.string(), async (pin) => {
    if (!pinLock) return { ok: false, message: 'PIN lock no disponible' }
    return pinLock.verify(pin)
  })
  safeHandle(ipcMain, 'pin:disable', voidSchema(), () => {
    if (!pinLock) return false
    return pinLock.disable()
  })
  safeHandle(ipcMain, 'pin:isEnabled', voidSchema(), () => pinLock ? pinLock.isEnabled() : false)
  safeHandle(ipcMain, 'pin:isLocked', voidSchema(), () => pinLock ? pinLock.isLocked() : false)

  safeHandle(ipcMain, 'plugins:list', voidSchema(), () => pluginSystem ? pluginSystem.listPlugins() : [])
  safeHandle(ipcMain, 'plugins:get', z.string(), (id) => pluginSystem ? pluginSystem.getPlugin(id) : null)
  safeHandle(ipcMain, 'plugins:load', z.string(), async (id) => {
    if (!pluginSystem) return null
    return pluginSystem.load(id)
  })
  safeHandle(ipcMain, 'plugins:unload', z.string(), (id) => {
    if (!pluginSystem) return false
    return pluginSystem.unload(id)
  })
  safeHandle(ipcMain, 'plugins:isActive', z.string(), (id) => pluginSystem ? pluginSystem.isActive(id) : false)

  safeHandle(ipcMain, 'encryption:encrypt', z.string(), (text) => encryption ? encryption.encrypt(text) : text)
  safeHandle(ipcMain, 'encryption:decrypt', z.string(), (data) => encryption ? encryption.decrypt(data) : data)
  safeHandle(ipcMain, 'encryption:hash', z.string(), (data) => encryption ? encryption.hash(data) : data)
  safeHandle(ipcMain, 'encryption:generateKey', voidSchema(), () => encryption ? encryption.generateKey() : null)
}

module.exports = { register }
