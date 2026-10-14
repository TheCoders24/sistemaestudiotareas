/**
 * Initial schema migration
 * Creates all core tables for the application
 */
module.exports = {
  checksum: 'a1b2c3d4e5f6',
  
  up(db) {
    // Settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)

    // Workspaces table (must be first for FK references)
    db.exec(`
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
    `)

    // Kanban columns
    db.exec(`
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
    `)

    // Courses
    db.exec(`
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
    `)

    // Templates
    db.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        payload TEXT NOT NULL,
        is_builtin INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Exams
    db.exec(`
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
    `)

    // Exam simulations
    db.exec(`
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
    `)

    // Projects
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        color TEXT DEFAULT '#6366f1',
        tech_stack TEXT DEFAULT '',
        repo_url TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Tasks
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER,
        project_id INTEGER,
        parent_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        priority TEXT DEFAULT 'media',
        status TEXT DEFAULT 'pendiente',
        position INTEGER DEFAULT 0,
        tags TEXT DEFAULT '',
        repeat TEXT,
        reminder TEXT,
        deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Subtasks
    db.exec(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        position INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Task dependencies
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(task_id, depends_on_id)
      );
    `)

    // Task comments
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Time entries
    db.exec(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Task labels
    db.exec(`
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6366f1',
        workspace_id INTEGER REFERENCES workspaces(id),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS task_labels (
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, label_id)
      );
    `)

    // Kanban cards
    db.exec(`
      CREATE TABLE IF NOT EXISTS kanban_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        column_id INTEGER NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
        workspace_id INTEGER REFERENCES workspaces(id),
        project_id INTEGER REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        priority TEXT DEFAULT 'media',
        tags TEXT DEFAULT '',
        position INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Pomodoro sessions
    db.exec(`
      CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER REFERENCES workspaces(id),
        project_id INTEGER REFERENCES projects(id),
        task_id INTEGER REFERENCES tasks(id),
        duration INTEGER NOT NULL DEFAULT 1500,
        type TEXT DEFAULT 'focus',
        completed INTEGER DEFAULT 1,
        started_at TEXT NOT NULL,
        finished_at TEXT
      );
    `)

    // Study topics
    db.exec(`
      CREATE TABLE IF NOT EXISTS study_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER REFERENCES workspaces(id),
        course_id INTEGER REFERENCES courses(id),
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        order_position INTEGER DEFAULT 0,
        study_level INTEGER DEFAULT 0,
        study_level_updated_at TEXT,
        resource_url TEXT DEFAULT '',
        completed INTEGER DEFAULT 0,
        date TEXT DEFAULT (date('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Study progress
    db.exec(`
      CREATE TABLE IF NOT EXISTS study_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE,
        completed INTEGER DEFAULT 0,
        date TEXT DEFAULT (date('now'))
      );
    `)

    // Notes
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER REFERENCES workspaces(id),
        project_id INTEGER REFERENCES projects(id),
        folder_id INTEGER,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Note folders
    db.exec(`
      CREATE TABLE IF NOT EXISTS note_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        color TEXT DEFAULT '#6366f1',
        workspace_id INTEGER REFERENCES workspaces(id),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Goals
    db.exec(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER REFERENCES workspaces(id),
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        target_date TEXT,
        target_value REAL,
        current_value REAL DEFAULT 0,
        unit TEXT DEFAULT '',
        deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Goal progress
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        date TEXT NOT NULL DEFAULT (date('now')),
        value REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Streaks
    db.exec(`
      CREATE TABLE IF NOT EXISTS streaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        current INTEGER DEFAULT 0,
        max INTEGER DEFAULT 0,
        last_date TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Daily logs
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER REFERENCES workspaces(id),
        date TEXT NOT NULL UNIQUE,
        tomorrow_plan TEXT DEFAULT '',
        focus TEXT DEFAULT '',
        blockers TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Snippets
    db.exec(`
      CREATE TABLE IF NOT EXISTS snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER REFERENCES workspaces(id),
        project_id INTEGER REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        code TEXT NOT NULL,
        language TEXT DEFAULT 'text',
        tags TEXT DEFAULT '',
        deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Habits
    db.exec(`
      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER REFERENCES workspaces(id),
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        frequency TEXT DEFAULT 'daily',
        icon TEXT DEFAULT 'check',
        color TEXT DEFAULT '#6366f1',
        deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Habit logs
    db.exec(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        date TEXT NOT NULL DEFAULT (date('now')),
        completed INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(habit_id, date)
      );
    `)

    // Tags
    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#6366f1',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Achievements
    db.exec(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'trophy',
        xp_reward INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // User achievements
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    // XP log
    db.exec(`
      CREATE TABLE IF NOT EXISTS xp_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        xp_amount INTEGER NOT NULL,
        reference_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    // Challenges
    db.exec(`
      CREATE TABLE IF NOT EXISTS challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'target',
        requirement_type TEXT NOT NULL,
        requirement_count INTEGER NOT NULL,
        period TEXT DEFAULT 'weekly',
        xp_reward INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // User challenges
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
        period_start TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        completed_at TEXT
      );
    `)

    // Weekly reports
    db.exec(`
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT NOT NULL UNIQUE,
        data_json TEXT NOT NULL,
        generated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Flashcard decks
    db.exec(`
      CREATE TABLE IF NOT EXISTS flashcard_decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER REFERENCES workspaces(id),
        course_id INTEGER REFERENCES courses(id),
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Flashcards
    db.exec(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
        study_topic_id INTEGER REFERENCES study_topics(id),
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        hint TEXT DEFAULT '',
        difficulty INTEGER DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,
        repetitions INTEGER DEFAULT 0,
        interval INTEGER DEFAULT 0,
        next_review TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Outbox events (for sync)
    db.exec(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        published_at TEXT
      );
    `)

    // Snapshots
    db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        reason TEXT,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `)

    // Activity log
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `)

    // Daily task stats
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_task_stats (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        completed_count INTEGER NOT NULL DEFAULT 0,
        created_count INTEGER NOT NULL DEFAULT 0,
        worked_minutes INTEGER NOT NULL DEFAULT 0,
        UNIQUE(workspace_id, date)
      );
    `)

    // Project stats
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_stats (
        project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
        total_tasks INTEGER NOT NULL DEFAULT 0,
        completed_tasks INTEGER NOT NULL DEFAULT 0,
        total_minutes INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `)

    // Attachments
    db.exec(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Automation rules
    db.exec(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER REFERENCES workspaces(id),
        name TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_config_json TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_config_json TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // Migration tracking table
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        checksum TEXT
      );
    `)
  },

  down(db) {
    // Drop tables in reverse order of creation (respecting FK constraints)
    const dropTables = [
      'automation_rules',
      'attachments',
      'project_stats',
      'daily_task_stats',
      'activity_log',
      'snapshots',
      'outbox_events',
      'flashcards',
      'flashcard_decks',
      'weekly_reports',
      'user_challenges',
      'challenges',
      'xp_log',
      'user_achievements',
      'achievements',
      'tags',
      'task_labels',
      'labels',
      'habit_logs',
      'habits',
      'snippets',
      'daily_logs',
      'study_progress',
      'study_topics',
      'pomodoro_sessions',
      'kanban_cards',
      'time_entries',
      'task_comments',
      'task_dependencies',
      'subtasks',
      'tasks',
      'notes',
      'note_folders',
      'goals',
      'goal_progress',
      'streaks',
      'exam_simulations',
      'exams',
      'templates',
      'courses',
      'projects',
      'kanban_columns',
      'workspaces',
      'schema_migrations',
      'settings'
    ]

    for (const table of dropTables) {
      try {
        db.exec(`DROP TABLE IF EXISTS ${table}`)
      } catch (e) {
        // Ignore errors
      }
    }
  }
}