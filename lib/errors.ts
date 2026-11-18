/**
 * Small, dependency-free error primitives shared across server and client code.
 */

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status = 500, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert an unknown error into a safe, user-facing message + status code without
 * leaking internal details. Always log the original error server-side.
 */
export function toHttpError(error: unknown): { status: number; message: string } {
  if (isAppError(error)) {
    return { status: error.status, message: error.message };
  }
  if (error instanceof Error) {
    return { status: 500, message: 'An unexpected error occurred. Please try again.' };
  }
  return { status: 500, message: 'An unexpected error occurred. Please try again.' };
}