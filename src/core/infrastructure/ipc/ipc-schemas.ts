import { z } from 'zod'

export const WorkspaceIdSchema = z.union([z.string().min(1), z.number().int().positive()])
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>

export const ProjectIdSchema = z.union([z.string().min(1), z.number().int().positive()]).nullable()
export type ProjectId = z.infer<typeof ProjectIdSchema>

export const TaskIdSchema = z.union([z.string().min(1), z.number().int().positive()])
export type TaskId = z.infer<typeof TaskIdSchema>

export const PrioritySchema = z.enum(['none', 'low', 'medium', 'high', 'urgent'])
export type Priority = z.infer<typeof PrioritySchema>

export const EntityTypeSchema = z.enum(['task', 'project', 'note', 'workspace', 'kanban_card'])

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  color: z.string().max(50).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
})

export const UpdateWorkspaceSchema = CreateWorkspaceSchema.partial().extend({
  isFavorite: z.boolean().optional(),
  archivedAt: z.string().nullable().optional(),
})

export const CreateProjectSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  parentId: ProjectIdSchema.optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']).optional(),
  priority: PrioritySchema.optional(),
  color: z.string().max(50).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
})

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ workspaceId: true })

export const CreateTaskSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  projectId: ProjectIdSchema,
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable().optional(),
  priority: PrioritySchema.optional(),
  dueAt: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  parentTaskId: z.union([z.string(), z.number()]).nullable().optional(),
  position: z.number().optional(),
})

export const UpdateTaskSchema = CreateTaskSchema.partial().omit({ workspaceId: true })

export const CompleteTaskSchema = z.object({
  taskId: TaskIdSchema,
  completedAt: z.string().optional(),
})

export const CreateKanbanColumnSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  projectId: ProjectIdSchema,
  name: z.string().min(1).max(100),
  color: z.string().max(50).nullable().optional(),
  position: z.number().optional(),
  wipLimit: z.number().int().positive().nullable().optional(),
})

export const MoveKanbanCardSchema = z.object({
  taskId: TaskIdSchema,
  fromColumnId: z.union([z.string(), z.number()]),
  toColumnId: z.union([z.string(), z.number()]),
  position: z.number(),
})

export const CreateNoteSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  projectId: ProjectIdSchema.optional(),
  title: z.string().min(1).max(300),
  content: z.string().max(50000).optional(),
  folderId: z.union([z.string(), z.number()]).nullable().optional(),
})

export const UpdateNoteSchema = CreateNoteSchema.partial().omit({ workspaceId: true })

export const CreateCalendarEventSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  projectId: ProjectIdSchema.optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(10000).nullable().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  allDay: z.boolean().optional(),
  color: z.string().max(50).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
})

export const UpdateCalendarEventSchema = CreateCalendarEventSchema.partial().omit({ workspaceId: true })

export const CreateLabelSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  name: z.string().min(1).max(100),
  color: z.string().max(50).optional(),
})

export const CreateAttachmentSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  entityType: EntityTypeSchema,
  entityId: z.union([z.string(), z.number()]),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive(),
  storagePath: z.string().min(1).max(2000),
})

export const CreateAutomationRuleSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  name: z.string().min(1).max(200),
  trigger: z.enum(['task.completed', 'task.due', 'task.created', 'project.completed', 'date.reached']),
  conditions: z.array(z.object({
    type: z.enum(['task.priority.is', 'task.project.is', 'task.label.has', 'workspace.is']),
    value: z.string(),
  })).optional(),
  actions: z.array(z.object({
    type: z.enum(['task.move.column', 'task.set.priority', 'task.set.color', 'task.create', 'project.archive', 'notification.show']),
    value: z.union([z.string(), z.object({ title: z.string() })]),
  })),
})

export const ArchiveEntitySchema = z.object({
  id: z.union([z.string(), z.number()]),
  workspaceId: WorkspaceIdSchema,
  entityType: z.enum(['project', 'task', 'workspace']),
})

export const IdParamSchema = z.object({
  id: z.union([z.string(), z.number()]),
})

export const WorkspaceParamSchema = z.object({
  workspaceId: WorkspaceIdSchema,
})

export const SearchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  workspaceId: WorkspaceIdSchema.optional(),
  entityType: EntityTypeSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
})

export const ExportSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  include: z.array(z.enum(['tasks', 'projects', 'notes', 'events', 'settings'])).optional(),
  format: z.enum(['json', 'csv']).optional(),
})

export const PaginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
export type CompleteTaskInput = z.infer<typeof CompleteTaskSchema>
export type CreateKanbanColumnInput = z.infer<typeof CreateKanbanColumnSchema>
export type MoveKanbanCardInput = z.infer<typeof MoveKanbanCardSchema>
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>
export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventSchema>
export type UpdateCalendarEventInput = z.infer<typeof UpdateCalendarEventSchema>
export type CreateLabelInput = z.infer<typeof CreateLabelSchema>
export type CreateAttachmentInput = z.infer<typeof CreateAttachmentSchema>
export type CreateAutomationRuleInput = z.infer<typeof CreateAutomationRuleSchema>
export type ArchiveEntityInput = z.infer<typeof ArchiveEntitySchema>
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>
export type ExportInput = z.infer<typeof ExportSchema>
export type PaginationInput = z.infer<typeof PaginationSchema>
