import { ok, fail, type Result } from '../../shared/result'
import { ValidationError } from '../../shared/errors'
import type { ValidationIssue } from '../../application/validators'
import type { ZodSchema } from 'zod'

export type IpcResult<T> = {
  ok: boolean
  value?: T
  error?: { name: string; message: string; issues?: ValidationIssue[] }
}

export function toIpcResult<T>(result: Result<T, Error>): IpcResult<T> {
  if (result.ok) return { ok: true, value: result.value }
  return {
    ok: false,
    error: {
      name: result.error.name,
      message: result.error.message,
      issues: result.error instanceof ValidationError ? result.error.issues : undefined,
    },
  }
}

export function fromIpcResult<T>(ipcResult: IpcResult<T>): Result<T, Error> {
  if (ipcResult.ok) return ok(ipcResult.value!)
  return fail(new Error(ipcResult.error?.message ?? 'Unknown error'))
}

export function wrapIpcHandler<T, Args extends unknown[]>(
  handler: (...args: Args) => Promise<Result<T, Error>>
): (...args: Args) => Promise<IpcResult<T>> {
  return async (...args: Args): Promise<IpcResult<T>> => {
    try {
      const result = await handler(...args)
      return toIpcResult(result)
    } catch (err) {
      return {
        ok: false,
        error: {
          name: 'InternalServerError',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      }
    }
  }
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.\./g, '').substring(0, 255)
}

export function validateId(id: unknown, _field = 'id'): number | null {
  const n = Number(id)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

export function validateWithZod<T>(schema: ZodSchema<T>, input: unknown): Result<T, ValidationError> {
  const result = schema.safeParse(input)
  if (result.success) return ok(result.data)
  const issues = result.error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
  return fail(new ValidationError(issues))
}
