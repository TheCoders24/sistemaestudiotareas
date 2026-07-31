Estimado **TheCoders**,

La recopilación que ha presentado es **excelente** y constituye una base muy sólida para una aplicación de productividad de escritorio de nivel profesional. No se trata solo de una lista de funcionalidades: ya se aprecia una visión clara de **modularidad, rendimiento, offline-first, event-driven architecture, persistencia local, seguridad y escalabilidad**.

Como profesor y especialista en arquitectura de software, mi deber ahora es convertir esa especificación en una **solución arquitectónica correcta, ejecutable y profesional**, evitando errores comunes y priorizando lo que realmente debe construirse primero.

A continuación, le presento una propuesta completa de arquitectura, roadmap, buenas prácticas, riesgos y primer esqueleto técnico recomendado.

---

# 1. Valoración general de la especificación

Su documento cubre correctamente varias dimensiones críticas:

## 1.1. Producto

Define módulos claros:

* Workspaces
* Proyectos
* Kanban
* Tareas
* Calendario
* Notas
* Archivos
* Dashboard
* Estadísticas
* Productividad
* Organización
* Búsqueda
* Automatizaciones
* Seguridad
* Exportación
* Electron
* Optimización

Esto es muy bueno porque permite construir la aplicación como un sistema modular.

## 1.2. Arquitectura

La idea de usar:

* Event Bus
* Servicios
* Managers
* LRU Cache
* Lazy Loading
* Fast Boot
* Virtualización
* SQLite optimizado

es totalmente acertada.

## 1.3. Rendimiento

Ha identificado correctamente los problemas típicos de aplicaciones Electron:

* arranque lento,
* exceso de inicialización,
* listas enormes,
* memoria no liberada,
* consultas ineficientes,
* renderizado innecesario.

Por tanto, la arquitectura debe estar diseñada desde el inicio para ser:

* rápida,
* progresiva,
* offline,
* modular,
* observable,
* testeable,
* escalable.

---

# 2. Decisión arquitectónica principal

## 2.1. Stack recomendado

Para esta aplicación, mi recomendación profesional es:

```text
Electron
React
TypeScript
Vite
Zustand
Tailwind CSS
better-sqlite3
Zod
Vitest
Playwright
```

### ¿Por qué?

| Tecnología | Razón |
|---|---|
| Electron | Acceso completo a sistema de archivos, bandeja, notificaciones, atajos globales, multiplataforma. |
| React | Ecosistema maduro, componentización, lazy loading, Suspense, virtualización. |
| TypeScript | Seguridad de tipos, mantenibilidad, refactorización segura. |
| Vite | Desarrollo rápido y build eficiente. |
| Zustand | Estado de UI simple, selectivo y sin boilerplate excesivo. |
| Tailwind CSS | UI consistente, temas personalizables, productividad visual. |
| better-sqlite3 | SQLite síncrono, rápido, ideal para escritorio si se usa correctamente. |
| Zod | Validación estricta de IPC, formularios, persistencia y eventos. |
| Vitest | Pruebas unitarias y de integración rápidas. |
| Playwright | Pruebas end-to-end para Electron. |

---

# 3. Arquitectura recomendada

La arquitectura correcta para este sistema es una combinación de:

* **Clean Architecture**
* **Domain-Driven Design simplificado**
* **Event-Driven Architecture**
* **CQRS ligero**
* **Modular Feature Architecture**

No recomiendo una arquitectura monolítica por vistas. Debe organizar el sistema por **dominios funcionales**.

---

## 3.1. Diagrama general

```text
┌────────────────────────────────────────────────────────────┐
│                         Electron Main                       │
│                                                            │
│  WindowManager                                             │
│  TrayManager                                               │
│  ShortcutManager                                           │
│  NotificationManager                                       │
│  BackupManager                                             │
│  DatabaseService                                           │
│  FileStorageService                                        │
│  IPC Router                                                │
│  Domain Event Dispatcher                                   │
└──────────────────────────┬─────────────────────────────────┘
                           │ IPC seguro
                           │ Zod validation
┌──────────────────────────▼─────────────────────────────────┐
│                      Electron Preload                       │
│                                                            │
│  contextBridge.exposeInMainWorld("api", ...)               │
└──────────────────────────┬─────────────────────────────────┘
                           │ window.api
┌──────────────────────────▼─────────────────────────────────┐
│                      React Renderer                         │
│                                                            │
│  App Shell                                                 │
│  Router                                                    │
│  Command Palette                                           │
│  Dashboard                                                 │
│  Kanban                                                    │
│  Calendar                                                  │
│  Notes                                                     │
│  Settings                                                  │
│  Statistics                                                │
│  Search                                                    │
│                                                            │
│  UI Stores                                                 │
│  Feature Hooks                                             │
│  Query / Cache Layer                                       │
│  Event Subscription Layer                                  │
└────────────────────────────────────────────────────────────┘
```

---

# 4. Separación de responsabilidades

## 4.1. Electron Main Process

Debe ser la fuente de verdad para operaciones sensibles:

* abrir base de datos,
* ejecutar migraciones,
* escribir en SQLite,
* gestionar archivos,
* backups,
* exportación,
* notificaciones nativas,
* bandeja del sistema,
* atajos globales,
* ventanas,
* seguridad.

El renderer **nunca** debe acceder directamente a SQLite ni al sistema de archivos.

### Regla de oro

```text
El renderer pide.
El main valida.
El main ejecuta.
El main responde.
El main emite eventos.
```

---

## 4.2. Preload

Debe exponer una API mínima, segura y tipada.

Ejemplo conceptual:

```ts
contextBridge.exposeInMainWorld("api", {
  workspaces: {
    list: () => ipcRenderer.invoke("workspaces:list"),
    create: (input: unknown) => ipcRenderer.invoke("workspaces:create", input),
  },
  tasks: {
    create: (input: unknown) => ipcRenderer.invoke("tasks:create", input),
    complete: (taskId: string) => ipcRenderer.invoke("tasks:complete", taskId),
  },
  events: {
    subscribe: (channel: string, callback: (...args: unknown[]) => void) => {
      const subscription = (_event: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
  },
});
```

---

## 4.3. React Renderer

Debe encargarse de:

* interfaz,
* estado visual,
* drag & drop,
* formularios,
* optimismo controlado,
* renderizado,
* suscripción a eventos del dominio,
* lazy loading de módulos.

No debe contener lógica de negocio crítica directamente en componentes.

---

# 5. Arquitectura interna del dominio

Recomiendo estructurar el núcleo así:

