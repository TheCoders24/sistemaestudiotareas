import initSqlJs, { Database, SqlJsStatic } from 'sql.js'

let SQL: SqlJsStatic
let db: Database
let saveTimer: any
const DB_KEY = 'estudioapp_db'

function getCols(stmt: any): string[] {
  try { return stmt.getColumnNames() } catch { return [] }
}

function getAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) {
    const vals = stmt.get()
    const cols = getCols(stmt)
    const row: any = {}
    cols.forEach((c: string, i: number) => row[c] = vals[i])
    rows.push(row)
  }
  stmt.free()
  return rows
}

function getOne(sql: string, params: any[] = []): any | undefined {
  const rows = getAll(sql, params)
  return rows[0]
}

function run(sql: string, params: any[] = []) {
  db.run(sql, params)
}

function save() {
  const data = db.export()
  const len = data.length
  let binary = ''
  for (let i = 0; i < len; i++) binary += String.fromCharCode(data[i])
  try { localStorage.setItem(DB_KEY, btoa(binary)) } catch {}
}

function debouncedSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 300)
}

function addXp(amount: number, reason: string) {
  run('INSERT INTO xp_log (amount, reason) VALUES (?, ?)', [amount, reason])
  computeXp()
  try { updateChallengeProgress('xp', amount) } catch {}
  save()
}

function computeXp(): any {
  const row = getOne('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log')
  let total = row.total
  let level = 1, xpForNext = 100, remaining = total
  while (remaining >= xpForNext) { remaining -= xpForNext; level++; xpForNext = Math.floor(xpForNext * 1.5) }
  return { total, level, currentXp: remaining, nextLevelXp: xpForNext }
}

function getWeekStart(): string {
  const now = new Date(); const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function updateChallengeProgress(type: string, amount: number) {
  const weekStart = getWeekStart()
  const challenges = getAll("SELECT * FROM challenges WHERE requirement_type = ?", [type])
  for (const challenge of challenges) {
    const existing = getOne("SELECT * FROM user_challenges WHERE challenge_id = ? AND week_start = ?", [challenge.id, weekStart])
    if (existing) {
      if (!existing.completed) {
        const newProgress = existing.progress + amount
        if (newProgress >= challenge.requirement_count) {
          run("UPDATE user_challenges SET progress = ?, completed = 1, completed_at = datetime('now') WHERE id = ?", [newProgress, existing.id])
          addXp(challenge.xp_reward, `desaf\u00edo completado: ${challenge.name}`)
        } else {
          run("UPDATE user_challenges SET progress = ? WHERE id = ?", [newProgress, existing.id])
        }
      }
    } else {
      run("INSERT INTO user_challenges (challenge_id, progress, week_start) VALUES (?, ?, ?)", [challenge.id, amount, weekStart])
    }
  }
}

function dynamicUpdate(table: string, id: number, data: any) {
  const keys = Object.keys(data).filter(k => k !== 'id')
  if (keys.length === 0) return getOne(`SELECT * FROM ${table} WHERE id = ?`, [id])
  const setClause = keys.map(k => `${k} = ?`).join(', ')
  const params = keys.map(k => data[k])
  run(`UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = ?`, [...params, id])
  return getOne(`SELECT * FROM ${table} WHERE id = ?`, [id])
}

let initialized = false

export async function initDatabase() {
  if (initialized) return
  SQL = await initSqlJs()
  const saved = localStorage.getItem(DB_KEY)
  if (saved) {
    try {
      const binaryStr = atob(saved)
      const array = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) array[i] = binaryStr.charCodeAt(i)
      db = new SQL.Database(array)
    } catch {
      db = new SQL.Database()
    }
  } else {
    db = new SQL.Database()
  }
  runSchema()
  runMigrations()
  seedData()
  save()
  initialized = true
}

