const { Notification } = require('electron')

class NotificationManager {
  constructor() {
    this.queue = []
    this.processing = false
    this.lastNotificationTime = 0
    this.throttleMs = 1000
  }

  show(title, body, severity = 'info') {
    return new Promise((resolve) => {
      this.queue.push({ title, body, severity, resolve })
      this.processQueue()
    })
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    const now = Date.now()
    const elapsed = now - this.lastNotificationTime
    if (elapsed < this.throttleMs) {
      await new Promise(r => setTimeout(r, this.throttleMs - elapsed))
    }

    const item = this.queue.shift()
    this.lastNotificationTime = Date.now()

    try {
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: item.title,
          body: item.body
        })
        notification.on('click', () => item.resolve({ clicked: true }))
        notification.on('close', () => item.resolve({ clicked: false }))
        notification.show()
      } else {
        await this.fallbackNotification(item.title, item.body)
        item.resolve({ clicked: false })
      }
    } catch {
      try {
        await this.fallbackNotification(item.title, item.body)
      } catch {
        // completely fail silently
      }
      item.resolve({ clicked: false })
    }

    this.processing = false
    this.processQueue()
  }

  async fallbackNotification(title, body) {
    try {
      const notifier = require('node-notifier')
      return new Promise((resolve, reject) => {
        notifier.notify({ title, message: body }, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    } catch {
      // node-notifier not available
    }
  }

  notifyRenderer(webContents, channel, data) {
    if (webContents && !webContents.isDestroyed()) {
      webContents.send(channel, data)
    }
  }
}

module.exports = new NotificationManager()
