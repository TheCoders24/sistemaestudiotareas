/**
 * ============================================================================
 *  verify-study-course.js — Verificación end-to-end del fix de course_id
 * ============================================================================
 *
 *  Ejecuta los handlers IPC REALES (electron/handlers/study.js y courses.js)
 *  sobre la base de datos real (electrón, userData temporal) para comprobar:
 *
 *    1. Crear una materia (courses:create).
 *    2. Crear un tema enviando course_id + claves extra (como hace StudyMap)
 *       → el course_id DEBE persistir y NO debe lanzar
 *       "Too many parameter values were provided".
 *    3. Reasignar la materia con db:updateStudyTopic (safeUpdate permite course_id).
 *    4. Listar temas y verificar los course_id.
 *
 *  Cómo ejecutarlo (requiere el binario de Electron):
 *    npx electron scripts/verify-study-course.js
 *
 *  Código de salida: 0 = todo OK, 1 = falló alguna comprobación.
 * ============================================================================
 */

const { app } = require('electron')
const path = require('path')
const fs = require('fs')

app.setPath('userData', path.join(app.getPath('temp'), 'sistema-verify-study-course'))
const { initDatabase, deferDbInit, closeDatabase } = require('../electron/database')
const { getStmt, wsFilter, wsParams, safeUpdate } = require('../electron/utils')
const { safeHandle, voidSchema, z } = require('../electron/core/safe-handle')
const schemas = require('../electron/core/schemas')
const studyHandler = require('../electron/handlers/study')
const coursesHandler = require('../electron/handlers/courses')

const handlers = {}
const fakeIpcMain = {
  handle: (channel, fn) => { handlers[channel] = fn },
  removeHandler: (channel) => { delete handlers[channel] },
}

let failures = 0
function check(label, ok) {
  console.log(ok ? '  ✓ ' + label : '  ✗ ' + label)
  if (!ok) failures++
}

function invoke(channel, ...args) {
  return handlers[channel]({}, ...args)
}

app.whenReady().then(async () => {
  try {
    const dbDir = path.join(app.getPath('userData'))
    fs.mkdirSync(dbDir, { recursive: true })
    initDatabase()
    deferDbInit()

    const deps = { getStmt, wsFilter, wsParams, safeUpdate, safeHandle, schemas, voidSchema, z }
    studyHandler.register(fakeIpcMain, deps)
    coursesHandler.register(fakeIpcMain, deps)

    console.log('=== Verificación end-to-end: course_id en StudyMap ===\n')

    // 1. Crear una materia
    const course = await invoke('courses:create', {
      name: 'Anatomía I',
      color: '#f43f5e',
      icon: 'book',
      term: '2026-1',
      workspace_id: 1,
    })
    check('courses:create devuelve la materia con id', course && course.id > 0)

    // 2. Crear tema con course_id + claves extra (igual que StudyMap.handleCreate)
    let created
    try {
      created = await invoke('db:createStudyTopic', {
        name: 'Sistema respiratorio',
        description: 'Pulmones',
        parent_id: null,
        course_id: course.id,
        order_position: 0,
        resource_url: '',
      })
      check('db:createStudyTopic no lanza "too many parameters"', true)
    } catch (err) {
      check('db:createStudyTopic no lanza "too many parameters"', false)
      console.error('     → ' + err.message)
    }
    check('el tema creado persiste course_id = ' + course.id, created && created.course_id === course.id)

    // 3. Tema sin materia → course_id null
    const free = await invoke('db:createStudyTopic', { name: 'Apuntes generales', order_position: 1 })
    check('tema sin materia tiene course_id = null', free && free.course_id === null)

    // 4. Reasignar materia vía update
    const updated = await invoke('db:updateStudyTopic', free.id, { course_id: course.id })
    check('db:updateStudyTopic permite reasignar course_id', updated && updated.course_id === course.id)

    // 5. Listar y agrupar
    const topics = await invoke('db:getStudyTopics', undefined)
    const withCourse = topics.filter(t => t.course_id === course.id)
    check('listar temas → 2 pertenecen a la materia', withCourse.length === 2)

    console.log('\n=== ' + (failures === 0 ? 'TODAS LAS COMPROBACIONES OK' : failures + ' COMPROBACIÓN(ES) FALLARON') + ' ===')
  } catch (err) {
    failures++
    console.error('Error fatal en la verificación:', err)
  } finally {
    try { closeDatabase() } catch {}
    app.exit(failures === 0 ? 0 : 1)
  }
})
