/**
 * @deprecated The error contract lives in `@/lib/errors/index`. This file is a
 * compatibility re-export kept so existing imports keep working — new code
 * should import from `@/lib/errors/index`.
 */
export * from './errors/index';

/**
 * Convert an unknown error into a safe, user-facing message + status code
 * without leaking internal details. Kept for existing call sites.
 */
export function toHttpError(error: unknown): { status: number; message: string } {
  if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
    const appError = error as { status: unknown; expose?: unknown; message?: unknown };
    if (typeof appError.status === 'number') {
      const exposed = appError.expose !== false;
      return {
        status: appError.status,
        message:
          exposed && typeof appError.message === 'string'
            ? appError.message
            : 'An unexpected error occurred. Please try again.',
      };
    }
  }
  return { status: 500, message: 'An unexpected error occurred. Please try again.' };
}
