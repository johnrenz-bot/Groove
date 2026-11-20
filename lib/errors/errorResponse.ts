import { NextResponse } from 'next/server';
import {
  AppError,
  normalizeError,
  toSafeMessage,
} from './AppError';
import { ErrorCodes, type ErrorCode } from './errorCodes';

export interface ErrorResponseBody {
  /** Client-safe message. */
  error: string;
  /** Stable machine-readable code (see ErrorCodes). */
  code: ErrorCode | (string & {});
  /** Seconds to wait before retrying (429/503). */
  retryAfter?: number;
}

/**
 * Serialize an unknown error into the API's standard response shape:
 *
 *   { error: string, code: string, retryAfter?: number }
 *
 * Guarantees:
 *  - No database internals, stack traces, credentials or tokens leak into the
 *    body. Internal/database errors log the cause server-side and return a
 *    generic message.
 *  - HTTP status semantics are preserved (4xx stays 4xx, 429/503 carry
 *    Retry-After).
 *  - Existing callers that read `body.error` keep working.
 */
export function errorResponse(error: unknown, context?: string): NextResponse {
  const appError = normalizeError(error);

  if (!appError.expose) {
    console.error(context ? `[${context}]` : '[api]', appError.cause ?? error);
  } else if (appError.status >= 500) {
    console.error(context ? `[${context}]` : '[api]', error);
  }

  const body: ErrorResponseBody = {
    error: toSafeMessage(appError),
    code: appError.code,
  };
  if (typeof appError.retryAfter === 'number') body.retryAfter = appError.retryAfter;

  const headers =
    typeof appError.retryAfter === 'number'
      ? { 'Retry-After': String(appError.retryAfter) }
      : undefined;

  return NextResponse.json(body, { status: appError.status, headers });
}

/** Convenience shorthands, mirroring the historical lib/api/errors helpers. */
export function badRequest(message = 'Invalid request.') {
  return errorResponse(AppError.badRequest(message), '400');
}

export function unauthorized(message = 'Authentication required.') {
  return errorResponse(AppError.unauthenticated(message), '401');
}

export function forbidden(message = 'You are not allowed to perform this action.') {
  return errorResponse(AppError.forbidden(message), '403');
}

export function notFound(message = 'Resource not found.') {
  return errorResponse(AppError.notFound(message), '404');
}

export function conflict(message = 'Conflict with the current state.') {
  return errorResponse(AppError.conflict(message), '409');
}

export function tooManyRequests(retryAfter = 60, message = 'Too many requests. Please try again later.') {
  return errorResponse(AppError.rateLimited(message, retryAfter), '429');
}

/** Log the original error, return a safe 500. */
export function internalError(error: unknown, context?: string): NextResponse {
  return errorResponse(AppError.internal(error), context ?? 'internal');
}
