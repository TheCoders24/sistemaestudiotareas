# Sistema de Backup

La app tiene **dos capas** de respaldo. Existe además código legacy sin usar.

## 1. Respaldo automático (main process) — el único que corre solo

- `setInterval(doAutoBackup, 3600000)` en `electron/main.js` ejecuta
  `doAutoBackup()` **cada hora mientras la app está abierta**.
- Guarda en `app.getPath('userData')/backups/` (Windows:
  `C:\Users\<usuario>\AppData\Roaming\<appName>\backups`) un JSON
  `backup-YYYY-MM-DD.json` con las tablas serializadas.
- Solo crea **1 respaldo por día** (revisa `settings.last_auto_backup`).
- Conserva **los últimos 30 archivos**, borrando los más viejos.

Tablas incluidas en el respaldo automático (`main.js`):
`settings, projects, tasks, kanban_cards, pomodoro_sessions, study_topics,
study_progress, study_files, notes, goals, goal_progress, streaks, daily_logs,
snippets, habits, habit_logs, tags, xp_log, achievements, user_achievements,
challenges, user_challenges, weekly_reports, subtasks, entity_links`.

> ⚠️ **Limitación conocida**: las tablas `flashcard_decks`, `flashcards`,
> `workspaces`, `note_folders`, `kanban_columns`, `task_dependencies`,
> `task_comments` y `time_entries` **no** quedan cubiertas por el respaldo
> automático (ni por `restoreBackup`/`importData`/`restoreFromJSON`, que usan
> listas propias).

## 2. Respaldo manual desde Configuración — vía IPC

UI: `src/components/Settings/Settings.tsx`.

| Acción | Preload | Canal |
|---|---|---|
| Listar backups | `backup.list()` | `db:listBackups` |
| Restaurar backup | `backup.restore(filename)` | `db:restoreBackup` |
| Exportar JSON | `export.data()` | `db:exportData` |
| Importar JSON | `export.import(data)` | `db:importData` |
| Importar JSON (variante) | `export.importJSON(data)` | `db:restoreFromJSON` |

### `db:listBackups` (`electron/handlers/backup.js`)
Devuelve `[{ date, filename, size }]` ordenados por fecha descendente.

### `db:restoreBackup`
Valida el filename (`z.string().min(1)`), lee el JSON y en una **transacción**
borra las filas de las tablas e inserta las del backup. Devuelve `true`.

### `db:exportData`
Serializa una lista de tablas a JSON (con `_exportDate`).

### `db:importData` / `db:restoreFromJSON`
Recibe el objeto/string JSON y reinserta en transacción (delete + insert).

## Implementaciones duplicadas / código muerto

| Archivo | Estado |
|---|---|
| `electron/main.js` `doAutoBackup()` | **Activo** (el que ejecuta `setInterval`). |
| `electron/handlers/backup.js` `doAutoBackup` | Exportado pero **sin llamador** (duplicado). |
| `electron/services/BackupService.js` (clase) | **Sin llamadores** — lógica duplicada. |
| `src/lib/useAutoBackup.ts` (hook renderer) | **Sin llamadores**. Intenta `backup.saveDialog`, que **no existe** en el preload → protegido con `?.`/`typeof`. |

## Recomendación

Consolidar en una única implementación (`BackupService`) y hacer que el respaldo
automático y la restauración usen **la misma lista de tablas** (las 34 de
`database.js`), de modo que tablas nuevas (flashcards, workspaces, time_entries,
etc.) queden cubiertas.
