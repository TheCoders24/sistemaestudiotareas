import type { WorkspaceId } from './workspace'

export type ProjectId = number

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'
export type ProjectPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export interface Project {
  id: ProjectId
  workspaceId: WorkspaceId
  parentId: ProjectId | null
  name: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  color: string | null
  icon: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export function createProject(input: {
  workspaceId: WorkspaceId
  name: string
  parentId?: ProjectId | null
  description?: string | null
  priority?: ProjectPriority
  color?: string | null
}): Omit<Project, 'id'> {
  const now = new Date().toISOString()
  return {
    workspaceId: input.workspaceId,
    parentId: input.parentId ?? null,
    name: input.name,
    description: input.description ?? null,
    status: 'active',
    priority: input.priority ?? 'medium',
    color: input.color ?? null,
    icon: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}
