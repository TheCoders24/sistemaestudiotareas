const path = require('path')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')
const MIGRATION_TABLE = 'schema_migrations'

function createMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      checksum TEXT
    )
  `)
}

function getAppliedMigrations(db) {
  return db.prepare(`SELECT version FROM ${MIGRATION_TABLE} ORDER BY version`).all().map(r => r.version)
}

function getMigrationFiles() {
  const fs = require('fs')
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => {
      const match = f.match(/^(\d{4})_(.+)\.js$/)
      if (!match) return null
      return {
        version: parseInt(match[1], 10),
        name: match[2],
        file: f
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.version - b.version)
  return files
}

function loadMigration(file) {
  const migration = require(path.join(MIGRATIONS_DIR, file))
  return migration
}

function runMigrations(db) {
  createMigrationTable(db)
  const applied = getAppliedMigrations(db)
  const files = getMigrationFiles()
  
  let appliedCount = 0
  
  for (const file of files) {
    if (applied.includes(file.version)) continue
    
    const migration = loadMigration(file.file)
    const checksum = migration.checksum || ''
    
    console.log(`[Migration] Applying v${file.version}: ${file.name}`)
    
    const tx = db.transaction(() => {
      if (migration.up) migration.up(db)
      db.prepare(`INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)`)
        .run(file.version, file.name, checksum)
    })
    
    try {
      tx()
      console.log(`[Migration] v${file.version} applied successfully`)
      appliedCount++
    } catch (err) {
      console.error(`[Migration] Failed v${file.version}:`, err.message)
      throw err
    }
  }
  
  if (appliedCount === 0) {
    console.log('[Migration] No pending migrations')
  }
  
  return appliedCount
}

function rollbackMigration(db, targetVersion) {
  createMigrationTable(db)
  const applied = getAppliedMigrations(db).filter(v => v > targetVersion).sort((a, b) => b - a)
  
  for (const version of applied) {
    const files = getMigrationFiles()
    const file = files.find(f => f.version === version)
    if (!file) {
      console.error(`[Migration] Cannot find file for version ${version}`)
      continue
    }
    
    const migration = loadMigration(file.file)
    console.log(`[Migration] Rolling back v${version}: ${file.name}`)
    
    const tx = db.transaction(() => {
      if (migration.down) migration.down(db)
      db.prepare(`DELETE FROM schema_migrations WHERE version = ?`).run(version)
    })
    
    try {
      tx()
      console.log(`[Migration] v${version} rolled back successfully`)
    } catch (err) {
      console.error(`[Migration] Rollback failed v${version}:`, err.message)
      throw err
    }
  }
}

module.exports = {
  runMigrations,
  rollbackMigration,
  getAppliedMigrations,
  MIGRATION_TABLE
}