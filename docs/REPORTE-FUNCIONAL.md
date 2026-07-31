# Sistema Estudio y Tareas — Reporte Funcional Completo

**Versión:** 1.0.0  
**Stack:** Electron 42 + React 19 + TypeScript + Vite 8 + Tailwind CSS 3 + SQLite (better-sqlite3)  
**Estado del documento:** Completo  
**Fecha:** 2026-07-30

---

## 1. VISIÓN GENERAL

Aplicación de escritorio todo-en-uno para gestión de estudio y tareas. Combina técnicas de productividad (Pomodoro, Kanban, GTD) con gamificación (XP, logros, rachas) y refuerzo académico (flashcards con SM-2, mapas de estudio, repaso espaciado).

### Propósito principal
- Centralizar tareas, proyectos, hábitos y material de estudio en una sola app offline-first
- Motivar mediante gamificación (XP, niveles, logros, mascota virtual)
- Optimizar el aprendizaje con repaso espaciado (SM-2) y programación energética

---

## 2. ARQUITECTURA

```
┌──────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                       │
│  React SPA (Vite)                                        │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │  Components   │  │   Stores   │  │   Domain Logic   │  │
│  │  (40+ pages)  │──│  (Zustand) │──│  (src/core/)     │  │
│  └──────────────┘  └────────────┘  └──────────────────┘  │
│         │                │                  │             │
│         └────────────────┼──────────────────┘             │
│                          │                                │
│                 ┌────────┴────────┐                      │
│                 │  preload.js     │                      │
│                 │  (contextBridge)│                      │
│                 └────────┬────────┘                      │
│                          │ ipcRenderer.invoke            │
├──────────────────────────┼───────────────────────────────┤
│                    MAIN PROCESS                          │
│                          │                                │
│                 ┌────────┴────────┐                      │
│                 │  main.js        │                      │
│                 │  (bootstrap)    │                      │
│                 └────────┬────────┘                      │
│                          │                                │
│          ┌───────────────┼───────────────┐               │
│          │               │               │               │
│   ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐       │
│   │  Handlers   │ │   Database  │ │    Core     │       │
│   │  (20 mods)  │ │  (SQLite)   │ │  (15 mods)  │       │
│   └─────────────┘ └─────────────┘ └─────────────┘       │
└──────────────────────────────────────────────────────────┘
```

### Flujo de datos
1. Componente React → Store Zustand → `window.electronAPI.método()` (IPC invoke)
2. Preload.js → `ipcRenderer.invoke('channel', args)`
3. Main process handler → `getStmt()` (SQLite preparado) → resultado
4. Respuesta viaje inverso: handler → ipcMain → preload → componente React

### Patrones clave
- **Transactional Outbox**: Eventos de dominio se persisten en tabla `outbox_events` y se despachan cada 30s
- **Repository Pattern**: Interfaces en `src/core/domain/`, implementaciones en `electron/core/repositories/`
- **Safe IPC**: Todos los handlers envueltos en try/catch con `{ ok, value }` / `{ ok: false, error }`
- **Soft Delete**: 7 entidades con borrado lógico + auto-purga a los 30 días
- **LRU Cache**: Prepared statements cacheados (max 200) y cache de dominio en renderer

---

## 3. MÓDULOS Y FUNCIONALIDADES (30 TABS)

### 3.1 Inicio / Dashboard (`Ctrl+1`)
- Tarjetas de resumen: pomodoros hoy, tareas pendientes, XP total, racha actual
- Frase motivacional rotativa
- Feed de actividad reciente
- Gráficos de progreso (recharts)
- Niveles de estudio por materia

### 3.2 Pomodoro (`Ctrl+P`)
- Temporizador clásico 25/5/15 min
- Historial de sesiones por fecha
- XP por pomodoro completado (10 XP)
- Temporizador compacto en el header

### 3.3 Kanban (`Ctrl+K`)
- Tablero drag-and-drop con `@dnd-kit`
- Columnas: To Do / In Progress / Done (personalizables)
- Límites WIP por columna
- Prioridades, etiquetas, fechas de vencimiento en tarjetas

