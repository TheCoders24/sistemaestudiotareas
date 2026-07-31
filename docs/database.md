# Base de Datos

SQLite con WAL mode, foreign keys ON, usando `better-sqlite3`.
Ubicación: `app.getPath('userData')/sistema.db`.

## Tablas (34)

| Tabla | Propósito |
|---|---|
| `settings` | Configuración clave-valor (incluye `last_auto_backup`) |
| `workspaces` | Workspaces (multi-espacio) |
| `kanban_columns` | Columnas del tablero Kanban |
| `courses` | Cursos (académico) |
| `templates` | Plantillas reutilizables |
| `exams` | Exámenes |
| `exam_simulations` | Simulaciones de exámenes |
| `projects` | Proyectos de software |
| `tasks` | Tareas |
| `subtasks` | Subtareas checklist |
| `task_dependencies` | Dependencias entre tareas |
| `task_comments` | Comentarios de tareas |
| `time_entries` | Registro de tiempo por tarea |
| `entity_links` | Vínculos entre entidades |
| `kanban_cards` | Tarjetas Kanban |
| `pomodoro_sessions` | Sesiones de temporizador |
| `study_topics` | Árbol de temas de estudio |
| `study_progress` | Progreso diario por tema |
| `note_folders` | Carpetas jerárquicas de notas |
| `notes` | Notas de texto |
| `goals` | Metas (daily/weekly) |
| `goal_progress` | Progreso diario de metas |
| `streaks` | Rachas consecutivas |
| `daily_logs` | Diario personal |
| `snippets` | Fragmentos de código |
| `habits` | Hábitos definidos |
| `habit_logs` | Registro diario de hábitos |
| `tags` | Etiquetas |
| `achievements` | Logros |
| `user_achievements` | Logros desbloqueados por el usuario |
| `xp_log` | Registro de XP |
| `challenges` | Retos |
| `user_challenges` | Progreso del usuario en retos |
| `weekly_reports` | Reportes semanales |
| `study_files` | Archivos adjuntos de estudio |
| `flashcard_decks` | Mazos de flashcards |
| `flashcards` | Tarjetas con SM-2 |
| `outbox_events` | Cola de eventos para sync |
| `snapshots` | Snapshots de sincronización |
| `activity_log` | Auditoría de acciones |
| `daily_task_stats` | Estadísticas diarias de tareas |
| `project_stats` | Estadísticas por proyecto |
| `labels` | Etiquetas (v2) |
| `task_labels` | Etiquetas ↔ Tareas (M:N) |
| `attachments` | Adjuntos |
| `automation_rules` | Reglas de automatización |

## Migraciones Automáticas

Se ejecutan al iniciar la app en `electron/database.js`: cada una usa
`CREATE TABLE IF NOT EXISTS` + migraciones `ALTER TABLE ADD COLUMN`/tablas
nuevas protegidas con try/catch para esquemas legacy.

## Export/Import

Todas las tablas se pueden exportar/importar como JSON (ver `docs/backup.md`).
Usa `INSERT` con columnas explícitas y placeholders `@campo`.
