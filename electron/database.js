const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')
const { getHeavyProxy } = require('./database-heavy-proxy')

const crypto = require('crypto')
const SCHEMA_VERSION = 18
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

    CREATE TABLE IF NOT EXISTS kanban_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'custom',
      color TEXT DEFAULT '#6366f1',
      wip_limit INTEGER DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      workspace_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'briefcase',
      color TEXT DEFAULT '#6366f1',
      is_default INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'book',
      term TEXT,
      credits INTEGER,
      target_grade REAL,
      archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      payload TEXT NOT NULL,
      is_builtin INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id),
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      weight REAL,
      study_topic_ids TEXT,
      completed INTEGER DEFAULT 0,
      grade_obtained REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_simulations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL,
      course_id INTEGER REFERENCES courses(id),
      total_questions INTEGER NOT NULL DEFAULT 0,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      wrong_answers INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'activo',
      tech_stack TEXT DEFAULT '',
      repo_url TEXT DEFAULT '',
      color TEXT DEFAULT '#6366f1',
      workspace_id INTEGER,
      deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_task_id INTEGER,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'media',
      due_date TEXT,
      reminder TEXT,
      tags TEXT DEFAULT '',
      project_id INTEGER,
      workspace_id INTEGER,
      repeat TEXT,
      deleted INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
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

    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      depends_on_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, depends_on_id)
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER DEFAULT 0,
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
      workspace_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      project_id INTEGER,
      duration INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      workspace_id INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS study_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      resource_url TEXT DEFAULT '',
      order_position INTEGER DEFAULT 0,
      workspace_id INTEGER,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES study_topics(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS study_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      date TEXT DEFAULT (date('now')),
      FOREIGN KEY (topic_id) REFERENCES study_topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      color TEXT DEFAULT '#6366f1',
      workspace_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES note_folders(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT 'Sin título',
      content TEXT DEFAULT '',
      project_id INTEGER,
      folder_id INTEGER,
      workspace_id INTEGER,
      deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (folder_id) REFERENCES note_folders(id) ON DELETE SET NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('daily', 'weekly')),
      target INTEGER NOT NULL,
      metric TEXT NOT NULL,
      workspace_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
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
      workspace_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      code TEXT DEFAULT '',
      language TEXT DEFAULT 'text',
      description TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      project_id INTEGER,
      workspace_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'check',
      color TEXT DEFAULT '#6366f1',
      frequency TEXT DEFAULT 'daily',
      workspace_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
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

    CREATE TABLE IF NOT EXISTS study_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      file_size INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES study_topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS flashcard_decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      workspace_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
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

    CREATE TABLE IF NOT EXISTS outbox_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      published_at TEXT
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      reason TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS daily_task_stats (
      id TEXT PRIMARY KEY,
      workspace_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed_count INTEGER NOT NULL DEFAULT 0,
      created_count INTEGER NOT NULL DEFAULT 0,
      worked_minutes INTEGER NOT NULL DEFAULT 0,
      UNIQUE(workspace_id, date)
    );

    CREATE TABLE IF NOT EXISTS project_stats (
      project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      total_tasks INTEGER NOT NULL DEFAULT 0,
      completed_tasks INTEGER NOT NULL DEFAULT 0,
      total_minutes INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS task_labels (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      storage_path TEXT NOT NULL,
      checksum TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS automation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      trigger TEXT NOT NULL,
      conditions_json TEXT NOT NULL DEFAULT '[]',
      actions_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
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
    CREATE INDEX IF NOT EXISTS idx_study_files_topic_id ON study_files(topic_id);
    CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_events(published_at) WHERE published_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_snapshots_entity ON snapshots(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_pending ON tasks(due_date) WHERE completed IS NULL;
    CREATE INDEX IF NOT EXISTS idx_labels_workspace ON labels(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(enabled, trigger);
  `)

  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        entity_type, entity_id UNINDEXED, workspace_id UNINDEXED,
        title, body, tags,
        tokenize='porter unicode61'
      );
    `)
  } catch (e) {
    console.log('[DB] FTS5 not available:', e.message)
  }

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
      { sql: `ALTER TABLE kanban_cards ADD COLUMN deleted INTEGER DEFAULT 0`, table: 'kanban_cards', col: 'deleted' },
      { sql: `ALTER TABLE snippets ADD COLUMN deleted INTEGER DEFAULT 0`, table: 'snippets', col: 'deleted' },
      { sql: `ALTER TABLE habits ADD COLUMN deleted INTEGER DEFAULT 0`, table: 'habits', col: 'deleted' },
      { sql: `ALTER TABLE goals ADD COLUMN deleted INTEGER DEFAULT 0`, table: 'goals', col: 'deleted' },
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
      { sql: `ALTER TABLE study_topics ADD COLUMN study_level INTEGER DEFAULT 0`, table: 'study_topics', col: 'study_level' },
      { sql: `ALTER TABLE study_topics ADD COLUMN study_level_updated_at TEXT`, table: 'study_topics', col: 'study_level_updated_at' },
      { sql: `ALTER TABLE study_topics ADD COLUMN resource_url TEXT DEFAULT ''`, table: 'study_topics', col: 'resource_url' },
      { sql: `CREATE TABLE IF NOT EXISTS workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, icon TEXT DEFAULT 'briefcase', color TEXT DEFAULT '#6366f1', is_default INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, deleted INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`, table: 'workspaces', col: 'id' },
      { sql: `ALTER TABLE projects ADD COLUMN workspace_id INTEGER`, table: 'projects', col: 'workspace_id' },
      { sql: `ALTER TABLE tasks ADD COLUMN workspace_id INTEGER`, table: 'tasks', col: 'workspace_id' },
      { sql: `ALTER TABLE notes ADD COLUMN workspace_id INTEGER`, table: 'notes', col: 'workspace_id' },
      { sql: `ALTER TABLE kanban_cards ADD COLUMN workspace_id INTEGER`, table: 'kanban_cards', col: 'workspace_id' },
      { sql: `ALTER TABLE pomodoro_sessions ADD COLUMN workspace_id INTEGER`, table: 'pomodoro_sessions', col: 'workspace_id' },
      { sql: `ALTER TABLE study_topics ADD COLUMN workspace_id INTEGER`, table: 'study_topics', col: 'workspace_id' },
      { sql: `ALTER TABLE goals ADD COLUMN workspace_id INTEGER`, table: 'goals', col: 'workspace_id' },
      { sql: `ALTER TABLE habits ADD COLUMN workspace_id INTEGER`, table: 'habits', col: 'workspace_id' },
      { sql: `ALTER TABLE snippets ADD COLUMN workspace_id INTEGER`, table: 'snippets', col: 'workspace_id' },
      { sql: `ALTER TABLE daily_logs ADD COLUMN workspace_id INTEGER`, table: 'daily_logs', col: 'workspace_id' },
      { sql: `ALTER TABLE flashcard_decks ADD COLUMN workspace_id INTEGER`, table: 'flashcard_decks', col: 'workspace_id' },
      { sql: `CREATE TABLE IF NOT EXISTS kanban_columns (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'custom', color TEXT DEFAULT '#6366f1', wip_limit INTEGER DEFAULT 0, position INTEGER NOT NULL DEFAULT 0, workspace_id INTEGER, created_at TEXT DEFAULT (datetime('now')))`, table: 'kanban_columns', col: 'id' },
      { sql: `CREATE TABLE IF NOT EXISTS note_folders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, parent_id INTEGER, color TEXT DEFAULT '#6366f1', workspace_id INTEGER, created_at TEXT DEFAULT (datetime('now')))`, table: 'note_folders', col: 'id' },
      { sql: `ALTER TABLE notes ADD COLUMN folder_id INTEGER`, table: 'notes', col: 'folder_id' },
      { sql: `CREATE TABLE IF NOT EXISTS task_dependencies (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, depends_on_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE, UNIQUE(task_id, depends_on_id))`, table: 'task_dependencies', col: 'id' },
      { sql: `CREATE TABLE IF NOT EXISTS task_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE)`, table: 'task_comments', col: 'id' },
      { sql: `CREATE TABLE IF NOT EXISTS time_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT, duration INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE)`, table: 'time_entries', col: 'id' },
      { sql: `ALTER TABLE habits ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`, table: 'habits', col: 'updated_at' },
      { sql: `ALTER TABLE goals ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`, table: 'goals', col: 'updated_at' },
      { sql: `ALTER TABLE snippets ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`, table: 'snippets', col: 'updated_at' },
      { sql: `CREATE TABLE IF NOT EXISTS outbox_events (id TEXT PRIMARY KEY, type TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), published_at TEXT)`, table: 'outbox_events', col: 'id' },
      { sql: `CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, reason TEXT, payload_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`, table: 'snapshots', col: 'id' },
      { sql: `CREATE TABLE IF NOT EXISTS activity_log (id TEXT PRIMARY KEY, workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, payload_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`, table: 'activity_log', col: 'id' },
      { sql: `CREATE TABLE IF NOT EXISTS daily_task_stats (id TEXT PRIMARY KEY, workspace_id INTEGER NOT NULL, date TEXT NOT NULL, completed_count INTEGER NOT NULL DEFAULT 0, created_count INTEGER NOT NULL DEFAULT 0, worked_minutes INTEGER NOT NULL DEFAULT 0, UNIQUE(workspace_id, date))`, table: 'daily_task_stats', col: 'id' },
      { sql: `CREATE TABLE IF NOT EXISTS project_stats (project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE, total_tasks INTEGER NOT NULL DEFAULT 0, completed_tasks INTEGER NOT NULL DEFAULT 0, total_minutes INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`, table: 'project_stats', col: 'id' },
      { sql: 'ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL', table: 'tasks', col: 'parent_task_id' },
      // v13: courses table
      { sql: `CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL REFERENCES workspaces(id), name TEXT NOT NULL, color TEXT DEFAULT '#6366f1', icon TEXT DEFAULT 'book', term TEXT, credits INTEGER, target_grade REAL, archived INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`, table: 'courses', col: 'id' },
      { sql: `ALTER TABLE study_topics ADD COLUMN course_id INTEGER REFERENCES courses(id)`, table: 'study_topics', col: 'course_id' },
      { sql: `ALTER TABLE flashcard_decks ADD COLUMN course_id INTEGER REFERENCES courses(id)`, table: 'flashcard_decks', col: 'course_id' },
      // v14: templates
      { sql: `CREATE TABLE IF NOT EXISTS templates (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, name TEXT NOT NULL, description TEXT DEFAULT '', payload TEXT NOT NULL, is_builtin INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`, table: 'templates', col: 'id' },
      // v15: exams + exam_simulations + flashcard study_topic_id
      { sql: `CREATE TABLE IF NOT EXISTS exams (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER REFERENCES courses(id), title TEXT NOT NULL, date TEXT NOT NULL, weight REAL, study_topic_ids TEXT, completed INTEGER DEFAULT 0, grade_obtained REAL, created_at TEXT DEFAULT (datetime('now')))`, table: 'exams', col: 'id' },
      { sql: `CREATE TABLE IF NOT EXISTS exam_simulations (id INTEGER PRIMARY KEY AUTOINCREMENT, deck_id INTEGER NOT NULL, course_id INTEGER REFERENCES courses(id), total_questions INTEGER NOT NULL DEFAULT 0, correct_answers INTEGER NOT NULL DEFAULT 0, wrong_answers INTEGER NOT NULL DEFAULT 0, duration_seconds INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`, table: 'exam_simulations', col: 'id' },
      { sql: `ALTER TABLE flashcards ADD COLUMN study_topic_id INTEGER REFERENCES study_topics(id)`, table: 'flashcards', col: 'study_topic_id' },
      // v16: study_topics.updated_at (safeUpdate siempre escribe updated_at)
      { sql: `ALTER TABLE study_topics ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`, table: 'study_topics', col: 'updated_at' },
      // v17: daily_logs.updated_at (safeUpdate siempre escribe updated_at)
      { sql: `ALTER TABLE daily_logs ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`, table: 'daily_logs', col: 'updated_at' },
      // v18: pomodoro_sessions.course_id (rachas por materia)
      { sql: `ALTER TABLE pomodoro_sessions ADD COLUMN course_id INTEGER REFERENCES courses(id)`, table: 'pomodoro_sessions', col: 'course_id' },
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
  const existingDefaultWorkspace = db.prepare('SELECT id FROM workspaces WHERE is_default = 1 AND deleted = 0').get()
  if (!existingDefaultWorkspace) {
    const wsCount = db.prepare('SELECT COUNT(*) as count FROM workspaces WHERE deleted = 0').get().count
    if (wsCount === 0) {
      db.prepare("INSERT INTO workspaces (name, icon, color, is_default, sort_order) VALUES (?, ?, ?, ?, ?)").run('Mi Espacio', 'briefcase', '#6366f1', 1, 0)
    }
  }

  const existingTemplates = db.prepare("SELECT COUNT(*) as count FROM templates WHERE is_builtin = 1").get().count
  if (existingTemplates === 0) {
    const insertTemplate = db.prepare('INSERT INTO templates (type, name, description, payload, is_builtin) VALUES (?, ?, ?, ?, 1)')
    const seedTemplates = [
      ['project', 'Proyecto de Tesis', 'Estructura básica para proyecto de tesis o trabajo final',
        JSON.stringify({ project: { name: '{{name}}', description: '{{description}}', color: '#6366f1', status: 'active' } })],
      ['project', 'Sprint de 2 Semanas', 'Tablero ágil para sprint de desarrollo',
        JSON.stringify({ project: { name: '{{name}}', description: 'Sprint planificado desde plantilla', color: '#22c55e', status: 'active' } })],
      ['kanban_board', 'Tablero Ágil - Desarrollo', 'Columnas: Backlog, Por hacer, En progreso, Hecho',
        JSON.stringify({})],
      ['kanban_board', 'Tablero Académico', 'Columnas: Pendiente, Investigando, En redacción, Revisado, Entregado',
        JSON.stringify({})],
      ['study_plan', 'Repaso 30 Días para Examen', 'Plan de estudio intensivo con temas y flashcards',
        JSON.stringify({ studyTopics: [
          { name: 'Semana 1 - Fundamentos', description: 'Conceptos básicos y teoría fundamental', order_position: 1 },
          { name: 'Semana 2 - Temas Avanzados', description: 'Profundización en temas clave', order_position: 2 },
          { name: 'Semana 3 - Práctica y ejercicios', description: 'Resolución de problemas y aplicación', order_position: 3 },
          { name: 'Semana 4 - Repaso general', description: 'Repaso integral y simulacros', order_position: 4 },
        ] })],
    ]
    const insertMany = db.transaction(() => {
      for (const [type, name, description, payload] of seedTemplates) {
        insertTemplate.run(type, name, description, payload)
      }
    })
    insertMany()
    console.log('[DB] Seed templates inserted')
  }
}

function getDb() {
  return db
}

function closeDatabase() {
  if (db) db.close()
}

const heavyProxy = getHeavyProxy()

async function backupDatabase(path) {
  return heavyProxy.backup(path)
}

async function migrateDatabase() {
  return heavyProxy.migrate()
}

async function createIndexes() {
  return heavyProxy.createIndexes()
}

async function reindexSearch() {
  return heavyProxy.reindexSearch()
}

async function vacuumDatabase() {
  return heavyProxy.vacuum()
}

async function analyzeDatabase() {
  return heavyProxy.analyze()
}

async function runLargeQuery(sql, params = [], method = 'all') {
  return heavyProxy.largeQuery(sql, params, method)
}

module.exports = { 
  initDatabase, 
  deferDbInit, 
  getDb, 
  closeDatabase, 
  getDbPath,
  backupDatabase,
  migrateDatabase,
  createIndexes,
  reindexSearch,
  vacuumDatabase,
  analyzeDatabase,
  runLargeQuery
}
