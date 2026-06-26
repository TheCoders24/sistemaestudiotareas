const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

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
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS snippet_tags (
      snippet_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (snippet_id, tag_id),
      FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- Flashcards
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
      ease REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS flashcard_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      reviewed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES flashcards(id) ON DELETE CASCADE
    );

    -- Subtasks
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- Recurrence
    CREATE TABLE IF NOT EXISTS task_recurrence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL UNIQUE,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekdays','weekly','monthly')),
      interval_days INTEGER DEFAULT 1,
      day_of_week INTEGER,
      day_of_month INTEGER,
      end_date TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- Activity log
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      action TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Notebooks
    CREATE TABLE IF NOT EXISTS notebooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#6366f1',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES notebooks(id) ON DELETE CASCADE
    );

    -- Templates
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Performance indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_kanban_column_type ON kanban_cards(column_type);
    CREATE INDEX IF NOT EXISTS idx_kanban_position ON kanban_cards(position);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_started ON pomodoro_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_task ON pomodoro_sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_study_progress_topic ON study_progress(topic_id);
    CREATE INDEX IF NOT EXISTS idx_study_progress_date ON study_progress(date);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
    CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
    CREATE INDEX IF NOT EXISTS idx_snippets_project ON snippets(project_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
    CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
    CREATE INDEX IF NOT EXISTS idx_snippet_tags_snippet ON snippet_tags(snippet_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_review ON flashcards(next_review);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_notebooks_parent ON notebooks(parent_id);
  `)

  // Migrations for existing databases (add columns that may be missing)
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
    `ALTER TABLE notes ADD COLUMN notebook_id INTEGER REFERENCES notebooks(id) ON DELETE SET NULL`,
    `ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT`,
    `ALTER TABLE tasks ADD COLUMN recurrence_end TEXT`,
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

  return db
}

function getDb() {
  return db
}

function closeDatabase() {
  if (db) db.close()
}

module.exports = { initDatabase, getDb, closeDatabase, getDbPath }
