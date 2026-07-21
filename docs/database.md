# Base de Datos

SQLite con WAL mode, foreign keys ON, usando `better-sqlite3`.

## Esquema General

### Tablas Principales (28)

| Tabla | Propósito | FK | Índices |
|---|---|---|---|
| `settings` | Configuración clave-valor | — | — |
| `projects` | Proyectos de software | — | — |
| `tasks` | Tareas | projects(id) | completed, project_id |
| `kanban_cards` | Tarjetas Kanban | projects(id) | column_type, position |
| `pomodoro_sessions` | Sesiones de temporizador | tasks(id), projects(id) | started_at, task_id |
| `study_topics` | Árbol de temas de estudio | parent_id(self) | — |
| `study_progress` | Progreso diario por tema | study_topics(id) | topic_id, date |
| `notes` | Notas de texto | projects(id), notebooks(id) | project_id |
| `goals` | Metas (daily/weekly) | — | — |
| `goal_progress` | Progreso diario de metas | goals(id) | — |
| `streaks` | Rachas consecutivas | — | — |
| `daily_logs` | Diario personal | — | — |
| `snippets` | Fragmentos de código | projects(id) | project_id |
| `habits` | Hábitos definidos | — | — |
| `habit_logs` | Registro diario de hábitos | habits(id) | habit_id, date |
| `tags` | Etiquetas | — | — |
| `task_tags` | Tags ↔ Tareas (M:N) | tasks(id), tags(id) | task_id |
| `note_tags` | Tags ↔ Notas (M:N) | notes(id), tags(id) | note_id |
| `snippet_tags` | Tags ↔ Snippets (M:N) | snippets(id), tags(id) | snippet_id |
| `flashcard_decks` | Mazos de flashcards | — | — |
| `flashcards` | Tarjetas con SM-2 | flashcard_decks(id) | deck_id, next_review |
| `flashcard_reviews` | Historial de repasos | flashcards(id) | — |
| `subtasks` | Subtareas checklist | tasks(id) | task_id |
| `task_recurrence` | Reglas de recurrencia | tasks(id) | — |
| `activity_log` | Auditoría de acciones | — | created_at, entity_type+id |
| `notebooks` | Cuadernos jerárquicos | parent_id(self) | parent_id |
| `templates` | Plantillas reutilizables | — | — |

### Índices (19 total)

```sql
idx_tasks_completed, idx_tasks_project_id,
idx_kanban_column_type, idx_kanban_position,
idx_pomodoro_started, idx_pomodoro_task,
idx_study_progress_topic, idx_study_progress_date,
idx_habit_logs_habit, idx_habit_logs_date,
idx_notes_project, idx_snippets_project,
idx_task_tags_task, idx_note_tags_note, idx_snippet_tags_snippet,
idx_flashcards_deck, idx_flashcards_review,
idx_subtasks_task,
idx_activity_created, idx_activity_entity,
idx_notebooks_parent
```

### 5 Batch Handlers (N+1 Prevention)

6 handlers que aceptan arrays de IDs y ejecutan una sola consulta:

| Handler | Consulta |
|---|---|
| `getAllTaskTags` | Tags con task_id IN (?) |
| `getAllNoteTags` | Tags con note_id IN (?) |
| `getAllSnippetTags` | Tags con snippet_id IN (?) |
| `getAllSubtasks` | Subtasks con task_id IN (?) |
| `getAllTaskRecurrences` | Recurrencias con task_id IN (?) |
| `getAllHabitLogs` | Logs con habit_id IN (?) + opcional date |

### Migraciones Automáticas

33 migraciones `ALTER TABLE ADD COLUMN` + 1 rename column para esquemas legacy.  
Se ejecutan al iniciar la app si la columna no existe (try/catch).

### Export/Import

28 tablas exportadas/importadas como JSON.  
Usa `INSERT OR REPLACE` para evitar duplicados en importación.