function runSchema() {
  const tables = [
    'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT "", status TEXT DEFAULT "activo", tech_stack TEXT DEFAULT "", repo_url TEXT DEFAULT "", color TEXT DEFAULT "#6366f1", deleted INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime("now")), updated_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT "", completed INTEGER DEFAULT 0, priority TEXT DEFAULT "media", due_date TEXT, reminder TEXT, tags TEXT DEFAULT "", project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, repeat TEXT, deleted INTEGER DEFAULT 0, position INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime("now")), updated_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS subtasks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, title TEXT NOT NULL, completed INTEGER DEFAULT 0, position INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS entity_links (id INTEGER PRIMARY KEY AUTOINCREMENT, from_type TEXT NOT NULL, from_id INTEGER NOT NULL, to_type TEXT NOT NULL, to_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime("now")), UNIQUE(from_type, from_id, to_type, to_id))',
    'CREATE TABLE IF NOT EXISTS kanban_cards (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT "", column_type TEXT NOT NULL DEFAULT "pendiente", position INTEGER NOT NULL DEFAULT 0, priority TEXT DEFAULT "media", tags TEXT DEFAULT "", due_date TEXT, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, created_at TEXT DEFAULT (datetime("now")), updated_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS pomodoro_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, duration INTEGER NOT NULL, started_at TEXT NOT NULL, ended_at TEXT)',
    'CREATE TABLE IF NOT EXISTS study_topics (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER REFERENCES study_topics(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT DEFAULT "", resource_url TEXT DEFAULT "", study_level INTEGER DEFAULT 0, study_level_updated_at TEXT, order_position INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS study_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE, completed INTEGER DEFAULT 0, date TEXT DEFAULT (date("now")))',
    'CREATE TABLE IF NOT EXISTS study_files (id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE, original_name TEXT NOT NULL, stored_name TEXT NOT NULL UNIQUE, file_size INTEGER DEFAULT 0, mime_type TEXT DEFAULT "", created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT DEFAULT "Sin t\u00edtulo", content TEXT DEFAULT "", project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, deleted INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime("now")), updated_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ("daily","weekly")), target INTEGER NOT NULL, metric TEXT NOT NULL, created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS goal_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE, date TEXT NOT NULL, value INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS streaks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, current INTEGER DEFAULT 0, max INTEGER DEFAULT 0, updated_at TEXT DEFAULT (date("now")))',
    'CREATE TABLE IF NOT EXISTS daily_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, content TEXT DEFAULT "", focus TEXT DEFAULT "", blockers TEXT DEFAULT "", tomorrow_plan TEXT DEFAULT "", created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS snippets (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, code TEXT DEFAULT "", language TEXT DEFAULT "text", description TEXT DEFAULT "", tags TEXT DEFAULT "", project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS habits (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, icon TEXT DEFAULT "check", color TEXT DEFAULT "#6366f1", frequency TEXT DEFAULT "daily", created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS habit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE, date TEXT NOT NULL, completed INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT DEFAULT "#6366f1")',
    'CREATE TABLE IF NOT EXISTS achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT DEFAULT "", icon TEXT DEFAULT "trophy", xp_reward INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS user_achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE, unlocked_at TEXT DEFAULT (datetime("now")), UNIQUE(achievement_id))',
    'CREATE TABLE IF NOT EXISTS xp_log (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS challenges (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT DEFAULT "", icon TEXT DEFAULT "zap", requirement_type TEXT NOT NULL, requirement_count INTEGER NOT NULL, period TEXT DEFAULT "weekly", xp_reward INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS user_challenges (id INTEGER PRIMARY KEY AUTOINCREMENT, challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE, progress INTEGER DEFAULT 0, completed INTEGER DEFAULT 0, week_start TEXT NOT NULL, completed_at TEXT, UNIQUE(challenge_id, week_start))',
    'CREATE TABLE IF NOT EXISTS weekly_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, week_start TEXT NOT NULL UNIQUE, pomodoros INTEGER DEFAULT 0, tasks_completed INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, streak_max INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS flashcard_decks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT "", created_at TEXT DEFAULT (datetime("now")))',
    'CREATE TABLE IF NOT EXISTS flashcards (id INTEGER PRIMARY KEY AUTOINCREMENT, deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE, front TEXT NOT NULL, back TEXT NOT NULL, hint TEXT DEFAULT "", difficulty INTEGER DEFAULT 0, ease_factor REAL DEFAULT 2.5, repetitions INTEGER DEFAULT 0, interval INTEGER DEFAULT 0, next_review TEXT DEFAULT (datetime("now")), created_at TEXT DEFAULT (datetime("now")))',
  ]
  for (const sql of tables) db.run(sql)
}

