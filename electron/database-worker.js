const { parentPort, workerData } = require('worker_threads')
const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

let db = null

function getDbPath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'sistema.db')
}

function getDb() {
  if (!db) {
    const dbPath = getDbPath()
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('synchronous = NORMAL')
    db.pragma('cache_size = -8000')
    db.pragma('temp_store = MEMORY')
  }
  return db
}

function handleMessage(message) {
  const { type, payload, requestId } = message
  const db = getDb()

  try {
    let result

    switch (type) {
      case 'backup':
        // Create backup
        const backupPath = payload.path
        db.backup(backupPath)
        parentPort.postMessage({ type: 'response', requestId, result: { success: true, path: backupPath } })
        break

      case 'migrate':
        // Run migrations
        const { runMigrations } = require('../core/migrations')
        runMigrations(getDb())
        parentPort.postMessage({ type: 'response', requestId, result: { success: true } })
        break

      case 'createIndexes':
        // Create performance indexes
        const indexes = [
          'CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)',
          'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
          'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
          'CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted)',
          'CREATE INDEX IF NOT EXISTS idx_tasks_workspace_deleted ON tasks(workspace_id, deleted)',
          'CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id)',
          'CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id)',
          'CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_id ON task_dependencies(depends_on_id)',
          'CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id)',
          'CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id)',
          'CREATE INDEX IF NOT EXISTS idx_task_labels_label_id ON task_labels(label_id)',
          'CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_id ON kanban_cards(column_id)',
          'CREATE INDEX IF NOT EXISTS idx_kanban_cards_workspace_id ON kanban_cards(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_kanban_cards_project_id ON kanban_cards(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_kanban_cards_deleted ON kanban_cards(deleted)',
          'CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_workspace_id ON pomodoro_sessions(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id)',
          'CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at ON pomodoro_sessions(started_at)',
          'CREATE INDEX IF NOT EXISTS idx_study_topics_workspace_id ON study_topics(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_study_topics_course_id ON study_topics(course_id)',
          'CREATE INDEX IF NOT EXISTS idx_study_progress_topic_id ON study_progress(topic_id)',
          'CREATE INDEX IF NOT EXISTS idx_study_progress_date ON study_progress(date)',
          'CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id)',
          'CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted)',
          'CREATE INDEX IF NOT EXISTS idx_note_folders_workspace_id ON note_folders(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_goals_workspace_id ON goals(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_goals_deleted ON goals(deleted)',
          'CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id)',
          'CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(date)',
          'CREATE INDEX IF NOT EXISTS idx_streaks_key ON streaks(key)',
          'CREATE INDEX IF NOT EXISTS idx_daily_logs_workspace_id ON daily_logs(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date)',
          'CREATE INDEX IF NOT EXISTS idx_snippets_workspace_id ON snippets(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_snippets_project_id ON snippets(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_snippets_deleted ON snippets(deleted)',
          'CREATE INDEX IF NOT EXISTS idx_habits_workspace_id ON habits(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_habits_deleted ON habits(deleted)',
          'CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id)',
          'CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date)',
          'CREATE INDEX IF NOT EXISTS idx_flashcard_decks_workspace_id ON flashcard_decks(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_flashcard_decks_course_id ON flashcard_decks(course_id)',
          'CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id)',
          'CREATE INDEX IF NOT EXISTS idx_flashcards_study_topic_id ON flashcards(study_topic_id)',
          'CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review)',
          'CREATE INDEX IF NOT EXISTS idx_outbox_events_published_at ON outbox_events(published_at)',
          'CREATE INDEX IF NOT EXISTS idx_snapshots_workspace_id ON snapshots(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON activity_log(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id)',
          'CREATE INDEX IF NOT EXISTS idx_daily_task_stats_workspace_date ON daily_task_stats(workspace_id, date)',
          'CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id)',
          'CREATE INDEX IF NOT EXISTS idx_automation_rules_workspace_id ON automation_rules(workspace_id)',
          'CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled)'
        ]
        for (const sql of indexes) {
          try { db.exec(sql) } catch (e) {}
        }
        try {
          db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
              entity_type, entity_id UNINDEXED, workspace_id UNINDEXED,
              title, body, tags,
              tokenize='porter unicode61'
            );
          `)
        } catch (e) {}
        parentPort.postMessage({ type: 'response', requestId, result: { success: true } })
        break

      case 'reindexSearch':
        // Reindex search
        const tables = [
          { table: 'tasks', columns: ['title', 'description'], id: 'id', type: 'task' },
          { table: 'notes', columns: ['title', 'content'], id: 'id', type: 'note' },
          { table: 'projects', columns: ['name', 'description'], id: 'id', type: 'project' },
          { table: 'study_topics', columns: ['name', 'description'], id: 'id', type: 'study_topic' },
        ]
        db.exec('DELETE FROM search_index')
        for (const t of tables) {
          const rows = db.prepare(`SELECT ${t.id}, ${t.columns.join(', ')} FROM ${t.table} WHERE deleted = 0`).all()
          const stmt = db.prepare(`INSERT INTO search_index (entity_type, entity_id, title, body, tags) VALUES (?, ?, ?, ?, ?)`)
          for (const row of rows) {
            const title = row[t.columns[0]] || ''
            const body = row[t.columns[1]] || ''
            stmt.run(t.type, row[t.id], title, body, '')
          }
        }
        parentPort.postMessage({ type: 'response', requestId, result: { success: true } })
        break

      case 'vacuum':
        db.exec('VACUUM')
        parentPort.postMessage({ type: 'response', requestId, result: { success: true } })
        break

      case 'analyze':
        db.exec('ANALYZE')
        parentPort.postMessage({ type: 'response', requestId, result: { success: true } })
        break

      case 'largeQuery':
        // Execute a large query that might block the main thread
        const { sql, params, method } = payload
        let result
        switch (method) {
          case 'all':
            result = db.prepare(sql).all(...payload.params)
            break
          case 'get':
            result = db.prepare(sql).get(...payload.params)
            break
          case 'run':
            result = db.prepare(sql).run(...payload.params)
            break
          default:
            throw new Error(`Unknown method: ${method}`)
        }
        parentPort.postMessage({ type: 'response', requestId, result })
        break

      default:
        parentPort.postMessage({ type: 'error', requestId, error: { message: `Unknown type: ${type}` } })
    }
  } catch (error) {
    parentPort.postMessage({ type: 'error', requestId, error: { message: error.message, stack: error.stack } })
  }
}

parentPort.on('message', handleMessage)

console.log('[DB Heavy Worker] Started')