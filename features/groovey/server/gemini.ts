import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export const GROOVEYY_SYSTEM_INSTRUCTION = `You are Grooveyy, a world-class, passionate, encouraging, and knowledgeable AI Performing Arts Companion and Coach.
You specialize EXCLUSIVELY in performing arts:
1. Dance and choreography (contemporary, ballet, hip-hop, jazz, tap, ballroom, modern, cultural dance, improvisation, alignment, balance, turns/pirouettes, musicality)
2. Singing and vocal techniques (vocal pedagogy, breath support, subglottic pressure, resonance, registration/mix, belt, falsetto/head voice, range extension, pitch accuracy, patter singing, diction/articulation)
3. Music and musical performance (composition, sight-reading, ear training, rhythm, phrasing, dynamics, interpretation, accompaniment, transposition)
4. Theater and acting (Stanislavski, Meisner, Uta Hagen, Michael Chekhov, scene study, monologue prep, character objectives, beats, tactics, subtext, vocal projection, emotional recall/availability)
5. Stage performance and audition preparation (callbacks, cold reading, 16/32-bar audition cuts, slate delivery, stage fright management, blocking, audition etiquette, self-tapes)
6. Rehearsal techniques and performance improvement (practice logs, metronome patter drills, muscle memory pacing, recovery, ensemble coordination)

TONE & PERSONALITY:
- Knowledgeable, empathetic, encouraging, artistic, and creatively inspiring.
- Natural, mature, supportive, and professional tone — never patronizing, clinical, or overly childish.
- Structure responses with clean, readable, theatrical-workbook formatting: use clear headings, concise tactile cues, action verbs, bullet points, or step-by-step drills.
- Adapt your technical depth dynamically based on whether the artist is a beginner, intermediate, or advanced/audition performer.
- When an artistic request is vague, ask an insightful clarifying question (e.g., character arc, musical tempo, vocal range, or dance style).
- Always include actionable cues (e.g., "Tactile Cue", "Action Verb", "Practice Cadence").
- If a musical piece or patter is discussed, suggest tempo (BPM) or metronome drills where helpful.

CRITICAL SAFETY & INJURY-PREVENTION RULES:
- Vocal Safety: For singing and vocal work, emphasize proper hydration, gentle semi-occluded vocal tract (SOVT) exercises (lip trills, straw phonation), gradual warm-ups, and vocal rest. Explicitly instruct users NEVER to push through vocal strain, raspy fatigue, or throat pain.
- Dance & Movement Safety: Emphasize proper alignment, warm-up of major joints and core, safe stretching, and proper landing mechanics. Instruct performers to stop if they feel sharp pain or joint distress.

STRICT BOUNDARY:
- Grooveyy is exclusively for performing arts. If a user asks questions entirely unrelated to performing arts (e.g. coding general software, math homework, politics, cooking, etc.), respond politely and warmly redirect them back to dance, vocal training, stage acting, music, or auditions.`;

