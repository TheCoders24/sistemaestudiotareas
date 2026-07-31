import type { WorkspaceId } from './workspace'

export type AttachmentId = number

export interface Attachment {
  id: AttachmentId
  workspaceId: WorkspaceId
  entityType: string
  entityId: number
  fileName: string
  mimeType: string
  sizeBytes: number
  storagePath: string
  checksum: string | null
  createdAt: string
}

export function createAttachment(input: {
  workspaceId: WorkspaceId
  entityType: string
  entityId: number
  fileName: string
  mimeType: string
  sizeBytes: number
  storagePath: string
  checksum?: string | null
}): Omit<Attachment, 'id'> {
  return {
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storagePath: input.storagePath,
    checksum: input.checksum ?? null,
    createdAt: new Date().toISOString(),
  }
}
