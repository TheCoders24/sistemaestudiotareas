function register(ipcMain, { getStmt, getDb, safeUpdate, addXp, updateChallengeProgress, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getTasks', schemas.tasks.list, (wsId) => {
    return getStmt(`SELECT * FROM tasks WHERE deleted = 0${wsId ? ' AND workspace_id = ?' : ''} ORDER BY position ASC, created_at DESC`).all(...(wsId ? [wsId] : []))
  })
  safeHandle(ipcMain, 'db:reorderTasks', schemas.tasks.reorder, (orderedIds) => {
    const tx = getDb().transaction(() => {
      orderedIds.forEach((id, index) => {
        getStmt('UPDATE tasks SET position = ?, updated_at = datetime(\'now\') WHERE id = ?').run(index, id)
      })
    })
    tx()
    return true
  })
  safeHandle(ipcMain, 'db:createTask', schemas.tasks.create, (task) => {
    task.project_id = task.project_id ?? null
    task.repeat = task.repeat || null
    task.tags = task.tags || ''
    task.priority = task.priority || 'media'
    const allowed = ['title', 'description', 'priority', 'due_date', 'reminder', 'project_id', 'repeat', 'tags']
    const cols = allowed.filter(c => task[c] !== undefined)
    const sets = cols.map(c => `@${c}`).join(', ')
    const stmt = getStmt(`INSERT INTO tasks (${cols.join(', ')}) VALUES (${sets})`)
    const result = stmt.run(task)
    return getStmt('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'db:updateTask', schemas.tasks.update, ({ id, data }) => {
    safeUpdate('tasks', id, data)
    return getStmt('SELECT * FROM tasks WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'db:deleteTask', schemas.tasks.delete, (id) => {
    getStmt('UPDATE tasks SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'db:getTasksWithSubtasks', schemas.tasks.listWithSubtasks, (wsId) => {
    const tasks = getStmt(`SELECT * FROM tasks WHERE deleted = 0${wsId ? ' AND workspace_id = ?' : ''} ORDER BY position ASC, created_at DESC`).all(...(wsId ? [wsId] : []))
    const subtasks = getStmt('SELECT * FROM subtasks ORDER BY position ASC').all()
    const map = {}
    for (const s of subtasks) {
      if (!map[s.task_id]) map[s.task_id] = []
      map[s.task_id].push(s)
    }
    return tasks.map(t => ({ ...t, subtasks: map[t.id] || [] }))
  })
  safeHandle(ipcMain, 'db:addTagToTask', schemas.tasks.addTag, ({ taskId, tag }) => {
    const task = getStmt('SELECT * FROM tasks WHERE id = ?').get(taskId)
    if (!task) return false
    const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    if (!tags.includes(tag)) tags.push(tag)
    getStmt('UPDATE tasks SET tags = ?, updated_at = datetime(\'now\') WHERE id = ?').run(tags.join(','), taskId)
    return true
  })
  safeHandle(ipcMain, 'db:removeTagFromTask', schemas.tasks.removeTag, ({ taskId, tag }) => {
    const task = getStmt('SELECT * FROM tasks WHERE id = ?').get(taskId)
    if (!task) return false
    const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const filtered = tags.filter(t => t !== tag)
    getStmt('UPDATE tasks SET tags = ?, updated_at = datetime(\'now\') WHERE id = ?').run(filtered.join(','), taskId)
    return true
  })
  safeHandle(ipcMain, 'db:getTasksByTag', schemas.tasks.getByTag, (tag) => {
    return getStmt("SELECT * FROM tasks WHERE deleted = 0 AND (tags LIKE ? OR tags LIKE ? OR tags LIKE ?) ORDER BY created_at DESC").all(`%${tag}%`, `%,${tag}%`, `%${tag},%`)
  })
  safeHandle(ipcMain, 'db:toggleTask', schemas.tasks.toggle, (id) => {
    const task = getStmt('SELECT * FROM tasks WHERE id = ?').get(id)
    getStmt('UPDATE tasks SET completed = CASE WHEN completed THEN 0 ELSE 1 END, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    if (task && !task.completed) {
      addXp(5, 'tarea completada')
      updateChallengeProgress('task', 1)
    }
    return getStmt('SELECT * FROM tasks WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'tasks:getDependencies', schemas.tasks.dependencies.get, (taskId) => {
    return getStmt('SELECT t.id, t.title FROM tasks t JOIN task_dependencies d ON d.depends_on_id = t.id WHERE d.task_id = ? AND t.deleted = 0').all(taskId)
  })
  safeHandle(ipcMain, 'tasks:getDependents', schemas.tasks.dependencies.getDependents, (taskId) => {
    return getStmt('SELECT t.id, t.title FROM tasks t JOIN task_dependencies d ON d.task_id = t.id WHERE d.depends_on_id = ? AND t.deleted = 0').all(taskId)
  })
  safeHandle(ipcMain, 'tasks:addDependency', schemas.tasks.dependencies.add, ({ taskId, dependsOnId }) => {
    try {
      getStmt('INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)').run(taskId, dependsOnId)
      return true
    } catch { return false }
  })
  safeHandle(ipcMain, 'tasks:removeDependency', schemas.tasks.dependencies.remove, ({ taskId, dependsOnId }) => {
    getStmt('DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?').run(taskId, dependsOnId)
    return true
  })
  safeHandle(ipcMain, 'tasks:getComments', schemas.tasks.comments.list, (taskId) => {
    return getStmt('SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC').all(taskId)
  })
  safeHandle(ipcMain, 'tasks:addComment', schemas.tasks.comments.add, ({ taskId, content }) => {
    const result = getStmt('INSERT INTO task_comments (task_id, content) VALUES (?, ?)').run(taskId, content)
    return getStmt('SELECT * FROM task_comments WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'tasks:deleteComment', schemas.tasks.comments.delete, (id) => {
    getStmt('DELETE FROM task_comments WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'tasks:getTimeEntries', schemas.tasks.timeTracking.list, (taskId) => {
    return getStmt('SELECT * FROM time_entries WHERE task_id = ? ORDER BY start_time DESC').all(taskId)
  })
  safeHandle(ipcMain, 'tasks:startTimeEntry', schemas.tasks.timeTracking.start, (taskId) => {
    const result = getStmt('INSERT INTO time_entries (task_id, start_time) VALUES (?, datetime(\'now\'))').run(taskId)
    return getStmt('SELECT * FROM time_entries WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'tasks:stopTimeEntry', schemas.tasks.timeTracking.stop, (id) => {
    getStmt("UPDATE time_entries SET end_time = datetime('now'), duration = ROUND((julianday(datetime('now')) - julianday(start_time)) * 86400) WHERE id = ?").run(id)
    return getStmt('SELECT * FROM time_entries WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'tasks:deleteTimeEntry', schemas.tasks.timeTracking.delete, (id) => {
    getStmt('DELETE FROM time_entries WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'tasks:getTotalTrackedTime', schemas.tasks.timeTracking.total, (taskId) => {
    const row = getStmt('SELECT COALESCE(SUM(duration), 0) as total FROM time_entries WHERE task_id = ?').get(taskId)
    return row.total
  })
  safeHandle(ipcMain, 'db:getSubtasks', schemas.subtasks.list, (taskId) => {
    return getStmt('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(taskId)
  })
  safeHandle(ipcMain, 'db:createSubtask', schemas.subtasks.create, (subtask) => {
    const maxPos = getStmt('SELECT COALESCE(MAX(position), -1) + 1 as pos FROM subtasks WHERE task_id = ?').get(subtask.task_id)
    subtask.position = maxPos.pos
    const stmt = getStmt('INSERT INTO subtasks (task_id, title, position) VALUES (@task_id, @title, @position)')
    const result = stmt.run(subtask)
    return getStmt('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'db:toggleSubtask', schemas.subtasks.toggle, (id) => {
    getStmt('UPDATE subtasks SET completed = CASE WHEN completed THEN 0 ELSE 1 END WHERE id = ?').run(id)
    return getStmt('SELECT * FROM subtasks WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'db:deleteSubtask', schemas.subtasks.delete, (id) => {
    getStmt('DELETE FROM subtasks WHERE id = ?').run(id)
    return true
  })
}

module.exports = { register }