function sanitizeApiKey(key: string): string {
  if (!key) return '';
  return key
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

/**
 * Resolves the Gemini API key with strict local development precedence:
 * 1. Project-root `.env.local` (local developer override, preventing stale OS env variables from breaking local dev)
 * 2. `process.env.GEMINI_API_KEY` (sanitized environment variable)
 * 3. Project-root `.env` (fallback)
 * 4. `process.env.GOOGLE_API_KEY` (fallback if GEMINI_API_KEY is not defined)
 *
 * Automatically strips quotes, accidental 'Bearer ' prefixes, and whitespace.
 */
export function getGeminiApiKey(): string {
  const cwd = process.cwd();

  // 1. Check .env.local in project root
  const envLocalPath = path.resolve(cwd, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    try {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      const match = content.match(/^\s*GEMINI_API_KEY\s*=\s*([^\r\n#]+)/m);
      if (match) {
        const cleaned = sanitizeApiKey(match[1]);
        if (cleaned) {
          process.env.GEMINI_API_KEY = cleaned;
          return cleaned;
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // 2. Check process.env.GEMINI_API_KEY
  if (process.env.GEMINI_API_KEY) {
    const cleaned = sanitizeApiKey(process.env.GEMINI_API_KEY);
    if (cleaned) {
      process.env.GEMINI_API_KEY = cleaned;
      return cleaned;
    }
  }

  // 3. Check .env in project root
  const envPath = path.resolve(cwd, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^\s*GEMINI_API_KEY\s*=\s*([^\r\n#]+)/m);
      if (match) {
        const cleaned = sanitizeApiKey(match[1]);
        if (cleaned) {
          process.env.GEMINI_API_KEY = cleaned;
          return cleaned;
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // 4. Fallback to GOOGLE_API_KEY if explicitly set and GEMINI_API_KEY is absent
  if (process.env.GOOGLE_API_KEY) {
    const cleaned = sanitizeApiKey(process.env.GOOGLE_API_KEY);
    if (cleaned) {
      return cleaned;
    }
  }

  return '';
}

let aiClient: GoogleGenAI | null = null;
let activeApiKey: string | null = null;

// Verified against the live ListModels endpoint for this project.
// PRIMARY_MODEL is retained: it is a valid, supported model ID.
export const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Order matters: these are tried in sequence when the primary is unavailable.
// Each entry was confirmed present in the account's supported model list.
export const FALLBACK_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
];

/**
 * Tracks models whose daily free-tier quota is exhausted, so subsequent requests fail
 * over immediately instead of burning latency on retries that cannot succeed.
 * Google's per-day quota is dimensioned per model, so a different model still has budget.
 */
const modelQuotaCooldown = new Map<string, number>();

/** Records that `model` is quota-blocked until the given epoch ms. */
export function markModelQuotaCooldown(model: string, untilEpochMs: number): void {
  modelQuotaCooldown.set(model, untilEpochMs);
  if (modelQuotaCooldown.size > 32) {
    // Bound the registry so it cannot grow without limit.
    const oldest = [...modelQuotaCooldown.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldest) modelQuotaCooldown.delete(oldest[0]);
  }
}

/** Returns the epoch ms at which `model` becomes usable again, or 0 if it is usable now. */
export function getModelCooldown(model: string): number {
  const until = modelQuotaCooldown.get(model);
  if (!until) return 0;
  if (until <= Date.now()) {
    modelQuotaCooldown.delete(model);
    return 0;
  }
  return until;
}

/** Clears any cooldown for a model, e.g. after a successful request. */
export function clearModelCooldown(model: string): void {
  modelQuotaCooldown.delete(model);
}

/** The full ordered model chain: primary first, then verified fallbacks. */
export function getModelChain(): string[] {
  return [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Please set it in .env.local in the project root.'
    );
  }

  // Check for conflicting GOOGLE_API_KEY without exposing secret values in logs
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== apiKey) {
    console.warn(
      '[GrooveyAI] Notice: Both GOOGLE_API_KEY and GEMINI_API_KEY are detected. Using GEMINI_API_KEY for the Gemini Developer API.'
    );
  }

  if (!aiClient || activeApiKey !== apiKey) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    activeApiKey = apiKey;
  }
  return aiClient;
}

/** Details Google attaches to a 429/503 so we can distinguish a burst limit from a daily cap. */
export interface QuotaInfo {
  status: number | null;
  /** Seconds to wait, from `google.rpc.RetryInfo` / `Retry-After`. */
  retryAfterSeconds: number | null;
  /** e.g. `GenerateRequestsPerDayPerProjectPerModel-FreeTier`. */
  quotaId: string | null;
  /** The limit value reported for the violated quota, when present. */
  quotaValue: number | null;
  /** The model the violated quota is dimensioned for. */
  model: string | null;
}

/**
 * Extracts a numeric HTTP status from the error shapes this codebase sees:
 * `@google/genai` `ApiError` (`.status`), fetch responses, and plain objects.
 */
export function getErrorStatus(err: unknown): number | null {
  if (!err) return null;
  const candidate = err as {
    status?: unknown;
    code?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  const raw = candidate.status ?? candidate.code ?? candidate.statusCode ?? candidate.response?.status;
  const status = Number(raw);
  return Number.isFinite(status) && status > 0 ? status : null;
}

/**
 * Google ships rate-limit and quota information inside a JSON payload embedded in the
 * error `message` (the SDK stringifies the RPC error). Parsing it lets us tell a short
 * burst limit (retry in seconds) apart from a daily free-tier cap (resets in hours),
 * which is what separates a real "retry soon" from a futile retry loop.
 */
export function extractQuotaInfo(err: unknown): QuotaInfo {
  const info: QuotaInfo = {
    status: getErrorStatus(err),
    retryAfterSeconds: null,
    quotaId: null,
    quotaValue: null,
    model: null,
  };
  if (!err) return info;

  const raw = (err as { message?: unknown }).message;
  if (typeof raw !== 'string') return info;

  let payload: {
    error?: { details?: unknown };
    details?: unknown;
  } | null = null;
  try {
    const start = raw.indexOf('{');
    if (start !== -1) payload = JSON.parse(raw.slice(start));
  } catch {
    // Malformed or truncated JSON: fall through to the regex-based extraction below.
    payload = null;
  }

  const details = payload?.error?.details ?? payload?.details;

  // Regex fallback so quota detection still works if the payload is unparseable.
  if (!Array.isArray(details)) {
    const quotaId = raw.match(/"quotaId"\s*:\s*"([^"]+)"/);
    const retryDelay = raw.match(/"retryDelay"\s*:\s*"([0-9.]+)s"/);
    const quotaValue = raw.match(/"quotaValue"\s*:\s*"?([0-9.]+)"?/);
    const quotaModel = raw.match(/"quotaDimensions"\s*:\s*\{[^}]*"model"\s*:\s*"([^"]+)"/);

    if (quotaId) info.quotaId = quotaId[1];
    if (retryDelay) {
      const seconds = Number.parseFloat(retryDelay[1]);
      if (Number.isFinite(seconds)) info.retryAfterSeconds = seconds;
    }
    if (quotaValue) {
      const value = Number(quotaValue[1]);
      if (Number.isFinite(value)) info.quotaValue = value;
    }
    if (quotaModel) info.model = quotaModel[1];
  }

  if (Array.isArray(details)) {
    for (const detail of details as Array<Record<string, unknown>>) {
      const type = typeof detail?.['@type'] === 'string' ? detail['@type'] : '';

      if (type.endsWith('RetryInfo')) {
        const delay = detail.retryDelay;
        if (typeof delay === 'string') {
          const parsed = Number.parseFloat(delay);
          if (Number.isFinite(parsed)) info.retryAfterSeconds = parsed;
        } else if (typeof delay === 'number') {
          info.retryAfterSeconds = delay;
        } else if (delay && typeof (delay as { seconds?: unknown }).seconds === 'number') {
          info.retryAfterSeconds = (delay as { seconds: number }).seconds;
        }
      }

      if (type.endsWith('QuotaFailure')) {
        const violations = detail.violations as Array<Record<string, unknown>> | undefined;
        const violation = violations?.[0];
        if (violation) {
          if (typeof violation.quotaId === 'string') info.quotaId = violation.quotaId;
          if (violation.quotaValue != null) {
            const value = Number(violation.quotaValue);
            if (Number.isFinite(value)) info.quotaValue = value;
          }
          const model = (violation.quotaDimensions as { model?: unknown } | undefined)?.model;
          if (typeof model === 'string') info.model = model;
        }
      }
    }
  }

  // Fallback: human-readable form, e.g. "Please retry in 20h34m36.178719637s."
  if (info.retryAfterSeconds === null) {
    const human = raw.match(/retry in (\d+)h(\d+)m/i);
    if (human) info.retryAfterSeconds = Number(human[1]) * 3600 + Number(human[2]) * 60;
  }

  return info;
}

/**
 * A wait longer than this cannot be honoured inside a single request, so retrying is futile
 * and we should fail over to another model instead.
 */
export const RETRY_AFTER_UNUSEFUL_THRESHOLD_SECONDS = 60;

/**
 * True when the 429 represents an exhausted *daily* free-tier budget rather than a
 * short-lived burst limit. Retrying such a request only wastes latency and quota.
 */
export function isDailyQuotaError(err: unknown): boolean {
  const { status, retryAfterSeconds, quotaId } = extractQuotaInfo(err);
  if (status !== 429) return false;
  if (quotaId && quotaId.includes('PerDay')) return true;
  return retryAfterSeconds !== null && retryAfterSeconds > RETRY_AFTER_UNUSEFUL_THRESHOLD_SECONDS;
}

/** Bounded exponential backoff parameters. Caps keep a request from hanging. */
export const RETRY_BASE_DELAY_MS = 500;
export const RETRY_MAX_DELAY_MS = 8_000;
/**
 * Upper bound applied when we defer to the provider's own Retry-After hint. Waiting exactly
 * as long as Google asks is respected up to this point, so short burst limits are honored
 * precisely while long waits still fall back to the computed backoff.
 */
export const RETRY_AFTER_HONOR_MAX_MS = 30_000;
export const RETRY_TOTAL_BUDGET_MS = 25_000;
export const MAX_ATTEMPTS_PER_MODEL = 3;

/**
 * Bounded exponential backoff with jitter. Honors the provider's Retry-After / RetryInfo
 * when the requested wait is short enough to be useful inside a request, and never exceeds
 * {@link RETRY_MAX_DELAY_MS}.
 */
export function computeBackoffDelayMs(attempt: number, retryAfterSeconds: number | null): number {
  const exponential = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, RETRY_MAX_DELAY_MS);
  const jitter = Math.random() * RETRY_MAX_DELAY_MS * 0.25;
  const computed = Math.min(capped + jitter, RETRY_MAX_DELAY_MS);

  // Defer to the provider's own hint when it asks for a short, workable wait.
  // Longer hints (e.g. a 20-hour daily-cap reset) are deliberately ignored here —
  // they are handled by the model-failover path instead of stalling the request.
  if (retryAfterSeconds !== null && retryAfterSeconds > 0) {
    const requestedMs = retryAfterSeconds * 1000;
    if (requestedMs <= RETRY_AFTER_HONOR_MAX_MS) {
      return Math.round(Math.min(Math.max(computed, requestedMs), RETRY_AFTER_HONOR_MAX_MS));
    }
  }

  return Math.round(computed);
}

/**
 * Checks if an error is transient (503 high demand / service unavailable, 429 rate limit, 500, socket resets)
 */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const status = getErrorStatus(err);
  if (status === 503 || status === 429 || status === 500 || status === 502 || status === 504) {
    return true;
  }
  const message = typeof (err as { message?: string })?.message === 'string' ? (err as { message?: string }).message! : '';
  const lowerMsg = message.toLowerCase();
  return (
    lowerMsg.includes('503') ||
    lowerMsg.includes('429') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('overloaded') ||
    lowerMsg.includes('temporarily unavailable') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('fetch failed')
  );
}

/**
 * Checks if an error is permanent (e.g. 401 unauthenticated, 400 invalid argument, 403 forbidden)
 */
export function isPermanentError(err: unknown): boolean {
  if (!err) return false;
  const status = getErrorStatus(err);
  if (status === 400 || status === 401 || status === 403) {
    return true;
  }
  const message = typeof (err as { message?: string })?.message === 'string' ? (err as { message?: string }).message! : '';
  const lowerMsg = message.toLowerCase();
  return (
    lowerMsg.includes('401') ||
    lowerMsg.includes('403') ||
    lowerMsg.includes('unauthenticated') ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('invalid_argument')
  );
}

/**
 * Strips anything that resembles a credential from text that will be returned to the client.
 * Provider errors occasionally echo the request (including the key) back in the message.
 */
export function redactSecrets(input: string): string {
  if (!input) return input;
  return input
    .replace(/AIza[0-9A-Za-z\-_]{10,}/g, '[redacted-api-key]')
    .replace(/\bAQ\.Ab8[0-9A-Za-z\-_]{10,}/g, '[redacted-api-key]')
    .replace(/(x-goog-api-key|api[-_]?key|authorization)("?\s*[:=]\s*"?)([^\s",}]+)/gi, '$1$2[redacted]');
}

/**
 * Formats a clean, user-friendly error message, strictly concealing API keys and credentials.
 */
export function getUserFriendlyErrorMessage(err: unknown): string {
  if (!err) return 'An unexpected error occurred. Please try again.';

  // A daily free-tier cap is reported accurately instead of being mislabelled as "high demand".
  if (isDailyQuotaError(err)) {
    const { retryAfterSeconds } = extractQuotaInfo(err);
    if (retryAfterSeconds !== null && retryAfterSeconds >= 3600) {
      const hours = Math.floor(retryAfterSeconds / 3600);
      const minutes = Math.round((retryAfterSeconds % 3600) / 60);
      return `The daily free-tier request limit for Google Gemini has been reached. The quota resets in about ${hours}h ${minutes}m. Your message has been kept — try again after the reset, or add billing to lift the cap.`;
    }
    return 'The daily free-tier request limit for Google Gemini has been reached. Your message has been kept — please try again later.';
  }

  if (isTransientError(err)) {
    return 'The AI coaching service is currently experiencing high demand. Please try again in a few moments.';
  }

  const raw = (err as { message?: string })?.message || String(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error?.message) {
      return redactSecrets(parsed.error.message);
    }
  } catch {
    // not JSON
  }

  return redactSecrets(raw);
}

export function getGroqApiKey(): string {
  const cwd = process.cwd();
  const envLocalPath = path.resolve(cwd, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    try {
      const match = fs.readFileSync(envLocalPath, 'utf8').match(/^\s*GROQ_API_KEY\s*=\s*([^\r\n#]+)/m);
      if (match) return sanitizeApiKey(match[1]);
    } catch {}
  }
  return sanitizeApiKey(process.env.GROQ_API_KEY || '');
}

export function getOpenRouterApiKey(): string {
  const cwd = process.cwd();
  const envLocalPath = path.resolve(cwd, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    try {
      const match = fs.readFileSync(envLocalPath, 'utf8').match(/^\s*OPENROUTER_API_KEY\s*=\s*([^\r\n#]+)/m);
      if (match) return sanitizeApiKey(match[1]);
    } catch {}
  }
  return sanitizeApiKey(process.env.OPENROUTER_API_KEY || '');
}

/**
 * Optional secondary genuinely free-tier fallback stream via Groq (LLaMA 3.3 70B) or OpenRouter (:free).
 * Only invoked if configured in environment and Gemini models encounter transient 503/overload.
 */
export interface FallbackMessage {
  role: string;
  content?: string;
  text?: string;
  parts?: { text?: string }[];
}

export async function streamFreeFallbackProvider(
  params: {
    messages: FallbackMessage[];
    systemInstruction: string;
    temperature?: number;
  },
  onChunk: (text: string) => void
): Promise<boolean> {
  const groqKey = getGroqApiKey();
  if (groqKey) {
    try {
      const formatted = [
        { role: 'system', content: params.systemInstruction },
        ...params.messages.map((m) => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.parts ? m.parts.map((p) => p.text || '').join('') : (m.content || m.text || ''),
        })),
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: formatted,
          temperature: params.temperature ?? 0.7,
          stream: true,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') return true;
            try {
              const json = JSON.parse(dataStr);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) onChunk(delta);
            } catch {}
          }
        }
        return true;
      }
    } catch (err) {
      console.warn('[GrooveyAI] Groq fallback provider stream attempt failed:', err);
    }
  }

  const openRouterKey = getOpenRouterApiKey();
  if (openRouterKey) {
    try {
      const formatted = [
        { role: 'system', content: params.systemInstruction },
        ...params.messages.map((m) => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.parts ? m.parts.map((p) => p.text || '').join('') : (m.content || m.text || ''),
        })),
      ];

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: formatted,
          temperature: params.temperature ?? 0.7,
          stream: true,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') return true;
            try {
              const json = JSON.parse(dataStr);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) onChunk(delta);
            } catch {}
          }
        }
        return true;
      }
    } catch (err) {
      console.warn('[GrooveyAI] OpenRouter fallback provider stream attempt failed:', err);
    }
  }

  return false;
}

/**
 * Optional secondary genuinely free-tier fallback for non-streaming requests.
 */
export async function generateFreeFallbackProvider(params: {
  messages: FallbackMessage[];
  systemInstruction: string;
  temperature?: number;
}): Promise<string | null> {
  const groqKey = getGroqApiKey();
  if (groqKey) {
    try {
      const formatted = [
        { role: 'system', content: params.systemInstruction },
        ...params.messages.map((m) => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.parts ? m.parts.map((p) => p.text || '').join('') : (m.content || m.text || ''),
        })),
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: formatted,
          temperature: params.temperature ?? 0.7,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content || null;
      }
    } catch (err) {
      console.warn('[GrooveyAI] Groq fallback non-stream attempt failed:', err);
    }
  }

  const openRouterKey = getOpenRouterApiKey();
  if (openRouterKey) {
    try {
      const formatted = [
        { role: 'system', content: params.systemInstruction },
        ...params.messages.map((m) => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.parts ? m.parts.map((p) => p.text || '').join('') : (m.content || m.text || ''),
        })),
      ];

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: formatted,
          temperature: params.temperature ?? 0.7,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content || null;
      }
    } catch (err) {
      console.warn('[GrooveyAI] OpenRouter fallback non-stream attempt failed:', err);
    }
  }

  return null;
}