function runMigrations() {
  const version = getOne("SELECT value FROM settings WHERE key = 'db_schema_version'")
  if (version && parseInt(version.value) >= 8) return
  const migrations: { col: string, table: string, sql: string }[] = [
    { col: 'position', table: 'tasks', sql: "ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0" },
    { col: 'repeat', table: 'tasks', sql: "ALTER TABLE tasks ADD COLUMN repeat TEXT" },
    { col: 'project_id', table: 'tasks', sql: "ALTER TABLE tasks ADD COLUMN project_id INTEGER" },
    { col: 'reminder', table: 'tasks', sql: "ALTER TABLE tasks ADD COLUMN reminder TEXT" },
    { col: 'priority', table: 'tasks', sql: "ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'media'" },
    { col: 'tags', table: 'tasks', sql: "ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT ''" },
    { col: 'description', table: 'tasks', sql: "ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''" },
    { col: 'deleted', table: 'tasks', sql: "ALTER TABLE tasks ADD COLUMN deleted INTEGER DEFAULT 0" },
    { col: 'deleted', table: 'notes', sql: "ALTER TABLE notes ADD COLUMN deleted INTEGER DEFAULT 0" },
    { col: 'deleted', table: 'projects', sql: "ALTER TABLE projects ADD COLUMN deleted INTEGER DEFAULT 0" },
    { col: 'project_id', table: 'kanban_cards', sql: "ALTER TABLE kanban_cards ADD COLUMN project_id INTEGER" },
    { col: 'project_id', table: 'pomodoro_sessions', sql: "ALTER TABLE pomodoro_sessions ADD COLUMN project_id INTEGER" },
    { col: 'task_id', table: 'pomodoro_sessions', sql: "ALTER TABLE pomodoro_sessions ADD COLUMN task_id INTEGER" },
    { col: 'project_id', table: 'notes', sql: "ALTER TABLE notes ADD COLUMN project_id INTEGER" },
    { col: 'project_id', table: 'snippets', sql: "ALTER TABLE snippets ADD COLUMN project_id INTEGER" },
    { col: 'study_level', table: 'study_topics', sql: "ALTER TABLE study_topics ADD COLUMN study_level INTEGER DEFAULT 0" },
    { col: 'study_level_updated_at', table: 'study_topics', sql: "ALTER TABLE study_topics ADD COLUMN study_level_updated_at TEXT" },
    { col: 'resource_url', table: 'study_topics', sql: "ALTER TABLE study_topics ADD COLUMN resource_url TEXT DEFAULT ''" },
  ]
  for (const m of migrations) {
    try {
      const cols = getAll(`PRAGMA table_info(${m.table})`).map((c: any) => c.name)
      if (!cols.includes(m.col)) db.run(m.sql)
    } catch {}
  }
  run("INSERT OR REPLACE INTO settings (key, value) VALUES ('db_schema_version', '8')")
}

function seedData() {
  if (getOne('SELECT COUNT(*) as c FROM achievements').c > 0) return
  const ach = [
    ['first_pomodoro', 'Primer Pomodoro', 'Completá tu primer pomodoro', 'clock', 50],
    ['ten_pomodoros', 'En Racha', 'Completá 10 pomodoros', 'clock', 100],
    ['fifty_pomodoros', 'Máquina de Pomodoros', 'Completá 50 pomodoros', 'clock', 250],
    ['first_task', 'Primer Paso', 'Completá tu primera tarea', 'check-square', 50],
    ['ten_tasks', 'Productivo', 'Completá 10 tareas', 'check-square', 100],
    ['first_note', 'Apuntes', 'Creá tu primera nota', 'book-open', 30],
    ['first_streak_3', 'Constancia', 'Alcanzá 3 días de racha', 'flame', 100],
    ['first_streak_7', 'Semana Completa', 'Alcanzá 7 días de racha', 'flame', 250],
    ['first_streak_30', 'Imparable', 'Alcanzá 30 días de racha', 'flame', 500],
    ['ten_notes', 'Escritor', 'Creá 10 notas', 'book-open', 100],
    ['fifty_notes', 'Novelista', 'Creá 50 notas', 'book-open', 250],
    ['ten_snippets', 'Programador', 'Creá 10 snippets', 'code', 100],
    ['five_projects', 'Arquitecto', 'Creá 5 proyectos', 'folder', 150],
    ['hundred_tasks', 'Máquina de Tareas', 'Completá 100 tareas', 'check-square', 500],
    ['first_weekly_challenge', 'Desafío Semanal', 'Completá tu primer desafío semanal', 'zap', 100],
    ['seven_day_streak_app', 'Dedicated', 'Usá la app 7 días seguidos', 'smartphone', 200],
  ]
  for (const a of ach) run('INSERT INTO achievements (key, name, description, icon, xp_reward) VALUES (?,?,?,?,?)', a)
  const ch = [
    ['pomodoros_15', 'Racha de Foco', 'Completá 15 pomodoros en la semana', 'clock', 'pomodoro', 15, 150],
    ['tasks_20', 'Máquina Semanal', 'Completá 20 tareas en la semana', 'check-square', 'task', 20, 150],
    ['xp_500', 'Ganador de XP', 'Ganá 500 XP en la semana', 'zap', 'xp', 500, 200],
    ['streak_5', 'Constante', 'Mantené 5 días de racha', 'flame', 'streak', 5, 100],
    ['notes_5', 'Escritor Semanal', 'Creá 5 notas en la semana', 'book-open', 'note', 5, 100],
  ]
  for (const c of ch) run('INSERT INTO challenges (key, name, description, icon, requirement_type, requirement_count, xp_reward) VALUES (?,?,?,?,?,?,?)', c)
}

export { getAll, getOne, run, save, debouncedSave, addXp, computeXp, updateChallengeProgress, getWeekStart, dynamicUpdate }
