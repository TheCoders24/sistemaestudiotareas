function register(ipcMain, { getStmt, getDb, safeUpdate, wsFilter, wsParams, addXp, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getProjects', z.number().int().positive().optional(), (wsId) => {
    return getStmt(`SELECT * FROM projects WHERE deleted = 0${wsFilter(wsId)} ORDER BY name ASC`).all(...wsParams(wsId))
  })
  safeHandle(ipcMain, 'db:createProject', z.object({
    name: z.string().min(1).max(500),
    description: z.string().max(2000).optional().nullable(),
    status: z.string().optional().default('active'),
    tech_stack: z.string().max(500).optional().nullable(),
    repo_url: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
  }).passthrough(), (project) => {
    const stmt = getStmt('INSERT INTO projects (name, description, status, tech_stack, repo_url, color) VALUES (@name, @description, @status, @tech_stack, @repo_url, @color)')
    const result = stmt.run(project)
    addXp(15, 'proyecto creado')
    return getStmt('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'db:updateProject', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    safeUpdate('projects', id, data)
    return getStmt('SELECT * FROM projects WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'db:deleteProject', z.number().int().positive(), (id) => {
    getStmt('UPDATE projects SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'projects:gitStatus', z.number().int().positive(), async (id) => {
    const project = getStmt('SELECT * FROM projects WHERE id = ?').get(id)
    if (!project) return null
    const repoPath = project.repo_url
    if (!repoPath) return null
    try {
      const { execSync } = require('child_process')
      const branch = execSync('git branch --show-current', { cwd: repoPath, timeout: 5000 }).toString().trim()
      const logOutput = execSync('git log -1 --format=%s|%ai|%an', { cwd: repoPath, timeout: 5000 }).toString().trim()
      const [message, date, author] = logOutput.split('|')
      const statusOutput = execSync('git status --porcelain', { cwd: repoPath, timeout: 5000 }).toString().trim()
      const dirty = statusOutput.length > 0
      const filesChanged = dirty ? statusOutput.split('\n').length : 0
      return { branch, lastCommit: { message, date, author }, dirty, filesChanged }
    } catch {
      return null
    }
  })
  safeHandle(ipcMain, 'projects:openInEditor', z.object({
    id: z.number().int().positive(),
    editor: z.enum(['code', 'claude']).optional().default('code'),
  }).transform(a => a), async ({ id, editor }) => {
    const project = getStmt('SELECT * FROM projects WHERE id = ?').get(id)
    if (!project) throw new Error('Project not found')
    const repoPath = project.repo_url
    if (!repoPath) throw new Error('No repo URL configured')
    try {
      const { execSync } = require('child_process')
      const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
      if (editor === 'code') {
        execSync(`"${cmd}" code "${repoPath}"`, { timeout: 5000 })
      } else {
        execSync(`"${cmd}" claude "${repoPath}"`, { timeout: 5000 })
      }
      return true
    } catch (e) {
      throw new Error(`${editor} not found in PATH. Is it installed?`)
    }
  })
}

module.exports = { register }
