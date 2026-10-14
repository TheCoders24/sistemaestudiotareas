/**
 * Migration 2: Add missing indexes for performance
 */
module.exports = {
  checksum: 'b2c3d4e5f6a7',
  
  up(db) {
    // Add indexes for frequently queried columns
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
      try {
        db.exec(sql)
      } catch (e) {
        // Ignore errors (index might already exist)
      }
    }
    
    console.log('[Migration v2] Added performance indexes')
  },
  
  down(db) {
    // SQLite doesn't support DROP INDEX IF EXISTS for all versions
    // We'll just leave the indexes - they don't hurt
    console.log('[Migration v2] Rollback: indexes left in place (harmless)')
  }
}