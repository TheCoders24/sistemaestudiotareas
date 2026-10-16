let syncServer = null
let syncUdpBroadcast = null
let syncUdpInterval = null
const SYNC_PORT = 27345
const SYNC_HTTP_PORT = 27346
let syncToken = null

function generateSyncToken() {
  syncToken = require('crypto').randomBytes(16).toString('hex')
  return syncToken
}

function getSyncToken() { return syncToken }

const { ALL_TABLES } = require('../core/backup-tables')

function exportAllData(getDb) {
  const tables = ALL_TABLES
  const data = {}
  for (const table of tables) {
    try { data[table] = getDb().prepare(`SELECT * FROM ${table}`).all() } catch { data[table] = [] }
  }
  data._exportDate = new Date().toISOString()
  return data
}

function primaryKeyColumns(db, table) {
  try {
    return db.prepare(`PRAGMA table_info('${table}')`).all().filter(c => c.pk > 0).map(c => c.name)
  } catch { return [] }
}

function mergeSyncData(getStmt, getDb, incoming) {
  const db = getDb()
  if (!db || !incoming || typeof incoming !== 'object') return
  const known = new Set(ALL_TABLES)
  const tables = ALL_TABLES.filter(t => known.has(t) && Array.isArray(incoming[t]) && incoming[t].length)
  try { db.exec('PRAGMA foreign_keys = OFF') } catch {}
  const tx = db.transaction(() => {
    for (const table of tables) {
      let validCols
      try {
        validCols = new Set(db.prepare(`PRAGMA table_info('${table}')`).all().map(c => c.name))
      } catch { continue }
      const pk = primaryKeyColumns(db, table)
      for (const row of incoming[table]) {
        try {
          const keys = Object.keys(row).filter(k => validCols.has(k))
          if (!keys.length) continue
          const hasPk = pk.length > 0 && pk.every(k => row[k] !== undefined && row[k] !== null)
          if (hasPk) {
            const where = pk.map(k => `${k} = ?`).join(' AND ')
            const pkValues = pk.map(k => row[k])
            const existing = db.prepare(`SELECT 1 FROM ${table} WHERE ${where} LIMIT 1`).get(...pkValues)
            if (existing) {
              const setCols = keys.filter(k => !pk.includes(k))
              if (setCols.length) {
                const sets = setCols.map(k => `${k} = ?`).join(', ')
                db.prepare(`UPDATE ${table} SET ${sets} WHERE ${where}`).run(...setCols.map(k => row[k]), ...pkValues)
              }
            } else {
              const columns = keys.join(', ')
              const placeholders = keys.map(() => '?').join(', ')
              db.prepare(`INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`).run(...keys.map(k => row[k]))
            }
          } else {
            const columns = keys.join(', ')
            const placeholders = keys.map(() => '?').join(', ')
            db.prepare(`INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`).run(...keys.map(k => row[k]))
          }
        } catch (e) {
          console.error(`Merge error ${table}:`, e.message)
        }
      }
    }
  })
  try { tx() } finally { try { db.exec('PRAGMA foreign_keys = ON') } catch {} }
}

function verifyToken(req) {
  if (!syncToken) return true
  const token = req.headers['x-sync-token']
  return token === syncToken
}

function broadcastAddresses() {
  const os = require('os')
  const out = new Set(['255.255.255.255'])
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family !== 'IPv4' || iface.internal) continue
      const ip = String(iface.address).split('.').map(Number)
      const mask = String(iface.netmask || '255.255.255.255').split('.').map(Number)
      if (ip.length === 4 && mask.length === 4 && ip.every(n => !Number.isNaN(n)) && mask.every(n => !Number.isNaN(n))) {
        out.add(ip.map((o, i) => (o | (~mask[i] & 255))).join('.'))
      }
    }
  }
  return [...out]
}

function httpGetJson(url, timeout, headers) {
  const http = require('http')
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout, headers: headers || {} }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid response')) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function httpPostJson(url, data, timeout, headers) {
  const http = require('http')
  const parsed = new URL(url)
  const postData = JSON.stringify(data)
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(headers || {}),
      },
      timeout,
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) } catch { resolve({ ok: true }) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.write(postData)
    req.end()
  })
}

