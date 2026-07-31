const { BrowserWindow, session, app } = require('electron')
const path = require('path')

class WindowManager {
  constructor() {
    this.window = null
    this.boundsSaveTimeout = null
    this.isDev = !app.isPackaged
  }

  async create() {
    const bounds = await this.loadBounds()

    this.window = new BrowserWindow({
      width: bounds?.width || 1200,
      height: bounds?.height || 800,
      x: bounds?.x,
      y: bounds?.y,
      minWidth: 800,
      minHeight: 600,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: false,
        preload: path.join(__dirname, '..', 'preload.js')
      }
    })

    this.setupCSP()
    this.setupBoundsTracking()

    if (this.isDev) {
      this.window.loadURL('http://localhost:5173')
    } else {
      this.window.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'))
    }

    this.window.once('ready-to-show', () => {
      this.window.show()
    })

    if (this.isDev) {
      this.window.webContents.openDevTools()
    }

    this.window.on('closed', () => {
      this.window = null
    })

    return this.window
  }

  getWindow() {
    return this.window
  }

  close() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
    this.window = null
  }

  setupCSP() {
    this.window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' " + (this.isDev ? "ws://localhost:5173" : "")
          ]
        }
      })
    })
  }

  setupBoundsTracking() {
    this.window.on('resize', () => this.debounceSaveBounds())
    this.window.on('move', () => this.debounceSaveBounds())
  }

  debounceSaveBounds() {
    if (this.boundsSaveTimeout) clearTimeout(this.boundsSaveTimeout)
    this.boundsSaveTimeout = setTimeout(() => this.saveBounds(), 500)
  }

  async loadBounds() {
    try {
      const { getDb } = require('../database')
      const db = getDb()
      const row = db.prepare("SELECT value FROM settings WHERE key = 'window_bounds'").get()
      return row ? JSON.parse(row.value) : null
    } catch {
      return null
    }
  }

  async saveBounds() {
    if (!this.window || this.window.isDestroyed() || this.window.isMinimized()) return
    try {
      const bounds = this.window.getBounds()
      const { getDb } = require('../database')
      const db = getDb()
      db.prepare("INSERT INTO settings (key, value) VALUES ('window_bounds', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .run(JSON.stringify({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }))
    } catch {
      // settings table might not exist yet
    }
  }
}

module.exports = new WindowManager()
