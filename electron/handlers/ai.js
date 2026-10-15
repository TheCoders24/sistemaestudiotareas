const https = require('https')
const http = require('http')

function register(ipcMain, { getStmt, safeHandle, schemas, voidSchema, z }) {

  const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
  const ANTHROPIC_MODEL = 'claude-3-haiku-20240307'
  const DEFAULT_LMSTUDIO_URL = 'http://localhost:1234/v1'

  function getSetting(key) {
    const row = getStmt('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : null
  }

  function getProvider() {
    return getSetting('ai_provider') || 'anthropic'
  }

  function getBaseUrl() {
    return (getSetting('ai_base_url') || DEFAULT_LMSTUDIO_URL).replace(/\/+$/, '')
  }

  function request(method, urlStr, headers, body, timeout = 120000) {
    return new Promise((resolve, reject) => {
      let url
      try {
        url = new URL(urlStr)
      } catch {
        reject(new Error(`Invalid URL: ${urlStr}`))
        return
      }
      const mod = url.protocol === 'https:' ? https : http
      const req = mod.request(url, { method, headers, timeout }, (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', chunk => { data += chunk })
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('AI request timed out')) })
      if (body) req.write(body)
      req.end()
    })
  }

  function parseJson(raw, fallbackMessage) {
    try {
      return JSON.parse(raw)
    } catch {
      throw new Error(fallbackMessage || 'Failed to parse AI response')
    }
  }

  function getApiKey() {
    return getSetting('ai_api_key')
  }

  function callAnthropic(systemPrompt, userMessage, maxTokens = 1024) {
    const apiKey = getApiKey()
    if (!apiKey) throw new Error('API key not configured. Set it in Settings > AI.')
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })
      const req = https.request(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) reject(new Error(parsed.error.message))
            else resolve(parsed.content?.[0]?.text || '')
          } catch {
            reject(new Error('Failed to parse AI response'))
          }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('AI request timed out')) })
      req.write(body)
      req.end()
    })
  }

  async function callOpenAICompatible(systemPrompt, userMessage, maxTokens = 1024) {
    const model = getSetting('ai_model')
    if (!model) throw new Error('No model configured for LM Studio. Choose one in Settings > AI.')
    const headers = { 'Content-Type': 'application/json' }
    const apiKey = getApiKey()
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    const messages = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: userMessage })
    const body = JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: false,
    })
    const { status, body: raw } = await request('POST', `${getBaseUrl()}/chat/completions`, headers, body)
    const parsed = parseJson(raw)
    if (status >= 400 || parsed.error) {
      throw new Error(parsed.error?.message || `LM Studio error (${status})`)
    }
    return parsed.choices?.[0]?.message?.content || ''
  }

  async function listModels() {
    const headers = {}
    const apiKey = getApiKey()
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    const { status, body: raw } = await request('GET', `${getBaseUrl()}/models`, headers, null, 15000)
    const parsed = parseJson(raw, 'Failed to parse model list')
    if (status >= 400 || parsed.error) {
      throw new Error(parsed.error?.message || `LM Studio error (${status})`)
    }
    return (parsed.data || []).map(m => m.id).filter(Boolean)
  }

  function callAI(systemPrompt, userMessage, maxTokens = 1024) {
    if (getProvider() === 'lmstudio') {
      return callOpenAICompatible(systemPrompt, userMessage, maxTokens)
    }
    return callAnthropic(systemPrompt, userMessage, maxTokens)
  }

  // 7.1 Generate flashcards from study topic or note content
  safeHandle(ipcMain, 'ai:generateFlashcards', z.object({
    sourceType: z.enum(['topic', 'note']),
    sourceId: z.number().int().positive(),
  }).transform(a => a), async ({ sourceType, sourceId }) => {
    let content = ''
    if (sourceType === 'topic') {
      const topic = getStmt('SELECT * FROM study_topics WHERE id = ?').get(sourceId)
      if (!topic) throw new Error('Topic not found')
      content = `Topic: ${topic.name}\nDescription: ${topic.description || ''}`
      // Try to get file contents
      const files = getStmt('SELECT * FROM study_files WHERE topic_id = ?').all(sourceId)
      for (const f of files) {
        try {
          const fs = require('fs')
          const filePath = require('path').join(require('electron').app.getPath('userData'), 'study_files', f.stored_name)
          if (fs.existsSync(filePath)) {
            const text = fs.readFileSync(filePath, 'utf-8').slice(0, 4000)
            content += `\n\nFile (${f.original_name}):\n${text}`
          }
        } catch {}
      }
    } else if (sourceType === 'note') {
      const note = getStmt('SELECT * FROM notes WHERE id = ?').get(sourceId)
      if (!note) throw new Error('Note not found')
      content = `Note: ${note.title}\n\n${note.content || ''}`
    }

    const response = await callAI(
      'You are a study assistant. Generate flashcards (question/answer pairs) from the given content. ' +
      'Respond with ONLY a JSON array of objects with "front" and "back" properties. Generate 5-10 flashcards.',
      `Generate flashcards from this content:\n\n${content}`,
      2048
    )

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Failed to parse AI response')
    return JSON.parse(jsonMatch[0])
  })

  // 7.2 Weekly summary with AI insights
  safeHandle(ipcMain, 'ai:weeklySummary', voidSchema(), async () => {
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const tasksCompleted = getStmt("SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND updated_at >= ?").get(weekAgo)
    const pomodorosDone = getStmt("SELECT COUNT(*) as count, SUM(duration) as total FROM pomodoro_sessions WHERE started_at >= ?").get(weekAgo)
    const dailyLogs = getStmt("SELECT date, content, focus, blockers, tomorrow_plan FROM daily_logs WHERE date >= ? ORDER BY date DESC").all(weekAgo)
    const xpGained = getStmt("SELECT SUM(amount) as total FROM xp_log WHERE created_at >= ?").get(weekAgo)
    const habitsCompleted = getStmt("SELECT COUNT(*) as count FROM habit_logs WHERE date >= ? AND completed = 1").get(weekAgo)

    const data = {
      period: `${weekAgo} to ${today.toISOString().split('T')[0]}`,
      tasksCompleted: tasksCompleted?.count || 0,
      pomodorosDone: pomodorosDone?.count || 0,
      pomodoroMinutes: Math.round((pomodorosDone?.total || 0) / 60),
      xpGained: xpGained?.total || 0,
      habitsCompleted: habitsCompleted?.count || 0,
      dailyLogs: dailyLogs.slice(0, 7),
    }

    const response = await callAI(
      'You are a productivity analyst. Given weekly data, provide 2-3 concise observations in Spanish ' +
      'about patterns, improvements, and suggestions. Be specific and actionable. ' +
      'Respond with a JSON object: { observations: string[], tip: string }',
      `Generate insights from this weekly data:\n${JSON.stringify(data, null, 2)}`,
      1024
    )

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : { observations: ['No insights available'], tip: '' }
    return { ...data, ...insights }
  })

  // 7.3 Tutor conversation about a study topic
  safeHandle(ipcMain, 'ai:tutor', z.object({
    topicId: z.number().int().positive(),
    message: z.string().min(1).max(2000),
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional().default([]),
  }).transform(a => a), async ({ topicId, message, history }) => {
    const topic = getStmt('SELECT * FROM study_topics WHERE id = ?').get(topicId)
    if (!topic) throw new Error('Topic not found')

    let context = `Topic: ${topic.name}\nDescription: ${topic.description || ''}`
    if (topic.resource_url) context += `\nResource: ${topic.resource_url}`

    const files = getStmt('SELECT * FROM study_files WHERE topic_id = ?').all(topicId)
    for (const f of files) {
      try {
        const fs = require('fs')
        const filePath = require('path').join(require('electron').app.getPath('userData'), 'study_files', f.stored_name)
        if (fs.existsSync(filePath)) {
          const text = fs.readFileSync(filePath, 'utf-8').slice(0, 3000)
          context += `\n\nFrom ${f.original_name}:\n${text}`
        }
      } catch {}
    }

    const messages = history.map(h => `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.content}`).join('\n')

    return await callAI(
      'You are a helpful tutor. Answer questions about the given study topic using ONLY the provided context. ' +
      'If the question cannot be answered from the context, say so. Be concise and clear. Respond in Spanish.',
      `Context:\n${context}\n\nConversation history:\n${messages}\n\nStudent: ${message}\nTutor:`,
      1024
    )
  })

  // Settings validation
  safeHandle(ipcMain, 'ai:validateKey', voidSchema(), async () => {
    const provider = getProvider()
    try {
      if (provider === 'lmstudio') {
        const models = await listModels()
        return { valid: true, provider, models }
      }
      await callAnthropic('Reply with just the word OK', 'Ping', 10)
      return { valid: true, provider }
    } catch (e) {
      return { valid: false, provider, error: e instanceof Error ? e.message : String(e) }
    }
  })

  // List available models (LM Studio / OpenAI-compatible)
  safeHandle(ipcMain, 'ai:listModels', voidSchema(), async () => listModels())
}

module.exports = { register }
