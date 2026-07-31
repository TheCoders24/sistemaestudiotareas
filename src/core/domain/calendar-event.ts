import type { WorkspaceId } from './workspace'
import type { ProjectId } from './project'

export type CalendarEventId = number

export interface CalendarEvent {
  id: CalendarEventId
  workspaceId: WorkspaceId
  projectId: ProjectId | null
  taskId: number | null
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  color: string | null
  createdAt: string
  updatedAt: string
}

export function createCalendarEvent(input: {
  workspaceId: WorkspaceId
  projectId?: ProjectId | null
  taskId?: number | null
  title: string
  description?: string | null
  startDate: string
  endDate?: string | null
  allDay?: boolean
  color?: string | null
}): Omit<CalendarEvent, 'id'> {
  const now = new Date().toISOString()
  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
    title: input.title,
    description: input.description ?? null,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    allDay: input.allDay ?? false,
    color: input.color ?? null,
    createdAt: now,
    updatedAt: now,
  }
}
