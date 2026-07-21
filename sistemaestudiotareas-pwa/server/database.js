const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const SCHEMA_VERSION = 8
let db = null

function getDbPath() {
  const dataDir = path.join(__dirname, '..', 'data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  return path.join(dataDir, 'database.sqlite')
}

function getDb() {
  if (!db) {
    db = new Database(getDbPath())
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initDatabase()
    deferDbInit()
  }
  return db
}

const stmtCache = new Map()
function getStmt(sql) {
  if (!stmtCache.has(sql)) stmtCache.set(sql, getDb().prepare(sql))
  return stmtCache.get(sql)
}

function initDatabase() {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', status TEXT DEFAULT 'activo', tech_stack TEXT DEFAULT '', repo_url TEXT DEFAULT '', color TEXT DEFAULT '#6366f1', deleted INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '', completed INTEGER DEFAULT 0, priority TEXT DEFAULT 'media', due_date TEXT, reminder TEXT, tags TEXT DEFAULT '', project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, repeat TEXT, deleted INTEGER DEFAULT 0, position INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS subtasks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, title TEXT NOT NULL, completed INTEGER DEFAULT 0, position INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS entity_links (id INTEGER PRIMARY KEY AUTOINCREMENT, from_type TEXT NOT NULL, from_id INTEGER NOT NULL, to_type TEXT NOT NULL, to_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), UNIQUE(from_type, from_id, to_type, to_id));
    CREATE TABLE IF NOT EXISTS kanban_cards (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '', column_type TEXT NOT NULL DEFAULT 'pendiente', position INTEGER NOT NULL DEFAULT 0, priority TEXT DEFAULT 'media', tags TEXT DEFAULT '', due_date TEXT, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, duration INTEGER NOT NULL, started_at TEXT NOT NULL, ended_at TEXT);
    CREATE TABLE IF NOT EXISTS study_topics (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER REFERENCES study_topics(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT DEFAULT '', resource_url TEXT DEFAULT '', study_level INTEGER DEFAULT 0, study_level_updated_at TEXT, order_position INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS study_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE, completed INTEGER DEFAULT 0, date TEXT DEFAULT (date('now')));
    CREATE TABLE IF NOT EXISTS study_files (id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE, original_name TEXT NOT NULL, stored_name TEXT NOT NULL UNIQUE, file_size INTEGER DEFAULT 0, mime_type TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT DEFAULT 'Sin t\u00edtulo', content TEXT DEFAULT '', project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, deleted INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('daily','weekly')), target INTEGER NOT NULL, metric TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS goal_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE, date TEXT NOT NULL, value INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS streaks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, current INTEGER DEFAULT 0, max INTEGER DEFAULT 0, updated_at TEXT DEFAULT (date('now')));
    CREATE TABLE IF NOT EXISTS daily_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, content TEXT DEFAULT '', focus TEXT DEFAULT '', blockers TEXT DEFAULT '', tomorrow_plan TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS snippets (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, code TEXT DEFAULT '', language TEXT DEFAULT 'text', description TEXT DEFAULT '', tags TEXT DEFAULT '', project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS habits (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, icon TEXT DEFAULT 'check', color TEXT DEFAULT '#6366f1', frequency TEXT DEFAULT 'daily', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS habit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE, date TEXT NOT NULL, completed INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT DEFAULT '#6366f1');
    CREATE TABLE IF NOT EXISTS achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT DEFAULT '', icon TEXT DEFAULT 'trophy', xp_reward INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS user_achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE, unlocked_at TEXT DEFAULT (datetime('now')), UNIQUE(achievement_id));
    CREATE TABLE IF NOT EXISTS xp_log (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS challenges (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT DEFAULT '', icon TEXT DEFAULT 'zap', requirement_type TEXT NOT NULL, requirement_count INTEGER NOT NULL, period TEXT DEFAULT 'weekly', xp_reward INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS user_challenges (id INTEGER PRIMARY KEY AUTOINCREMENT, challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE, progress INTEGER DEFAULT 0, completed INTEGER DEFAULT 0, week_start TEXT NOT NULL, completed_at TEXT, UNIQUE(challenge_id, week_start));
    CREATE TABLE IF NOT EXISTS weekly_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, week_start TEXT NOT NULL UNIQUE, pomodoros INTEGER DEFAULT 0, tasks_completed INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, streak_max INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS flashcard_decks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS flashcards (id INTEGER PRIMARY KEY AUTOINCREMENT, deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE, front TEXT NOT NULL, back TEXT NOT NULL, hint TEXT DEFAULT '', difficulty INTEGER DEFAULT 0, ease_factor REAL DEFAULT 2.5, repetitions INTEGER DEFAULT 0, interval INTEGER DEFAULT 0, next_review TEXT DEFAULT (datetime('now')), created_at TEXT DEFAULT (datetime('now')));
  `)
}

function deferDbInit() {
  const db = getDb()
  const version = db.prepare("SELECT value FROM settings WHERE key = 'db_schema_version'").get()
  const currentVersion = version ? parseInt(version.value, 10) : 0

  const migrations = [
    { col: 'position', sql: "ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0", table: 'tasks' },
    { col: 'repeat', sql: "ALTER TABLE tasks ADD COLUMN repeat TEXT", table: 'tasks' },
    { col: 'deleted_t', sql: "ALTER TABLE tasks ADD COLUMN deleted INTEGER DEFAULT 0", table: 'tasks' },
    { col: 'deleted_n', sql: "ALTER TABLE notes ADD COLUMN deleted INTEGER DEFAULT 0", table: 'notes' },
    { col: 'deleted_p', sql: "ALTER TABLE projects ADD COLUMN deleted INTEGER DEFAULT 0", table: 'projects' },
    { col: 'project_id_t', sql: "ALTER TABLE tasks ADD COLUMN project_id INTEGER", table: 'tasks' },
    { col: 'reminder', sql: "ALTER TABLE tasks ADD COLUMN reminder TEXT", table: 'tasks' },
    { col: 'priority_t', sql: "ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'media'", table: 'tasks' },
    { col: 'desc_t', sql: "ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''", table: 'tasks' },
    { col: 'project_id_k', sql: "ALTER TABLE kanban_cards ADD COLUMN project_id INTEGER", table: 'kanban_cards' },
    { col: 'tags_k', sql: "ALTER TABLE kanban_cards ADD COLUMN tags TEXT DEFAULT ''", table: 'kanban_cards' },
    { col: 'priority_k', sql: "ALTER TABLE kanban_cards ADD COLUMN priority TEXT DEFAULT 'media'", table: 'kanban_cards' },
    { col: 'desc_k', sql: "ALTER TABLE kanban_cards ADD COLUMN description TEXT DEFAULT ''", table: 'kanban_cards' },
    { col: 'project_id_p', sql: "ALTER TABLE pomodoro_sessions ADD COLUMN project_id INTEGER", table: 'pomodoro_sessions' },
    { col: 'task_id_p', sql: "ALTER TABLE pomodoro_sessions ADD COLUMN task_id INTEGER", table: 'pomodoro_sessions' },
    { col: 'project_id_n', sql: "ALTER TABLE notes ADD COLUMN project_id INTEGER", table: 'notes' },
    { col: 'content_n', sql: "ALTER TABLE notes ADD COLUMN content TEXT DEFAULT ''", table: 'notes' },
    { col: 'project_id_s', sql: "ALTER TABLE snippets ADD COLUMN project_id INTEGER", table: 'snippets' },
    { col: 'tags_s', sql: "ALTER TABLE snippets ADD COLUMN tags TEXT DEFAULT ''", table: 'snippets' },
    { col: 'desc_s', sql: "ALTER TABLE snippets ADD COLUMN description TEXT DEFAULT ''", table: 'snippets' },
    { col: 'lang_s', sql: "ALTER TABLE snippets ADD COLUMN language TEXT DEFAULT 'text'", table: 'snippets' },
    { col: 'tomorrow_plan', sql: "ALTER TABLE daily_logs ADD COLUMN tomorrow_plan TEXT DEFAULT ''", table: 'daily_logs' },
    { col: 'focus', sql: "ALTER TABLE daily_logs ADD COLUMN focus TEXT DEFAULT ''", table: 'daily_logs' },
    { col: 'blockers', sql: "ALTER TABLE daily_logs ADD COLUMN blockers TEXT DEFAULT ''", table: 'daily_logs' },
    { col: 'completed_sp', sql: "ALTER TABLE study_progress ADD COLUMN completed INTEGER DEFAULT 0", table: 'study_progress' },
    { col: 'date_sp', sql: "ALTER TABLE study_progress ADD COLUMN date TEXT DEFAULT (date('now'))", table: 'study_progress' },
    { col: 'icon_h', sql: "ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT 'check'", table: 'habits' },
    { col: 'color_h', sql: "ALTER TABLE habits ADD COLUMN color TEXT DEFAULT '#6366f1'", table: 'habits' },
    { col: 'freq_h', sql: "ALTER TABLE habits ADD COLUMN frequency TEXT DEFAULT 'daily'", table: 'habits' },
    { col: 'color_pr', sql: "ALTER TABLE projects ADD COLUMN color TEXT DEFAULT '#6366f1'", table: 'projects' },
    { col: 'tech_pr', sql: "ALTER TABLE projects ADD COLUMN tech_stack TEXT DEFAULT ''", table: 'projects' },
    { col: 'repo_pr', sql: "ALTER TABLE projects ADD COLUMN repo_url TEXT DEFAULT ''", table: 'projects' },
    { col: 'tags_t2', sql: "ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT ''", table: 'tasks' },
    { col: 'sl', sql: "ALTER TABLE study_topics ADD COLUMN study_level INTEGER DEFAULT 0", table: 'study_topics' },
    { col: 'slu', sql: "ALTER TABLE study_topics ADD COLUMN study_level_updated_at TEXT", table: 'study_topics' },
    { col: 'ru', sql: "ALTER TABLE study_topics ADD COLUMN resource_url TEXT DEFAULT ''", table: 'study_topics' },
  ]

  for (const m of migrations) {
    const cols = db.prepare(`PRAGMA table_info(${m.table})`).all().map(c => c.name)
    if (!cols.includes(m.col)) {
      try { db.exec(m.sql) } catch (e) { /* column may already exist */ }
    }
  }

  const fkTables = ['tasks', 'notes', 'projects', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'study_files', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags', 'achievements', 'user_achievements', 'xp_log', 'challenges', 'user_challenges', 'weekly_reports', 'subtasks', 'entity_links', 'flashcard_decks', 'flashcards']
  for (const t of fkTables) {
    if (db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(t)) {
      try {
        const cols2 = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)
        if (t === 'study_topics' && !cols2.includes('study_level')) {
          db.exec("ALTER TABLE study_topics ADD COLUMN study_level INTEGER DEFAULT 0")
        }
      } catch (e) {}
    }
  }

  if (currentVersion < SCHEMA_VERSION) {
    if (db.prepare("SELECT COUNT(*) as cnt FROM achievements").get().cnt === 0) {
      const achievements = [
        ['first_pomodoro', 'Primer Pomodoro', 'Complet\u00e1 tu primer pomodoro', 'clock', 50],
        ['ten_pomodoros', 'En Racha', 'Complet\u00e1 10 pomodoros', 'clock', 100],
        ['fifty_pomodoros', 'M\u00e1quina de Pomodoros', 'Complet\u00e1 50 pomodoros', 'clock', 250],
        ['first_task', 'Primer Paso', 'Complet\u00e1 tu primera tarea', 'check-square', 50],
        ['ten_tasks', 'Productivo', 'Complet\u00e1 10 tareas', 'check-square', 100],
        ['first_note', 'Apuntes', 'Cre\u00e1 tu primera nota', 'book-open', 30],
        ['first_streak_3', 'Constancia', 'Alcanz\u00e1 3 d\u00edas de racha', 'flame', 100],
        ['first_streak_7', 'Semana Completa', 'Alcanz\u00e1 7 d\u00edas de racha', 'flame', 250],
        ['first_streak_30', 'Imparable', 'Alcanz\u00e1 30 d\u00edas de racha', 'flame', 500],
        ['ten_notes', 'Escritor', 'Cre\u00e1 10 notas', 'book-open', 100],
        ['fifty_notes', 'Novelista', 'Cre\u00e1 50 notas', 'book-open', 250],
        ['ten_snippets', 'Programador', 'Cre\u00e1 10 snippets', 'code', 100],
        ['five_projects', 'Arquitecto', 'Cre\u00e1 5 proyectos', 'folder', 150],
        ['hundred_tasks', 'M\u00e1quina de Tareas', 'Complet\u00e1 100 tareas', 'check-square', 500],
        ['first_weekly_challenge', 'Desaf\u00edo Semanal', 'Complet\u00e1 tu primer desaf\u00edo semanal', 'zap', 100],
        ['seven_day_streak_app', 'Dedicated', 'Us\u00e1 la app 7 d\u00edas seguidos', 'smartphone', 200],
      ]
      const ins = db.prepare('INSERT INTO achievements (key, name, description, icon, xp_reward) VALUES (?, ?, ?, ?, ?)')
      for (const a of achievements) ins.run(...a)
    }

    if (db.prepare("SELECT COUNT(*) as cnt FROM challenges").get().cnt === 0) {
      const challenges = [
        ['pomodoros_15', 'Racha de Foco', 'Complet\u00e1 15 pomodoros en la semana', 'clock', 'pomodoro', 15, 150],
        ['tasks_20', 'M\u00e1quina Semanal', 'Complet\u00e1 20 tareas en la semana', 'check-square', 'task', 20, 150],
        ['xp_500', 'Ganador de XP', 'Gan\u00e1 500 XP en la semana', 'zap', 'xp', 500, 200],
        ['streak_5', 'Constante', 'Manten\u00e9 5 d\u00edas de racha', 'flame', 'streak', 5, 100],
        ['notes_5', 'Escritor Semanal', 'Cre\u00e1 5 notas en la semana', 'book-open', 'note', 5, 100],
      ]
      const ins = db.prepare('INSERT INTO challenges (key, name, description, icon, requirement_type, requirement_count, xp_reward) VALUES (?, ?, ?, ?, ?, ?, ?)')
      for (const c of challenges) ins.run(...c)
    }

    try {
      const cols = db.prepare(`PRAGMA table_info(daily_logs)`).all().map(c => c.name)
      if (cols.includes('tomorrowPlan') && !cols.includes('tomorrow_plan')) {
        db.exec("ALTER TABLE daily_logs RENAME COLUMN tomorrowPlan TO tomorrow_plan")
      }
    } catch (e) {}

    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('db_schema_version', ?)").run(SCHEMA_VERSION.toString())
  }

  createIndexes()
}

function createIndexes() {
  const db = getDb()
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_type ON kanban_cards(column_type)',
    'CREATE INDEX IF NOT EXISTS idx_kanban_cards_project_id ON kanban_cards(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_kanban_cards_position ON kanban_cards(position)',
    'CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at ON pomodoro_sessions(started_at)',
    'CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id)',
    'CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_project_id ON pomodoro_sessions(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_study_topics_parent_id ON study_topics(parent_id)',
    'CREATE INDEX IF NOT EXISTS idx_study_progress_topic_id ON study_progress(topic_id)',
    'CREATE INDEX IF NOT EXISTS idx_study_progress_topic_date ON study_progress(topic_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type)',
    'CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id)',
    'CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_date ON goal_progress(goal_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_snippets_project_id ON snippets(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id)',
    'CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_xp_log_created_at ON xp_log(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted)',
    'CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted)',
    'CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted)',
    'CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id)',
    'CREATE INDEX IF NOT EXISTS idx_entity_links_from ON entity_links(from_type, from_id)',
    'CREATE INDEX IF NOT EXISTS idx_entity_links_to ON entity_links(to_type, to_id)',
    'CREATE INDEX IF NOT EXISTS idx_study_files_topic_id ON study_files(topic_id)',
  ]
  for (const sql of indexes) {
    try { db.exec(sql) } catch (e) {}
  }
}

function addXp(amount, reason) {
  const db = getDb()
  db.prepare('INSERT INTO xp_log (amount, reason) VALUES (?, ?)').run(amount, reason)
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get()
  const total = row.total
  let level = 1
  let xpForNext = 100
  let remaining = total
  while (remaining >= xpForNext) {
    remaining -= xpForNext
    level++
    xpForNext = Math.floor(xpForNext * 1.5)
  }
  try { updateChallengeProgress('xp', amount) } catch (e) {}
  return { total, level, currentXp: remaining, nextLevelXp: xpForNext, leveledUp: false }
}

function updateChallengeProgress(type, amount) {
  const db = getDb()
  const weekStart = getWeekStart()
  const challenges = db.prepare("SELECT c.* FROM challenges c WHERE c.requirement_type = ?").all(type)
  for (const challenge of challenges) {
    const existing = db.prepare("SELECT * FROM user_challenges WHERE challenge_id = ? AND week_start = ?").get(challenge.id, weekStart)
    if (existing) {
      if (!existing.completed) {
        const newProgress = existing.progress + amount
        if (newProgress >= challenge.requirement_count) {
          db.prepare("UPDATE user_challenges SET progress = ?, completed = 1, completed_at = datetime('now') WHERE id = ?").run(newProgress, existing.id)
          addXp(challenge.xp_reward, `desaf\u00edo completado: ${challenge.name}`)
        } else {
          db.prepare("UPDATE user_challenges SET progress = ? WHERE id = ?").run(newProgress, existing.id)
        }
      }
    } else {
      db.prepare("INSERT INTO user_challenges (challenge_id, progress, week_start) VALUES (?, ?, ?)").run(challenge.id, amount, weekStart)
    }
  }
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function computeXp() {
  const row = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get()
  const total = row.total
  let level = 1
  let xpForNext = 100
  let remaining = total
  while (remaining >= xpForNext) {
    remaining -= xpForNext
    level++
    xpForNext = Math.floor(xpForNext * 1.5)
  }
  return { total, level, currentXp: remaining, nextLevelXp: xpForNext }
}

function validate(val, type) {
  if (type === 'string') return String(val)
  if (type === 'number') return Number(val)
  if (type === 'int') return parseInt(val, 10) || 0
  return val
}

module.exports = { getDb, getStmt, addXp, updateChallengeProgress, getWeekStart, computeXp, validate }
