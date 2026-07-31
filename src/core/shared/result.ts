export type Result<TValue, TError extends Error = Error> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError }

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value }
}

export function fail<TError extends Error>(error: TError): Result<never, TError> {
  return { ok: false, error }
}

export function isOk<T, E extends Error>(r: Result<T, E>): r is { ok: true; value: T } {
  return r.ok
}

export function isFail<T, E extends Error>(r: Result<T, E>): r is { ok: false; error: E } {
  return !r.ok
}

export function unwrap<T, E extends Error>(r: Result<T, E>, _msg?: string): T {
  if (isFail(r)) throw r.error
  return r.value
}

export function unwrapOr<T, E extends Error>(r: Result<T, E>, fallback: T): T {
  if (isFail(r)) return fallback
  return r.value
}

export function map<T, E extends Error, U>(r: Result<T, E>, fn: (v: T) => U): Result<U, E> {
  if (isFail(r)) return r as Result<never, E>
  return ok(fn(r.value))
}

export function mapError<T, E extends Error, F extends Error>(r: Result<T, E>, fn: (e: E) => F): Result<T, F> {
  if (isOk(r)) return r
  return fail(fn(r.error))
}

export function flatMap<T, E extends Error, U, F extends Error>(r: Result<T, E>, fn: (v: T) => Result<U, F>): Result<U, E | F> {
  if (isFail(r)) return r
  return fn(r.value)
}
