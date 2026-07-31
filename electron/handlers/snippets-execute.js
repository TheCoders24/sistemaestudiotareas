const { execFile } = require('child_process')

function register(ipcMain, { getStmt, safeHandle, schemas, z }) {
  safeHandle(ipcMain, 'snippets:execute', z.object({
    id: z.number().int().positive(),
  }).transform(a => a), async ({ id }) => {
    const snippet = getStmt('SELECT * FROM snippets WHERE id = ?').get(id)
    if (!snippet) throw new Error('Snippet not found')
    const code = snippet.code
    const lang = snippet.language

    let cmd, args
    switch (lang) {
      case 'javascript': case 'js': cmd = 'node'; args = ['-e', code]; break
      case 'typescript': case 'ts': cmd = 'npx'; args = ['tsx', '-e', code]; break
      case 'python': cmd = 'python3'; args = ['-c', code]; break
      case 'bash': cmd = 'bash'; args = ['-c', code]; break
      default:
        throw new Error(`Execution not supported for language: ${lang}`)
    }

    return new Promise((resolve, reject) => {
      const child = execFile(cmd, args, {
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=64' },
      }, (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            resolve({ stdout: stdout || '', stderr: (stderr || '') + '\n[ERROR: Execution timed out or memory limit exceeded]', exitCode: error.code || 1 })
          } else {
            resolve({ stdout: stdout || '', stderr: stderr || error.message, exitCode: error.code || 1 })
          }
        } else {
          resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: 0 })
        }
      })
    })
  })
}

module.exports = { register }