### 3.4 Tareas (`Ctrl+T`)
- Lista completa con subtareas, etiquetas, prioridades, fechas
- Arrastrar para reordenar
- Tareas recurrentes (diarias, semanales, mensuales, anuales)
- Dependencias entre tareas (grafo dirigido acíclico)
- Comentarios por tarea
- Time tracking por tarea
- 3 vistas alternativas: calendario, timeline, tabla

### 3.5 Proyectos (`Ctrl+Shift+P`)
- CRUD completo: nombre, descripción, estado, stack tecnológico, repo URL, color
- XP por creación (15 XP)

### 3.6 Daily Log / Diario (`Ctrl+D`)
- Entrada diaria con foco, blockers, plan del día siguiente
- Upsert por fecha

### 3.7 Calendario (`Ctrl+Shift+C`)
- Vista calendario mensual con tareas y eventos

### 3.8 Snippets (`Ctrl+Shift+S`)
- Gestor de fragmentos de código
- Resaltado de sintaxis por lenguaje
- Búsqueda y etiquetado

### 3.9 Hábitos (`Ctrl+H`)
- Seguimiento diario con toggle
- Heatmap mensual
- Rachas por hábito
- Estadísticas: total días, este mes, hoy

### 3.10 Logros (`Ctrl+L`)
- 16 logros predefinidos (primer pomodoro, 10 tareas, racha de 7 días, etc.)
- Desbloqueo automático al cumplir condiciones
- XP por logro

### 3.11 Desafíos (`Ctrl+Shift+D`)
- 5 desafíos semanales rotativos (15 pomodoros, 20 tareas, 500 XP, etc.)
- Progreso en tiempo real

### 3.12 Study Map / Mapa de Estudio (`Ctrl+M`)
- Árbol jerárquico de temas de estudio
- Niveles de dominio (0=no iniciado, 1=diario, 2=1er repaso, 3=2do repaso)
- Archivos adjuntos por tema (PDF, imágenes, etc.)
- Progreso diario toggle

### 3.13 Estadísticas (`Ctrl+E`)
- Dashboard analítico con gráficos (barras, áreas, tortas)
- Pomodoros, tareas, XP, hábitos
- Períodos: semana / mes / año

### 3.14 Notas (`Ctrl+N`)
- Editor rich text con Tiptap (bold, italic, listas, tablas, imágenes, links)
- Organización por carpetas
- Exportación a Markdown

### 3.15 Metas / Goals (`Ctrl+G`)
- Metas diarias/semanales con target numérico
- Progreso diario
- Barras de progreso visuales

### 3.16 Reporte Semanal (`Ctrl+Shift+R`)
- Resumen semanal de pomodoros, tareas, XP, rachas
- Exportable a PDF

### 3.17 Papelera (`Ctrl+Shift+T`)
- Elementos eliminados (tareas, notas, proyectos, kanban, hábitos, metas, snippets)
- Restaurar o eliminar permanentemente
- Auto-purga a los 30 días

### 3.18 Flashcards (`Ctrl+Shift+F`)
- Sistema SM-2 de repaso espaciado
- Mazos de tarjetas
- Estadísticas: retención, revisiones, próximas
- Rachas por materia
- Niveles de dificultad con ease factor

### 3.19 Repaso Inteligente (`Ctrl+Shift+Q`)
- Dashboard de repaso espaciado
- Tarjetas pendientes hoy
- Curva de olvido (Forgetting Curve)

### 3.20 Energy Planning (`Ctrl+Shift+B`)
- Planificación de tareas según nivel de energía
- Programación óptima del día

### 3.21 Smart Reminders (`Ctrl+Shift+N`)
- Recordatorios inteligentes para tareas
- Configuración de notificaciones

### 3.22 Social (`Ctrl+Shift+U`)
- Sección social / comunidad (en desarrollo)

### 3.23 Tienda de Logros (`Ctrl+Shift+I`)
- Canje de puntos por recompensas cosméticas

### 3.24 Rachas por Materia (`Ctrl+Shift+F`)
- Heatmap de rachas por materia
- Seguimiento visual

