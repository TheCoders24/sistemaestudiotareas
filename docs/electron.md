# Electron / IPC / Seguridad

## Main Process (`electron/main.js`)

### Ventana
- 1400×900, min 1000×700
- `show: false` → `ready-to-show` → `show()` (evita flash blanco)
- CSP via `session.webRequest.onHeadersReceived`
- En dev: carga `http://localhost:5173` + DevTools
- En prod: carga `dist/index.html`
- `dev.bat` orquesta dev: levanta Vite → `wait-on http://localhost:5173` → `electron . --dev` → limpia procesos.

### Contrato IPC: `safeHandle`

Todo canal se registra con el mismo contrato (definido en `electron/core/safe-handle.js`):

```javascript
safeHandle(ipcMain, canal, schemaZod, handlerFn)
```

- `schemaZod` es un **schema tupla** (`z.object({ 0, 1, ... })`) o `voidSchema()` (sin args).
- El valor se devuelve **crudo** (sin wrapper `{ok, value}`).
- **Parse dual**: `args[0]` se valida como `{0: arg0}` (1 arg) o `{0,1,2}` (N args).
- Los schemas hacen `.transform()` a un objeto plano para el handler
  (p. ej. `tasks.create` recibe `{title, ...}` en vez de `[task]`).
- Errores de validación se re-lanzan como `Error("Validación falló en <canal>: ...")`.
- El registro es idempotente: registrar el mismo canal dos veces no duplica handlers.

### Schemas (`electron/core/schemas/index.js`)

| Dominio | Operaciones |
|---|---|
| `settings` | get, set |
| `workspaces` | list, getActive, setActive, create, update, delete, getEntities |
| `tasks` | list, listWithSubtasks, create, update, delete, toggle, reorder, addTag, removeTag, getByTag, dependencies (get/getDependents/add/remove), comments (list/add/delete), timeTracking (list/start/stop/delete/total) |
| `subtasks` | list, create, toggle, delete |
| `kanban` | cards (list/create/update/delete/move), columns (list/create/update/delete) |
| `notes` | list, create, update, delete, folders (list/create/update/delete), exportMarkdown |
| `habits` | list, create, update, delete, logs (list/listAll/toggle), stats |
| `goals` | list, create, update, delete, progress (add/get) |
| `snippets` | list, create, update, delete |
| `projects` | list, create, update, delete |
| `pomodoro` | sessions (list/create) |
| `dailyLogs` | list, get, create, update |
| `flashcards` | decks (list/create/delete), cards (list/create/delete/getDue/review), stats (deck/retention/reviews/upcoming), streak (update/subjects) |
| `study` | topics (list/create/update/delete/move/toggleProgress/setLevel), files (pickAndUpload/list/delete/open), stats |
| `search` | search, reindex |
| `gamification` | xp (get/add/history), achievements (list/check), challenges (list/updateProgress) |
| `streaks` | get, update |
| `trash` | list, softDelete, restore, deletePermanent, empty |
| `labels` | list, create, delete, addToTask, removeFromTask, getByTask |
| `backup` | listBackups, restoreBackup, importData, exportData, restoreFromJSON |
| `courses`, `templates`, `exams`, `examSimulations`, `ai`, `automation` | CRUD + operaciones específicas |

Nota: `workspace_id` en `tasks.create` y `study.topics.create` es **opcional**
(columna DB nullable); las listas sin workspace devuelven todo el registro.

## Handlers (`electron/handlers/`) — 27 módulos

`ai`, `automation`, `backup`, `courses`, `dailylogs`, `exams`, `flashcards`,
`gamification`, `goals`, `habits`, `kanban`, `labels`, `newmodules`, `notes`,
`pomodoro`, `projects`, `search`, `settings`, `snippets`, `snippets-execute`,
`study`, `studyfiles`, `sync`, `tasks`, `templates`, `trash`, `workspaces`.

Cada módulo exporta `register(ipcMain, deps)` donde `deps` incluye
`{ getStmt, getDb, safeHandle, schemas, voidSchema, z, app, ... }`.

## Preload (`electron/preload.js`)
- `contextBridge.exposeInMainWorld('electronAPI', { ... })`.
- ~200 métodos anidados + listeners de eventos con cleanup.
- **Envuelve argumentos** cuando el handler espera objeto plano:
  `notification.show(title, body, severity)` → `{ title, body, severity }`,
  `templates.instantiate(id, params)` → `{ templateId, params }`,
  `flashcards.cards.review(id, ease)` → `{ id, ease }`,
  `ai.tutor(...)` → `{ topicId, message, history }`,
  `wifiSync.connect(ip)` → `{ ip }`, `app.shortcuts.register` → `{ accelerator, action }`.
- **Pasa args separados** para handlers tupla: `settings.get(key)`, `settings.set(key, value)`, `search(query)`.

## Auto-backup (ver `docs/backup.md`)

## Seguridad
1. **contextIsolation + nodeIntegration off + sandbox** — renderer aislado.
2. **CSP** vía session.webRequest.
3. **Validación Zod** en cada canal — nada llega a la DB sin validar.
4. **Whitelist de columnas** en cada INSERT/UPDATE.
5. **Truncado de strings** a 10k caracteres.
6. **Sin dependencias de red** — todo es local (opcionalmente WiFi sync local).
