let syncServer = null
let syncUdpBroadcast = null
const SYNC_PORT = 27345
const SYNC_HTTP_PORT = 27346

function exportAllData(getDb) {
  const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','notes','goals','daily_logs','snippets','habits','habit_logs','subtasks']
  const data = {}
  for (const table of tables) {
    try { data[table] = getDb().prepare(`SELECT * FROM ${table}`).all() } catch { data[table] = [] }
  }
  data._exportDate = new Date().toISOString()
  return data
}

function mergeSyncData(getStmt, getDb, incoming) {
  const tables = Object.keys(incoming).filter(k => !k.startsWith('_'))
  const tx = getDb().transaction(() => {
    for (const table of tables) {
      if (!incoming[table] || !incoming[table].length) continue
      try {
        const existing = getDb().prepare(`SELECT * FROM ${table}`).all()
        const existingIds = new Set(existing.map(r => r.id))
        const incomingIds = new Set(incoming[table].map(r => r.id))
        for (const row of incoming[table]) {
          if (existingIds.has(row.id)) {
            const cols = Object.keys(row).filter(k => k !== 'id')
            const sets = cols.map(c => `${c} = @${c}`).join(', ')
            if (sets) getStmt(`UPDATE ${table} SET ${sets} WHERE id = @id`).run(row)
          } else {
            const columns = Object.keys(row).join(', ')
            const placeholders = Object.keys(row).map(k => `@${k}`).join(', ')
            getStmt(`INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`).run(row)
          }
        }
      } catch (e) { console.error(`Merge error ${table}:`, e) }
    }
  })
  tx()
}

function register(ipcMain, { getStmt, getDb, mainWindow, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'wifi-sync:start', voidSchema(), () => {
    if (syncServer) return { ok: true, port: SYNC_HTTP_PORT }
    const http = require('http')
    const os = require('os')

    syncServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

      if (req.method === 'GET' && req.url === '/sync') {
        const data = exportAllData(getDb)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(data))
        return
      }

      if (req.method === 'POST' && req.url === '/sync') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', () => {
          try {
            const incoming = JSON.parse(body)
            mergeSyncData(getStmt, getDb, incoming)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: e.message }))
          }
        })
        return
      }

      if (req.method === 'GET' && req.url === '/info') {
        const hostname = os.hostname()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ name: hostname, app: 'EstudioApp', version: '1.0.0' }))
        return
      }

      res.writeHead(404)
      res.end()
    })

    syncServer.listen(SYNC_HTTP_PORT, '0.0.0.0', () => {
      console.log(`[WiFi Sync] Server on port ${SYNC_HTTP_PORT}`)
    })

    const dgram = require('dgram')
    syncUdpBroadcast = dgram.createSocket('udp4')
    syncUdpBroadcast.bind(() => {
      syncUdpBroadcast.setBroadcast(true)
      const hostname = os.hostname()
      const msg = JSON.stringify({ app: 'EstudioApp', name: hostname, port: SYNC_HTTP_PORT })
      setInterval(() => {
        const buf = Buffer.from(msg)
        syncUdpBroadcast.send(buf, 0, buf.length, SYNC_PORT, '255.255.255.255')
      }, 3000)
      const startupMsg = Buffer.from(msg)
      syncUdpBroadcast.send(startupMsg, 0, startupMsg.length, SYNC_PORT, '255.255.255.255')
    })

    syncUdpBroadcast.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString())
        if (data.app === 'EstudioApp' && data.name !== os.hostname()) {
          if (mainWindow) mainWindow.webContents.send('wifi-sync:device-found', { ...data, ip: rinfo.address })
        }
      } catch {}
    })
    syncUdpBroadcast.bind(SYNC_PORT)

    return { ok: true, port: SYNC_HTTP_PORT }
  })

  safeHandle(ipcMain, 'wifi-sync:stop', voidSchema(), () => {
    if (syncServer) { syncServer.close(); syncServer = null }
    if (syncUdpBroadcast) { syncUdpBroadcast.close(); syncUdpBroadcast = null }
    return { ok: true }
  })

  safeHandle(ipcMain, 'wifi-sync:discover', voidSchema(), () => {
    const os = require('os')
    const interfaces = os.networkInterfaces()
    const addresses = []
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push({ ip: iface.address, name })
        }
      }
    }
    return addresses
  })

  safeHandle(ipcMain, 'wifi-sync:connect', schemas.sync.wifi.connect, async ({ ip }) => {
    const http = require('http')
    return new Promise((resolve, reject) => {
      const req = http.get(`http://${ip}:${SYNC_HTTP_PORT}/info`, { timeout: 5000 }, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => {
          try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid response')) }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    })
  })

  safeHandle(ipcMain, 'wifi-sync:pull', schemas.sync.wifi.pull, async ({ ip }) => {
    const http = require('http')
    return new Promise((resolve, reject) => {
      const req = http.get(`http://${ip}:${SYNC_HTTP_PORT}/sync`, { timeout: 30000 }, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => {
          try { mergeSyncData(getStmt, getDb, JSON.parse(body)); resolve({ ok: true }) }
          catch (e) { reject(e) }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    })
  })

  safeHandle(ipcMain, 'wifi-sync:push', schemas.sync.wifi.push, async ({ ip }) => {
    const http = require('http')
    const data = exportAllData(getDb)
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
      req.write(postData)
      req.end()
    })
  })
}

module.exports = { register }
