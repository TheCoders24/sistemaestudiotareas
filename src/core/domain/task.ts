import type { WorkspaceId } from './workspace'
import type { ProjectId } from './project'

export type TaskId = number
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: TaskId
  workspaceId: WorkspaceId
  projectId: ProjectId | null
  parentTaskId: TaskId | null
  title: string
  description: string | null
  priority: TaskPriority
  completedAt: string | null
  dueAt: string | null
  estimatedMinutes: number | null
  actualMinutes: number | null
  position: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export function createTask(input: {
  workspaceId: WorkspaceId
  projectId?: ProjectId | null
  parentTaskId?: TaskId | null
  title: string
  description?: string | null
  priority?: TaskPriority
  dueAt?: string | null
  estimatedMinutes?: number | null
}): Omit<Task, 'id'> {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Task title is required')
  }
  if (input.title.length > 500) {
    throw new Error('Task title must be 500 characters or fewer')
  }
  const now = new Date().toISOString()
  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? null,
    parentTaskId: input.parentTaskId ?? null,
    title: input.title.trim(),
    description: input.description ?? null,
    priority: input.priority ?? 'medium',
    completedAt: null,
    dueAt: input.dueAt ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    actualMinutes: null,
    position: 0,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function completeTask(task: Task): Task {
  const now = new Date().toISOString()
  return { ...task, completedAt: task.completedAt ?? now, updatedAt: now }
}

export function uncompleteTask(task: Task): Task {
  return { ...task, completedAt: null, updatedAt: new Date().toISOString() }
}
