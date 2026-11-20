/**
 * T4 — Abuse protection for the Groovey AI routes.
 *
 * Three controls, applied by `/api/groovey/chat`, `/api/groovey/chat/stream`
 * and `/api/groovey/chat/title` AFTER Supabase authentication (never before —
 * identity comes from `auth.getUser()`, never from the request body):
 *
 *   1. Per-user rate limits via `lib/rateLimit.ts` (in-memory, per process):
 *        - chat + stream share one bucket: 30 requests / 5 minutes
 *          (`groovey-chat:<userId>`), so switching endpoints cannot bypass
 *          the quota;
 *        - title generation: 10 requests / minute (`groovey-title:<userId>`).
 *      Limitations (documented, accepted): counters are per process — cold
 *      starts reset them and serverless instances do not share them, so these
 *      limits are a first line of defence, not a global guarantee. No Redis /
 *      Upstash in this change, per scope. The limiter's Map is never swept,
 *      so distinct user ids grow it unboundedly within a warm process
 *      (bounded by active user count, not by traffic).
 *
 *   2. Request validation for the chat endpoints:
 *        - any conversation length is accepted; the last 16 messages are sent
 *          to the provider (`messages.slice(-16)` — the original pre-removal
 *          behavior, restored). Every message is validated first; the oldest
 *          are then elided from the provider context, never silently dropped
 *          from validation;
 *        - at most 2000 characters of text per message (413);
 *        - roles limited to 'user' | 'assistant' | 'model' (400 otherwise)
 *          — the exact set the Groovey client sends;
 *        - per-message text must be a non-blank string (400);
 *        - overall body capped at 256 KB via Content-Length when present (413);
 *        - no silent truncation, no mutation of message text or order.
 *
 *   3. Title input validation: `prompt` must be a non-blank string of at most
 *      MAX_TITLE_CHARS characters.
 *
 * This module is deliberately free of server-only imports (no Supabase, no
 * env) so `scripts/test-groovey.ts` can exercise the exact code the routes
 * use, the same pattern as `scripts/test-send-email.ts`.
 */

import { rateLimit } from './rateLimit.ts';

export const GROOVEY_CHAT_LIMIT = 30;
export const GROOVEY_CHAT_WINDOW_MS = 5 * 60_000;
export const GROOVEY_TITLE_LIMIT = 10;
export const GROOVEY_TITLE_WINDOW_MS = 60_000;
export const MAX_HISTORY_MESSAGES = 16;
export const MAX_MESSAGE_CHARS = 2_000;
export const MAX_TITLE_CHARS = 2_000;
export const MAX_BODY_BYTES = 256 * 1024;

export interface GrooveyRateResult {
  allowed: boolean;
  /** Seconds until the window resets; 0 when allowed. */
  retryAfter: number;
  reason: 'ok' | 'limited';
}

/** Shared bucket for /chat and /chat/stream (30 req / 5 min / user). */
export function checkGrooveyChatRate(userId: string): GrooveyRateResult {
  const result = rateLimit(`groovey-chat:${userId}`, GROOVEY_CHAT_LIMIT, GROOVEY_CHAT_WINDOW_MS);
  return result.allowed
    ? { allowed: true, retryAfter: 0, reason: 'ok' }
    : { allowed: false, retryAfter: result.retryAfter, reason: 'limited' };
}

/** /chat/title (10 req / minute / user). */
export function checkGrooveyTitleRate(userId: string): GrooveyRateResult {
  const result = rateLimit(`groovey-title:${userId}`, GROOVEY_TITLE_LIMIT, GROOVEY_TITLE_WINDOW_MS);
  return result.allowed
    ? { allowed: true, retryAfter: 0, reason: 'ok' }
    : { allowed: false, retryAfter: result.retryAfter, reason: 'limited' };
}

export type ChatValidation =
  | { ok: true; messages: Array<{ role: 'user' | 'model'; text: string }> }
  | { ok: false; status: 400 | 413; error: string };

/** Validate the `messages` array contract used by /chat and /chat/stream. */
export function validateChatBody(body: unknown): ChatValidation {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'A JSON object body is required.' };
  }
  const { messages } = body as { messages?: unknown };

  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, status: 400, error: 'Valid messages array is required' };
  }

  const out: Array<{ role: 'user' | 'model'; text: string }> = [];
  for (const [index, msg] of messages.entries()) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      return { ok: false, status: 400, error: `messages[${index}] must be an object.` };
    }
    const m = msg as Record<string, unknown>;

    const role = m.role;
    if (role !== 'user' && role !== 'assistant' && role !== 'model') {
      return { ok: false, status: 400, error: `messages[${index}].role must be 'user', 'assistant' or 'model'.` };
    }

    const raw = typeof m.content === 'string' ? m.content : typeof m.text === 'string' ? m.text : null;
    if (raw === null) {
      return { ok: false, status: 400, error: `messages[${index}] needs a string content.` };
    }
    if (raw.length > MAX_MESSAGE_CHARS) {
      return { ok: false, status: 413, error: `messages[${index}] exceeds the ${MAX_MESSAGE_CHARS}-character limit.` };
    }
    if (raw.trim().length === 0) {
      return { ok: false, status: 400, error: `messages[${index}] is empty.` };
    }

    // Text passes through unmodified — no truncation, no reordering.
    out.push({ role: role === 'user' ? 'user' : 'model', text: raw });
  }

  // Provider context window: exactly the last 16 messages (restore of the
  // original slice(-16) behavior). Validation above already inspected every
  // message; only the provider context is elided here.
  return { ok: true, messages: out.slice(-MAX_HISTORY_MESSAGES) };
}

export type TitleValidation =
  | { ok: true; prompt: string }
  | { ok: false; status: 400 | 413; error: string };

/** Validate the `{ prompt }` contract used by /chat/title. */
export function validateTitleBody(body: unknown): TitleValidation {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'A JSON object body is required.' };
  }
  const { prompt } = body as { prompt?: unknown };

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return { ok: false, status: 400, error: 'Prompt is required' };
  }
  if (prompt.length > MAX_TITLE_CHARS) {
    return { ok: false, status: 413, error: `Prompt exceeds the ${MAX_TITLE_CHARS}-character limit.` };
  }

  return { ok: true, prompt };
}