// In-memory status probe cache to avoid flooding the API while delivering truthful status
interface CachedHealth {
  status: 'ready' | 'connecting' | 'unavailable' | 'configuration-error';
  provider: string;
  model: string;
  activeProvider: 'gemini' | 'groq' | 'openrouter' | 'none';
  message: string;
  hasKey: boolean;
  fallbackModels: string[];
  secondaryFallbackAvailable: boolean;
  freeTierNote: string;
  checkedAt: number;
}

let healthCache: CachedHealth | null = null;
const HEALTH_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export async function checkTruthfulHealth(forceFresh = false): Promise<CachedHealth> {
  const apiKey = getGeminiApiKey();
  const groqKey = getGroqApiKey();
  const openRouterKey = getOpenRouterApiKey();
  const hasSecondary = Boolean(groqKey || openRouterKey);

  if (!apiKey) {
    return {
      status: 'configuration-error',
      provider: 'Google Gemini',
      model: PRIMARY_MODEL,
      activeProvider: 'none',
      message: 'GEMINI_API_KEY is missing in server environment (.env.local)',
      hasKey: false,
      fallbackModels: FALLBACK_MODELS,
      secondaryFallbackAvailable: hasSecondary,
      freeTierNote: 'Gemini Developer API Free Tier: 15 RPM / 1M TPM.',
      checkedAt: Date.now(),
    };
  }

  const now = Date.now();
  if (!forceFresh && healthCache && now - healthCache.checkedAt < HEALTH_CACHE_TTL_MS) {
    return healthCache;
  }

  try {
    const ai = getGeminiClient();

    // Use the quota-free Models API rather than generateContent: a generation probe would
    // consume the very free-tier budget this check is meant to measure, and the UI polls
    // this endpoint on a timer.
    await ai.models.get({ model: PRIMARY_MODEL });

    healthCache = {
      status: 'ready',
      provider: 'Google Gemini',
      model: PRIMARY_MODEL,
      activeProvider: 'gemini',
      message: 'Connected and ready for rehearsals',
      hasKey: true,
      fallbackModels: FALLBACK_MODELS,
      secondaryFallbackAvailable: hasSecondary,
      freeTierNote: 'Gemini Developer API Free Tier: 15 RPM / 1M TPM.',
      checkedAt: now,
    };
    return healthCache;
  } catch (err: unknown) {
    const status = getErrorStatus(err);
    const errMessage = String((err as { message?: string })?.message ?? '');

    // Authentication failure
    if (status === 401 || errMessage.includes('401') || errMessage.includes('UNAUTHENTICATED')) {
      healthCache = {
        status: 'configuration-error',
        provider: 'Google Gemini',
        model: PRIMARY_MODEL,
        activeProvider: 'none',
        message: 'Invalid Gemini API key (401 UNAUTHENTICATED)',
        hasKey: true,
        fallbackModels: FALLBACK_MODELS,
        secondaryFallbackAvailable: hasSecondary,
        freeTierNote: 'Verify GEMINI_API_KEY at aistudio.google.com',
        checkedAt: now,
      };
      return healthCache;
    }

    // High demand (503) or rate limit (429) -> check if a fallback model is usable
    if (isTransientError(err)) {
      // A daily free-tier cap is a distinct condition from short-lived high demand.
      if (isDailyQuotaError(err)) {
        const usableModel = getModelChain().find((m) => getModelCooldown(m) === 0 && m !== PRIMARY_MODEL);

        if (usableModel) {
          healthCache = {
            status: 'ready',
            provider: 'Google Gemini (Fallback Active)',
            model: usableModel,
            activeProvider: 'gemini',
            message: `Daily free-tier limit reached on ${PRIMARY_MODEL}. Serving via ${usableModel}.`,
            hasKey: true,
            fallbackModels: FALLBACK_MODELS,
            secondaryFallbackAvailable: hasSecondary,
            freeTierNote: 'Per-model daily quota reached on the primary; fallback models have separate budget.',
            checkedAt: now,
          };
          return healthCache;
        }

        healthCache = {
          status: 'unavailable',
          provider: 'Google Gemini',
          model: PRIMARY_MODEL,
          activeProvider: 'none',
          message: 'Daily free-tier request limit reached. The quota resets later today.',
          hasKey: true,
          fallbackModels: FALLBACK_MODELS,
          secondaryFallbackAvailable: hasSecondary,
          freeTierNote: 'Daily quota exhausted. Retrying before the reset will not succeed.',
          checkedAt: now,
        };
        return healthCache;
      }

      healthCache = {
        status: 'unavailable',
        provider: 'Google Gemini',
        model: PRIMARY_MODEL,
        activeProvider: 'none',
        message: 'The AI service is temporarily experiencing high demand (503). Retrying automatically.',
        hasKey: true,
        fallbackModels: FALLBACK_MODELS,
        secondaryFallbackAvailable: hasSecondary,
        freeTierNote: 'Transient high-demand spike. Automatic backoff retries are active.',
        checkedAt: now,
      };
      return healthCache;
    }

    healthCache = {
      status: 'unavailable',
      provider: 'Google Gemini',
      model: PRIMARY_MODEL,
      activeProvider: 'none',
      message: (err as { message?: string })?.message || 'Gemini service unreachable',
      hasKey: true,
      fallbackModels: FALLBACK_MODELS,
      secondaryFallbackAvailable: hasSecondary,
      freeTierNote: 'Spike in demand or network error.',
      checkedAt: now,
    };
    return healthCache;
  }
}