```text
core/
  domain/
    workspace/
    project/
    task/
    kanban/
    calendar/
    note/
    file/
    automation/
    statistics/
    settings/
  application/
    use-cases/
    dto/
    validators/
  infrastructure/
    sqlite/
    cache/
    files/
    export/
    backup/
    events/
  shared/
    result/
    errors/
    utils/
```

---

# 6. Capas recomendadas

## 6.1. Domain

Contiene entidades y reglas de negocio puras.

Ejemplos:

* `Task`
* `Project`
* `Workspace`
* `KanbanColumn`
* `Note`
* `CalendarEvent`
* `AutomationRule`

No debe depender de React, Electron ni SQLite.

---

## 6.2. Application

Contiene casos de uso:

* `CreateTaskUseCase`
* `CompleteTaskUseCase`
* `MoveKanbanCardUseCase`
* `CreateWorkspaceUseCase`
* `ArchiveProjectUseCase`
* `RestoreSessionUseCase`
* `RunAutomationUseCase`

Los casos de uso coordinan:

1. validación,
2. recuperación de entidades,
3. aplicación de reglas,
4. persistencia,
5. emisión de eventos.

---

## 6.3. Infrastructure

Implementa detalles técnicos:

* repositorios SQLite,
* sistema de archivos,
* exportadores JSON/PDF/CSV,
* backups,
* caché LRU,
* bus de eventos,
* notificaciones.

---

## 6.4. UI

Cada módulo debe ser un feature independiente:

```text
features/
  workspaces/
  projects/
  kanban/
  calendar/
  notes/
  dashboard/
  statistics/
  search/
  settings/
  command-palette/
```

---

# 7. Patrón recomendado: Event-Driven + Use Cases

Su idea de arquitectura basada en eventos es correcta. La implementación profesional sería:

```text
Usuario ejecuta acción
        ↓
UI dispatch
        ↓
IPC seguro
        ↓
Use Case
        ↓
Repository
        ↓
SQLite transaction
        ↓
Domain Event publicado
        ↓
Módulos reaccionan:
  - Dashboard
  - Statistics
  - Kanban
  - History
  - Notifications
  - Automations
```

---

# 8. Eventos del dominio

Su lista de eventos es muy buena. Yo la formalizaría con un envelope estándar.

## 8.1. Estructura recomendada de evento

```ts
export type DomainEvent<
  TType extends string = string,
  TPayload = unknown
> = {
  id: string;
  type: TType;
  occurredAt: string;
  workspaceId?: string;
  aggregateId?: string;
  payload: TPayload;
  metadata?: Record<string, unknown>;
};
```

---

## 8.2. Ejemplos tipados

```ts
export type TaskCompletedPayload = {
  taskId: string;
  projectId: string | null;
  workspaceId: string;
  completedAt: string;
};

export type TaskCompletedEvent = DomainEvent<
  "task.completed",
  TaskCompletedPayload
>;

export type ProjectArchivedPayload = {
  projectId: string;
  workspaceId: string;
  archivedAt: string;
};

export type ProjectArchivedEvent = DomainEvent<
  "project.archived",
  ProjectArchivedPayload
>;
```

---

# 9. Event Bus tipado

A continuación, le muestro una implementación sencilla pero profesional.

```ts
export type EventEnvelope<
  TType extends string,
  TPayload
> = {
  id: string;
  type: TType;
  occurredAt: string;
  workspaceId?: string;
  aggregateId?: string;
  payload: TPayload;
};

export type AppEventMap = {
  "workspace.created": EventEnvelope<
    "workspace.created",
    { workspaceId: string; name: string }
  >;

  "workspace.opened": EventEnvelope<
    "workspace.opened",
    { workspaceId: string }
  >;

  "project.created": EventEnvelope<
    "project.created",
    { projectId: string; workspaceId: string }
  >;

  "project.archived": EventEnvelope<
    "project.archived",
    { projectId: string; workspaceId: string; archivedAt: string }
  >;

  "task.created": EventEnvelope<
    "task.created",
    { taskId: string; projectId: string | null; workspaceId: string }
  >;

  "task.completed": EventEnvelope<
    "task.completed",
    {
      taskId: string;
      projectId: string | null;
      workspaceId: string;
      completedAt: string;
    }
  >;

  "task.updated": EventEnvelope<
    "task.updated",
    { taskId: string; workspaceId: string }
  >;

  "task.deleted": EventEnvelope<
    "task.deleted",
    { taskId: string; workspaceId: string }
  >;

  "kanban.card.moved": EventEnvelope<
    "kanban.card.moved",
    {
      taskId: string;
      fromColumnId: string;
      toColumnId: string;
      position: number;
    }
  >;

  "note.created": EventEnvelope<
    "note.created",
    { noteId: string; workspaceId: string }
  >;

  "settings.updated": EventEnvelope<
    "settings.updated",
    { changedKeys: string[] }
  >;
};

type EventHandler<TEvent> = (event: TEvent) => void | Promise<void>;

export interface IEventBus<TMap extends Record<string, EventEnvelope<string, unknown>>> {
  publish<K extends keyof TMap>(event: TMap[K]): Promise<void>;
  subscribe<K extends keyof TMap>(
    type: K,
    handler: EventHandler<TMap[K]>
  ): () => void;
}

export class InMemoryEventBus<
  TMap extends Record<string, EventEnvelope<string, unknown>>
> implements IEventBus<TMap>
{
  private readonly handlers = new Map<
    keyof TMap,
    Set<EventHandler<EventEnvelope<string, unknown>>>
  >();

  async publish<K extends keyof TMap>(event: TMap[K]): Promise<void> {
    const type = event.type as K;
    const subscribers = this.handlers.get(type);

    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const promises = Array.from(subscribers).map(async handler => {
      try {
        await handler(event);
      } catch (error) {
        // En producción, enviar a LoggerService.
        console.error(`Error handling event ${String(type)}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  subscribe<K extends keyof TMap>(
    type: K,
    handler: EventHandler<TMap[K]>
  ): () => void {
    const set =
      this.handlers.get(type) ??
      new Set<EventHandler<EventEnvelope<string, unknown>>>();

    set.add(handler as EventHandler<EventEnvelope<string, unknown>>);
    this.handlers.set(type, set);

    return () => {
      const current = this.handlers.get(type);
      if (!current) return;

      current.delete(handler as EventHandler<EventEnvelope<string, unknown>>);

      if (current.size === 0) {
        this.handlers.delete(type);
      }
    };
  }
}
```

---

# 10. Result pattern para errores de dominio

No use excepciones para errores de negocio esperados. Use `Result`.

```ts
export type Result<TValue, TError extends Error = Error> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function fail<TError extends Error>(
  error: TError
): Result<never, TError> {
  return { ok: false, error };
}
```

Ejemplos de errores de dominio:

```ts
export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = "TaskNotFoundError";
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor(workspaceId: string) {
    super(`Workspace not found: ${workspaceId}`);
    this.name = "WorkspaceNotFoundError";
  }
}

