/** Keep database internals out of HTTP bodies while retaining domain validation messages. */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const value = error as { message?: unknown; query?: unknown; cause?: unknown; code?: unknown; name?: string };
  if (value.query || value.cause || value.name === 'PostgresError' || value.name === 'DrizzleQueryError' ||
      (typeof value.code === 'string' && /^[0-9A-Z]{5}$/.test(value.code))) return fallback;
  if (typeof value.message !== 'string' || /failed query:|postgres(?:ql)?:\/\/|password_hash|SQLSTATE/i.test(value.message)) return fallback;
  return value.message || fallback;
}

/** Log classification/context without SQL parameters, credentials, recovery links, or school records. */
export function logServerError(context: string, error: unknown): void {
  const value = error && typeof error === 'object' ? error as { name?: unknown; code?: unknown; cause?: { code?: unknown } } : {};
  console.error(context, { name: typeof value.name === 'string' ? value.name : 'Error', code: value.code || value.cause?.code || 'UNKNOWN' });
}
