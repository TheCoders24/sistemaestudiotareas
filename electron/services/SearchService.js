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
      const tasks = db.prepare(`SELECT id, title as name, 'tarea' as type FROM tasks WHERE title LIKE ? ${parsed.extraFilters('tasks')} AND deleted = 0 LIMIT 10`).all(...parsed.params('%' + parsed.cleanQuery + '%'))
      results.push(...tasks)
    } catch {}

    try {
      const notes = db.prepare(`SELECT id, title as name, 'nota' as type FROM notes WHERE (title LIKE ? OR content LIKE ?) ${parsed.extraFilters('notes')} AND deleted = 0 LIMIT 10`).all(parsed.cleanQueryParam, parsed.cleanQueryParam)
      results.push(...notes)
    } catch {}

    try {
      const snippets = db.prepare(`SELECT id, title as name, 'snippet' as type FROM snippets WHERE (title LIKE ? OR description LIKE ? OR code LIKE ?) ${parsed.extraFilters('snippets')} LIMIT 10`).all(parsed.cleanQueryParam, parsed.cleanQueryParam, parsed.cleanQueryParam)
      results.push(...snippets)
    } catch {}

    try {
      const projects = db.prepare(`SELECT id, name, 'proyecto' as type FROM projects WHERE (name LIKE ? OR description LIKE ?) ${parsed.extraFilters('projects')} AND deleted = 0 LIMIT 10`).all(parsed.cleanQueryParam, parsed.cleanQueryParam)
      results.push(...projects)
    } catch {}

    try {
      const habits = db.prepare(`SELECT id, name, 'hábito' as type FROM habits WHERE name LIKE ? ${parsed.extraFilters('habits')} AND deleted = 0 LIMIT 10`).all(parsed.cleanQueryParam)
      results.push(...habits)
    } catch {}

    try {
      const logs = db.prepare(`SELECT id, date as name, 'diario' as type FROM daily_logs WHERE (content LIKE ? OR focus LIKE ?) ${parsed.extraFilters('daily_logs')} LIMIT 10`).all(parsed.cleanQueryParam, parsed.cleanQueryParam)
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

    const extraFilters = (table) => {
      const parts = []
      if (filters.priority) parts.push(`priority = '${filters.priority}'`)
      if (filters.status) parts.push(`status = '${filters.status}'`)
      if (filters.tag) parts.push(`tags LIKE '%${filters.tag}%'`)
      if (filters.language) parts.push(`language = '${filters.language}'`)
      if (filters.type) parts.push(`type = '${filters.type}'`)
      return parts.length > 0 ? ' AND ' + parts.join(' AND ') : ''
    }

    return {
      cleanQuery,
      cleanQueryParam: '%' + cleanQuery + '%',
      params: (q) => [q],
      extraFilters,
      filters,
    }
  }
}

module.exports = { SearchService }
