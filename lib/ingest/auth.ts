import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * SHARED GUARD FOR THE `/api/<discipline>/ingest` ROUTES.
 *
 * Same contract as lib/cron/auth.ts, for the same reason the cron guard
 * exists: the previous comparison was `providedKey !== expectedKey`, which is
 * not constant-time and, more to the point, produced slightly different
 * failure shapes across the four routes. Fail closed and uniform:
 *
 *   INGEST_API_KEY missing -> 500 (server misconfiguration), as before
 *   key present/wrong      -> 401, constant-time digest compare
 *   oversized payload      -> 413 (2 MB cap before request.json())
 */

export const MAX_INGEST_BODY_BYTES = 2 * 1024 * 1024;

export type IngestAuthResult = { ok: true } | { ok: false; status: number; body: object };

export function authorizeIngestRequest(request: NextRequest, routeLabel: string): IngestAuthResult {
  const expectedKey = process.env.INGEST_API_KEY;
  if (!expectedKey) {
    console.error(`[${routeLabel}] INGEST_API_KEY is not configured in server environment.`);
    return {
      ok: false,
      status: 500,
      body: { error: 'Server configuration error: INGEST_API_KEY is not configured.' },
    };
  }

  const providedKey =
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';

  const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();
  const matches = providedKey.length > 0 && timingSafeEqual(digest(providedKey), digest(expectedKey));
  if (!matches) {
    return {
      ok: false,
      status: 401,
      body: { error: 'Unauthorized: Invalid or missing INGEST_API_KEY.' },
    };
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_INGEST_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      body: { error: 'Payload too large. Ingest bodies are capped at 2 MB.' },
    };
  }

  return { ok: true };
}
