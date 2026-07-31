module.exports = { register }

function register(ipcMain, { getStmt, wsFilter, wsParams, safeUpdate, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getStudyTopics', schemas.study.topics.list, (wsId) => {
    return getStmt(`SELECT * FROM study_topics${wsFilter(wsId)} ORDER BY order_position ASC`).all(...wsParams(wsId))
  })

  safeHandle(ipcMain, 'db:createStudyTopic', schemas.study.topics.create, (topic) => {
    const stmt = getStmt('INSERT INTO study_topics (parent_id, name, description, order_position) VALUES (@parent_id, @name, @description, @order_position)')
    const result = stmt.run(topic)
    return getStmt('SELECT * FROM study_topics WHERE id = ?').get(result.lastInsertRowid)
  })

  safeHandle(ipcMain, 'db:updateStudyTopic', schemas.study.topics.update, ({ id, data }) => {
    safeUpdate('study_topics', id, data)
    return getStmt('SELECT * FROM study_topics WHERE id = ?').get(id)
  })

  safeHandle(ipcMain, 'db:deleteStudyTopic', schemas.study.topics.delete, (id) => {
    getStmt('DELETE FROM study_topics WHERE id = ?').run(id)
    return true
  })

  safeHandle(ipcMain, 'db:setStudyLevel', schemas.study.topics.setLevel, ({ topicId, level }) => {
    getStmt("UPDATE study_topics SET study_level = ?, study_level_updated_at = datetime('now') WHERE id = ?").run(level, topicId)
    return true
  })

  safeHandle(ipcMain, 'db:getStudyStats', voidSchema(), () => {
    const rows = getStmt('SELECT study_level, COUNT(*) as count FROM study_topics GROUP BY study_level').all()
    const total = getStmt('SELECT COUNT(*) as total FROM study_topics').get()
    return { levels: rows, total: total.total }
  })

  safeHandle(ipcMain, 'db:toggleStudyProgress', schemas.study.topics.toggleProgress, ({ topicId, date }) => {
    const existing = getStmt('SELECT * FROM study_progress WHERE topic_id = ? AND date = ?').get(topicId, date || new Date().toISOString().split('T')[0])
    if (existing) {
      getStmt('DELETE FROM study_progress WHERE id = ?').run(existing.id)
      return { completed: false }
    } else {
      getStmt('INSERT INTO study_progress (topic_id, date) VALUES (?, ?)').run(topicId, date || new Date().toISOString().split('T')[0])
      return { completed: true }
    }
  })

  safeHandle(ipcMain, 'db:moveStudyTopic', schemas.study.topics.move, ({ id, direction }) => {
    const current = getStmt('SELECT id, order_position, parent_id FROM study_topics WHERE id = ?').get(id)
    if (!current) return false
    const pid = current.parent_id
    let other
    if (direction === 'up') {
      other = getStmt('SELECT id, order_position FROM study_topics WHERE (parent_id = ? OR (parent_id IS NULL AND ? IS NULL)) AND order_position < ? ORDER BY order_position DESC LIMIT 1').all(pid, pid, current.order_position)
    } else {
      other = getStmt('SELECT id, order_position FROM study_topics WHERE (parent_id = ? OR (parent_id IS NULL AND ? IS NULL)) AND order_position > ? ORDER BY order_position ASC LIMIT 1').all(pid, pid, current.order_position)
    }
    if (!other || other.length === 0) return false
    const swap = other[0]
    getStmt('UPDATE study_topics SET order_position = ? WHERE id = ?').run(swap.order_position, current.id)
    getStmt('UPDATE study_topics SET order_position = ? WHERE id = ?').run(current.order_position, swap.id)
    return true
  })
}