async function resolvePeerToken(ip) {
  try {
    const info = await httpGetJson(`http://${ip}:${SYNC_HTTP_PORT}/info`, 5000)
    return info && info.token ? info.token : (syncToken || '')
  } catch {
    return syncToken || ''
  }
}

function register(ipcMain, { getStmt, getDb, mainWindow, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'wifi-sync:start', voidSchema(), () => {
    if (!syncToken) generateSyncToken()

    if (!syncServer) {
      const http = require('http')
      const os = require('os')

      syncServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Token')

        if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

        if (req.method === 'GET' && req.url === '/info') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ name: os.hostname(), app: 'EstudioApp', version: '1.0.0', requiresAuth: true, token: syncToken }))
          return
        }

        if ((req.method === 'GET' || req.method === 'POST') && req.url === '/sync') {
          if (!verifyToken(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Unauthorized: invalid or missing X-Sync-Token' }))
            return
          }

          if (req.method === 'GET') {
            const data = exportAllData(getDb)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(data))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body)
                mergeSyncData(getStmt, getDb, incoming)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: true }))
              } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: e.message }))
              }
            })
            return
          }
        }

        res.writeHead(404)
        res.end()
      })

      syncServer.on('error', (e) => {
        console.error('[WiFi Sync] HTTP server error:', e.message)
        try { syncServer.close() } catch {}
        syncServer = null
      })

      syncServer.listen(SYNC_HTTP_PORT, '0.0.0.0', () => {
        console.log(`[WiFi Sync] Server on 0.0.0.0:${SYNC_HTTP_PORT}`)
      })
    }

    if (!syncUdpBroadcast) {
      const dgram = require('dgram')
      const os = require('os')

      syncUdpBroadcast = dgram.createSocket({ type: 'udp4', reuseAddr: true })
      syncUdpBroadcast.on('error', (e) => {
        console.error('[WiFi Sync] UDP error:', e.message)
        try { syncUdpBroadcast.close() } catch {}
        syncUdpBroadcast = null
      })

      syncUdpBroadcast.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString())
          if (data && data.app === 'EstudioApp' && data.name !== os.hostname()) {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('wifi-sync:device-found', { ...data, ip: rinfo.address })
            }
          }
        } catch {}
      })

      syncUdpBroadcast.bind(SYNC_PORT, () => {
        try {
          syncUdpBroadcast.setBroadcast(true)
          const msg = JSON.stringify({ app: 'EstudioApp', name: os.hostname(), port: SYNC_HTTP_PORT })
          const announce = () => {
            if (!syncUdpBroadcast) return
            const buf = Buffer.from(msg)
            for (const addr of broadcastAddresses()) {
              try { syncUdpBroadcast.send(buf, 0, buf.length, SYNC_PORT, addr) } catch {}
            }
          }
          announce()
          syncUdpInterval = setInterval(announce, 3000)
        } catch (e) {
          console.error('[WiFi Sync] UDP setup error:', e.message)
        }
      })
    }

    return { ok: true, port: SYNC_HTTP_PORT, token: syncToken }
  })

  safeHandle(ipcMain, 'wifi-sync:stop', voidSchema(), () => {
    if (syncUdpInterval) { clearInterval(syncUdpInterval); syncUdpInterval = null }
    if (syncServer) { syncServer.close(); syncServer = null }
    if (syncUdpBroadcast) { try { syncUdpBroadcast.close() } catch {}; syncUdpBroadcast = null }
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
    return httpGetJson(`http://${ip}:${SYNC_HTTP_PORT}/info`, 5000)
  })

  safeHandle(ipcMain, 'wifi-sync:pull', schemas.sync.wifi.pull, async ({ ip }) => {
    const token = await resolvePeerToken(ip)
    const data = await httpGetJson(`http://${ip}:${SYNC_HTTP_PORT}/sync`, 30000, { 'X-Sync-Token': token })
    mergeSyncData(getStmt, getDb, data)
    return { ok: true }
  })

  safeHandle(ipcMain, 'wifi-sync:push', schemas.sync.wifi.push, async ({ ip }) => {
    const token = await resolvePeerToken(ip)
    const data = exportAllData(getDb)
    return httpPostJson(`http://${ip}:${SYNC_HTTP_PORT}/sync`, data, 30000, { 'X-Sync-Token': token })
  })
}

module.exports = { register, generateSyncToken, getSyncToken, mergeSyncData, exportAllData }
