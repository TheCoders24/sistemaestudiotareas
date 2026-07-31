const http = require('http')
const dgram = require('dgram')
const os = require('os')

const SYNC_PORT = 27345
const SYNC_HTTP_PORT = 27346

class SyncService {
  constructor(getDb) {
    this.getDb = getDb
    this.server = null
    this.udpBroadcast = null
    this._onDeviceFound = null
  }

  start() {
    if (this.server) return { ok: true, port: SYNC_HTTP_PORT }
    this.server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method === 'GET' && req.url === '/sync') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(this._exportAllData()))
        return
      }
      if (req.method === 'POST' && req.url === '/sync') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', () => {
          try { this._mergeSyncData(JSON.parse(body)); res.writeHead(200); res.end(JSON.stringify({ ok: true })) }
          catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })) }
        })
        return
      }
      if (req.method === 'GET' && req.url === '/info') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ name: os.hostname(), app: 'EstudioApp', version: '1.0.0' }))
        return
      }
      res.writeHead(404); res.end()
    })
    this.server.listen(SYNC_HTTP_PORT, '0.0.0.0', () => console.log(`[SyncService] HTTP on ${SYNC_HTTP_PORT}`))
    this._startUdpBroadcast()
    return { ok: true, port: SYNC_HTTP_PORT }
  }

  stop() {
    if (this.server) { this.server.close(); this.server = null }
    if (this.udpBroadcast) { this.udpBroadcast.close(); this.udpBroadcast = null }
    return { ok: true }
  }

  discover() {
    const interfaces = os.networkInterfaces()
    const addresses = []
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) addresses.push({ ip: iface.address, name })
      }
    }
    return addresses
  }

  async connect(ip) {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://${ip}:${SYNC_HTTP_PORT}/info`, { timeout: 5000 }, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => { try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid response')) } })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    })
  }

  async pull(ip) {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://${ip}:${SYNC_HTTP_PORT}/sync`, { timeout: 30000 }, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => { try { this._mergeSyncData(JSON.parse(body)); resolve({ ok: true }) } catch (e) { reject(e) } })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    })
  }

  async push(ip) {
    const data = this._exportAllData()
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data)
      const req = http.request({
        hostname: ip, port: SYNC_HTTP_PORT, path: '/sync', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        timeout: 30000
      }, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve({ ok: true }) } })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
      req.write(postData); req.end()
    })
  }

  _startUdpBroadcast() {
    this.udpBroadcast = dgram.createSocket('udp4')
    this.udpBroadcast.bind(() => {
      this.udpBroadcast.setBroadcast(true)
      const msg = JSON.stringify({ app: 'EstudioApp', name: os.hostname(), port: SYNC_HTTP_PORT })
      setInterval(() => { const buf = Buffer.from(msg); this.udpBroadcast.send(buf, 0, buf.length, SYNC_PORT, '255.255.255.255') }, 3000)
      const startupMsg = Buffer.from(msg)
      this.udpBroadcast.send(startupMsg, 0, startupMsg.length, SYNC_PORT, '255.255.255.255')
    })
    this.udpBroadcast.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString())
        if (data.app === 'EstudioApp' && data.name !== os.hostname()) {
          this._onDeviceFound && this._onDeviceFound({ ...data, ip: rinfo.address })
        }
      } catch {}
    })
    this.udpBroadcast.bind(SYNC_PORT)
  }

  onDeviceFound(callback) { this._onDeviceFound = callback }

  _exportAllData() {
    const db = this.getDb()
    if (!db) return {}
    const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','notes','goals','daily_logs','snippets','habits','habit_logs','subtasks']
    const data = {}
    for (const table of tables) { try { data[table] = db.prepare(`SELECT * FROM ${table}`).all() } catch { data[table] = [] } }
    data._exportDate = new Date().toISOString()
    return data
  }

  _mergeSyncData(incoming) {
    const db = this.getDb()
    if (!db) return
    const tables = Object.keys(incoming).filter(k => !k.startsWith('_'))
    const tx = db.transaction(() => {
      for (const table of tables) {
        if (!incoming[table] || !incoming[table].length) continue
        try {
          const existing = db.prepare(`SELECT * FROM ${table}`).all()
          const existingIds = new Set(existing.map(r => r.id))
          for (const row of incoming[table]) {
            if (existingIds.has(row.id)) {
              const cols = Object.keys(row).filter(k => k !== 'id')
              const sets = cols.map(c => `${c} = @${c}`).join(', ')
              if (sets) db.prepare(`UPDATE ${table} SET ${sets} WHERE id = @id`).run(row)
            } else {
              const columns = Object.keys(row).join(', ')
              const placeholders = Object.keys(row).map(k => `@${k}`).join(', ')
              db.prepare(`INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`).run(row)
            }
          }
        } catch (e) { console.error(`Merge error ${table}:`, e) }
      }
    })
    tx()
  }
}

module.exports = { SyncService }