### 3.25 Bloqueador Web (`Ctrl+Shift+Z`)
- Configuración de sitios bloqueados durante focus mode

### 3.26 Distracciones (`Ctrl+Shift+E`)
- Estadísticas de distracciones durante sesiones de enfoque

### 3.27 Sincronización (`Ctrl+Shift+W`)
- Sincronización WiFi peer-to-peer
- Servidor HTTP + descubrimiento UDP
- Sincronización bidireccional de todas las tablas

### 3.28 Informe Semanal PDF (`Ctrl+Shift+O`)
- Generación de reporte PDF semanal con jsPDF

### 3.29 Importar Calendario (`Ctrl+Shift+A`)
- Importación de archivos ICS/calendario
- Conversión a tareas

### 3.30 Automatización (`Sin atajo`)
- Reglas If-This-Then-That
- Disparadores: tarea creada/completada, pomodoro completado, XP ganado
- Acciones: mover columna, cambiar prioridad, crear tarea, archivar proyecto, notificar

---

## 4. SISTEMA DE GAMIFICACIÓN

### XP y Niveles
- 100 XP por nivel
- Fuentes de XP: crear tarea (5), completar tarea (10), pomodoro (10), crear nota (3), crear snippet (3), crear proyecto (15), logros
- Historial transaccional en `xp_log`

### Logros (16)
| Key | Descripción | XP |
|-----|-------------|----|
| first_pomodoro | Primer pomodoro completado | 50 |
| ten_tasks | 10 tareas completadas | 100 |
| seven_day_streak | Racha de 7 días | 200 |
| twenty_pomodoros | 20 pomodoros | 150 |
| fifty_tasks | 50 tareas completadas | 300 |
| thirty_day_streak | Racha de 30 días | 500 |
| hundred_pomodoros | 100 pomodoros | 500 |
| first_achievement | Primer logro desbloqueado | 25 |
| five_achievements | 5 logros desbloqueados | 100 |
| all_achievements | Todos los logros | 1000 |
| first_note | Primera nota creada | 25 |
| first_snippet | Primer snippet guardado | 25 |
| five_projects | 5 proyectos creados | 100 |
| habit_streak_7 | Racha de 7 días en hábitos | 100 |
| habit_streak_30 | Racha de 30 días en hábitos | 300 |
| first_challenge | Primer desafío completado | 100 |

### Mascota Virtual (AvatarPet)
- Avatar animado en pantalla
- Reacciona a eventos (logros, niveles)

---

## 5. BASE DE DATOS (SQLite)

**Engine:** better-sqlite3, WAL mode, 46 tablas  
**Ubicación:** `app.getPath('userData')/sistema.db`  
**Esquema actual:** v12

### Tablas principales
| Tabla | Propósito | Registros típicos |
|-------|-----------|-------------------|
| `settings` | Configuración clave-valor | ~30 |
| `workspaces` | Espacios de trabajo | ~3 |
| `projects` | Proyectos | ~20 |
| `tasks` | Tareas (incluye subtareas via parent_task_id) | ~500 |
| `subtasks` | Subtareas checklist | ~200 |
| `task_dependencies` | Grafo de dependencias | ~50 |
| `task_comments` | Comentarios | ~100 |
| `time_entries` | Time tracking | ~200 |
| `kanban_columns` | Columnas del tablero | ~9 |
| `kanban_cards` | Tarjetas Kanban | ~100 |
| `pomodoro_sessions` | Sesiones completadas | ~300 |
| `study_topics` | Temas de estudio (árbol) | ~50 |
| `study_progress` | Progreso diario de estudio | ~500 |
| `study_files` | Archivos adjuntos | ~30 |
| `notes` | Notas rich text | ~50 |
| `note_folders` | Carpetas de notas | ~10 |
| `goals` | Metas | ~10 |
| `goal_progress` | Progreso de metas | ~300 |
| `streaks` | Contadores de racha | ~10 |
| `daily_logs` | Entradas diarias | ~100 |
| `snippets` | Fragmentos de código | ~30 |
| `habits` | Hábitos | ~10 |
| `habit_logs` | Registros diarios de hábitos | ~1000 |
| `flashcard_decks` | Mazos de flashcards | ~5 |
| `flashcards` | Tarjetas con estado SM-2 | ~100 |
| `achievements` | Definiciones de logros | 16 |
| `user_achievements` | Logros desbloqueados | ~10 |
| `xp_log` | Transacciones de XP | ~500 |
| `challenges` | Definiciones de desafíos | 5 |
| `user_challenges` | Progreso semanal | ~20 |
| `labels` | Etiquetas | ~15 |
| `task_labels` | Relación tarea-etiqueta | ~100 |
| `automation_rules` | Reglas de automatización | ~5 |
| `entity_links` | Vínculos entre entidades | ~20 |
| `outbox_events` | Eventos de dominio pendientes | ~100 |
| `activity_log` | Auditoría de actividad | ~1000 |
| `weekly_reports` | Reportes semanales agregados | ~20 |

