# Arquitectura General

## Diagrama de Flujo

```
[Renderer Process]                    [Main Process]
─────────────────────                 ───────────────
React App                              Node.js + Electron
  │                                      │
  ├── Componentes React                  ├── BrowserWindow (contextIsolation)
  │     │                                │     └── Carga dist/index.html o Vite dev
  │     ├── window.electronAPI──►ipcRenderer.invoke()──►  ├── ipcMain.handle()
  │     │        (preload)               │                │     └── safeHandle (validación Zod)
  │     └── Zustand stores               │                └── handlers/ (27 módulos)
  │                                      │
  │                                      ├── database.js
  │                                      │     ├── better-sqlite3
  │                                      │     ├── WAL mode + FK ON
  │                                      │     └── Migraciones automáticas
  │                                      │
  │                                      ├── core/
  │                                      │     ├── safe-handle.js   (contrato IPC)
  │                                      │     ├── schemas/index.js (canales Zod)
  │                                      │     ├── logger.js, event-bus.js, result.js
  │                                      │     ├── encryption.js, pin-lock.js
  │                                      │     ├── performance-*.js, startup-profiler.js
  │                                      │     ├── session-manager.js, window-manager.js
  │                                      │     ├── notification-manager.js, outbox.js
  │                                      │     └── plugin-system.js, automation-engine.js
  │                                      │
  │                                      └── Auto-backup (setInterval 1h)
  └────── preload.js ──────────────────►      (contextBridge.exposeInMainWorld)
```

## Capas

### 1. Main Process (`electron/main.js`)
- Crea la ventana con `contextIsolation: true`, `nodeIntegration: false`, `sandbox`.
- Content-Security-Policy vía `session.webRequest.onHeadersReceived`.
- **Registro de 27 módulos de handlers** (ver `docs/electron.md`) → +100 canales IPC.
- `safeHandle(ipcMain, canal, schemaZod, handler)` como contrato único de IPC.
- Auto-backup horario con `setInterval(doAutoBackup, 3600000)` (1 backup/día, retención 30).
- Auto-updater con `electron-updater` (GitHub releases).
- Startup profiler y performance modes para optimizar el arranque.

### 2. Preload (`electron/preload.js`)
- `contextBridge.exposeInMainWorld('electronAPI', { ... })`.
- API **anidada por dominio**: `settings`, `tasks`, `subtasks`, `kanban`, `notes`,
  `habits`, `goals`, `snippets`, `flashcards`, `study`, `pomodoro`, `search`,
  `gamification`, `streaks`, `dailyLogs`, `trash`, `export`, `backup`, `events`,
  `app`, `wifiSync`, `utils`, `dashboard`, `stats`, `labels`, `activity`,
  `session`, `automation`, `courses`, `templates`, `exams`, `examSimulations`,
  `ai`, `profiler`, `perf`, `perfMonitor`, `preload`, `pin`, `plugins`, `encryption`.
- Cada listener de eventos devuelve una función cleanup.

### 3. Core IPC (`electron/core/safe-handle.js` + `schemas/`)
- `schemas/index.js` define **cada canal** como un schema Zod (tupla `{0,1,...}`) que
  valida los argumentos y los transforma a un objeto plano para el handler.
- `safeHandle` aplica **parse dual** (con y sin transform) y re-lanza los errores
  como `Error("Validación falló en <canal>: ...")`.

### 4. Database (`electron/database.js`)
- Singleton `better-sqlite3` con WAL mode + foreign keys.
- **34 tablas** (ver `docs/database.md`).
- Ubicación: `app.getPath('userData')/sistema.db`.

### 5. Renderer (React + Vite)
- Single-page app con tabs en vez de router.
- Lazy loading de cada tab page con `React.lazy()` + `Suspense`.
- Llamadas IPC a través de `window.electronAPI` (tipado en `src/types/index.ts`).

## Seguridad
- `contextIsolation: true` — el renderer no accede a Node.
- `nodeIntegration: false`, `sandbox` activado.
- Content-Security-Policy restrictiva.
- **Validación Zod por canal** — todo argumento IPC se valida antes de tocar la DB.
- Whitelist de columnas en cada INSERT/UPDATE de los handlers.
- Truncado de strings a 10k caracteres en validación.
