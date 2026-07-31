import type { EventEnvelope } from '../shared/event-bus'
import type { TaskId, TaskPriority } from './task'
import type { WorkspaceId } from './workspace'
import type { ProjectId } from './project'
import type { KanbanColumnId } from './kanban'
import type { NoteId } from './note'

export type AppEventMap = {
  'workspace.created': EventEnvelope<'workspace.created', { workspaceId: WorkspaceId; name: string }>
  'workspace.updated': EventEnvelope<'workspace.updated', { workspaceId: WorkspaceId }>
  'workspace.deleted': EventEnvelope<'workspace.deleted', { workspaceId: WorkspaceId }>
  'workspace.opened': EventEnvelope<'workspace.opened', { workspaceId: WorkspaceId }>

  'project.created': EventEnvelope<'project.created', { projectId: ProjectId; workspaceId: WorkspaceId }>
  'project.updated': EventEnvelope<'project.updated', { projectId: ProjectId; workspaceId: WorkspaceId }>
  'project.archived': EventEnvelope<'project.archived', { projectId: ProjectId; workspaceId: WorkspaceId; archivedAt: string }>
  'project.deleted': EventEnvelope<'project.deleted', { projectId: ProjectId; workspaceId: WorkspaceId }>

  'task.created': EventEnvelope<'task.created', { taskId: TaskId; projectId: ProjectId | null; workspaceId: WorkspaceId }>
  'task.updated': EventEnvelope<'task.updated', { taskId: TaskId; workspaceId: WorkspaceId }>
  'task.completed': EventEnvelope<'task.completed', { taskId: TaskId; projectId: ProjectId | null; workspaceId: WorkspaceId; completedAt: string }>
  'task.uncompleted': EventEnvelope<'task.uncompleted', { taskId: TaskId; workspaceId: WorkspaceId }>
  'task.deleted': EventEnvelope<'task.deleted', { taskId: TaskId; workspaceId: WorkspaceId }>
  'task.priority.changed': EventEnvelope<'task.priority.changed', { taskId: TaskId; oldPriority: TaskPriority; newPriority: TaskPriority }>

  'kanban.card.moved': EventEnvelope<'kanban.card.moved', { taskId: TaskId; fromColumnId: KanbanColumnId; toColumnId: KanbanColumnId; position: number }>
  'kanban.column.created': EventEnvelope<'kanban.column.created', { columnId: KanbanColumnId; workspaceId: WorkspaceId }>

  'note.created': EventEnvelope<'note.created', { noteId: NoteId; workspaceId: WorkspaceId }>
  'note.updated': EventEnvelope<'note.updated', { noteId: NoteId; workspaceId: WorkspaceId }>
  'note.deleted': EventEnvelope<'note.deleted', { noteId: NoteId; workspaceId: WorkspaceId }>

  'settings.updated': EventEnvelope<'settings.updated', { changedKeys: string[] }>
  'app.started': EventEnvelope<'app.started', {}>

  'automation.triggered': EventEnvelope<'automation.triggered', { ruleId: string; trigger: string }>

  'calendar.event.created': EventEnvelope<'calendar.event.created', { eventId: number; workspaceId: number }>
  'calendar.event.updated': EventEnvelope<'calendar.event.updated', { eventId: number; workspaceId: number }>
  'calendar.event.deleted': EventEnvelope<'calendar.event.deleted', { eventId: number; workspaceId: number }>

  'label.created': EventEnvelope<'label.created', { labelId: number; workspaceId: number; name: string }>
  'label.deleted': EventEnvelope<'label.deleted', { labelId: number; workspaceId: number }>

  'attachment.added': EventEnvelope<'attachment.added', { attachmentId: number; entityType: string; entityId: number }>
  'attachment.deleted': EventEnvelope<'attachment.deleted', { attachmentId: number; entityType: string; entityId: number }>

  'project.restored': EventEnvelope<'project.restored', { projectId: number; workspaceId: number }>
  'session.restored': EventEnvelope<'session.restored', { workspaceId: number | null; module: string | null }>
}