### Índices
~50 índices en foreign keys, timestamps, patrones de consulta comunes.

---

## 6. API IPC (Preload → Main)

### 6.1 Canales structurados (namespaced)

| Namespace | Métodos | Handler |
|-----------|---------|---------|
| `settings` | get, set | settings.js |
| `workspaces` | list, getActive, setActive, create, update, delete, getEntities | workspaces.js |
| `projects` | list, create, update, delete | projects.js |
| `tasks` | list, listWithSubtasks, create, update, delete, toggle, reorder, addTag, removeTag, getByTag, dependencies.*, comments.*, timeTracking.* | tasks.js |
| `subtasks` | list, create, toggle, delete | tasks.js |
| `kanban.cards` | list, create, update, delete, move | kanban.js |
| `kanban.columns` | list, create, update, delete | kanban.js |
| `notes` | list, create, update, delete, folders.*, exportMarkdown | notes.js |
| `habits` | list, create, update, delete, logs.*, stats | habits.js |
| `goals` | list, create, update, delete, progress.* | goals.js |
| `snippets` | list, create, update, delete | snippets.js |
| `flashcards` | decks.*, cards.*, stats.*, streak.* | flashcards.js |
| `study` | topics.*, files.*, stats | study.js, studyfiles.js |
| `pomodoro` | sessions.* | pomodoro.js |
| `search` | search, reindex | search.js |
| `gamification` | xp.*, achievements.*, challenges.* | gamification.js |
| `streaks` | get, update | gamification.js |
| `dailyLogs` | list, get, create, update | dailylogs.js |
| `trash` | list, softDelete, restore, deletePermanent, empty | trash.js |
| `export` | data, import, importJSON, noteMarkdown | backup.js, notes.js |
| `backup` | list, restore | backup.js |
| `dashboard` | get, activityFeed | search.js |
| `stats` | get, weeklyReport | search.js |
| `labels` | list, create, delete, addToTask, removeFromTask, getByTask | labels.js |
| `activity` | list, getByEntity | search.js |
| `session` | save, restore, onRestored | main.js (inline) |
| `automation` | list, create, update, delete | automation.js |
| `app` | autoStart.*, shortcuts.*, updater.*, notification.* | settings.js, main.js |
| `wifiSync` | start, stop, discover, connect, pull, push | sync.js |
| `profiler` | getReport, reset | newmodules.js |
| `perf` | getMode, setMode, getConfig, getModes | newmodules.js |
| `perfMonitor` | start, stop, getReport, getLatest, collectSample | newmodules.js |
| `preload` | recordTransition, getStats, setLevel | newmodules.js |
| `pin` | set, verify, disable, isEnabled, isLocked | newmodules.js |
| `plugins` | list, get, load, unload, isActive | newmodules.js |
| `encryption` | encrypt, decrypt, hash, generateKey | newmodules.js |

### 6.2 Canales flat (legacy compat)
~80 métodos planos adicionales para compatibilidad hacia atrás.

### 6.3 Canales de evento (main → renderer)
| Canal | Emisor | Propósito |
|-------|--------|-----------|
| `tray:action` | main.js | Acciones desde bandeja del sistema |
| `updater:status` | main.js | Estado de actualización |
| `wifi-sync:device-found` | sync.js | Dispositivo WiFi descubierto |
| `session:restored` | main.js | Sesión restaurada |

