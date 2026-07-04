const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

const SCHEMA_VERSION = 2
const SCHEMA_KEY = 'db_schema_version'

let db

function getDbPath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'sistema.db')
}

function initDatabase() {
  const dbPath = getDbPath()
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -8000')
  db.pragma('temp_store = MEMORY')

  const currentVersion = db.prepare("SELECT value FROM settings WHERE key = ?").get(SCHEMA_KEY)

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'activo',
      tech_stack TEXT DEFAULT '',
      repo_url TEXT DEFAULT '',
      color TEXT DEFAULT '#6366f1',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'media',
      due_date TEXT,
      reminder TEXT,
      project_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS kanban_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      column_type TEXT NOT NULL DEFAULT 'pendiente',
      position INTEGER NOT NULL DEFAULT 0,
      priority TEXT DEFAULT 'media',
      tags TEXT DEFAULT '',
      due_date TEXT,
      project_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      project_id INTEGER,
      duration INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS study_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      order_position INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES study_topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      date TEXT DEFAULT (date('now')),
      FOREIGN KEY (topic_id) REFERENCES study_topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT 'Sin título',
      content TEXT DEFAULT '',
      project_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('daily', 'weekly')),
      target INTEGER NOT NULL,
      metric TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goal_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      value INTEGER DEFAULT 0,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      current INTEGER DEFAULT 0,
      max INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT DEFAULT '',
      focus TEXT DEFAULT '',
      blockers TEXT DEFAULT '',
      tomorrow_plan TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      code TEXT DEFAULT '',
      language TEXT DEFAULT 'text',
      description TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      project_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'check',
      color TEXT DEFAULT '#6366f1',
      frequency TEXT DEFAULT 'daily',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366f1'
    );
  `)

  // Only run migrations if schema version is outdated
  if (!currentVersion || Number(currentVersion.value) < SCHEMA_VERSION) {
    const migrationLog = []
    const migrations = [
      `ALTER TABLE tasks ADD COLUMN project_id INTEGER`,
      `ALTER TABLE tasks ADD COLUMN reminder TEXT`,
      `ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'media'`,
      `ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''`,
      `ALTER TABLE kanban_cards ADD COLUMN project_id INTEGER`,
      `ALTER TABLE kanban_cards ADD COLUMN tags TEXT DEFAULT ''`,
      `ALTER TABLE kanban_cards ADD COLUMN priority TEXT DEFAULT 'media'`,
      `ALTER TABLE kanban_cards ADD COLUMN description TEXT DEFAULT ''`,
      `ALTER TABLE pomodoro_sessions ADD COLUMN project_id INTEGER`,
      `ALTER TABLE pomodoro_sessions ADD COLUMN task_id INTEGER`,
      `ALTER TABLE notes ADD COLUMN project_id INTEGER`,
      `ALTER TABLE notes ADD COLUMN content TEXT DEFAULT ''`,
      `ALTER TABLE snippets ADD COLUMN project_id INTEGER`,
      `ALTER TABLE snippets ADD COLUMN tags TEXT DEFAULT ''`,
      `ALTER TABLE snippets ADD COLUMN description TEXT DEFAULT ''`,
      `ALTER TABLE snippets ADD COLUMN language TEXT DEFAULT 'text'`,
      `ALTER TABLE daily_logs ADD COLUMN tomorrow_plan TEXT DEFAULT ''`,
      `ALTER TABLE daily_logs ADD COLUMN focus TEXT DEFAULT ''`,
      `ALTER TABLE daily_logs ADD COLUMN blockers TEXT DEFAULT ''`,
      `ALTER TABLE study_progress ADD COLUMN completed INTEGER DEFAULT 0`,
      `ALTER TABLE study_progress ADD COLUMN date TEXT DEFAULT (date('now'))`,
      `ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT 'check'`,
      `ALTER TABLE habits ADD COLUMN color TEXT DEFAULT '#6366f1'`,
      `ALTER TABLE habits ADD COLUMN frequency TEXT DEFAULT 'daily'`,
      `ALTER TABLE projects ADD COLUMN color TEXT DEFAULT '#6366f1'`,
      `ALTER TABLE projects ADD COLUMN tech_stack TEXT DEFAULT ''`,
      `ALTER TABLE projects ADD COLUMN repo_url TEXT DEFAULT ''`,
    ]
    for (const sql of migrations) {
      try {
        db.exec(sql)
        migrationLog.push(`OK: ${sql}`)
      } catch (e) {
        // Column likely already exists - ignore
      }
    }
    // Handle old column name in daily_logs (migrate tomorrowPlan -> tomorrow_plan)
    try {
      const cols = db.prepare("PRAGMA table_info('daily_logs')").all()
      const hasNew = cols.some((c) => c.name === 'tomorrow_plan')
      const hasOld = cols.some((c) => c.name === 'tomorrowPlan')
      if (!hasNew && hasOld) {
        db.exec(`ALTER TABLE daily_logs RENAME COLUMN tomorrowPlan TO tomorrow_plan`)
        migrationLog.push('OK: Renamed tomorrowPlan -> tomorrow_plan in daily_logs')
      }
    } catch {}
    if (migrationLog.length > 0) {
      console.log('[DB Migration] Applied:', migrationLog.join('; '))
    }
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(SCHEMA_KEY, String(SCHEMA_VERSION))
  }

  return db
}

function getDb() {
  return db
}

function closeDatabase() {
  if (db) db.close()
}

module.exports = { initDatabase, getDb, closeDatabase, getDbPath }