export class InvalidTaskTitleError extends Error {
  constructor() {
    super("Task title must be between 1 and 500 characters");
    this.name = "InvalidTaskTitleError";
  }
}
```

---

# 11. Entidades principales

## 11.1. Workspace

```ts
export type WorkspaceId = string;

export type WorkspaceTheme = "light" | "dark" | "system";

export interface Workspace {
  id: WorkspaceId;
  name: string;
  color: string | null;
  icon: string | null;
  theme: WorkspaceTheme;
  isFavorite: boolean;
  archivedAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

---

## 11.2. Project

```ts
export type ProjectId = string;

export type ProjectStatus =
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export interface Project {
  id: ProjectId;
  workspaceId: WorkspaceId;
  parentId: ProjectId | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  color: string | null;
  icon: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 11.3. Task

```ts
export type TaskId = string;

export type TaskPriority =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "urgent";

export interface Task {
  id: TaskId;
  workspaceId: WorkspaceId;
  projectId: ProjectId | null;
  parentTaskId: TaskId | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  completedAt: string | null;
  dueAt: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  position: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

# 12. Caso de uso: completar tarea

Este es un ejemplo profesional de caso de uso.

```ts
import { ok, fail, type Result } from "../shared/result";
import { TaskNotFoundError } from "../shared/errors";
import type { Task, TaskId } from "../domain/task";
import type { ITaskRepository } from "../domain/task-repository";
import type { IEventBus, AppEventMap } from "../infrastructure/events";

export class CompleteTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus<AppEventMap>
  ) {}

  async execute(
    taskId: TaskId
  ): Promise<Result<Task, TaskNotFoundError>> {
    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      return fail(new TaskNotFoundError(taskId));
    }

    if (task.completedAt !== null) {
      return ok(task);
    }

    const now = new Date().toISOString();

    const updatedTask: Task = {
      ...task,
      completedAt: now,
      updatedAt: now,
    };

    await this.taskRepository.save(updatedTask);

    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: "task.completed",
      occurredAt: now,
      workspaceId: updatedTask.workspaceId,
      aggregateId: updatedTask.id,
      payload: {
        taskId: updatedTask.id,
        projectId: updatedTask.projectId,
        workspaceId: updatedTask.workspaceId,
        completedAt: now,
      },
    });

    return ok(updatedTask);
  }
}
```

---

# 13. Repositorio de tareas

Interfaz abstracta:

```ts
import type { Task, TaskId } from "../domain/task";

export interface ITaskRepository {
  findById(id: TaskId): Promise<Task | null>;
  save(task: Task): Promise<void>;
  delete(id: TaskId): Promise<void>;
  findByProjectId(projectId: string): Promise<Task[]>;
  findByWorkspaceId(workspaceId: string): Promise<Task[]>;
}
```

Implementación SQLite conceptual:

```ts
import type Database from "better-sqlite3";
import type { ITaskRepository } from "../../domain/task-repository";
import type { Task, TaskId } from "../../domain/task";

export class SqliteTaskRepository implements ITaskRepository {
  constructor(private readonly db: Database.Database) {}

  async findById(id: TaskId): Promise<Task | null> {
    const row = this.db
      .prepare(
        `
        SELECT
          id,
          workspace_id AS workspaceId,
          project_id AS projectId,
          parent_task_id AS parentTaskId,
          title,
          description,
          priority,
          completed_at AS completedAt,
          due_at AS dueAt,
          estimated_minutes AS estimatedMinutes,
          actual_minutes AS actualMinutes,
          position,
          archived_at AS archivedAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM tasks
        WHERE id = ?
        `
      )
      .get(id) as Task | undefined;

    return row ?? null;
  }

  async save(task: Task): Promise<void> {
    this.db
      .prepare(
        `
        INSERT INTO tasks (
          id,
          workspace_id,
          project_id,
          parent_task_id,
          title,
          description,
          priority,
          completed_at,
          due_at,
          estimated_minutes,
          actual_minutes,
          position,
          archived_at,
          created_at,
          updated_at
        )
        VALUES (
          @id,
          @workspaceId,
          @projectId,
          @parentTaskId,
          @title,
          @description,
          @priority,
          @completedAt,
          @dueAt,
          @estimatedMinutes,
          @actualMinutes,
          @position,
          @archivedAt,
          @createdAt,
          @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          project_id = excluded.project_id,
          parent_task_id = excluded.parent_task_id,
          title = excluded.title,
          description = excluded.description,
          priority = excluded.priority,
          completed_at = excluded.completed_at,
          due_at = excluded.due_at,
          estimated_minutes = excluded.estimated_minutes,
          actual_minutes = excluded.actual_minutes,
          position = excluded.position,
          archived_at = excluded.archived_at,
          updated_at = excluded.updated_at
        `
      )
      .run(task);
  }

  async delete(id: TaskId): Promise<void> {
    this.db
      .prepare(
        `
        DELETE FROM tasks
        WHERE id = ?
        `
      )
      .run(id);
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    return this.db
      .prepare(
        `
        SELECT
          id,
          workspace_id AS workspaceId,
          project_id AS projectId,
          parent_task_id AS parentTaskId,
          title,
          description,
          priority,
          completed_at AS completedAt,
          due_at AS dueAt,
          estimated_minutes AS estimatedMinutes,
          actual_minutes AS actualMinutes,
          position,
          archived_at AS archivedAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM tasks
        WHERE project_id = ?
        ORDER BY position ASC
        `
      )
      .all(projectId) as Task[];
  }

  async findByWorkspaceId(workspaceId: string): Promise<Task[]> {
    return this.db
      .prepare(
        `
        SELECT
          id,
          workspace_id AS workspaceId,
          project_id AS projectId,
          parent_task_id AS parentTaskId,
          title,
          description,
          priority,
          completed_at AS completedAt,
          due_at AS dueAt,
          estimated_minutes AS estimatedMinutes,
          actual_minutes AS actualMinutes,
          position,
          archived_at AS archivedAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM tasks
        WHERE workspace_id = ?
        ORDER BY position ASC
        `
      )
      .all(workspaceId) as Task[];
  }
}
```

---

# 14. Base de datos SQLite recomendada

## 14.1. Inicialización correcta

```ts
import Database from "better-sqlite3";

export function openDatabase(filePath: string): Database.Database {
  const db = new Database(filePath);

  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("temp_store = MEMORY");
  db.pragma("cache_size = -20000"); // Aprox. 20 MB

  return db;
}
```

---

## 14.2. Esquema mínimo inicial

```sql
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  theme TEXT NOT NULL DEFAULT 'system',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  color TEXT,
  icon TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  completed_at TEXT,
  due_at TEXT,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  position REAL NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS task_labels (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS kanban_columns (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  position REAL NOT NULL DEFAULT 0,
  wip_limit INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_project
ON tasks(workspace_id, project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_parent
ON tasks(parent_task_id);

CREATE INDEX IF NOT EXISTS idx_tasks_due_pending
ON tasks(due_at)
WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_archived
ON tasks(archived_at);

CREATE INDEX IF NOT EXISTS idx_projects_workspace
ON projects(workspace_id);

CREATE INDEX IF NOT EXISTS idx_projects_parent
ON projects(parent_id);

CREATE INDEX IF NOT EXISTS idx_activity_entity
ON activity_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_outbox_unpublished
ON outbox_events(published_at)
WHERE published_at IS NULL;
```

---

# 15. Patrón Outbox para eventos fiables

En una aplicación local también conviene garantizar que los eventos no se pierdan si la aplicación se cierra inesperadamente.

## 15.1. Flujo recomendado

```text
1. Comienza transacción SQLite.
2. Se guarda la entidad.
3. Se inserta el evento en outbox_events.
4. Se hace commit.
5. Un dispatcher publica los eventos pendientes.
6. Marca published_at.
```

Esto evita inconsistencias como:

```text
La tarea se guardó, pero el evento nunca se emitió.
```

o:

```text
El evento se emitió, pero la transacción falló.
```

---

# 16. IPC seguro con Zod

Toda comunicación entre renderer y main debe validarse.

Ejemplo:

```ts
import { z } from "zod";
import { ipcMain } from "electron";

export const CreateTaskInputSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable().optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export function registerTaskIpcHandlers(
  createTaskUseCase: (input: CreateTaskInput) => Promise<unknown>
) {
  ipcMain.handle("tasks:create", async (_event, rawInput: unknown) => {
    const parsed = CreateTaskInputSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          name: "ValidationError",
          message: "Invalid input for task creation",
          issues: parsed.error.issues,
        },
      };
    }

    try {
      const result = await createTaskUseCase(parsed.data);
      return { ok: true, value: result };
    } catch (error) {
      return {
        ok: false,
        error: {
          name: "InternalServerError",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  });
}
```

---

# 17. Seguridad en Electron

La configuración de seguridad debe ser estricta.

```ts
import { BrowserWindow } from "electron";
import path from "node:path";

export function createMainWindow(preloadPath: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  return win;
}
```

Además:

* No cargar URLs remotas.
* Usar Content Security Policy.
* No exponer `ipcRenderer` completo.
* Validar todos los inputs.
* Sanear nombres de archivo.
* No ejecutar código dinámico.
* No usar `remote`.
* Limitar permisos de ventanas.
* Revisar `will-navigate`.
* Revisar `setWindowOpenHandler`.

Ejemplo de CSP básica:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'"
/>
```

---

# 18. Gestión de estado en React

Recomiendo separar tres tipos de estado:

## 18.1. Estado de UI

Ejemplos:

* sidebar abierto,
* tema,
* panel activo,
* modal visible,
* filtros visuales,
* command palette abierta.

Use Zustand.

```ts
import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

export const useUiStore = create<UiState>(set => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  toggleSidebar: () =>
    set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
}));
```

---

## 18.2. Estado de dominio cacheado

Ejemplos:

* workspace actual,
* proyectos recientes,
* tareas del proyecto activo,
* columnas Kanban,
* notas abiertas.

Este estado debe sincronizarse con eventos del main process.

---

## 18.3. Estado persistente

Ejemplos:

* configuración,
* último workspace,
* último proyecto,
* scroll,
* paneles,
* filtros guardados.

Esto debe guardarse en SQLite o en un fichero JSON seguro, no solo en localStorage.

---

# 19. Lazy Loading y Fast Boot

Su idea de Fast Boot es correcta. La secuencia recomendada sería:

```text
1. Electron arranca.
2. Mostrar ventana o splash mínimo.
3. Cargar configuración crítica.
4. Cargar tema.
5. Restaurar último workspace.
6. Renderizar shell básico.
7. Cargar Dashboard ligero.
8. Inicializar módulos pesados bajo demanda.
```

---

## 19.1. Lazy loading de módulos

```tsx
import { lazy, Suspense } from "react";

const KanbanModule = lazy(() => import("./features/kanban/KanbanModule"));
const CalendarModule = lazy(() => import("./features/calendar/CalendarModule"));
const NotesModule = lazy(() => import("./features/notes/NotesModule"));
const StatisticsModule = lazy(
  () => import("./features/statistics/StatisticsModule")
);

export function ModuleRouter({ module }: { module: string }) {
  if (module === "kanban") {
    return (
      <Suspense fallback={<div>Cargando Kanban...</div>}>
        <KanbanModule />
      </Suspense>
    );
  }

  if (module === "calendar") {
    return (
      <Suspense fallback={<div>Cargando Calendario...</div>}>
        <CalendarModule />
      </Suspense>
    );
  }

  if (module === "notes") {
    return (
      <Suspense fallback={<div>Cargando Notas...</div>}>
        <NotesModule />
      </Suspense>
    );
  }

  if (module === "statistics") {
    return (
      <Suspense fallback={<div>Cargando Estadísticas...</div>}>
        <StatisticsModule />
      </Suspense>
    );
  }

  return null;
}
```

---

# 20. LRU Cache

Su idea de LRU Cache es correcta. Debe usarse solo para memoria, nunca como reemplazo de SQLite.

Implementación simple:

```ts
export class LruCache<TKey, TValue> {
  private readonly cache = new Map<TKey, TValue>();

