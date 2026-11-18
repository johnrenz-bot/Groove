import { NextResponse } from 'next/server';
import { toHttpError } from '@/lib/errors';

/**
 * Centralised helpers for building consistent JSON error responses.
 *
 * Keep the public surface small: one generic builder plus a handful of
 * status-specific helpers that match the HTTP semantics the app already uses.
 */

export interface ErrorBody {
  error: string;
  code?: string;
}

export function jsonError(status: number, message: string, code?: string): NextResponse {
  const body: ErrorBody = code ? { error: message, code } : { error: message };
  return NextResponse.json(body, { status });
}

export function badRequest(message = 'Invalid request.') {
  return jsonError(400, message, 'BAD_REQUEST');
}

export function unauthorized(message = 'Authentication required.') {
  return jsonError(401, message, 'UNAUTHORIZED');
}

export function forbidden(message = 'You are not allowed to perform this action.') {
  return jsonError(403, message, 'FORBIDDEN');
}

export function notFound(message = 'Resource not found.') {
  return jsonError(404, message, 'NOT_FOUND');
}

export function conflict(message = 'Conflict with the current state.') {
  return jsonError(409, message, 'CONFLICT');
}

export function tooManyRequests(retryAfter = 60, message = 'Too many requests. Please try again later.') {
  return jsonError(429, message, 'RATE_LIMITED');
}

/**
 * Convert an unknown error into a safe 500 response, logging the original.
 */
export function internalError(error: unknown, context?: string): NextResponse {
  const { message } = toHttpError(error);
  if (context) {
    console.error(`[${context}]`, error);
  } else {
    console.error(error);
  }
  return jsonError(500, 'An unexpected error occurred. Please try again.', 'INTERNAL_ERROR');
}