# Arquitectura General

## Diagrama de Flujo

```
[Renderer Process]                    [Main Process]
─────────────────────                 ───────────────
React App                              Node.js + Electron
  │                                      │
  ├── Componentes React                  ├── BrowserWindow
  │     │                                │     └── Carga dist/index.html
  │     ├── safeIpc()──►ipcRenderer──►   ├── ipcMain.handle()
  │     │                                │     └── safeHandler wrapper
  │     └── Zustand stores               │
  │                                      ├── database.js
  │                                      │     ├── better-sqlite3
  │                                      │     ├── WAL mode + FK ON
  │                                      │     └── Migraciones automáticas
  │                                      │
  │                                      ├── autoUpdater
  │                                      │     └── electron-updater (GitHub)
  │                                      │
  │                                      └── CSP via session.webRequest
  └────── preload.js ──────────────────►      (contextBridge)
```

## Capas

### 1. Main Process (`electron/main.js`)
- Crea la ventana con `contextIsolation: true`, `nodeIntegration: false`
- Content-Security-Policy vía `session.webRequest.onHeadersReceived`
- Registra ~80 IPC handlers agrupados por dominio
- Wrapper `safeHandler()` para captura de errores
- Auto-updater con `electron-updater` (GitHub releases)
- Export/Import de todas las tablas como JSON

### 2. Preload (`electron/preload.js`)
- `contextBridge.exposeInMainWorld('electronAPI', { ... })`
- Expone ~90 métodos + 4 event listeners de auto-updater
- Cada listener retorna función cleanup

### 3. Database (`electron/database.js`)
- Singleton `better-sqlite3` con WAL mode + foreign keys
- 28 tablas con índices + 33 migraciones automáticas
- Ubicación: `app.getPath('userData')/sistema.db`

### 4. Renderer (React + Vite)
- Single-page app con tabs en vez de router
- Lazy loading de cada tab page con `React.lazy()` + `Suspense`
- Optimización: `React.memo` en componentes siempre montados
- safeIpc wrapper con retry (3 intentos) + cache (5s TTL)

## Seguridad
- `contextIsolation: true` — el renderer no accede a Node
- `nodeIntegration: false`
- Content-Security-Policy restrictiva
- `validateInput()` en cada handler IPC (columnas permitidas + campos requeridos)
- Truncado de strings a 10k caracteres en validación
