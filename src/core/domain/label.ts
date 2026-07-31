import type { WorkspaceId } from './workspace'

export type LabelId = number

export interface Label {
  id: LabelId
  workspaceId: WorkspaceId
  name: string
  color: string
  createdAt: string
}

export function createLabel(input: {
  workspaceId: WorkspaceId
  name: string
  color?: string
}): Omit<Label, 'id'> {
  return {
    workspaceId: input.workspaceId,
    name: input.name,
    color: input.color ?? '#6366f1',
    createdAt: new Date().toISOString(),
  }
}
