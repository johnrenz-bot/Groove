/**
 * T2 — Abuse protection for `POST /api/send-email`.
 *
 * Two independent controls, both reusing the in-memory limiter in
 * `lib/rateLimit.ts` (no new dependencies):
 *
 *   1. Per-IP rate limits: 3 requests / minute AND 20 requests / day.
 *      Both are enforced on every call. Implemented as two separate keys
 *      (`send-email:min:<ip>` / `send-email:day:<ip>`) so a minute window
 *      never eats the daily window and vice versa.
 *      NOTE: the limiter is in-memory per process/instance. On a multi-instance
 *      serverless deployment the counters are NOT shared, so these limits are a
 *      first line of defence, not a hard guarantee. A shared store
 *      (Upstash/Redis) or Supabase-based ledger would be needed for a global
 *      limit; that is a deliberate future step, not part of this change.
 *
 *   2. Same-origin validation for the Origin header:
 *      - Origin present: it must parse as a URL whose host equals the request's
 *        own `host` header and whose protocol equals the server-side protocol
 *        (never the caller's `x-forwarded-*`). Anything else -> reject 403.
 *      - Origin absent (or the opaque "null"): allowed, and documented as the
 *        approved limitation. Non-browser clients (curl, health checks, some
 *        in-app webviews) legitimately omit Origin, and this endpoint's abuse
 *        ceiling stays low because the template is fixed.
 *
 * Rejected requests still consume daily quota: rateLimit() increments before a
 * denial is reported, so a sustained abuser burns through their own budget.
 */

import { clientIp, rateLimit } from './rateLimit.ts';

export const SEND_EMAIL_MIN_LIMIT = 3;
export const SEND_EMAIL_MIN_WINDOW_MS = 60_000;
export const SEND_EMAIL_DAY_LIMIT = 20;
export const SEND_EMAIL_DAY_WINDOW_MS = 86_400_000;

export interface RateCheckResult {
  allowed: boolean;
  /** Seconds until the controlling window resets; 0 when allowed. */
  retryAfter: number;
  /** Which limit(s) deny the call. 'ok' when allowed. */
  reason: 'ok' | 'minute' | 'day' | 'both';
}

/** Enforce both the per-minute and the per-day limit for an IP. */
export function checkSendEmailRateLimit(ip: string): RateCheckResult {
  const minute = rateLimit(`send-email:min:${ip}`, SEND_EMAIL_MIN_LIMIT, SEND_EMAIL_MIN_WINDOW_MS);
  const day = rateLimit(`send-email:day:${ip}`, SEND_EMAIL_DAY_LIMIT, SEND_EMAIL_DAY_WINDOW_MS);

  if (minute.allowed && day.allowed) {
    return { allowed: true, retryAfter: 0, reason: 'ok' };
  }
  const reason: RateCheckResult['reason'] = !minute.allowed && !day.allowed
    ? 'both'
    : !minute.allowed
      ? 'minute'
      : 'day';
  return { allowed: false, retryAfter: Math.max(minute.retryAfter, day.retryAfter), reason };
}

/** The actionable client IP for this request (see lib/rateLimit.ts#clientIp). */
export function sendEmailClientIp(request: Request): string {
  return clientIp(request);
}

export type OriginDecision =
  | { allowed: true; reason: 'same-origin' | 'missing-origin' }
  | { allowed: false; reason: 'unparseable-origin' | 'missing-host' | 'host-mismatch' | 'protocol-mismatch' };

/**
 * Decide whether a request carrying `Origin: <originHeader>` is same-origin
 * with the deployment it reached. `hostHeader` is the request's own `Host`
 * header — the value the server actually routed on — and `serverProtocol` is
 * the protocol part of the URL the server was reached by ("http:" / "https:"),
 * taken from `new URL(request.url).protocol`, not from caller input.
 */
export function sameOriginDecision(
  originHeader: string | null,
  hostHeader: string | null,
  serverProtocol: string
): OriginDecision {
  // Approved limitation: no Origin at all (curl, server-to-server, some
  // browsers on cross-origin redirects / opaque origins). Allowed, logged nowhere.
  if (!originHeader || originHeader === 'null') {
    return { allowed: true, reason: 'missing-origin' };
  }

  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return { allowed: false, reason: 'unparseable-origin' };
  }

  const host = hostHeader?.trim();
  if (!host) {
    // We can see an Origin but cannot verify it against the arriving host.
    // Unverifiable cross-context traffic is rejected rather than assumed friendly.
    return { allowed: false, reason: 'missing-host' };
  }

  if (origin.host !== host) {
    return { allowed: false, reason: 'host-mismatch' };
  }
  if (origin.protocol !== serverProtocol) {
    return { allowed: false, reason: 'protocol-mismatch' };
  }

  return { allowed: true, reason: 'same-origin' };
}
