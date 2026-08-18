/**
 * ============================================================================
 *  automated-testing.js — Suite de tests automatizados (end-to-end real)
 * ============================================================================
 *
 *  Ejecuta los handlers IPC REALES de TODOS los módulos (electron/handlers/*)
 *  sobre una base de datos SQLite REAL y DESECHABLE (carpeta temporal), usando
 *  información genérica, y verifica cada flujo CRUD de la aplicación:
 *
 *    workspaces · tasks · subtasks · proyectos · notas · kanban · pomodoro ·
 *    mapa de estudio + materias · objetivos · hábitos · snippets · diarios ·
 *    flashcards · automatizaciones · etiquetas · papelera · búsqueda ·
 *    dashboard · actividad · estadísticas · ajustes · plantillas · exámenes ·
 *    gamificación · infraestructura (perfilador/perf/plugins/pin/cifrado) ·
 *    backups (lectura) · vínculos entre entidades · importación ICS.
 *
 *  ❌ NO se ejercitan los canales peligrosos: AI (API externa), sincronización
 *  WiFi, restauración/importación masiva de BD, vaciar papelera, ejecución de
 *  snippets, diálogos de archivo, atajos globales, autoarranque, updater, PIN.
 *
 *  Cómo ejecutarlo (requiere el binario de Electron):
 *    npx electron scripts/automated-testing.js
 *
 *  Código de salida: 0 = todas las comprobaciones OK, 1 = al menos una falló.
 * ============================================================================
 */

const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

app.setPath('userData', path.join(app.getPath('temp'), 'sistema-automated-tests'))

const { initDatabase, deferDbInit, closeDatabase, getDb } = require('../electron/database')
const { getStmt, safeUpdate, wsFilter, wsParams } = require('../electron/utils')
const { safeHandle, voidSchema, z } = require('../electron/core/safe-handle')
const schemas = require('../electron/core/schemas')

// ---------------------------------------------------------------------------
// Fake ipcMain: captura los handlers que registra cada módulo
// ---------------------------------------------------------------------------
const handlers = {}
const fakeIpcMain = {
  handle: (channel, fn) => { handlers[channel] = fn },
  removeHandler: (channel) => { delete handlers[channel] },
}

function invoke(channel, ...args) {
  return handlers[channel]({}, ...args)
}

// ---------------------------------------------------------------------------
// Motor de tests
// ---------------------------------------------------------------------------
const results = []
let failures = 0

function today() {
  return new Date().toISOString().split('T')[0]
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'La condición falló')
}
function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEq'}: se esperaba ${JSON.stringify(expected)}, se obtuvo ${JSON.stringify(actual)}`)
  }
}
function assertTruthy(value, msg) {
  if (!value) throw new Error(msg || 'Se esperaba un valor válido')
}

async function test(group, name, fn) {
  try {
    await fn()
    results.push({ group, name, ok: true })
  } catch (err) {
    failures++
    results.push({ group, name, ok: false, error: err.message })
    console.error(`  ✗ [${group}] ${name}\n      → ${err.message}`)
  }
}

// ---------------------------------------------------------------------------
// Stubs de infraestructura (no se está probando esos subsistemas)
// ---------------------------------------------------------------------------
const noop = () => {}
const stubs = {
  automationEngine: { addRule: noop, removeRule: noop },
  startupProfiler: { getReport: () => ({ measures: [] }), reset: () => true },
  performanceModes: {
    modeId: 'balanceado',
    modes: [{ id: 'balanceado', label: 'Balanceado' }],
    getConfig: () => ({}),
    setMode: (mode) => { stubs.performanceModes.modeId = mode; return true },
  },
  performanceMonitor: {
    enabled: false,
    start: noop, stop: noop,
    collectSample: () => null, getReport: () => null, getLatestSample: () => null,
  },
  smartPreload: { getStats: () => null, recordTransition: () => true, setLevel: () => true },
  pinLock: {
    setPin: () => ({ ok: true }), verify: (pin) => ({ ok: pin === '1234' }),
    disable: () => true, isEnabled: () => false, isLocked: () => false,
  },
  pluginSystem: {
    listPlugins: () => [], getPlugin: () => null, isActive: () => false,
    load: () => null, unload: () => true,
  },
  encryption: {
    encrypt: (t) => 'enc:' + Buffer.from(t).toString('base64'),
    decrypt: (d) => Buffer.from(String(d).replace(/^enc:/, ''), 'base64').toString('utf8'),
    hash: (d) => 'sha256:' + crypto.createHash('sha256').update(String(d)).digest('hex'),
    generateKey: () => 'test-key-123',
  },
}
const sessionManagerStub = { _state: null, save: (s) => { sessionManagerStub._state = s; return true }, restore: () => sessionManagerStub._state }