  constructor(private readonly maxSize: number) {
    if (maxSize <= 0) {
      throw new Error("LRU cache size must be greater than zero");
    }
  }

  get(key: TKey): TValue | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const value = this.cache.get(key) as TValue;

    // Reinsertar para marcar como recientemente usado.
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  set(key: TKey, value: TValue): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;

      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
  }

  has(key: TKey): boolean {
    return this.cache.has(key);
  }

  delete(key: TKey): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
```

Ejemplo de uso:

```ts
const taskCache = new LruCache<string, Task[]>(50);

taskCache.set("project:123:tasks", tasks);
const cachedTasks = taskCache.get("project:123:tasks");
```

---

# 21. Virtualización de listas

Para miles de tareas o notas, no renderice todo.

Use:

* `@tanstack/react-virtual`
* `react-window`

Recomendación:

```text
@tanstack/react-virtual
```

Es flexible y moderno.

Concepto:

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

interface TaskListProps {
  tasks: Array<{ id: string; title: string }>;
}

export function VirtualTaskList({ tasks }: TaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      style={{
        height: 600,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => {
          const task = tasks[virtualRow.index];

          return (
            <div
              key={task.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {task.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

# 22. Optimización en React

Debe usar correctamente:

* `React.memo`
* `useMemo`
* `useCallback`
* selectores finos en Zustand
* claves estables en listas
* componentes pequeños
* evitar objetos nuevos inline cuando provoquen rerenders

Ejemplo:

```tsx
import { memo, useCallback, useMemo } from "react";

interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  onToggle: (id: string) => void;
}

