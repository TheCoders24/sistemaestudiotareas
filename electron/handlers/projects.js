function register(ipcMain, { getStmt, getDb, safeUpdate, wsFilter, wsParams, addXp, safeHandle, schemas, voidSchema, z, outbox }) {
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
    project.status = project.status || 'active'
    const allowed = ['name', 'description', 'status', 'tech_stack', 'repo_url', 'color', 'workspace_id']
    const cols = allowed.filter(c => project[c] !== undefined)
    const sets = cols.map(c => `@${c}`).join(', ')
    const stmt = getStmt(`INSERT INTO projects (${cols.join(', ')}) VALUES (${sets})`)
    const result = stmt.run(project)
    addXp(15, 'proyecto creado')
    const created = getStmt('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
    outbox?.emit(getDb(), 'project.created', { projectId: created.id, name: created.name, status: created.status, workspaceId: created.workspace_id ?? null })
    return created
  })
  safeHandle(ipcMain, 'db:updateProject', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    safeUpdate('projects', id, data)
    const updated = getStmt('SELECT * FROM projects WHERE id = ?').get(id)
    outbox?.emit(getDb(), 'project.updated', { projectId: id, status: updated ? updated.status : null, workspaceId: updated ? updated.workspace_id ?? null : null })
    if (data.status === 'archived') {
      outbox?.emit(getDb(), 'project.archived', { projectId: id })
    }
    return updated
  })
  safeHandle(ipcMain, 'db:deleteProject', z.number().int().positive(), (id) => {
    getStmt('UPDATE projects SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    outbox?.emit(getDb(), 'project.deleted', { projectId: id })
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
    const { execFile } = require('child_process')
    const resolved = require('path').resolve(repoPath)
    return new Promise((resolve, reject) => {
      const cmd = editor === 'code' ? 'code' : 'claude'
      execFile(cmd, [resolved], { timeout: 5000 }, (error) => {
        if (error) reject(new Error(`${editor} not found in PATH. Is it installed?`))
        else resolve(true)
      })
    })
  })
}

module.exports = { register }