app.whenReady().then(async () => {
  try {
    fs.rmSync(app.getPath('userData'), { recursive: true, force: true })
    fs.mkdirSync(app.getPath('userData'), { recursive: true })
    initDatabase()
    deferDbInit()

    const { dialog, shell, globalShortcut } = require('electron')
    const coreDeps = {
      getStmt, getDb, safeUpdate, wsFilter, wsParams, safeHandle, schemas, voidSchema, z,
      app, mainWindow: null, dialog, shell, fs, path, crypto, globalShortcut,
      updateTrayMenu: noop, notificationManager: { show: noop },
    }
    const { addXp, updateChallengeProgress } = require('../electron/handlers/gamification').register(fakeIpcMain, { getStmt, safeHandle, schemas, voidSchema, z })
    const allDeps = { ...coreDeps, addXp, updateChallengeProgress }
    const depExtra = { ...allDeps, mainWindow: null, ...stubs }

    require('../electron/handlers/tasks').register(fakeIpcMain, allDeps)
    require('../electron/handlers/projects').register(fakeIpcMain, allDeps)
    require('../electron/handlers/workspaces').register(fakeIpcMain, allDeps)
    require('../electron/handlers/notes').register(fakeIpcMain, allDeps)
    require('../electron/handlers/kanban').register(fakeIpcMain, allDeps)
    require('../electron/handlers/pomodoro').register(fakeIpcMain, allDeps)
    require('../electron/handlers/study').register(fakeIpcMain, allDeps)
    require('../electron/handlers/goals').register(fakeIpcMain, allDeps)
    require('../electron/handlers/habits').register(fakeIpcMain, allDeps)
    require('../electron/handlers/snippets').register(fakeIpcMain, allDeps)
    require('../electron/handlers/dailylogs').register(fakeIpcMain, allDeps)
    require('../electron/handlers/flashcards').register(fakeIpcMain, allDeps)
    require('../electron/handlers/automation').register(fakeIpcMain, depExtra)
    require('../electron/handlers/labels').register(fakeIpcMain, allDeps)
    require('../electron/handlers/trash').register(fakeIpcMain, allDeps)
    require('../electron/handlers/search').register(fakeIpcMain, allDeps)
    require('../electron/handlers/settings').register(fakeIpcMain, allDeps)
    require('../electron/handlers/studyfiles').register(fakeIpcMain, allDeps)
    require('../electron/handlers/newmodules').register(fakeIpcMain, depExtra)
    require('../electron/handlers/sync').register(fakeIpcMain, allDeps)
    require('../electron/handlers/backup').register(fakeIpcMain, allDeps)
    require('../electron/handlers/courses').register(fakeIpcMain, allDeps)
    require('../electron/handlers/templates').register(fakeIpcMain, allDeps)
    require('../electron/handlers/exams').register(fakeIpcMain, allDeps)
    require('../electron/handlers/snippets-execute').register(fakeIpcMain, allDeps)
    require('../electron/handlers/ai').register(fakeIpcMain, allDeps)

    // Canales auxiliares que main.js registra inline (los seguros)
    safeHandle(fakeIpcMain, 'entity:link', z.object({ 0: z.string(), 1: z.number(), 2: z.string(), 3: z.number() }).transform(a => ({ fromType: a[0], fromId: a[1], toType: a[2], toId: a[3] })), ({ fromType, fromId, toType, toId }) => {
      getStmt('INSERT OR IGNORE INTO entity_links (from_type, from_id, to_type, to_id) VALUES (?, ?, ?, ?)').run(fromType, fromId, toType, toId)
      return true
    })
    safeHandle(fakeIpcMain, 'db:linkEntities', z.object({ 0: z.string(), 1: z.number(), 2: z.string(), 3: z.number() }).transform(a => ({ fromType: a[0], fromId: a[1], toType: a[2], toId: a[3] })), ({ fromType, fromId, toType, toId }) => {
      getStmt('INSERT OR IGNORE INTO entity_links (from_type, from_id, to_type, to_id) VALUES (?, ?, ?, ?)').run(fromType, fromId, toType, toId)
      return true
    })
    safeHandle(fakeIpcMain, 'entity:getLinks', z.object({ 0: z.string(), 1: z.number() }).transform(a => ({ type: a[0], id: a[1] })), ({ type, id }) => {
      return getStmt('SELECT * FROM entity_links WHERE (from_type = ? AND from_id = ?) OR (to_type = ? AND to_id = ?)').all(type, id, type, id)
    })
    safeHandle(fakeIpcMain, 'db:getEntityLinks', z.object({ 0: z.string(), 1: z.number() }).transform(a => ({ type: a[0], id: a[1] })), ({ type, id }) => {
      return getStmt('SELECT * FROM entity_links WHERE (from_type = ? AND from_id = ?) OR (to_type = ? AND to_id = ?)').all(type, id, type, id)
    })
    safeHandle(fakeIpcMain, 'db:importICSEvents', z.object({ events: z.array(z.object({ title: z.string(), description: z.string().optional(), startDate: z.string() })) }), ({ events }) => {
      const resultsArr = []
      for (const evt of events) {
        const task = { title: evt.title, description: evt.description || '', priority: 'media', due_date: evt.startDate, repeat: null }
        const result = getDb().prepare('INSERT INTO tasks (title, description, priority, due_date, repeat) VALUES (?, ?, ?, ?, ?)').run(task.title, task.description, task.priority, task.due_date, task.repeat)
        resultsArr.push({ id: result.lastInsertRowid, title: evt.title })
      }
      return resultsArr
    })
    safeHandle(fakeIpcMain, 'session:save', z.object({ activeTab: z.string().optional(), sidebarOpen: z.boolean().optional(), scrollPositions: z.record(z.number()).optional() }).passthrough(), (state) => sessionManagerStub.save(state))
    safeHandle(fakeIpcMain, 'session:restore', voidSchema(), () => sessionManagerStub.restore())

    const registeredChannels = Object.keys(handlers)
    console.log(`Canales IPC registrados: ${registeredChannels.length}\n`)

    // =======================================================================
    // ESTADO COMPARTIDO Y EJECUCIÓN SECUENCIAL
    // =======================================================================
    const st = {}
    const WS = 1 // workspace por defecto "Mi Espacio"

    console.log('=== 1 · Workspaces ===')
    await test('Workspaces', 'workspaces:create', async () => {
      const ws = await invoke('workspaces:create', { name: 'Universidad', icon: 'graduation-cap', color: '#10b981' })
      assertTruthy(ws && ws.id > 0, 'No devolvió un id válido')
      st.ws = ws
    })
    await test('Workspaces', 'workspaces:list', async () => {
      const list = await invoke('workspaces:list')
      assert(list.some(w => w.id === st.ws.id), 'El workspace creado no aparece')
    })
    await test('Workspaces', 'workspaces:update', async () => {
      const upd = await invoke('workspaces:update', st.ws.id, { name: 'Universidad 2026' })
      assertEq(upd.name, 'Universidad 2026', 'No se actualizó el nombre')
    })
    await test('Workspaces', 'workspaces:setActive + getActive', async () => {
      await invoke('workspaces:setActive', st.ws.id)
      const active = await invoke('workspaces:getActive')
      assertTruthy(active, 'No hay workspace activo')
    })
    await test('Workspaces', 'workspaces:getEntities', async () => {
      const entities = await invoke('workspaces:getEntities', st.ws.id)
      assert(typeof entities === 'object' && entities.projects !== undefined, 'No devolvió conteos')
    })
    await test('Workspaces', 'workspaces:delete', async () => {
      const ok = await invoke('workspaces:delete', st.ws.id)
      assertEq(ok, true, 'No devolvió true')
    })

    console.log('=== 2 · Tareas ===')
    await test('Tareas', 'db:createTask', async () => {
      const task = await invoke('db:createTask', { title: 'Comprar materiales de estudio', description: 'Apuntes y marcadores', priority: 'alta', due_date: today(), tags: 'compras,estudio', workspace_id: WS })
      assertTruthy(task && task.id > 0, 'No devolvió id')
      st.task = task
    })
    await test('Tareas', 'db:getTasks', async () => {
      const list = await invoke('db:getTasks')
      assert(list.some(t => t.id === st.task.id), 'La tarea no aparece')
    })
    await test('Tareas', 'db:updateTask', async () => {
      const upd = await invoke('db:updateTask', st.task.id, { description: 'Actualizado', priority: 'urgente' })
      assertEq(upd.priority, 'urgente', 'No se actualizó la prioridad')
    })
    await test('Tareas', 'db:toggleTask', async () => {
      const toggled = await invoke('db:toggleTask', st.task.id)
      assertEq(toggled.completed, 1, 'No se marcó como completada')
      await invoke('db:toggleTask', st.task.id)
    })
    await test('Tareas', 'db:reorderTasks', async () => {
      const t2 = await invoke('db:createTask', { title: 'Ordenar bibliografía', workspace_id: WS })
      const ok = await invoke('db:reorderTasks', [t2.id, st.task.id])
      assertEq(ok, true, 'reorder no devolvió true')
    })
    await test('Tareas', 'db:addTagToTask + getTasksByTag + removeTagFromTask', async () => {
      await invoke('db:addTagToTask', st.task.id, 'urgente')
      const byTag = await invoke('db:getTasksByTag', 'urgente')
      assert(byTag.some(t => t.id === st.task.id), 'No encontró la tarea por etiqueta')
      await invoke('db:removeTagFromTask', st.task.id, 'urgente')
      const after = await invoke('db:getTasksByTag', 'urgente')
      assert(!after.some(t => t.id === st.task.id), 'No se removió la etiqueta')
    })
    await test('Tareas', 'db:createSubtask + getSubtasks + toggleSubtask + deleteSubtask', async () => {
      const sub = await invoke('db:createSubtask', { task_id: st.task.id, title: 'Comparar precios' })
      assertTruthy(sub && sub.id > 0, 'No creó la subtarea')
      const subs = await invoke('db:getSubtasks', st.task.id)
      assert(subs.some(s => s.id === sub.id), 'La subtarea no aparece')
      const toggled = await invoke('db:toggleSubtask', sub.id)
      assertEq(toggled.completed, 1, 'No se completó la subtarea')
      assertEq(await invoke('db:deleteSubtask', sub.id), true, 'No borró la subtarea')
    })
    await test('Tareas', 'db:getTasksWithSubtasks', async () => {
      const rows = await invoke('db:getTasksWithSubtasks')
      const mine = rows.find(t => t.id === st.task.id)
      assertTruthy(mine && Array.isArray(mine.subtasks), 'No devolvió subtasks[]')
    })
    await test('Tareas', 'tasks:addDependency + getDependencies + getDependents + removeDependency', async () => {
      const t2 = await invoke('db:createTask', { title: 'Dependiente', workspace_id: WS })
      await invoke('tasks:addDependency', t2.id, st.task.id)
      const deps = await invoke('tasks:getDependencies', t2.id)
      assert(deps.some(t => t.id === st.task.id), 'No devolvió la dependencia')
      const dependents = await invoke('tasks:getDependents', st.task.id)
      assert(dependents.some(t => t.id === t2.id), 'No devolvió el dependiente')
      await invoke('tasks:removeDependency', t2.id, st.task.id)
      const after = await invoke('tasks:getDependencies', t2.id)
      assert(!after.some(t => t.id === st.task.id), 'No removió la dependencia')
    })
    await test('Tareas', 'tasks:addComment + getComments + deleteComment', async () => {
      const c = await invoke('tasks:addComment', st.task.id, 'Recordar llevar libreta')
      assertTruthy(c && c.id > 0, 'No creó el comentario')
      const comments = await invoke('tasks:getComments', st.task.id)
      assert(comments.some(x => x.id === c.id), 'El comentario no aparece')
      assertEq(await invoke('tasks:deleteComment', c.id), true, 'No borró el comentario')
    })
    await test('Tareas', 'tasks:startTimeEntry + stopTimeEntry + getTotalTrackedTime', async () => {
      const te = await invoke('tasks:startTimeEntry', st.task.id)
      assertTruthy(te && te.id > 0, 'No inició el registro de tiempo')
      await invoke('tasks:stopTimeEntry', te.id)
      const entries = await invoke('tasks:getTimeEntries', st.task.id)
      assert(entries.some(e => e.id === te.id), 'El registro no aparece')
      const total = await invoke('tasks:getTotalTrackedTime', st.task.id)
      assert(typeof total === 'number', 'El total no es numérico')
      assertEq(await invoke('tasks:deleteTimeEntry', te.id), true, 'No borró el registro')
    })
    await test('Tareas', 'db:deleteTask', async () => {
      assertEq(await invoke('db:deleteTask', st.task.id), true, 'No borró la tarea')
      const list = await invoke('db:getTasks')
      assert(!list.some(t => t.id === st.task.id), 'La tarea borrada sigue apareciendo')
    })

    console.log('=== 3 · Proyectos ===')
    await test('Proyectos', 'db:createProject', async () => {
      const p = await invoke('db:createProject', { name: 'Proyecto de laboratorio', description: 'Informe final', status: 'active', tech_stack: 'química', color: '#22c55e', workspace_id: WS })
      assertTruthy(p && p.id > 0, 'No creó el proyecto')
      st.project = p
    })
    await test('Proyectos', 'db:getProjects + update', async () => {
      const list = await invoke('db:getProjects')
      assert(list.some(p => p.id === st.project.id), 'El proyecto no aparece')
      const upd = await invoke('db:updateProject', st.project.id, { status: 'paused' })
      assertEq(upd.status, 'paused', 'No actualizó el estado')
    })
    await test('Proyectos', 'projects:gitStatus (sin repo)', async () => {
      const res = await invoke('projects:gitStatus', st.project.id)
      assertEq(res, null, 'Debería devolver null sin repo_url')
    })
    await test('Proyectos', 'db:deleteProject', async () => {
      assertEq(await invoke('db:deleteProject', st.project.id), true, 'No borró el proyecto')
    })

    console.log('=== 4 · Notas ===')
    await test('Notas', 'notes:createFolder + getFolders + updateFolder', async () => {
      const folder = await invoke('notes:createFolder', { name: 'Apuntes de clase', color: '#6366f1', workspace_id: WS })
      assertTruthy(folder && folder.id > 0, 'No creó la carpeta')
      st.folder = folder
      const list = await invoke('notes:getFolders', WS)
      assert(list.some(f => f.id === folder.id), 'La carpeta no aparece')
      const upd = await invoke('notes:updateFolder', folder.id, { name: 'Apuntes 2026' })
      assertEq(upd.name, 'Apuntes 2026', 'No renombró la carpeta')
    })
    await test('Notas', 'db:createNote + getNotes + updateNote + exportMarkdown', async () => {
      const note = await invoke('db:createNote', { title: 'Resumen de bioquímica', content: '# Metabolismo', project_id: null, workspace_id: WS, folder_id: st.folder.id })
      assertTruthy(note && note.id > 0, 'No creó la nota')
      st.note = note
      const list = await invoke('db:getNotes')
      assert(list.some(n => n.id === note.id), 'La nota no aparece')
      const upd = await invoke('db:updateNote', note.id, { title: 'Resumen de bioquímica II' })
      assertEq(upd.title, 'Resumen de bioquímica II', 'No actualizó la nota')
      const md = await invoke('notes:exportMarkdown', note.id)
      assertTruthy(md && md.title, 'No exportó el markdown')
    })
    await test('Notas', 'notes:deleteFolder (desasigna notas)', async () => {
      assertEq(await invoke('notes:deleteFolder', st.folder.id), true, 'No borró la carpeta')
      const after = await invoke('db:getNotes')
      const n = after.find(x => x.id === st.note.id)
      assert(n && n.folder_id == null, 'La nota debería quedar sin carpeta')
    })
    await test('Notas', 'db:deleteNote', async () => {
      assertEq(await invoke('db:deleteNote', st.note.id), true, 'No borró la nota')
    })

    console.log('=== 5 · Kanban ===')
    await test('Kanban', 'kanban:createColumn + getColumns + updateColumn', async () => {
      const col = await invoke('kanban:createColumn', { name: 'Por hacer', type: 'todo', color: '#ef4444', workspace_id: WS })
      assertTruthy(col && col.id > 0, 'No creó la columna')
      st.column = col
      const cols = await invoke('kanban:getColumns', WS)
      assert(cols.some(c => c.id === col.id), 'La columna no aparece')
      const upd = await invoke('kanban:updateColumn', col.id, { name: 'En espera' })
      assertEq(upd.name, 'En espera', 'No renombró la columna')
    })
    await test('Kanban', 'db:createKanbanCard + getKanbanCards + update + move', async () => {
      const card = await invoke('db:createKanbanCard', { title: 'Tarjeta de prueba', description: 'Moverse de columna', column_type: 'todo', priority: 'media', tags: 'kanban', workspace_id: WS })
      assertTruthy(card && card.id > 0, 'No creó la tarjeta')
      st.card = card
      const cards = await invoke('db:getKanbanCards')
      assert(cards.some(c => c.id === card.id), 'La tarjeta no aparece')
      const upd = await invoke('db:updateKanbanCard', card.id, { description: 'Editada' })
      assertEq(upd.description, 'Editada', 'No editó la tarjeta')
      const moved = await invoke('db:moveKanbanCard', card.id, 'in_progress', 0)
      assertEq(moved.column_type, 'in_progress', 'No se movió la tarjeta')
    })
    await test('Kanban', 'db:deleteKanbanCard + kanban:deleteColumn', async () => {
      assertEq(await invoke('db:deleteKanbanCard', st.card.id), true, 'No borró la tarjeta')
      assertEq(await invoke('kanban:deleteColumn', st.column.id), true, 'No borró la columna')
    })

    console.log('=== 6 · Pomodoro ===')
    await test('Pomodoro', 'db:createPomodoroSession + getPomodoroSessions', async () => {
      const session = await invoke('db:createPomodoroSession', { duration: 25, type: 'focus', date: today() })
      assertTruthy(session && session.id > 0, 'No creó la sesión')
      const list = await invoke('db:getPomodoroSessions')
      assert(list.some(s => s.id === session.id), 'La sesión no aparece')
    })

    console.log('=== 7 · Mapa de estudio + Materias ===')
    await test('StudyMap', 'courses:create + get', async () => {
      const course = await invoke('courses:create', { name: 'Anatomía I', color: '#f43f5e', icon: 'book', term: '2026-1', workspace_id: WS })
      assertTruthy(course && course.id > 0, 'No creó la materia')
      st.course = course
      const got = await invoke('courses:get', course.id)
      assertEq(got.name, 'Anatomía I', 'No devolvió la materia')
    })
    await test('StudyMap', 'courses:update', async () => {
      const upd = await invoke('courses:update', st.course.id, { target_grade: 90 })
      assertEq(upd.target_grade, 90, 'No actualizó la nota objetivo')
    })
    await test('StudyMap', 'db:createStudyTopic persiste course_id', async () => {
      const topic = await invoke('db:createStudyTopic', { name: 'Sistema respiratorio', description: 'Pulmones', course_id: st.course.id, workspace_id: WS, order_position: 0 })
      assertTruthy(topic && topic.id > 0, 'No creó el tema')
      assertEq(topic.course_id, st.course.id, 'No persiste course_id')
      st.topic = topic
    })
    await test('StudyMap', 'db:getStudyTopics', async () => {
      const list = await invoke('db:getStudyTopics')
      assert(list.some(t => t.id === st.topic.id), 'El tema no aparece')
    })
    await test('StudyMap', 'db:updateStudyTopic', async () => {
      const upd = await invoke('db:updateStudyTopic', st.topic.id, { description: 'Actualizado' })
      assertEq(upd.description, 'Actualizado', 'No editó el tema')
    })
    await test('StudyMap', 'db:setStudyLevel', async () => {
      const ok = await invoke('db:setStudyLevel', st.topic.id, 2)
      assertEq(ok, true, 'No seteó el nivel')
      const after = await invoke('db:getStudyTopics').then(l => l.find(t => t.id === st.topic.id))
      assertEq(after.study_level, 2, 'El nivel no se guardó')
    })
    await test('StudyMap', 'db:toggleStudyProgress', async () => {
      const res = await invoke('db:toggleStudyProgress', st.topic.id, today())
      assert(typeof res.completed === 'boolean', 'toggle no devolvió completed')
    })
    await test('StudyMap', 'db:moveStudyTopic', async () => {
      const t2 = await invoke('db:createStudyTopic', { name: 'Sistema circulatorio', course_id: st.course.id, workspace_id: WS, order_position: 1 })
      const ok = await invoke('db:moveStudyTopic', t2.id, 'up')
      assertEq(ok, true, 'No se pudo mover el tema')
    })
    await test('StudyMap', 'db:getStudyStats', async () => {
      const stats = await invoke('db:getStudyStats')
      assertTruthy(stats && typeof stats.total === 'number', 'No devolvió estadísticas')
    })
    await test('StudyMap', 'db:deleteStudyTopic + courses:delete (archiva)', async () => {
      assertEq(await invoke('db:deleteStudyTopic', st.topic.id), true, 'No borró el tema')
      assertEq(await invoke('courses:delete', st.course.id), true, 'No archivó la materia')
      const courses = await invoke('courses:list')
      assert(!courses.some(c => c.id === st.course.id), 'La materia archivada sigue visible')
    })

    console.log('=== 8 · Objetivos ===')
    await test('Objetivos', 'db:createGoal + getGoals', async () => {
      const goal = await invoke('db:createGoal', { title: 'Leer 20 páginas por día', type: 'daily', target: 20, metric: 'páginas', workspace_id: WS })
      assertTruthy(goal && goal.id > 0, 'No creó el objetivo')
      st.goal = goal
      const list = await invoke('db:getGoals')
      assert(list.some(g => g.id === goal.id), 'El objetivo no aparece')
    })
    await test('Objetivos', 'db:addGoalProgress + getGoalProgress', async () => {
      await invoke('db:addGoalProgress', st.goal.id, today(), 15)
      const progress = await invoke('db:getGoalProgress', st.goal.id, today())
      assertEq(progress, 15, 'No acumuló el progreso')
    })
    await test('Objetivos', 'db:updateGoal + deleteGoal', async () => {
      const upd = await invoke('db:updateGoal', st.goal.id, { target: 30 })
      assertEq(upd.target, 30, 'No actualizó la meta')
      assertEq(await invoke('db:deleteGoal', st.goal.id), true, 'No borró el objetivo')
    })

    console.log('=== 9 · Hábitos ===')
    await test('Hábitos', 'db:createHabit + getHabits', async () => {
      const habit = await invoke('db:createHabit', { name: 'Meditar 10 min', icon: 'brain', color: '#8b5cf6', frequency: 'daily', workspace_id: WS })
      assertTruthy(habit && habit.id > 0, 'No creó el hábito')
      st.habit = habit
      const list = await invoke('db:getHabits')
      assert(list.some(h => h.id === habit.id), 'El hábito no aparece')
    })
    await test('Hábitos', 'db:toggleHabitLog + getHabitLogs', async () => {
      const created = await invoke('db:toggleHabitLog', st.habit.id, today())
      assertEq(created, true, 'No creó el registro del hábito')
      const logs = await invoke('db:getHabitLogs', st.habit.id)
      assert(logs.some(l => l.date === today()), 'El log del día no aparece')
      const removed = await invoke('db:toggleHabitLog', st.habit.id, today())
      assertEq(removed, false, 'No eliminó el registro al desmarcar')
    })
    await test('Hábitos', 'db:getHabitStats', async () => {
      const stats = await invoke('db:getHabitStats')
      assert(Array.isArray(stats), 'No devolvió estadísticas de hábitos')
    })
    await test('Hábitos', 'db:updateHabit + deleteHabit', async () => {
      const upd = await invoke('db:updateHabit', st.habit.id, { name: 'Meditar 15 min' })
      assertEq(upd.name, 'Meditar 15 min', 'No actualizó el hábito')
      assertEq(await invoke('db:deleteHabit', st.habit.id), true, 'No borró el hábito')
    })

    console.log('=== 10 · Snippets ===')
    await test('Snippets', 'db:createSnippet + getSnippets', async () => {
      const snip = await invoke('db:createSnippet', { title: 'Formatear fecha', code: 'const f = (d) => d.toISOString()', language: 'javascript', tags: 'utils', workspace_id: WS })
      assertTruthy(snip && snip.id > 0, 'No creó el snippet')
      st.snippet = snip
      const list = await invoke('db:getSnippets')
      assert(list.some(s => s.id === snip.id), 'El snippet no aparece')
    })
    await test('Snippets', 'db:updateSnippet + deleteSnippet', async () => {
      const upd = await invoke('db:updateSnippet', st.snippet.id, { description: 'Utilidad' })
      assertEq(upd.description, 'Utilidad', 'No actualizó el snippet')
      assertEq(await invoke('db:deleteSnippet', st.snippet.id), true, 'No borró el snippet')
    })

    console.log('=== 11 · Diarios ===')
    await test('Diarios', 'db:createDailyLog + getDailyLog', async () => {
      const log = await invoke('db:createDailyLog', { date: today(), content: 'Estudié anatomía', focus: 'Sistemas', blockers: 'Ninguno', tomorrow_plan: 'Repasar', workspace_id: WS })
      assertTruthy(log && log.id > 0, 'No creó el diario')
      st.log = log
      const got = await invoke('db:getDailyLog', today())
      assertTruthy(got, 'No encontró el diario por fecha')
    })
    await test('Diarios', 'db:getDailyLogs + updateDailyLog', async () => {
      const list = await invoke('db:getDailyLogs')
      assert(list.some(l => l.id === st.log.id), 'El diario no aparece en la lista')
      const upd = await invoke('db:updateDailyLog', st.log.id, { content: 'Revisado' })
      assertEq(upd.content, 'Revisado', 'No actualizó el diario')
    })

    console.log('=== 12 · Flashcards ===')
    await test('Flashcards', 'db:createFlashcardDeck + getFlashcardDecks', async () => {
      const deck = await invoke('db:createFlashcardDeck', { name: 'Anatomía', description: 'Músculos', workspace_id: WS })
      assertTruthy(deck && deck.id > 0, 'No creó el mazo')
      st.deck = deck
      const list = await invoke('db:getFlashcardDecks')
      assert(list.some(d => d.id === deck.id), 'El mazo no aparece')
    })
    await test('Flashcards', 'db:createFlashcard + getFlashcards', async () => {
      const card = await invoke('db:createFlashcard', { deck_id: st.deck.id, front: '¿Cuál es el más largo?', back: 'El sartorio' })
      assertTruthy(card && card.id > 0, 'No creó la tarjeta')
      st.card = card
      const cards = await invoke('db:getFlashcards', st.deck.id)
      assert(cards.some(c => c.id === card.id), 'La tarjeta no aparece')
    })
    await test('Flashcards', 'db:getDueFlashcards + reviewFlashcard', async () => {
      const due = await invoke('db:getDueFlashcards', st.deck.id)
      assert(Array.isArray(due), 'No devolvió tarjetas pendientes')
      const reviewed = await invoke('db:reviewFlashcard', { id: st.card.id, ease: 3 })
      assertTruthy(reviewed && typeof reviewed.repetitions === 'number', 'No devolvió repeticiones')
    })
    await test('Flashcards', 'db:getFlashcardStats + retention + reviewStats + upcoming', async () => {
      const stats = await invoke('db:getFlashcardStats', st.deck.id)
      assertEq(stats.total, 1, 'El total de tarjetas no coincide')
      const retention = await invoke('db:getRetentionStats')
      assertTruthy(retention && typeof retention.total === 'number', 'No devolvió retención')
      const review = await invoke('db:getFlashcardReviewStats')
      assertTruthy(review, 'No devolvió reviewStats')
      const upcoming = await invoke('db:getUpcomingFlashcardReviews')
      assert(Array.isArray(upcoming), 'No devolvió próximas revisiones')
    })
    await test('Flashcards', 'db:updateFlashcardStreak + getSubjectStreaks', async () => {
      const streak = await invoke('db:updateFlashcardStreak', { studied: true })
      assertTruthy(streak && typeof streak.streak === 'number', 'No devolvió racha')
      const subjects = await invoke('db:getSubjectStreaks')
      assert(Array.isArray(subjects), 'No devolvió rachas por materia')
    })
    await test('Flashcards', 'db:deleteFlashcard + deleteFlashcardDeck', async () => {
      assertEq(await invoke('db:deleteFlashcard', st.card.id), true, 'No borró la tarjeta')
      assertEq(await invoke('db:deleteFlashcardDeck', st.deck.id), true, 'No borró el mazo')
    })

    console.log('=== 13 · Automatizaciones ===')
    await test('Automatizaciones', 'automation:create + list', async () => {
      const rule = await invoke('automation:create', { workspaceId: WS, name: 'Rutina diaria', trigger: 'daily', conditions: [], actions: [{ type: 'notification', config: { text: 'Recordatorio' } }] })
      assertTruthy(rule && rule.id > 0, 'No creó la regla')
      st.rule = rule
      const list = await invoke('automation:list', WS)
      assert(list.some(r => r.id === rule.id), 'La regla no aparece')
    })
    await test('Automatizaciones', 'automation:update + delete', async () => {
      const upd = await invoke('automation:update', st.rule.id, { name: 'Rutina actualizada', enabled: false })
      assertEq(upd.name, 'Rutina actualizada', 'No actualizó la regla')
      assertEq(await invoke('automation:delete', st.rule.id), true, 'No borró la regla')
    })

    console.log('=== 14 · Etiquetas ===')
    await test('Etiquetas', 'labels:create + list', async () => {
      const label = await invoke('labels:create', { workspaceId: WS, name: 'Importante', color: '#ef4444' })
      assertTruthy(label && label.id > 0, 'No creó la etiqueta')
      st.label = label
      const list = await invoke('labels:list', WS)
      assert(list.some(l => l.id === label.id), 'La etiqueta no aparece')
    })
    await test('Etiquetas', 'labels:addToTask + getByTask + removeFromTask', async () => {
      const task = await invoke('db:createTask', { title: 'Tarea con etiqueta', workspace_id: WS })
      await invoke('labels:addToTask', task.id, st.label.id)
      const byTask = await invoke('labels:getByTask', task.id)
      assert(byTask.some(l => l.id === st.label.id), 'La etiqueta no quedó en la tarea')
      await invoke('labels:removeFromTask', task.id, st.label.id)
      const after = await invoke('labels:getByTask', task.id)
      assert(!after.some(l => l.id === st.label.id), 'No se removió la etiqueta')
    })
    await test('Etiquetas', 'labels:delete', async () => {
      assertEq(await invoke('labels:delete', st.label.id), true, 'No borró la etiqueta')
    })

    console.log('=== 15 · Papelera ===')
    await test('Papelera', 'db:softDeleteItem + getTrashItems + restoreItem', async () => {
      const note = await invoke('db:createNote', { title: 'Nota para papelera', workspace_id: WS })
      await invoke('db:softDeleteItem', 'note', note.id)
      const trash = await invoke('db:getTrashItems')
      assert(trash.notes.some(n => n.id === note.id), 'La nota no aparece en la papelera')
      assertEq(await invoke('db:restoreItem', 'note', note.id), true, 'No restauró la nota')
      const trash2 = await invoke('db:getTrashItems')
      assert(!trash2.notes.some(n => n.id === note.id), 'La nota restaurada sigue en papelera')
    })

    console.log('=== 16 · Búsqueda / Dashboard / Actividad / Estadísticas ===')
    await test('Búsqueda', 'db:reindexSearch + db:search', async () => {
      await invoke('db:createTask', { title: 'Comprar materiales de estudio', workspace_id: WS })
      await invoke('db:reindexSearch')
      const res = await invoke('db:search', 'materiales')
      assert(Array.isArray(res), 'No devolvió resultados')
      assert(res.some(r => String(r.title || r.name || '').toLowerCase().includes('materiales')), 'No encontró la tarea "Comprar materiales"')
    })
    await test('Búsqueda', 'db:getWeeklyReport', async () => {
      const report = await invoke('db:getWeeklyReport')
      assertTruthy(report, 'No devolvió el reporte semanal')
    })
    await test('Búsqueda', 'db:getActivityFeed', async () => {
      const feed = await invoke('db:getActivityFeed')
      assert(Array.isArray(feed), 'No devolvió el feed')
    })
    await test('Actividad', 'activity:list + getByEntity', async () => {
      const list = await invoke('activity:list', 5)
      assert(Array.isArray(list), 'No devolvió actividad')
      const byEntity = await invoke('activity:getByEntity', 'task', st.task.id)
      assert(Array.isArray(byEntity), 'No devolvió actividad por entidad')
    })
    await test('Estadísticas', 'db:getStats', async () => {
      const stats = await invoke('db:getStats', 'day')
      assertTruthy(stats && typeof stats.tasksTotal === 'object' && typeof stats.tasksTotal.count === 'number', 'No devolvió estadísticas')
    })

    console.log('=== 17 · Ajustes ===')
    await test('Ajustes', 'db:setSetting + getSetting', async () => {
      await invoke('db:setSetting', 'theme', 'dark')
      const value = await invoke('db:getSetting', 'theme')
      assertEq(value, 'dark', 'No persistió el ajuste')
    })
    await test('Ajustes', 'app:getAutoStart (lectura)', async () => {
      const enabled = await invoke('app:getAutoStart')
      assert(typeof enabled === 'boolean', 'No devolvió un booleano')
    })

    console.log('=== 18 · Plantillas ===')
    await test('Plantillas', 'templates:list + create + delete', async () => {
      const list = await invoke('templates:list')
      assert(Array.isArray(list), 'No devolvió plantillas')
      const tpl = await invoke('templates:create', { type: 'study_plan', name: 'Plan de estudio genérico', description: 'Para tests', payload: '{"modules":[]}' })
      assertTruthy(tpl && tpl.id > 0, 'No creó la plantilla')
      assertEq(await invoke('templates:delete', tpl.id), true, 'No borró la plantilla')
    })
    await test('Plantillas', 'templates:instantiate (crea temas de estudio)', async () => {
      const tpl = await invoke('templates:create', {
        type: 'study_plan', name: 'Plan para instanciar', description: 'Genera temas', is_builtin: 0,
        payload: JSON.stringify({ studyTopics: [{ name: 'Tema de prueba', description: 'Instanciado', order_position: 0 }] }),
      })
      assertTruthy(tpl && tpl.id > 0, 'No creó la plantilla para instanciar')
      const result = await invoke('templates:instantiate', { templateId: tpl.id, params: { workspace_id: WS, name: 'Plan X' } })
      assertTruthy(result && Array.isArray(result.studyTopics) && result.studyTopics.length === 1, 'No instanció los temas')
      const topics = await invoke('db:getStudyTopics')
      assert(topics.some(t => t.id === result.studyTopics[0] && t.name === 'Tema de prueba'), 'El tema instanciado no aparece')
      assertEq(await invoke('templates:delete', tpl.id), true, 'No borró la plantilla usada')
    })

    console.log('=== 19 · Exámenes ===')
    await test('Exámenes', 'exams:create + list + gpa', async () => {
      const course = await invoke('courses:create', { name: 'Fisiología', workspace_id: WS })
      const exam = await invoke('exams:create', { course_id: course.id, title: 'Parcial 1', date: today(), weight: 50, study_topic_ids: '' })
      assertTruthy(exam && exam.id > 0, 'No creó el examen')
      st.exam = exam
      const list = await invoke('exams:list')
      assert(list.some(e => e.id === exam.id), 'El examen no aparece')
      const gpa = await invoke('exams:gpa')
      assert(typeof gpa === 'object', 'No devolvió el GPA')
    })
    await test('Exámenes', 'exams:update + delete', async () => {
      const upd = await invoke('exams:update', st.exam.id, { title: 'Parcial 1 - Modificado', completed: 1, grade_obtained: 8.5 })
      assertEq(upd.title, 'Parcial 1 - Modificado', 'No actualizó el examen')
      assertEq(await invoke('exams:delete', st.exam.id), true, 'No borró el examen')
    })
    await test('Exámenes', 'exam_simulations:create + list', async () => {
      const deck = await invoke('db:createFlashcardDeck', { name: 'Mazo simulacro', workspace_id: WS })
      const sim = await invoke('exam_simulations:create', { deck_id: deck.id, total_questions: 20, correct_answers: 15, wrong_answers: 5, duration_seconds: 1200 })
      assertTruthy(sim && sim.id > 0, 'No creó la simulación')
      const list = await invoke('exam_simulations:list', deck.id)
      assert(list.some(s => s.id === sim.id), 'La simulación no aparece')
    })

    console.log('=== 20 · Gamificación ===')
    await test('Gamificación', 'xp:get + add + getHistory', async () => {
      const before = await invoke('xp:get')
      assertTruthy(before && typeof before.total === 'number', 'No devolvió XP')
      const after = await invoke('xp:add', 10, 'test automatizado')
      assert(after.total > before.total, 'El XP no aumentó')
      const history = await invoke('xp:getHistory', 7)
      assert(Array.isArray(history), 'No devolvió historial')
    })
    await test('Gamificación', 'xp:getAchievements + checkAchievements', async () => {
      const ach = await invoke('xp:getAchievements')
      assert(Array.isArray(ach), 'No devolvió logros')
      const checked = await invoke('xp:checkAchievements')
      assertTruthy(checked && typeof checked.leveledUp === 'boolean', 'No devolvió el chequeo')
    })
    await test('Gamificación', 'db:getStreak + updateStreak', async () => {
      await invoke('db:updateStreak', 'daily_study')
      const streak = await invoke('db:getStreak', 'daily_study')
      assertTruthy(streak && typeof streak.current === 'number', 'No devolvió la racha')
    })
    await test('Gamificación', 'db:getChallenges + updateChallengeProgress', async () => {
      const challenges = await invoke('db:getChallenges')
      assert(Array.isArray(challenges), 'No devolvió desafíos')
      const ok = await invoke('db:updateChallengeProgress', 'pomodoro', 1)
      assertEq(ok, true, 'No actualizó el progreso')
    })

    console.log('=== 21 · Infraestructura (nuevos módulos) ===')
    await test('Infraestructura', 'profiler:getReport', async () => {
      const report = await invoke('profiler:getReport')
      assertTruthy(report, 'No devolvió el reporte del profiler')
    })
    await test('Infraestructura', 'perf:getMode + getConfig + getModes', async () => {
      const mode = await invoke('perf:getMode')
      assert(typeof mode === 'string', 'No devolvió el modo')
      const config = await invoke('perf:getConfig')
      assertTruthy(config, 'No devolvió la config')
      const modes = await invoke('perf:getModes')
      assert(Array.isArray(modes), 'No devolvió los modos')
    })
    await test('Infraestructura', 'plugins:list', async () => {
      const plugins = await invoke('plugins:list')
      assert(Array.isArray(plugins), 'No devolvió plugins')
    })
    await test('Infraestructura', 'pin:isEnabled + isLocked', async () => {
      const enabled = await invoke('pin:isEnabled')
      const locked = await invoke('pin:isLocked')
      assertEq(enabled, false, 'El PIN debería estar deshabilitado')
      assertEq(locked, false, 'No debería estar bloqueado')
    })
    await test('Infraestructura', 'encryption:encrypt + decrypt + hash + generateKey', async () => {
      const cipher = await invoke('encryption:encrypt', 'dato sensible')
      const plain = await invoke('encryption:decrypt', cipher)
      assertEq(plain, 'dato sensible', 'El ciclo encrypt/decrypt no redondea')
      const hash = await invoke('encryption:hash', 'dato sensible')
      assert(typeof hash === 'string' && hash.length > 0, 'No devolvió un hash')
      const key = await invoke('encryption:generateKey')
      assertTruthy(key, 'No generó una clave')
    })
    await test('Infraestructura', 'preload:getStats', async () => {
      const stats = await invoke('preload:getStats')
      assertTruthy(stats !== undefined, 'No devolvió estadísticas de precarga')
    })

    console.log('=== 22 · Backups (lectura) ===')
    await test('Backups', 'db:listBackups', async () => {
      const backups = await invoke('db:listBackups')
      assert(Array.isArray(backups), 'No devolvió la lista de backups')
    })
    await test('Backups', 'db:exportData', async () => {
      const data = await invoke('db:exportData')
      assertTruthy(data && Array.isArray(data.tasks), 'No exportó los datos')
      assert(data.tasks.length > 0, 'La exportación de tareas está vacía')
    })

    console.log('=== 23 · Vínculos entre entidades ===')
    await test('Vínculos', 'entity:link + entity:getLinks', async () => {
      const task = await invoke('db:createTask', { title: 'Tarea vinculada', workspace_id: WS })
      const note = await invoke('db:createNote', { title: 'Nota vinculada', workspace_id: WS })
      await invoke('entity:link', 'task', task.id, 'note', note.id)
      const links = await invoke('entity:getLinks', 'task', task.id)
      assert(links.some(l => l.from_id === task.id || l.to_id === task.id), 'No creó el vínculo')
    })
    await test('Vínculos', 'db:linkEntities + db:getEntityLinks', async () => {
      const task = await invoke('db:createTask', { title: 'Tarea B', workspace_id: WS })
      const note = await invoke('db:createNote', { title: 'Nota B', workspace_id: WS })
      await invoke('db:linkEntities', 'task', task.id, 'note', note.id)
      const links = await invoke('db:getEntityLinks', 'task', task.id)
      assert(links.length > 0, 'No creó el vínculo')
    })

    console.log('=== 24 · Importación ICS ===')
    await test('ICS', 'db:importICSEvents', async () => {
      const events = await invoke('db:importICSEvents', { events: [{ title: 'Evento de calendario', description: 'Recordatorio', startDate: today() }] })
      assertTruthy(events && events[0] && events[0].id > 0, 'No importó el evento')
      assertEq(events[0].title, 'Evento de calendario', 'Título incorrecto')
    })

    // -----------------------------------------------------------------------
    // RESUMEN
    // -----------------------------------------------------------------------
    const groups = {}
    for (const r of results) {
      if (!groups[r.group]) groups[r.group] = { total: 0, ok: 0 }
      groups[r.group].total++
      if (r.ok) groups[r.group].ok++
    }

    console.log('\n')
    console.log('┌──────────────────────────────────────────────────────────────┐')
    console.log('│            INFORME DE TESTS AUTOMATIZADOS (E2E)              │')
    console.log('├──────────────────────────────────────────────────────────────┤')
    for (const [name, g] of Object.entries(groups)) {
      const status = g.ok === g.total ? 'OK ' : 'FAIL'
      console.log(`│ ${name.padEnd(42)} ${String(g.ok).padStart(3)}/${String(g.total).padEnd(3)} ${status} │`)
    }
    console.log('├──────────────────────────────────────────────────────────────┤')
    const totalOk = results.filter(r => r.ok).length
    const total = results.length
    const pass = failures === 0
    console.log(`│ TOTAL ${' '.padEnd(45)} ${String(totalOk).padStart(3)}/${String(total).padEnd(3)} ${pass ? 'OK ' : 'FAIL'} │`)
    console.log('└──────────────────────────────────────────────────────────────┘')
    console.log(`\nCanales IPC probados: ${registeredChannels.length} registrados · ${total} comprobaciones`)
    if (!pass) {
      console.log(`\n${failures} comprobación(es) FALLARON:`)
      for (const r of results) {
        if (!r.ok) console.log(`  ✗ [${r.group}] ${r.name} → ${r.error}`)
      }
    }
    console.log(pass ? '\n=== TODAS LAS COMPROBACIONES OK ===' : '\n=== HAY COMPROBACIONES FALLIDAS ===')
  } catch (err) {
    failures++
    console.error('Error fatal en la suite:', err)
  } finally {
    try { closeDatabase() } catch {}
    app.exit(failures === 0 ? 0 : 1)
  }
})
