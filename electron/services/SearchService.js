class SearchService {
  constructor(getDb) {
    this.getDb = getDb
  }

  search(query) {
    const db = this.getDb()
    if (!db) return []
    const parsed = this._parseQuery(query)
    const results = []

    try {
      const sql = `SELECT id, title as name, 'tarea' as type FROM tasks WHERE title LIKE ? ${parsed.extraFilters('tasks')} AND deleted = 0 LIMIT 10`
      const tasks = db.prepare(sql).all(parsed.cleanQueryParam, ...parsed.getExtraParams())
      results.push(...tasks)
    } catch {}

    try {
      const sql = `SELECT id, title as name, 'nota' as type FROM notes WHERE (title LIKE ? OR content LIKE ?) ${parsed.extraFilters('notes')} AND deleted = 0 LIMIT 10`
      const notes = db.prepare(sql).all(parsed.cleanQueryParam, parsed.cleanQueryParam, ...parsed.getExtraParams())
      results.push(...notes)
    } catch {}

    try {
      const sql = `SELECT id, title as name, 'snippet' as type FROM snippets WHERE (title LIKE ? OR description LIKE ? OR code LIKE ?) ${parsed.extraFilters('snippets')} AND deleted = 0 LIMIT 10`
      const snippets = db.prepare(sql).all(parsed.cleanQueryParam, parsed.cleanQueryParam, parsed.cleanQueryParam, ...parsed.getExtraParams())
      results.push(...snippets)
    } catch {}

    try {
      const sql = `SELECT id, name, 'proyecto' as type FROM projects WHERE (name LIKE ? OR description LIKE ?) ${parsed.extraFilters('projects')} AND deleted = 0 LIMIT 10`
      const projects = db.prepare(sql).all(parsed.cleanQueryParam, parsed.cleanQueryParam, ...parsed.getExtraParams())
      results.push(...projects)
    } catch {}

    try {
      const sql = `SELECT id, name, 'hábito' as type FROM habits WHERE name LIKE ? ${parsed.extraFilters('habits')} AND deleted = 0 LIMIT 10`
      const habits = db.prepare(sql).all(parsed.cleanQueryParam, ...parsed.getExtraParams())
      results.push(...habits)
    } catch {}

    try {
      const sql = `SELECT id, date as name, 'diario' as type FROM daily_logs WHERE (content LIKE ? OR focus LIKE ?) ${parsed.extraFilters('daily_logs')} LIMIT 10`
      const logs = db.prepare(sql).all(parsed.cleanQueryParam, parsed.cleanQueryParam, ...parsed.getExtraParams())
      results.push(...logs)
    } catch {}

    return results
  }

  _parseQuery(query) {
    let cleanQuery = query
    const filters = {}
    const filterRegex = /(\w+):(\S+)/g
    let match
    while ((match = filterRegex.exec(query)) !== null) {
      filters[match[1]] = match[2]
      cleanQuery = cleanQuery.replace(match[0], '').trim()
    }
    const cleanQueryParam = '%' + cleanQuery + '%'

    const extraFilterParams = []
    const extraFilters = (table) => {
      extraFilterParams.length = 0
      const parts = []
      if (filters.priority) { parts.push('priority = ?'); extraFilterParams.push(filters.priority) }
      if (filters.status) { parts.push('status = ?'); extraFilterParams.push(filters.status) }
      if (filters.tag) { parts.push('tags LIKE ?'); extraFilterParams.push('%' + filters.tag + '%') }
      if (filters.language) { parts.push('language = ?'); extraFilterParams.push(filters.language) }
      if (filters.type) { parts.push('type = ?'); extraFilterParams.push(filters.type) }
      return parts.length > 0 ? ' AND ' + parts.join(' AND ') : ''
    }
    const getExtraParams = () => [...extraFilterParams]

    return {
      cleanQuery,
      cleanQueryParam: '%' + cleanQuery + '%',
      params: (q) => [q],
      extraFilters,
      getExtraParams,
      filters,
    }
  }
}

module.exports = { SearchService }
