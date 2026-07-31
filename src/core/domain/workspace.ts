export type WorkspaceId = number

export type WorkspaceTheme = 'light' | 'dark' | 'system'

export interface Workspace {
  id: WorkspaceId
  name: string
  color: string | null
  icon: string | null
  theme: WorkspaceTheme
  isFavorite: boolean
  isDefault: boolean
  sortOrder: number
  archivedAt: string | null
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export function createWorkspace(input: { name: string; color?: string; icon?: string; theme?: WorkspaceTheme }): Omit<Workspace, 'id'> {
  const now = new Date().toISOString()
  return {
    name: input.name,
    color: input.color ?? null,
    icon: input.icon ?? null,
    theme: input.theme ?? 'system',
    isFavorite: false,
    isDefault: false,
    sortOrder: 0,
    archivedAt: null,
    settings: {},
    createdAt: now,
    updatedAt: now,
  }
}
