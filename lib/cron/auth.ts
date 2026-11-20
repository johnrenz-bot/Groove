import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * SHARED GUARD FOR THE `/api/cron/*` ROUTES.
 *
 * Both cron endpoints ran their workload — a privileged service-role write, and
 * for `/api/cron/dance-logos` a 300-second outbound crawl — under this shape:
 *
 *   if (expectedSecret) { check it } else { console.warn(...); }
 *
 * i.e. it FAILED OPEN. `CRON_SECRET` is only documented in `.env.example` and
 * is absent from `.env` and `.env.local`, so on any environment that had not set
 * it, an anonymous `GET` to either URL ran the job. The `user-agent` sniffing
 * for `vercel-cron` made it look deliberate and is not: that header is
 * caller-controlled and only ever mattered because the bearer comparison ran
 * first anyway.
 *
 * The rule now mirrors `/api/dance/ingest`, which already fails closed:
 *
 *   secret configured  -> it must be presented, compared in constant time.
 *   secret missing,
 *     production       -> 503. Not configured means not callable. Failing open
 *                         here means an unauthenticated caller can trigger a
 *                         privileged database write.
 *   secret missing,
 *     local dev        -> allowed, loudly, so `npm run dev` still works.
 */

export type CronAuthResult = { ok: true } | { ok: false; status: number; body: object };

export function authorizeCronRequest(request: NextRequest, routeLabel: string): CronAuthResult {
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    if (process.env.NODE_ENV === 'production') {
      return {
        ok: false,
        status: 503,
        body: {
          error: `${routeLabel} is not configured. Set CRON_SECRET to enable this endpoint.`,
        },
      };
    }

    console.warn(
      `[${routeLabel}] CRON_SECRET is not set. Running unauthenticated because NODE_ENV is not "production". Never do this in a deployment.`
    );
    return { ok: true };
  }

  const authHeader = request.headers.get('authorization');
  const bearerSecret = authHeader?.replace(/^Bearer\s+/i, '') ?? '';
  const queryKey = request.nextUrl.searchParams.get('key') ?? '';

  // Compare SHA-256 digests with timingSafeEqual: fixed-length, and the
  // candidate's content cannot influence whether comparison short-circuits.
  // (The previous hand-rolled 32-bit hash had a collision space of ~2^32 and
  // the final `===` on the raw strings was not constant-time.)
  const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();
  const matches = timingSafeEqual(digest(bearerSecret), digest(expectedSecret));
  const matchesQuery = timingSafeEqual(digest(queryKey), digest(expectedSecret));

  if (!matches && !matchesQuery) {
    return {
      ok: false,
      status: 401,
      body: { error: 'Unauthorized: Invalid CRON_SECRET token.' },
    };
  }

  return { ok: true };
}