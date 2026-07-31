class TaskNotFoundError extends Error {
  constructor(taskId) {
    super(`Task not found: ${taskId}`)
    this.name = 'TaskNotFoundError'
  }
}

class WorkspaceNotFoundError extends Error {
  constructor(workspaceId) {
    super(`Workspace not found: ${workspaceId}`)
    this.name = 'WorkspaceNotFoundError'
  }
}

class ValidationError extends Error {
  constructor(issues) {
    super(`Validation failed: ${issues.map(i => `${i.path}: ${i.message}`).join('; ')}`)
    this.name = 'ValidationError'
    this.issues = issues
  }
}

function ok(value) {
  return { ok: true, value }
}

function fail(error) {
  return { ok: false, error }
}

function isOk(result) {
  return result.ok
}

function isFail(result) {
  return !result.ok
}

function unwrap(result) {
  if (isFail(result)) throw result.error
  return result.value
}

module.exports = { ok, fail, isOk, isFail, unwrap, TaskNotFoundError, WorkspaceNotFoundError, ValidationError }
