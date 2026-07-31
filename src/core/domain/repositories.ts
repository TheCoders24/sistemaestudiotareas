import type { Workspace, WorkspaceId } from './workspace'
import type { Project, ProjectId, ProjectStatus } from './project'
import type { Task, TaskId } from './task'
import type { KanbanColumn, KanbanColumnId, KanbanCard, KanbanCardId } from './kanban'
import type { Note, NoteId, NoteFolder, NoteFolderId } from './note'
import type { CalendarEvent, CalendarEventId } from './calendar-event'
import type { Label, LabelId } from './label'
import type { Attachment, AttachmentId } from './attachment'

export interface IWorkspaceRepository {
  findById(id: WorkspaceId): Promise<Workspace | null>
  findAll(): Promise<Workspace[]>
  save(workspace: Workspace): Promise<void>
  delete(id: WorkspaceId): Promise<void>
  getDefault(): Promise<Workspace | null>
  count(): Promise<number>
}

export interface IProjectRepository {
  findById(id: ProjectId): Promise<Project | null>
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<Project[]>
  save(project: Project): Promise<void>
  delete(id: ProjectId): Promise<void>
  archive(id: ProjectId): Promise<void>
  updateStatus(id: ProjectId, status: ProjectStatus): Promise<void>
}

export interface ITaskRepository {
  findById(id: TaskId): Promise<Task | null>
  save(task: Task): Promise<void>
  delete(id: TaskId): Promise<void>
  findByProjectId(projectId: ProjectId): Promise<Task[]>
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<Task[]>
  findDuePending(): Promise<Task[]>
}

export interface IKanbanColumnRepository {
  findById(id: KanbanColumnId): Promise<KanbanColumn | null>
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<KanbanColumn[]>
  findByProjectId(projectId: ProjectId): Promise<KanbanColumn[]>
  save(column: KanbanColumn): Promise<void>
  delete(id: KanbanColumnId): Promise<void>
  reorder(ids: KanbanColumnId[]): Promise<void>
}

export interface IKanbanCardRepository {
  findById(id: KanbanCardId): Promise<KanbanCard | null>
  findByColumnId(columnId: KanbanColumnId): Promise<KanbanCard[]>
  save(card: KanbanCard): Promise<void>
  delete(id: KanbanCardId): Promise<void>
  move(id: KanbanCardId, toColumnId: KanbanColumnId, position: number): Promise<void>
}

export interface INoteRepository {
  findById(id: NoteId): Promise<Note | null>
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<Note[]>
  findByFolderId(folderId: NoteFolderId): Promise<Note[]>
  save(note: Note): Promise<void>
  delete(id: NoteId): Promise<void>
}

export interface INoteFolderRepository {
  findById(id: NoteFolderId): Promise<NoteFolder | null>
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<NoteFolder[]>
  save(folder: NoteFolder): Promise<void>
  delete(id: NoteFolderId): Promise<void>
}

export interface ICalendarEventRepository {
  findById(id: CalendarEventId): Promise<CalendarEvent | null>
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<CalendarEvent[]>
  findByDateRange(start: string, end: string): Promise<CalendarEvent[]>
  save(event: CalendarEvent): Promise<void>
  delete(id: CalendarEventId): Promise<void>
}

export interface ILabelRepository {
  findById(id: LabelId): Promise<Label | null>
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<Label[]>
  save(label: Label): Promise<void>
  delete(id: LabelId): Promise<void>
  addToTask(taskId: TaskId, labelId: LabelId): Promise<void>
  removeFromTask(taskId: TaskId, labelId: LabelId): Promise<void>
  findByTaskId(taskId: TaskId): Promise<Label[]>
}

export interface IAttachmentRepository {
  findById(id: AttachmentId): Promise<Attachment | null>
  findByEntity(entityType: string, entityId: number): Promise<Attachment[]>
  save(attachment: Attachment): Promise<void>
  delete(id: AttachmentId): Promise<void>
}