export const TaskItem = memo(function TaskItem({
  id,
  title,
  completed,
  onToggle,
}: TaskItemProps) {
  const handleToggle = useCallback(() => {
    onToggle(id);
  }, [id, onToggle]);

  return (
    <button onClick={handleToggle}>
      {completed ? "✅" : "⬜"} {title}
    </button>
  );
});
```

---

# 23. Drag & Drop para Kanban

No recomiendo `react-beautiful-dnd` porque está prácticamente descontinuado.

Recomiendo:

```text
@dnd-kit/core
@dnd-kit/sortable
```

Ventajas:

* accesible,
* mantenido,
* flexible,
* soporta múltiples contenedores,
* permite estrategias personalizadas.

---

# 24. Notas: Markdown vs Rich Text

Tiene dos opciones principales.

## 24.1. Opción A: Markdown puro

Ventajas:

* simple,
* portable,
* fácil de versionar,
* fácil de buscar,
* exportable.

Desventajas:

* menos flexible para colaboración o bloques avanzados.

---

## 24.2. Opción B: Rich Text con TipTap

Ventajas:

* editor potente,
* bloques,
* tablas,
* imágenes,
* código,
* enlaces internos,
* extensibilidad.

Desventajas:

* más complejo,
* requiere serialización cuidadosa.

Mi recomendación:

```text
TipTap como editor
Markdown como formato de exportación
JSON como formato interno opcional
```

---

# 25. Búsqueda global

Para búsqueda instantánea local, use SQLite FTS5.

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  entity_type,
  entity_id UNINDEXED,
  workspace_id UNINDEXED,
  title,
  body,
  tags
);
```

Cuando se crea una tarea:

```sql
INSERT INTO search_index (
  entity_type,
  entity_id,
  workspace_id,
  title,
  body,
  tags
)
VALUES (
  'task',
  ?,
  ?,
  ?,
  ?,
  ?
);
```

Cuando se actualiza:

```sql
DELETE FROM search_index
WHERE entity_type = 'task'
  AND entity_id = ?;

INSERT INTO search_index (...)
VALUES (...);
```

Búsqueda:

```sql
SELECT
  entity_type,
  entity_id,
  title,
  snippet(search_index, 3, '<mark>', '</mark>', '...', 10) AS snippet
FROM search_index
WHERE search_index MATCH ?
ORDER BY rank
LIMIT 50;
```

---

# 26. Automatizaciones sin IA

Su enfoque es correcto. Debe implementar un motor de reglas simple.

## 26.1. Modelo de regla

```ts
export type AutomationTrigger =
  | "task.completed"
  | "task.due"
  | "task.created"
  | "project.completed"
  | "date.reached";

export type AutomationCondition =
  | { type: "task.priority.is"; value: string }
  | { type: "task.project.is"; value: string }
  | { type: "task.label.has"; value: string }
  | { type: "workspace.is"; value: string };

export type AutomationAction =
  | { type: "task.move.column"; value: string }
  | { type: "task.set.priority"; value: string }
  | { type: "task.set.color"; value: string }
  | { type: "task.create"; value: { title: string } }
  | { type: "project.archive" }
  | { type: "notification.show"; value: string };

export interface AutomationRule {
  id: string;
  workspaceId: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 26.2. Flujo

```text
Evento del dominio
      ↓
AutomationService escucha
      ↓
Busca reglas activas para ese trigger
      ↓
Evalúa condiciones
      ↓
Ejecuta acciones
      ↓
Registra actividad
```

Ejemplo:

```text
Trigger: task.completed
Condition: task.project.is = "Inbox"
Action: task.move.column = "Done"
```

---

# 27. Undo / Redo

Para Undo/Redo ilimitado, no guarde simplemente “el estado completo” todo el tiempo. Use comandos reversibles.

## 27.1. Patrón recomendado

```ts
export interface ICommand {
  execute(): Promise<void>;
  undo(): Promise<void>;
}
```

Ejemplo conceptual:

```ts
export class CompleteTaskCommand implements ICommand {
  private previousCompletedAt: string | null = null;

  constructor(
    private readonly taskId: string,
    private readonly taskRepository: ITaskRepository
  ) {}

