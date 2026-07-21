const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

const SCHEMA_VERSION = 6
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
      deleted INTEGER DEFAULT 0,
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
      tags TEXT DEFAULT '',
      project_id INTEGER,
      repeat TEXT,
      deleted INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS entity_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_type TEXT NOT NULL,
      from_id INTEGER NOT NULL,
      to_type TEXT NOT NULL,
      to_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(from_type, from_id, to_type, to_id)
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
      deleted INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'trophy',
      xp_reward INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      achievement_id INTEGER NOT NULL,
      unlocked_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE(achievement_id)
    );

    CREATE TABLE IF NOT EXISTS xp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'zap',
      requirement_type TEXT NOT NULL,
      requirement_count INTEGER NOT NULL,
      period TEXT DEFAULT 'weekly',
      xp_reward INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL,
      progress INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      week_start TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
      UNIQUE(challenge_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      pomodoros INTEGER DEFAULT 0,
      tasks_completed INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      streak_max INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS flashcard_decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      hint TEXT DEFAULT '',
      difficulty INTEGER DEFAULT 0,
      ease_factor REAL DEFAULT 2.5,
      repetitions INTEGER DEFAULT 0,
      interval INTEGER DEFAULT 0,
      next_review TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE
    );
  `)

  return db
}

function deferDbInit() {
  if (!db) return
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_type ON kanban_cards(column_type);
    CREATE INDEX IF NOT EXISTS idx_kanban_cards_project_id ON kanban_cards(project_id);
    CREATE INDEX IF NOT EXISTS idx_kanban_cards_position ON kanban_cards(position);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at ON pomodoro_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_project_id ON pomodoro_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_study_topics_parent_id ON study_topics(parent_id);
    CREATE INDEX IF NOT EXISTS idx_study_progress_topic_id ON study_progress(topic_id);
    CREATE INDEX IF NOT EXISTS idx_study_progress_topic_date ON study_progress(topic_id, date);
    CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
    CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
    CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_date ON goal_progress(goal_id, date);
    CREATE INDEX IF NOT EXISTS idx_snippets_project_id ON snippets(project_id);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, date);
    CREATE INDEX IF NOT EXISTS idx_xp_log_created_at ON xp_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted);
    CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_entity_links_from ON entity_links(from_type, from_id);
    CREATE INDEX IF NOT EXISTS idx_entity_links_to ON entity_links(to_type, to_id);
  `)
  const existingAchievements = db.prepare('SELECT COUNT(*) as count FROM achievements').get()
  if (existingAchievements.count === 0) {
    const achievementSeeds = [
      ['first_pomodoro', 'Primer Pomodoro', 'Completá tu primer pomodoro', 'timer', 50],
      ['ten_pomodoros', 'En Racha', 'Completá 10 pomodoros', 'timer', 100],
      ['fifty_pomodoros', 'Máquina de Pomodoros', 'Completá 50 pomodoros', 'zap', 250],
      ['first_task', 'Primer Paso', 'Completá tu primera tarea', 'check-circle', 50],
      ['ten_tasks', 'Productivo', 'Completá 10 tareas', 'check-square', 100],
      ['first_note', 'Apuntes', 'Creá tu primera nota', 'sticky-note', 30],
      ['first_streak_3', 'Constancia', 'Mantené una racha de 3 días', 'flame', 100],
      ['first_streak_7', 'Semana Completa', 'Mantené una racha de 7 días', 'flame', 250],
      ['first_streak_30', 'Imparable', 'Mantené una racha de 30 días', 'flame', 500],
      ['ten_notes', 'Escritor', 'Creá 10 notas', 'sticky-note', 100],
      ['fifty_notes', 'Novelista', 'Creá 50 notas', 'sticky-note', 250],
      ['ten_snippets', 'Programador', 'Creá 10 snippets', 'code2', 100],
      ['five_projects', 'Arquitecto', 'Creá 5 proyectos', 'folder-kanban', 150],
      ['hundred_tasks', 'Máquina de Tareas', 'Completá 100 tareas', 'check-square', 500],
      ['first_weekly_challenge', 'Desafío Semanal', 'Completá tu primer desafío semanal', 'zap', 100],
      ['seven_day_streak_app', 'Dedicated', 'Usá la app 7 días seguidos', 'flame', 200],
    ]
    const stmt = db.prepare('INSERT INTO achievements (key, name, description, icon, xp_reward) VALUES (?, ?, ?, ?, ?)')
    for (const a of achievementSeeds) stmt.run(...a)
  }
  const existingChallenges = db.prepare('SELECT COUNT(*) as count FROM challenges').get()
  if (existingChallenges.count === 0) {
    const challengeSeeds = [
      ['pomodoros_15', 'Racha de Foco', 'Completá 15 pomodoros esta semana', 'timer', 'pomodoro', 15, 'weekly', 150],
      ['tasks_20', 'Máquina Semanal', 'Completá 20 tareas esta semana', 'check-square', 'task', 20, 'weekly', 150],
      ['xp_500', 'Ganador de XP', 'Ganá 500 XP esta semana', 'zap', 'xp', 500, 'weekly', 200],
      ['streak_5', 'Constante', 'Mantené la racha 5 días seguidos', 'flame', 'streak', 5, 'weekly', 100],
      ['notes_5', 'Escritor Semanal', 'Creá 5 notas esta semana', 'sticky-note', 'note', 5, 'weekly', 100],
    ]
    const stmt = db.prepare('INSERT INTO challenges (key, name, description, icon, requirement_type, requirement_count, period, xp_reward) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    for (const c of challengeSeeds) stmt.run(...c)
  }
  const currentVersion = db.prepare("SELECT value FROM settings WHERE key = ?").get(SCHEMA_KEY)
  if (!currentVersion || Number(currentVersion.value) < SCHEMA_VERSION) {
    const migrationLog = []
    const columnsCache = {}
    function hasColumn(table, column) {
      if (!columnsCache[table]) {
        columnsCache[table] = db.prepare(`PRAGMA table_info('${table}')`).all().map(c => c.name)
      }
      return columnsCache[table].includes(column)
    }
    const migrations = [
      { sql: `ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0`, table: 'tasks', col: 'position' },
      { sql: `ALTER TABLE tasks ADD COLUMN repeat TEXT`, table: 'tasks', col: 'repeat' },
      { sql: `ALTER TABLE tasks ADD COLUMN deleted INTEGER DEFAULT 0`, table: 'tasks', col: 'deleted' },
      { sql: `ALTER TABLE notes ADD COLUMN deleted INTEGER DEFAULT 0`, table: 'notes', col: 'deleted' },
      { sql: `ALTER TABLE projects ADD COLUMN deleted INTEGER DEFAULT 0`, table: 'projects', col: 'deleted' },
      { sql: `ALTER TABLE tasks ADD COLUMN project_id INTEGER`, table: 'tasks', col: 'project_id' },
      { sql: `ALTER TABLE tasks ADD COLUMN reminder TEXT`, table: 'tasks', col: 'reminder' },
      { sql: `ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'media'`, table: 'tasks', col: 'priority' },
      { sql: `ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''`, table: 'tasks', col: 'description' },
      { sql: `ALTER TABLE kanban_cards ADD COLUMN project_id INTEGER`, table: 'kanban_cards', col: 'project_id' },
      { sql: `ALTER TABLE kanban_cards ADD COLUMN tags TEXT DEFAULT ''`, table: 'kanban_cards', col: 'tags' },
      { sql: `ALTER TABLE kanban_cards ADD COLUMN priority TEXT DEFAULT 'media'`, table: 'kanban_cards', col: 'priority' },
      { sql: `ALTER TABLE kanban_cards ADD COLUMN description TEXT DEFAULT ''`, table: 'kanban_cards', col: 'description' },
      { sql: `ALTER TABLE pomodoro_sessions ADD COLUMN project_id INTEGER`, table: 'pomodoro_sessions', col: 'project_id' },
      { sql: `ALTER TABLE pomodoro_sessions ADD COLUMN task_id INTEGER`, table: 'pomodoro_sessions', col: 'task_id' },
      { sql: `ALTER TABLE notes ADD COLUMN project_id INTEGER`, table: 'notes', col: 'project_id' },
      { sql: `ALTER TABLE notes ADD COLUMN content TEXT DEFAULT ''`, table: 'notes', col: 'content' },
      { sql: `ALTER TABLE snippets ADD COLUMN project_id INTEGER`, table: 'snippets', col: 'project_id' },
      { sql: `ALTER TABLE snippets ADD COLUMN tags TEXT DEFAULT ''`, table: 'snippets', col: 'tags' },
      { sql: `ALTER TABLE snippets ADD COLUMN description TEXT DEFAULT ''`, table: 'snippets', col: 'description' },
      { sql: `ALTER TABLE snippets ADD COLUMN language TEXT DEFAULT 'text'`, table: 'snippets', col: 'language' },
      { sql: `ALTER TABLE daily_logs ADD COLUMN tomorrow_plan TEXT DEFAULT ''`, table: 'daily_logs', col: 'tomorrow_plan' },
      { sql: `ALTER TABLE daily_logs ADD COLUMN focus TEXT DEFAULT ''`, table: 'daily_logs', col: 'focus' },
      { sql: `ALTER TABLE daily_logs ADD COLUMN blockers TEXT DEFAULT ''`, table: 'daily_logs', col: 'blockers' },
      { sql: `ALTER TABLE study_progress ADD COLUMN completed INTEGER DEFAULT 0`, table: 'study_progress', col: 'completed' },
      { sql: `ALTER TABLE study_progress ADD COLUMN date TEXT DEFAULT (date('now'))`, table: 'study_progress', col: 'date' },
      { sql: `ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT 'check'`, table: 'habits', col: 'icon' },
      { sql: `ALTER TABLE habits ADD COLUMN color TEXT DEFAULT '#6366f1'`, table: 'habits', col: 'color' },
      { sql: `ALTER TABLE habits ADD COLUMN frequency TEXT DEFAULT 'daily'`, table: 'habits', col: 'frequency' },
      { sql: `ALTER TABLE projects ADD COLUMN color TEXT DEFAULT '#6366f1'`, table: 'projects', col: 'color' },
      { sql: `ALTER TABLE projects ADD COLUMN tech_stack TEXT DEFAULT ''`, table: 'projects', col: 'tech_stack' },
      { sql: `ALTER TABLE projects ADD COLUMN repo_url TEXT DEFAULT ''`, table: 'projects', col: 'repo_url' },
      { sql: `ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT ''`, table: 'tasks', col: 'tags' },
      { sql: `CREATE TABLE IF NOT EXISTS flashcard_decks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))`, table: 'flashcard_decks', col: 'id' },
      { sql: `CREATE TABLE IF NOT EXISTS flashcards (id INTEGER PRIMARY KEY AUTOINCREMENT, deck_id INTEGER NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL, hint TEXT DEFAULT '', difficulty INTEGER DEFAULT 0, ease_factor REAL DEFAULT 2.5, repetitions INTEGER DEFAULT 0, interval INTEGER DEFAULT 0, next_review TEXT DEFAULT (datetime('now')), created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE)`, table: 'flashcards', col: 'id' },
    ]
    const migrationTx = db.transaction(() => {
      for (const m of migrations) {
        if (!hasColumn(m.table, m.col)) {
          try { db.exec(m.sql); migrationLog.push(`OK: ${m.sql}`) } catch {}
        }
      }
    })
    migrationTx()
    try {
      const cols = db.prepare("PRAGMA table_info('daily_logs')").all()
      const hasNew = cols.some((c) => c.name === 'tomorrow_plan')
      const hasOld = cols.some((c) => c.name === 'tomorrowPlan')
      if (!hasNew && hasOld) { db.exec('ALTER TABLE daily_logs RENAME COLUMN tomorrowPlan TO tomorrow_plan'); migrationLog.push('OK: Renamed tomorrowPlan -> tomorrow_plan in daily_logs') }
    } catch {}
    if (migrationLog.length > 0) console.log('[DB Migration] Applied:', migrationLog.join('; '))
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(SCHEMA_KEY, String(SCHEMA_VERSION))
  }
}

function getDb() {
  return db
}

function closeDatabase() {
  if (db) db.close()
}

module.exports = { initDatabase, deferDbInit, getDb, closeDatabase, getDbPath }
