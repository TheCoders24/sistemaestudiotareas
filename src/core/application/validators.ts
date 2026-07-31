export interface ValidationIssue {
  path: string
  message: string
}

export function validateRequired(value: unknown, field: string): ValidationIssue | null {
  if (value === undefined || value === null) return { path: field, message: `${field} is required` }
  if (typeof value === 'string' && value.trim().length === 0) return { path: field, message: `${field} must not be empty` }
  return null
}

export function validateString(value: unknown, field: string, maxLength = 500): ValidationIssue | null {
  if (typeof value !== 'string') return { path: field, message: `${field} must be a string` }
  if (value.length > maxLength) return { path: field, message: `${field} must be ${maxLength} characters or fewer` }
  return null
}

export function validateEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): ValidationIssue | null {
  if (!allowed.includes(value as T)) return { path: field, message: `${field} must be one of: ${allowed.join(', ')}` }
  return null
}

export function validateOptionalString(value: unknown, field: string, maxLength = 10000): ValidationIssue | null {
  if (value === undefined || value === null) return null
  return validateString(value, field, maxLength)
}

export function validateCreateTask(input: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const titleErr = validateRequired(input.title, 'title')
  if (titleErr) issues.push(titleErr)
  else {
    const strErr = validateString(input.title, 'title')
    if (strErr) issues.push(strErr)
  }

  if (input.priority !== undefined) {
    const prioErr = validateEnum(input.priority, 'priority', ['none', 'low', 'medium', 'high', 'urgent'])
    if (prioErr) issues.push(prioErr)
  }

  if (input.description !== undefined) {
    const descErr = validateOptionalString(input.description, 'description', 10000)
    if (descErr) issues.push(descErr)
  }

  return issues
}

export function validateCreateWorkspace(input: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const titleErr = validateRequired(input.name, 'name')
  if (titleErr) issues.push(titleErr)
  else {
    const strErr = validateString(input.name, 'name')
    if (strErr) issues.push(strErr)
  }

  return issues
}
