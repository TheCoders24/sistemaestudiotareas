const path = require('path')
const fs = require('fs')

class PluginSystem {
  constructor({ pluginDir, getDb, eventBus, logger } = {}) {
    this.pluginDir = pluginDir || path.join(require('electron').app.getPath('userData'), 'plugins')
    this.getDb = getDb
    this.eventBus = eventBus
    this.logger = logger || console
    this.plugins = new Map()
    this.initialized = false
  }

  async init() {
    if (this.initialized) return
    try {
      if (!fs.existsSync(this.pluginDir)) {
        fs.mkdirSync(this.pluginDir, { recursive: true })
      }
      this.initialized = true
      await this.loadAll()
    } catch (err) {
      this.logger.error('[PluginSystem] Error initializing:', err)
    }
  }

  async loadAll() {
    try {
      const entries = fs.readdirSync(this.pluginDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.load(entry.name)
        }
      }
    } catch (err) {
      this.logger.error('[PluginSystem] Error loading plugins:', err)
    }
  }

  async load(pluginId) {
    const pluginPath = path.join(this.pluginDir, pluginId)
    const manifestPath = path.join(pluginPath, 'manifest.json')

    try {
      if (!fs.existsSync(manifestPath)) {
        this.logger.warn(`[PluginSystem] No manifest found for ${pluginId}`)
        return null
      }

      const manifestRaw = fs.readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(manifestRaw)

      if (!this.validateManifest(manifest)) {
        this.logger.warn(`[PluginSystem] Invalid manifest for ${pluginId}`)
        return null
      }

      const mainPath = path.join(pluginPath, manifest.main || 'index.js')
      if (!fs.existsSync(mainPath)) {
        this.logger.warn(`[PluginSystem] No main file for ${pluginId}`)
        return null
      }

      const context = this.createContext(pluginId, manifest)
      const pluginModule = require(mainPath)

      if (typeof pluginModule.activate === 'function') {
        pluginModule.activate(context)
      }

      const plugin = { id: pluginId, manifest, module: pluginModule, context, active: true, loadedAt: new Date().toISOString() }
      this.plugins.set(pluginId, plugin)
      this.logger.log(`[PluginSystem] Loaded plugin: ${pluginId} v${manifest.version}`)
      return plugin
    } catch (err) {
      this.logger.error(`[PluginSystem] Error loading plugin ${pluginId}:`, err)
      return null
    }
  }

  unload(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return false
    try {
      if (typeof plugin.module.deactivate === 'function') {
        plugin.module.deactivate(plugin.context)
      }
      this.plugins.delete(pluginId)
      this.logger.log(`[PluginSystem] Unloaded plugin: ${pluginId}`)
      return true
    } catch (err) {
      this.logger.error(`[PluginSystem] Error unloading plugin ${pluginId}:`, err)
      return false
    }
  }

  createContext(pluginId, manifest) {
    const permissions = manifest.permissions || []
    const db = this.getDb ? this.getDb() : null

    return {
      pluginId,
      manifest,
      log: {
        info: (...args) => this.logger.log(`[Plugin:${pluginId}]`, ...args),
        warn: (...args) => this.logger.warn(`[Plugin:${pluginId}]`, ...args),
        error: (...args) => this.logger.error(`[Plugin:${pluginId}]`, ...args),
      },
      db: permissions.includes('db:read') ? db : null,
      eventBus: this.eventBus && permissions.includes('events:subscribe') ? {
        subscribe: (type, handler) => this.eventBus.subscribe(type, handler),
        publish: permissions.includes('events:publish') ? (event) => this.eventBus.publish(event) : null,
      } : null,
      storage: permissions.includes('storage') ? {
        get: (key) => {
          try {
            const p = path.join(this.pluginDir, pluginId, 'data.json')
            if (!fs.existsSync(p)) return null
            const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
            return data[key]
          } catch { return null }
        },
        set: (key, value) => {
          try {
            const p = path.join(this.pluginDir, pluginId, 'data.json')
            let data = {}
            if (fs.existsSync(p)) data = JSON.parse(fs.readFileSync(p, 'utf-8'))
            data[key] = value
            fs.writeFileSync(p, JSON.stringify(data, null, 2))
          } catch {}
        },
      } : null,
    }
  }

  validateManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') return false
    if (!manifest.id || typeof manifest.id !== 'string') return false
    if (!manifest.name || typeof manifest.name !== 'string') return false
    if (!manifest.version || typeof manifest.version !== 'string') return false
    if (manifest.permissions && !Array.isArray(manifest.permissions)) return false
    return true
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId) || null
  }

  listPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description || '',
      permissions: p.manifest.permissions || [],
      active: p.active,
      loadedAt: p.loadedAt,
    }))
  }

  isActive(pluginId) {
    const plugin = this.plugins.get(pluginId)
    return plugin ? plugin.active : false
  }

  async destroy() {
    for (const [id] of this.plugins) {
      this.unload(id)
    }
    this.plugins.clear()
  }
}

module.exports = { PluginSystem }
