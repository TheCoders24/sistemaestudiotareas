# Electron / IPC / Seguridad

## Main Process (`electron/main.js`)

### Ventana
- 1400×900, min 1000×700
- `show: false` → `ready-to-show` → `show()` (evita flash blanco)
- CSP via `session.webRequest.onHeadersReceived`
- En dev: carga `http://localhost:5173` + DevTools
- En prod: carga `dist/index.html`

### Validation System
```javascript
// Columnas permitidas por tabla (whitelist)
const ALLOWED_COLUMNS = {
  tasks: ['title', 'description', 'completed', 'priority', ...],
  // ... todas las tablas
}

// Campos requeridos por tabla
const REQUIRED_FIELDS = {
  tasks: ['title'],
  // ...
}

// Función validateInput():
// 1. Filtra solo columnas permitidas
// 2. Trunca strings a 10k caracteres
// 3. Verifica campos requeridos
```

### safeHandler Wrapper
Envuelve cada handler IPC con try/catch:
```javascript
function safeHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      console.error(`[IPC Error] ${args[0] || 'unknown'}:`, err)
      throw err
    }
  }
}
```

### buildUpdate Helper
```javascript
function buildUpdate(table, id, data) {
  const cleaned = validateInput(table, data)
  const sets = Object.keys(cleaned).map(k => `${k} = @${k}`).join(', ')
  cleaned.id = id
  return { cleaned, sets }
}
```

### Dominios IPC (~80 handlers)

| Dominio | Canales | Operaciones |
|---|---|---|
| Settings | `db:getSetting`, `db:setSetting` | Get/Set KV |
| Tasks | `db:getTasks`, `createTask`, `updateTask`, `deleteTask`, `toggleTask` | CRUD + toggle |
| Kanban | `db:getKanbanCards`, `createKanbanCard`, `updateKanbanCard`, `deleteKanbanCard`, `moveKanbanCard` | CRUD + drag&drop |
| Pomodoro | `db:getPomodoroSessions` (filtro fecha), `createPomodoroSession` | List/Create |
| Study Topics | `db:getStudyTopics`, `createStudyTopic`, `updateStudyTopic`, `deleteStudyTopic`, `toggleStudyProgress` | CRUD + progreso |
| Notes | `db:getNotes`, `createNote`, `updateNote`, `deleteNote` | CRUD |
| Goals | `db:getGoals`, `createGoal`, `updateGoal`, `deleteGoal`, `addGoalProgress` | CRUD + progreso |
| Streaks | `db:getStreak`, `updateStreak` | Rachas |
| Statistics | `db:getStats` (week/month) | Stats agregados |
| Notifications | `notification:show` | Notificación nativa |
| Projects | `db:getProjects`, `createProject`, `updateProject`, `deleteProject` | CRUD |
| Daily Logs | `db:getDailyLogs`, `getDailyLog` (por fecha), `createDailyLog`, `updateDailyLog` | CRUD |
| Snippets | `db:getSnippets`, `createSnippet`, `updateSnippet`, `deleteSnippet` | CRUD |
| Habits | `db:getHabits`, `createHabit`, `deleteHabit`, `getHabitLogs`, `toggleHabitLog` | CRUD + toggle |
| Tags | 12 canales: CRUD + relaciones M:N + filtros por tag | CRUD + M:N |
| Flashcards | 9 canales: decks + cards + SM-2 review + stats | CRUD + SM-2 |
| Subtasks | `db:getSubtasks`, `createSubtask`, `updateSubtask`, `deleteSubtask`, `toggleSubtask` | CRUD + toggle |
| Recurrence | 4 canales: get/set/delete/check | CRUD + auto-generación |
| Activity Log | `db:getActivityLog`, `db:logActivity` | Auditoría |
| Notebooks | `db:getNotebooks`, `createNotebook`, `updateNotebook`, `deleteNotebook` | CRUD |
| Templates | `db:getTemplates` (filtro entity_type), `createTemplate`, `deleteTemplate` | CRUD |
| Batch | 6 handlers (N+1 prevention) | Consultas por array de IDs |
| Backup | `dialog:saveBackup` | Save dialog nativo |
| Export/Import | `db:exportData`, `db:importData` | 28 tablas JSON |
| Auto-updater | `update:check`, `update:download`, `update:install` | GitHub releases |

### Auto-updater
- `autoDownload: false`, `autoInstallOnAppQuit: true`
- Checks on startup (excepto dev)
- Listeners: update-available, download-progress, update-downloaded, error

## Preload (`electron/preload.js`)
- `contextBridge.exposeInMainWorld('electronAPI', { ... })`
- 90 métodos + 4 listeners con cleanup
- Export/Import de datos

## Seguridad
1. **contextIsolation + nodeIntegration off** — renderer aislado
2. **CSP** vía meta tag + session.webRequest
3. **Whitelist de columnas** en cada handler — no se aceptan campos no listados
4. **Campos requeridos** validados antes de insert
5. **Truncado de strings** a 10k caracteres
6. **Sin dependencias de red** — todo es local
