import type { WorkspaceId } from './workspace'
import type { ProjectId } from './project'
import type { TaskPriority } from './task'

export type KanbanColumnId = number
export type KanbanCardId = number

export interface KanbanColumn {
  id: KanbanColumnId
  workspaceId: WorkspaceId
  projectId: ProjectId | null
  name: string
  color: string | null
  position: number
  wipLimit: number | null
  createdAt: string
  updatedAt: string
}

export interface KanbanCard {
  id: KanbanCardId
  columnId: KanbanColumnId
  taskId: number | null
  title: string
  description: string | null
  position: number
  priority: TaskPriority
  dueAt: string | null
  labels: string[]
  createdAt: string
  updatedAt: string
}

export function createKanbanColumn(input: {
  workspaceId: WorkspaceId
  projectId?: ProjectId | null
  name: string
  color?: string | null
  position?: number
  wipLimit?: number | null
}): Omit<KanbanColumn, 'id'> {
  const now = new Date().toISOString()
  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? null,
    name: input.name,
    color: input.color ?? null,
    position: input.position ?? 0,
    wipLimit: input.wipLimit ?? null,
    createdAt: now,
    updatedAt: now,
  }
}
