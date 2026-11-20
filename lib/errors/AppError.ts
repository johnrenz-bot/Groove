import { ErrorCodes, type ErrorCode } from './errorCodes';

export interface AppErrorOptions {
  status?: number;
  code?: ErrorCode | (string & {});
  /**
   * True when `message` is written for the end user (safe to show as-is).
   * Defaults to true, matching the historical behaviour of AppError;
   * use AppError.database/internal/unavailable (or expose:false) to hide
   * internals.
   */
  expose?: boolean;
  /** Seconds the client should wait before retrying (429/503). */
  retryAfter?: number;
  /** The original error, kept for server-side logging only. Never serialized. */
  cause?: unknown;
}

/**
 * The one application error type. Throw this (or let `normalizeError`
 * classify unknown failures) instead of hand-building responses at call
 * sites.
 *
 * Rules:
 *  - 4xx codes carry a message the user may read.
 *  - 5xx codes from AppError.internal/database carry a generic message for
 *    the client; the cause is logged server-side.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode | (string & {});
  readonly expose: boolean;
  readonly retryAfter?: number;

  constructor(message: string, options: AppErrorOptions);
  /** Legacy positional form kept for existing call sites. */
  constructor(message: string, status: number, code?: string);
  constructor(
    message: string,
    statusOrOptions: number | AppErrorOptions = {},
    legacyCode?: string
  ) {
    if (typeof statusOrOptions === 'number') {
      super(message);
      this.name = 'AppError';
      this.status = statusOrOptions;
      this.code = legacyCode ?? ErrorCodes.INTERNAL;
      this.expose = legacyCode ? true : this.status < 500;
      this.retryAfter = undefined;
      return;
    }

    const options = statusOrOptions;
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.status = options.status ?? 500;
    this.code = options.code ?? ErrorCodes.INTERNAL;
    this.expose = options.expose ?? true;
    this.retryAfter = options.retryAfter;
  }

  static badRequest(message = 'Invalid request.', options: Omit<AppErrorOptions, 'status' | 'code'> = {}) {
    return new AppError(message, { ...options, status: 400, code: ErrorCodes.BAD_REQUEST });
  }

  static unauthenticated(message = 'Authentication required.') {
    return new AppError(message, { status: 401, code: ErrorCodes.UNAUTHENTICATED });
  }

  static forbidden(message = 'You are not allowed to perform this action.') {
    return new AppError(message, { status: 403, code: ErrorCodes.FORBIDDEN });
  }

  static notFound(message = 'Resource not found.') {
    return new AppError(message, { status: 404, code: ErrorCodes.NOT_FOUND });
  }

  static conflict(message = 'Conflict with the current state.') {
    return new AppError(message, { status: 409, code: ErrorCodes.CONFLICT });
  }

  static rateLimited(message = 'Too many requests. Please try again later.', retryAfter = 60) {
    return new AppError(message, { status: 429, code: ErrorCodes.RATE_LIMITED, expose: true, retryAfter });
  }

  /** A database failure whose internals must never reach the client. */
  static database(cause?: unknown, message = 'Something went wrong. Please try again.') {
    return new AppError(message, { status: 500, code: ErrorCodes.DATABASE, expose: false, cause });
  }

  static internal(cause?: unknown, message = 'An unexpected error occurred. Please try again.') {
    return new AppError(message, { status: 500, code: ErrorCodes.INTERNAL, expose: false, cause });
  }

  static unavailable(message = 'This service is temporarily unavailable.', cause?: unknown) {
    return new AppError(message, { status: 503, code: ErrorCodes.SERVICE_UNAVAILABLE, expose: true, cause });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Classify an unknown thrown value into an AppError. Postgres/PostgREST
 * failures are mapped by code so handlers that surface them don't hand
 * database internals to the client.
 */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) return error;

  // Postgres / PostgREST error shapes: { code, message, details?, hint? }
  if (error && typeof error === 'object' && 'code' in error) {
    const pg = error as { code?: unknown; message?: unknown };
    const code = typeof pg.code === 'string' ? pg.code : '';

    if (code === '23505') {
      return AppError.conflict('That value is already in use.');
    }
    if (code === '23503') {
      return AppError.badRequest('The referenced record does not exist.');
    }
    if (code === '23502' || code === '22P02' || code === '22003' || code === '22007' || code === '22P01') {
      return AppError.badRequest('The submitted value is not valid.');
    }
    if (code === '42501' || code === 'PGRST301' || code === 'PGRST302') {
      return AppError.forbidden('You do not have permission to access that resource.');
    }
    if (code === 'PGRST116' || code === 'PGRST123') {
      return AppError.notFound('The requested resource was not found.');
    }
    return AppError.database(error);
  }

  if (error instanceof Error) {
    return AppError.internal(error, 'An unexpected error occurred. Please try again.');
  }

  return AppError.internal(error);
}

/** Message safe to show to a client. Internal/database errors get a generic one. */
export function toSafeMessage(error: unknown): string {
  const appError = normalizeError(error);
  return appError.expose ? appError.message : 'Something went wrong. Please try again.';
}