---

## 7. ELECTRON MAIN PROCESS

### 7.1 Bootstrap sequence
1. `app.requestSingleInstanceLock()` — prevenir múltiples instancias
2. `initDatabase()` — SQLite + WAL + migraciones
3. `createWindow()` — BrowserWindow con CSP, bounds persistence
4. `createTray()` — Bandeja del sistema con menú
5. `registerIpcHandlers()` — Todos los handlers IPC (20 submódulos)
6. Init core modules: SmartPreload, PerformanceModes, Monitor, PIN Lock, Encryption, Plugins, Automation Engine
7. `setInterval` tasks: auto backup (1h), reminders (30s), recurring tasks (60s), keep-alive (60s), outbox dispatch (30s)
8. Global shortcuts: Ctrl+Shift+N/T/P/F
9. Auto-updater: `electron-updater` con eventos al renderer

### 7.2 Core modules (15)

| Módulo | Propósito |
|--------|-----------|
| `window-manager.js` | Creación de ventana, CSP, persistencia de bounds |
| `event-bus.js` | Publicador/suscriptor in-memory para eventos de dominio |
| `logger.js` | Logger estructurado con timestamp, runId, rotación 7 días |
| `notification-manager.js` | Notificaciones throttled con fallback |
| `session-manager.js` | Persistencia de estado de sesión |
| `outbox.js` | Patrón transactional outbox (despacho cada 30s) |
| `automation-engine.js` | Motor de reglas if-this-then-that |
| `smart-preload.js` | Precarga predictiva de datos |
| `performance-modes.js` | 3 modos: ahorro, balanceado, máximo |
| `performance-monitor.js` | Muestreo periódico de memoria/CPU |
| `startup-profiler.js` | Medición de fases de arranque |
| `pin-lock.js` | PIN con PBKDF2, bloqueo tras 5 intentos |
| `plugin-system.js` | Carga de plugins desde `userData/plugins/` |
| `encryption.js` | AES-256-GCM + DbEncryption para columnas sensibles |
| `zod-validate.js` | Middleware de validación Zod para handlers IPC |

---

## 8. ESTADO ACTUAL: CORRECCIONES APLICADAS

### Problemas resueltos recientemente

