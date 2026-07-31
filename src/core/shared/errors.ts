export class TaskNotFoundError extends Error {
  constructor(taskId: string | number) {
    super(`Task not found: ${taskId}`)
    this.name = 'TaskNotFoundError'
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor(workspaceId: string | number) {
    super(`Workspace not found: ${workspaceId}`)
    this.name = 'WorkspaceNotFoundError'
  }
}

export class ProjectNotFoundError extends Error {
  constructor(projectId: string | number) {
    super(`Project not found: ${projectId}`)
    this.name = 'ProjectNotFoundError'
  }
}

export class NoteNotFoundError extends Error {
  constructor(noteId: string | number) {
    super(`Note not found: ${noteId}`)
    this.name = 'NoteNotFoundError'
  }
}

export class InvalidTaskTitleError extends Error {
  constructor() {
    super('Task title must be between 1 and 500 characters')
    this.name = 'InvalidTaskTitleError'
  }
}

export class CircularDependencyError extends Error {
  constructor() {
    super('Circular dependency detected')
    this.name = 'CircularDependencyError'
  }
}

export class ValidationError extends Error {
  constructor(public readonly issues: Array<{ path: string; message: string }>) {
    super(`Validation failed: ${issues.map(i => `${i.path}: ${i.message}`).join('; ')}`)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends Error {
  constructor(cause: unknown) {
    super(`Database error: ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'DatabaseError'
  }
}