  async execute(): Promise<void> {
    const task = await this.taskRepository.findById(this.taskId);

    if (!task) return;

    this.previousCompletedAt = task.completedAt;

    await this.taskRepository.save({
      ...task,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async undo(): Promise<void> {
    const task = await this.taskRepository.findById(this.taskId);

    if (!task) return;

    await this.taskRepository.save({
      ...task,
      completedAt: this.previousCompletedAt,
      updatedAt: new Date().toISOString(),
    });
  }
}
```

Para operaciones complejas, use:

* snapshots,
* transacciones,
* histórico de cambios,
* comandos compuestos.

---

# 28. Snapshots y versionado

Los snapshots deben guardarse como JSON estructurado.

Ejemplo:

```sql
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_snapshots_entity
ON snapshots(entity_type, entity_id);
```

Recomendación:

```text
Crear snapshot antes de:
  - borrados masivos,
  - restauraciones,
  - importaciones,
  - cambios estructurales,
  - actualizaciones de esquema,
  - automatizaciones destructivas.
```

---

# 29. Backups

Debe implementar backups automáticos y manuales.

## 29.1. Estrategia recomendada

```text
Backup completo SQLite
Backup de archivos adjuntos
Backup de configuración
Manifest JSON con versión y checksum
```

Estructura:

```text
backup-2026-07-30T12-00-00/
  manifest.json
  database.sqlite
  files/
    attachments/
    images/
    notes/
```

Manifest:

```json
{
  "appVersion": "0.1.0",
  "createdAt": "2026-07-30T12:00:00.000Z",
  "schemaVersion": 12,
  "checksum": "sha256:..."
}
```

---

# 30. Exportación

## 30.1. JSON

Debe ser el formato principal para import/export.

Ejemplo:

```json
{
  "version": 1,
  "exportedAt": "2026-07-30T12:00:00.000Z",
  "workspace": {
    "id": "w_123",
    "name": "Personal",
    "projects": [],
    "tasks": [],
    "notes": []
  }
}
```

## 30.2. CSV

Útil para tareas y estadísticas.

## 30.3. PDF

Útil para reportes.

Recomendación:

```text
JSON para interoperabilidad y restauración.
CSV para análisis.
PDF para presentación humana.
```

---

# 31. Estadísticas

No calcule estadísticas pesadas en vivo constantemente.

Use una estrategia mixta:

## 31.1. Cálculo bajo demanda

Para vistas pequeñas:

* tareas hoy,
* pendientes,
* vencidas.

## 31.2. Materialización

Para métricas más grandes:

* horas trabajadas,
* productividad mensual,
* ranking de proyectos,
* calendario tipo GitHub.

Tablas recomendadas:

```sql
CREATE TABLE IF NOT EXISTS daily_task_stats (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  worked_minutes INTEGER NOT NULL DEFAULT 0,
  UNIQUE(workspace_id, date)
);

CREATE TABLE IF NOT EXISTS project_stats (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

Los eventos actualizan estas tablas.

---

# 32. Arquitectura por fases

Dado el enorme alcance, debe construir por fases. Si intenta hacer todo desde el inicio, el proyecto puede volverse inmanejable.

---

## Fase 0: Fundación

Objetivo:

```text
Tener una base técnica sólida.
```

Incluye:

* Electron + React + TypeScript.
* Estructura modular.
* ESLint + Prettier.
* Vitest.
* IPC seguro.
* SQLite inicial.
* Migraciones.
* Logger.
* Manejo de errores.
* Configuración de seguridad.
* Ventana principal.
* Fast boot básico.

---

## Fase 1: MVP

Objetivo:

```text
Aplicación usable y productiva.
```

Incluye:

* Workspaces básicos.
* Proyectos básicos.
* Tareas.
* Kanban simple.
* Dashboard simple.
* Búsqueda simple.
* Configuración.
* Tema claro/oscuro.
* Persistencia local.
* Backup manual.
* Exportación JSON.

Este MVP debe ser muy robusto.

---

## Fase 2: Productividad avanzada

Objetivo:

```text
Mejorar organización y uso diario.
```

Incluye:

* Etiquetas.
* Filtros.
* Vistas guardadas.
* Favoritos.
* Recientes.
* Subtareas.
* Dependencias.
* Comentarios.
* Historial.
* Papelera.
* Restauración.
* Atajos.
* Command Palette.

---

## Fase 3: Calendario y notas

Objetivo:

```text
Convertir la app en un centro de trabajo completo.
```

Incluye:

* Calendario día/semana/mes.
* Eventos.
* Recordatorios.
* Notas Markdown/Rich Text.
* Imágenes.
* Código.
* Tablas.
* Enlaces internos.
* Archivos adjuntos.

---

## Fase 4: Estadísticas y automatización

Objetivo:

```text
Sistema inteligente sin IA.
```

Incluye:

* Estadísticas.
* Productividad.
* Pomodoro.
* Cronómetro.
* Rachas.
* Metas.
* Automatizaciones.
* Activity log.
* Reportes.

---

## Fase 5: Avanzado

Objetivo:

```text
Diferenciación del producto.
```

Incluye:

* Gantt.
* Timeline.
* Whiteboard.
* Wiki.
* Split View.
* Multi-ventana.
* Plugins.
* Snapshots automáticos.
* Performance Monitor.
* Startup Profiler.
* Modos de rendimiento.

---

# 33. MVP recomendado en detalle

Si yo fuera el arquitecto responsable, definiría este MVP cerrado:

## 33.1. Workspaces

* Crear.
* Editar.
* Eliminar.
* Archivar.
* Cambiar color.
* Cambiar icono.
* Seleccionar workspace activo.
* Restaurar último workspace.

## 33.2. Projects

* Crear.
* Editar.
* Archivar.
* Eliminar.
* Anidación simple.
* Estado.
* Prioridad.

## 33.3. Tasks

* Crear.
* Editar.
* Completar.
* Eliminar.
* Archivar.
* Prioridad.
* Fecha límite.
* Subtareas simples.
* Etiquetas básicas.

## 33.4. Kanban

* Columnas por proyecto.
* Tarjetas.
* Drag & Drop.
* Orden manual.
* WIP limit básico.
* Vista compacta/expandida.

## 33.5. Dashboard

* Tareas pendientes.
* Tareas hoy.
* Tareas vencidas.
* Proyectos recientes.
* Actividad reciente.

## 33.6. Settings

* Tema.
* Idioma.
* Backup manual.
* Exportación JSON.
* Restaurar último workspace.

## 33.7. Infraestructura

* SQLite.
* Event Bus.
* IPC seguro.
* Logger.
* Migraciones.
* Tests básicos.

---

# 34. Estructura de carpetas recomendada

Para una aplicación profesional, recomiendo un monorepo.

```text
productivity-app/
  apps/
    desktop/
      src/
        main/
        preload/
        renderer/
      electron-builder.yml
      package.json
      vite.config.ts
  packages/
    core-domain/
      src/
        workspace/
        project/
        task/
        kanban/
        note/
        calendar/
        shared/
    core-application/
      src/
        use-cases/
        dto/
        validators/
    infra-sqlite/
      src/
        migrations/
        repositories/
        database.ts
    infra-events/
      src/
        event-bus.ts
        outbox.ts
    infra-files/
      src/
        storage.ts
        thumbnails.ts
    ui-kit/
      src/
        buttons/
        modals/
        inputs/
        layout/
    feature-kanban/
      src/
    feature-dashboard/
      src/
    feature-calendar/
      src/
    feature-notes/
      src/
    feature-settings/
      src/
```

Si al inicio no desea monorepo, puede usar una estructura interna simple:

```text
src/
  main/
  preload/
  renderer/
    app/
    features/
    shared/
  core/
    domain/
    application/
    infrastructure/
```

Pero para este alcance, el monorepo es recomendable.

---

# 35. Principios de diseño que debe respetar

## 35.1. Single Responsibility

Cada servicio debe hacer una sola cosa.

Ejemplo:

```text
TaskService no debe exportar PDF.
ExportManager no debe modificar tareas.
DatabaseService no debe conocer React.
```

---

## 35.2. Dependency Inversion

Los casos de uso dependen de interfaces, no de implementaciones.

```ts
class CompleteTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus<AppEventMap>
  ) {}
}
```

---

## 35.3. Open/Closed

Los módulos deben poder extenderse sin modificarse.

Ejemplo:

```text
Una nueva automatización no debería modificar TaskService.
Solo registra un nuevo handler de eventos.
```

---

## 35.4. Separation of Concerns

```text
UI no contiene reglas de negocio críticas.
Dominio no conoce Electron.
Infraestructura no conoce React.
```

---

# 36. Errores comunes que debe evitar

## 36.1. Cargar todo al inicio

Error:

```text
Inicializar Calendario, Notas, Estadísticas, Gantt, Whiteboard y Plugins en el arranque.
```

Solución:

```text
Fast Boot + Lazy Initialization.
```

---

## 36.2. Que los componentes llamen directamente a SQLite

Error grave.

Solución:

```text
UI → IPC → Use Case → Repository → SQLite.
```

---

## 36.3. Emitir eventos antes de persistir

Error:

```text
La UI actualiza, pero la base de datos falla.
```

Solución:

```text
Persistir primero, luego publicar.
```

Mejor aún:

```text
Persistir entidad + outbox event en la misma transacción.
```

---

## 36.4. No validar IPC

Error:

```text
El renderer puede enviar cualquier objeto.
```

Solución:

```text
Zod en main process.
```

---

## 36.5. Usar SQLite sin índices

Error:

```text
Consultas lentas cuando crecen los datos.
```

Solución:

```text
Índices por workspace, project, due_at, archived_at, entity_id.
```

---

## 36.6. No liberar listeners

Error:

```text
Cada componente se suscribe a eventos y no se desuscribe.
```

Solución:

```text
useEffect con cleanup.
```

Ejemplo:

```tsx
useEffect(() => {
  const unsubscribe = window.api.events.subscribe(
    "task.completed",
    handleTaskCompleted
  );

  return () => {
    unsubscribe();
  };
}, []);
```

---

## 36.7. Guardar demasiada caché

Error:

```text
Cachearlo todo en memoria.
```

Solución:

```text
LRU con límite.
SQLite como fuente persistente.
```

---

# 37. Estrategia de pruebas

## 37.1. Pruebas unitarias

Para:

* entidades,
* casos de uso,
* validaciones,
* LRU cache,
* motor de automatizaciones,
* utilidades.

Ejemplo:

```ts
import { describe, it, expect } from "vitest";
import { LruCache } from "./lru-cache";

describe("LruCache", () => {
  it("debe eliminar el elemento menos recientemente usado", () => {
    const cache = new LruCache<string, number>(2);

    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);

    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });
});
```

---

## 37.2. Pruebas de integración

Para:

* repositorios SQLite,
* migraciones,
* IPC,
* backup,
* exportación.

Use bases de datos temporales.

---

## 37.3. Pruebas end-to-end

Para:

* arranque,
* creación de workspace,
* creación de tarea,
* drag & drop,
* exportación,
* restauración de sesión.

Use Playwright.

---

# 38. Observabilidad interna

Usted mencionó muy bien:

* Startup Profiler
* Performance Monitor

Esto es excelente para una app de escritorio profesional.

## 38.1. Startup Profiler

Mida:

```text
app-start
main-ready
window-created
db-opened
migrations-completed
settings-loaded
workspace-restored
shell-rendered
kanban-ready
```

Use `performance.mark` y `performance.measure`.

---

## 38.2. Performance Monitor

Muestre internamente:

* memoria JS,
* número de listeners,
* tamaño de caché,
* consultas lentas,
* eventos publicados por segundo,
* tiempo de render,
* IPC latency.

Esto debe estar desactivado por defecto en producción.

---

# 39. Modos de rendimiento

Su idea es muy buena.

## 39.1. Ahorro

* Sin precarga.
* Menos animaciones.
* Caché pequeña.
* Virtualización agresiva.
* Menos efectos.

## 39.2. Balanceado

* Precarga moderada.
* Caché media.
* Animaciones normales.

## 39.3. Máximo rendimiento

* Precarga inteligente.
* Caché mayor.
* Animaciones completas.
* Workers para tareas pesadas.

---

# 40. Precarga inteligente

Ejemplo:

```text
Usuario abre un proyecto.
      ↓
Se precargan:
  - subtareas,
  - etiquetas,
  - columnas Kanban,
  - próximos eventos,
  - notas recientes.
```

Pero debe hacerse:

* después del render,
* con prioridad baja,
* cancelable,
* sin bloquear UI.

---

# 41. Restauración de sesión

Debe guardar algo como:

```json
{
  "activeWorkspaceId": "w_123",
  "activeProjectId": "p_456",
  "activeModule": "kanban",
  "panels": {
    "sidebar": true,
    "inspector": false
  },
  "kanban": {
    "scrollX": 0,
    "scrollY": 240,
    "filters": {
      "label": ["urgent"],
      "showCompleted": false
    }
  },
  "tabs": [
    {
      "type": "project",
      "id": "p_456"
    },
    {
      "type": "note",
      "id": "n_789"
    }
  ]
}
```

Guárdelo con debounce:

```text
No guardar en cada tecla.
Guardar tras inactividad o cambios importantes.
```

---

# 42. Command Palette

Recomiendo implementarla desde la Fase 2.

Librerías recomendadas:

```text
cmdk
```

o

```text
kbar
```

Mi recomendación:

```text
cmdk
```

Es simple, accesible y muy usada.

Comandos posibles:

```text
Crear tarea
Crear proyecto
Cambiar workspace
Ir a Dashboard
Ir a Kanban
Buscar tarea
Archivar proyecto
Exportar JSON
Activar tema oscuro
Abrir configuración
```

---

# 43. Notificaciones

Debe separar:

* notificaciones nativas,
* notificaciones internas de la app.

Ejemplo:

```ts
export interface INotificationService {
  notify(input: {
    title: string;
    body?: string;
    severity?: "info" | "success" | "warning" | "error";
    actionLabel?: string;
    onAction?: () => void;
  }): void;
}
```

En Electron main use `Notification`.

En renderer use toasts internos.

---

# 44. Archivos adjuntos

Recomendación:

```text
No guardar binarios grandes dentro de SQLite.
```

Guarde:

* archivo en disco,
* metadata en SQLite.

Tabla:

```sql
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  checksum TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity
ON attachments(entity_type, entity_id);
```

---

# 45. Seguridad de archivos

Debe:

* validar extensiones,
* validar MIME,
* limitar tamaño,
* sanear nombres,
* evitar path traversal,
* generar IDs únicos para almacenamiento.

Ejemplo de nombre seguro:

```text
original: ../../../informe.pdf
almacenado: 9f2c1a7e-5b8d-4c09-9f3a-1e6d0b8c7a65.pdf
```

---

# 46. Cifrado de base de datos

Para cifrado real, use una variante de SQLite cifrada.

Opciones:

* SQLCipher
* better-sqlite3-multiple-ciphers

Recomendación:

```text
SQLCipher o better-sqlite3-multiple-ciphers si la seguridad local es prioritaria.
```

Advertencia:

```text
No implemente cifrado casero.
```

---

# 47. Bloqueo por PIN / contraseña

Recomendación:

* no guardar contraseña en texto plano,
* usar hash con salt,
* bloquear tras varios intentos,
* guardar sesión cifrada si es necesario.

Ejemplo de flujo:

```text
Usuario configura PIN
      ↓
Se guarda hash + salt
      ↓
Al abrir la app
      ↓
Se solicita PIN si hay bloqueo activo
      ↓
Se compara hash
      ↓
Se desbloquea la sesión
```

---

# 48. Plugins

Los plugins son poderosos, pero peligrosos.

Si los implementa:

* API limitada,
* sandbox,
* permisos explícitos,
* sin acceso directo a SQLite,
* sin acceso directo a filesystem completo,
* sin IPC arbitrario.

Modelo recomendado:

```ts
export interface PluginContext {
  registerCommand(command: PluginCommand): void;
  registerWidget(widget: PluginWidget): void;
  subscribeEvent(type: string, handler: (payload: unknown) => void): void;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  permissions: string[];
}
```

---

# 49. Diagrama de flujo para una tarea

```text
Usuario hace clic en "Completar tarea"
        ↓
Componente React llama a window.api.tasks.complete(taskId)
        ↓
Preload envía IPC "tasks:complete"
        ↓
Main process valida taskId
        ↓
CompleteTaskUseCase.execute(taskId)
        ↓
TaskRepository.findById(taskId)
        ↓
Task.complete()
        ↓
Transacción SQLite:
  UPDATE tasks
  INSERT activity_log
  INSERT outbox_events
        ↓
Commit
        ↓
OutboxDispatcher publica task.completed
        ↓
Kanban actualiza tarjeta
Dashboard actualiza métricas
StatisticsService actualiza daily_task_stats
NotificationService muestra notificación
HistoryManager registra cambio
```

---

# 50. Roadmap técnico recomendado

Le propongo este orden concreto de implementación.

## Iteración 1

```text
Electron + React + TypeScript + Vite
Ventana principal
Preload seguro
IPC básico
Logger
Configuración de seguridad
```

## Iteración 2

```text
SQLite
Migraciones
DatabaseService
Workspaces repository
WorkspaceService
IPC de workspaces
UI de workspaces
```

## Iteración 3

```text
Projects
Tasks
TaskService
TaskRepository
IPC de tasks
UI de tareas
```

## Iteración 4

```text
Kanban
Columnas
Drag & Drop
Movimiento de tarjetas
Persistencia de posición
```

## Iteración 5

```text
Event Bus
Outbox
Activity log
Dashboard básico
```

## Iteración 6

```text
Settings
ThemeManager
SessionManager
Restaurar último workspace
Backup manual
Exportación JSON
```

## Iteración 7

```text
Búsqueda FTS5
Command Palette
Favoritos
Recientes
```

## Iteración 8

```text
Calendario
Notas
Archivos adjuntos
```

## Iteración 9

```text
Estadísticas
Pomodoro
Automatizaciones
```

## Iteración 10

```text
Performance Monitor
Startup Profiler
Virtualización avanzada
LRU avanzada
Modos de rendimiento
```

---

# 51. Mi recomendación final como arquitecto

Su especificación es ambiciosa y correcta, pero el mayor riesgo no es técnico: es el **alcance**.

Por tanto, la regla de oro debe ser:

```text
Construir un núcleo extremadamente sólido primero.
Luego añadir módulos avanzados.
Nunca sacrificar arquitectura por funcionalidad.
```

La aplicación debe sentirse:

* rápida,
* estable,
* offline,
* modular,
* segura,
* predecible,
* fácil de extender.

---

# 52. Próximo paso recomendado

Para continuar correctamente, le propongo empezar por uno de estos tres bloques:

## Opción A — Arquitectura base completa

Generar:

* estructura de carpetas,
* configuración Electron,
* configuración React,
* IPC seguro,
* Event Bus,
* SQLite inicial.

## Opción B — Modelo de datos completo

Generar:

* esquema SQLite completo,
* migraciones,
* índices,
* FTS5,
* outbox,
* activity log,
* snapshots.

## Opción C — MVP funcional

Generar:

* Workspaces,
* Projects,
* Tasks,
* Kanban,
* Dashboard,
* Settings,
* con código inicial profesional.

Mi recomendación como profesor es comenzar con la **Opción A**, porque si la base arquitectónica queda bien diseñada, el resto de módulos se integrarán con mucha más limpieza.

## Testing — Suite de pruebas implementada

Se implementaron **67 nuevas pruebas unitarias** cubriendo los módulos faltantes. Total: **223 pruebas**, 17 archivos, todos pasando.

| Archivo | Pruebas | Cobertura |
|---------|---------|-----------|
| `workspaces.test.ts` | 9 | CRUD workspaces, default flag, task filtering |
| `kanban-columns.test.ts` | 8 | CRUD columnas, reorden, límite WIP |
| `note-folders.test.ts` | 8 | CRUD carpetas, anidación, reparenting |
| `task-relationships.test.ts` | 17 | Dependencias, comentarios (orden cronológico), time tracking (start/stop/duración) |
| `pomodoro-settings.test.ts` | 9 | Duraciones personalizadas, auto-start, clamping, reseteo |
| `services.test.ts` | 16 | Encryption (XOR roundtrip), Search (parsing operadores, extracción términos), Backup (estructura snapshot, restauración) |

Para ejecutar: `npx vitest run`

Ver `docs/TESTING.md` para documentación completa.

Si usted lo desea, en el siguiente paso puedo entregarle:

```text
La arquitectura base completa en TypeScript para Electron + React + SQLite,
con Event Bus, IPC seguro, Result pattern, DatabaseService y estructura profesional de carpetas.
```