/**
 * Updates the health cache when an active request succeeds or fails in real time.
 */
export function recordActiveProviderStatus(
  provider: 'gemini' | 'groq' | 'openrouter',
  model: string,
  isHealthy: boolean,
  message?: string
) {
  const hasSecondary = Boolean(getGroqApiKey() || getOpenRouterApiKey());
  healthCache = {
    status: isHealthy ? 'ready' : 'unavailable',
    provider: provider === 'groq' ? 'Groq Cloud' : provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini',
    model,
    activeProvider: isHealthy ? provider : 'none',
    message: message || (isHealthy ? 'Connected and ready' : 'High demand (503)'),
    hasKey: Boolean(getGeminiApiKey()),
    fallbackModels: FALLBACK_MODELS,
    secondaryFallbackAvailable: hasSecondary,
    freeTierNote: 'Free tier coaching mode active.',
    checkedAt: Date.now(),
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GenerateContentParams {
  contents: unknown;
  config?: { systemInstruction?: string; temperature?: number; maxOutputTokens?: number };
  messagesForFallback?: FallbackMessage[];
}

/**
 * Executes generateContent with bounded exponential backoff (full-jitter aware),
 * per-model quota cooldowns and model failover for transient 503/429 errors.
 *
 * Guarantees:
 * - Bounded attempts per model and a total retry budget, so it can never loop forever.
 * - Honors Retry-After / RetryInfo when the requested wait is short enough to be useful.
 * - Daily quota exhaustion is recorded as a cooldown and skips retries instead of
 *   repeatedly re-requesting a model that cannot serve until the next quota reset.
 * - The caller's `messagesForFallback` is preserved for the secondary free-tier provider.
 */
export async function generateContentWithFallbackAndRetry(
  ai: GoogleGenAI,
  params: GenerateContentParams
) {
  const models = getModelChain();
  let lastError: unknown = null;
  const startedAt = Date.now();

  for (const model of models) {
    // Skip models already known to be quota-blocked (different models have separate budgets).
    const cooldownUntil = getModelCooldown(model);
    if (cooldownUntil > 0) {
      continue;
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents as Parameters<typeof ai.models.generateContent>[0]['contents'],
          config: params.config,
        });
        clearModelCooldown(model);
        recordActiveProviderStatus('gemini', model, true, `Connected via ${model}`);
        return response;
      } catch (err: unknown) {
        lastError = err;

        // Permanent errors (401, 400, 403): throw immediately
        if (isPermanentError(err)) {
          recordActiveProviderStatus('gemini', model, false, 'Authentication or parameter error');
          throw err;
        }

        const status = getErrorStatus(err);

        // 404 (model not found / no longer available): advance to next model immediately.
        if (status === 404) {
          break;
        }

        // Daily free-tier cap: do not retry this model now. Cool it down for the
        // remainder of the quota window and fail over to a model with its own budget.
        if (isDailyQuotaError(err)) {
          const { retryAfterSeconds } = extractQuotaInfo(err);
          const cooldownMs =
            retryAfterSeconds !== null
              ? Math.min(retryAfterSeconds * 1000, 24 * 60 * 60 * 1000)
              : 60 * 60 * 1000;
          markModelQuotaCooldown(model, Date.now() + cooldownMs);
          break;
        }

        const budgetExhausted = Date.now() - startedAt >= RETRY_TOTAL_BUDGET_MS;

        // Transient error: bounded exponential backoff with jitter, respecting Retry-After.
        if (
          isTransientError(err) &&
          attempt < MAX_ATTEMPTS_PER_MODEL - 1 &&
          !budgetExhausted
        ) {
          const { retryAfterSeconds } = extractQuotaInfo(err);
          const delay = computeBackoffDelayMs(attempt, retryAfterSeconds);
          await sleep(delay);
          continue;
        }

        // Retries exhausted for this model (or total budget spent): advance to next model.
        break;
      }
    }
  }

  // If all Gemini models encountered transient failures, attempt secondary free fallback provider if configured
  if (params.messagesForFallback && lastError && isTransientError(lastError)) {
    const fallbackText = await generateFreeFallbackProvider({
      messages: params.messagesForFallback,
      systemInstruction: params.config?.systemInstruction || GROOVEYY_SYSTEM_INSTRUCTION,
      temperature: params.config?.temperature,
    });
    if (fallbackText) {
      recordActiveProviderStatus('groq', 'llama-3.3-70b-versatile', true, 'Active via Groq free fallback');
      return { text: fallbackText };
    }
  }

  recordActiveProviderStatus('gemini', PRIMARY_MODEL, false, 'All configured models temporarily unavailable');
  throw lastError || new Error('All configured models are temporarily unavailable.');
}
