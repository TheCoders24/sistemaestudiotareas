import type { WorkspaceId } from './workspace'
import type { ProjectId } from './project'

export type NoteId = number
export type NoteFolderId = number

export interface NoteFolder {
  id: NoteFolderId
  workspaceId: WorkspaceId
  parentId: NoteFolderId | null
  name: string
  color: string | null
  createdAt: string
}

export interface Note {
  id: NoteId
  workspaceId: WorkspaceId
  folderId: NoteFolderId | null
  projectId: ProjectId | null
  title: string
  content: string
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export function createNote(input: {
  workspaceId: WorkspaceId
  folderId?: NoteFolderId | null
  projectId?: ProjectId | null
  title?: string
  content?: string
}): Omit<Note, 'id'> {
  const now = new Date().toISOString()
  return {
    workspaceId: input.workspaceId,
    folderId: input.folderId ?? null,
    projectId: input.projectId ?? null,
    title: input.title ?? 'Sin título',
    content: input.content ?? '',
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}