| # | Problema | Causa | Solución |
|---|----------|-------|----------|
| 1 | `ReferenceError: Cannot access 'logger' before initialization` | `logger.info()` llamado antes de `require('./core/logger')` | Mover logger.info() después de logger.init() |
| 2 | `TypeError: Cannot read properties of undefined (reading 'log')` | `const fn = logger.info` pierde el contexto `this` | Bindear métodos en constructor de Logger |
| 3 | `Attempted to register a second handler` en IPC | `registerIpcHandlers()` llamado múltiples veces | Guard `ipcHandlersRegistered` + `safeHandle()` con `removeHandler` |
| 4 | `ERR_CONNECTION_REFUSED` localhost:5173 | Usaba `loadURL` en producción | `loadFile()` en producción + Vite `base: './'` |
| 5 | Pantalla blanca al iniciar | Sin feedback visual durante carga | LoadingScreen + ErrorScreen con timeout 15s + retry |
| 6 | Render loop infinito (36+ renders) | Early return antes de useEffects impedía inicialización | Mover early returns después de todos los hooks |
| 7 | Múltiples instancias de Electron | Sin `requestSingleInstanceLock()` | Agregado single instance lock con second-instance handler |
| 8 | Promesas sin .catch() en bootstrap | Varias promesas no manejadas | try/catch en bootstrap, process.on handlers |
| 9 | `console-message` API deprecada | Usaba callback `(event, level, message, line, sourceId)` | Migrado a `event => { level, message, lineNumber, sourceId }` |
| 10 | Debug artifacts al escritorio | `require('fs').writeFileSync` a `C:\Users\...\Desktop\` | Eliminados (incompatibles con sandbox) |
| 11 | Console.log sin formato | Sin timestamp, runId, ni archivo persistente | Logger estructurado con runId, timestamps, stack traces |

### Pendientes

| # | Item | Prioridad |
|---|------|-----------|
| 1 | Activar `sandbox: true` (actualmente false) | Media |
| 2 | Validación Zod completa en todos los handlers IPC | Media |
| 3 | Eliminar API legacy flat del preload (duplicación ~250 líneas) | Baja |
| 4 | Cobertura de tests | Baja |
| 5 | TypeScript strict mode en todo el proyecto | Baja |

---

## 9. DEPENDENCIAS PRINCIPALES

### Frontend
| Paquete | Versión | Uso |
|---------|---------|-----|
| react / react-dom | ^19.1.0 | UI framework |
| framer-motion | ^12.9.0 | Animaciones |
| lucide-react | ^1.18.0 | Iconos |
| zustand | ^5.0.0 | Estado global |
| @tiptap/react + extensions | ^3.29.0 | Editor rich text |
| @dnd-kit/core + sortable | ^6.3.0 / ^10.0.0 | Drag & drop |
| recharts | ^3.8.0 | Gráficos |
| tailwindcss + tailwindcss-animate | ^3.4.0 | Estilos |
| @radix-ui/* | varios | Primitivas UI accesibles |
| zod | ^4.4.0 | Validación |
| canvas-confetti | ^1.9.0 | Efectos de celebración |

### Backend (Electron/Node.js)
| Paquete | Versión | Uso |
|---------|---------|-----|
| electron | ^42.4.0 | Desktop runtime |
| better-sqlite3 | ^12.11.0 | SQLite nativo (síncrono) |
| electron-builder | ^26.0.0 | Build/packaging |
| electron-updater | ^6.8.0 | Auto-actualizaciones |
| googleapis | ^173.0.0 | Google Calendar/Drive |
| node-notifier | ^10.0.0 | Notificaciones nativas |
| jspdf | ^4.2.0 | Generación PDF |
| html2canvas | ^1.4.0 | Captura de pantalla para PDF |

---

## 10. MÉTRICAS DEL PROYECTO

| Métrica | Valor |
|---------|-------|
| Archivos totales (src) | ~150 |
| Componentes React | ~50 |
| Stores Zustand | 7 |
| Handlers IPC | 20 |
| Módulos Core | 15 |
| Tablas SQLite | 46 |
| Canales IPC | 190+ |
| Tabs/Rutas | 30 |
| Logros | 16 |
| Desafíos semanales | 5 |
| Plugins core | ~15 |
| Repositorios | ~10 |

---

## 11. RECOMENDACIONES PARA MEJORA

### Arquitectura
1. **Unificar APIs IPC**: Eliminar la API flat legacy del preload (250 líneas duplicadas)
2. **Centralizar validación**: Mover toda validación a Zod schemas compartidos entre frontend y backend
3. **Tipado estricto**: Habilitar `strict: true` en tsconfig y resolver errores existentes

### Rendimiento
1. **Virtualización**: Extender el uso de listas virtualizadas a todos los componentes con lists largas
2. **Lazy loading**: Ya implementado con `React.lazy()`, verificar que todos los componentes pesados lo usen
3. **Optimización de re-renders**: Los 30+ renders en AppInner sugieren cascadas de actualización de estado

### Estabilidad
1. **Sandbox: true**: Probar y activar sandbox mode para seguridad adicional
2. **Tests**: Agregar tests unitarios para handlers IPC y componentes críticos
3. **Error boundaries**: Verificar que todos los tabs tengan ErrorBoundary individual

### UX
1. **Feedback offline**: Indicar visualmente cuando la app no puede conectar con el main process
2. **Progreso de carga**: Mostrar progreso granular durante la inicialización
3. **Atajos configurables**: Ya existe el store, verificar que la UI de configuración funcione

### Mantenibilidad
1. **Monorepo structure**: Separar tipos compartidos en un paquete común
2. **Documentación de API**: Generar docs automáticos de los canales IPC
3. **CHANGELOG**: Mantener registro de cambios por versión

---

*Fin del reporte. Generado el 2026-07-30.*
