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
      // Security: disable native window open from renderer
      nativeWindowOpen: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: false,
        // Security: prevent renderer from accessing Node.js APIs
        enableRemoteModule: false,
        preload: path.join(__dirname, '..', 'preload.js')
      }
    })

    this.setupSecurityHeaders()
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

  setupSecurityHeaders() {
    // Add security headers to all responses
    this.window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders }
      
      // Security headers
      headers['X-Content-Type-Options'] = ['nosniff']
      headers['X-Frame-Options'] = ['DENY']
      headers['X-XSS-Protection'] = ['1; mode=block']
      headers['Referrer-Policy'] = ['strict-origin-when-cross-origin']
      headers['Permissions-Policy'] = ['accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()']
      
      callback({ responseHeaders: headers })
    })
  }

  setupCSP() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 'unsafe-eval' needed for some React/Vite features
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self'" + (this.isDev ? " ws://localhost:5173" : ""),
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "block-all-mixed-content",
      "upgrade-insecure-requests"
    ].join('; ')

    this.window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders }
      headers['Content-Security-Policy'] = [csp]
      callback({ responseHeaders: headers })
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
