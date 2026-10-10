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

export const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
export const FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
];

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

/**
 * Checks if an error is transient (e.g. 503 high demand / service unavailable, 429 rate limit, 500, socket resets)
 */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const status = Number(
    (err as { status?: number; code?: number; statusCode?: number })?.status ||
      (err as { status?: number; code?: number; statusCode?: number })?.code ||
      (err as { status?: number; code?: number; statusCode?: number })?.statusCode
  );
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
  const status = Number(
    (err as { status?: number; code?: number; statusCode?: number })?.status ||
      (err as { status?: number; code?: number; statusCode?: number })?.code ||
      (err as { status?: number; code?: number; statusCode?: number })?.statusCode
  );
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
 * Formats a clean, user-friendly error message, strictly concealing API keys and credentials.
 */
export function getUserFriendlyErrorMessage(err: unknown): string {
  if (!err) return 'An unexpected error occurred. Please try again.';

  if (isTransientError(err)) {
    return 'The AI coaching service is currently experiencing high demand. Please try again in a few moments.';
  }

  const raw = (err as { message?: string })?.message || String(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // not JSON
  }

  return raw;
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
    // Test a minimal ping with the primary model
    await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: 'ping',
      config: { maxOutputTokens: 1 },
    });

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
    const errObj = err as { status?: number; code?: number; message?: string };
    const status = Number(errObj?.status || errObj?.code);

    // Authentication failure
    if (status === 401 || String(errObj?.message).includes('401') || String(errObj?.message).includes('UNAUTHENTICATED')) {
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

    // High demand (503) or rate limit (429) -> check if fallback model works
    if (isTransientError(err)) {
      try {
        const ai = getGeminiClient();
        await ai.models.generateContent({
          model: FALLBACK_MODELS[0],
          contents: 'ping',
          config: { maxOutputTokens: 1 },
        });

        healthCache = {
          status: 'ready',
          provider: 'Google Gemini (Fallback Active)',
          model: FALLBACK_MODELS[0],
          activeProvider: 'gemini',
          message: `High demand on ${PRIMARY_MODEL} (503). Automatic fallback to ${FALLBACK_MODELS[0]} is active.`,
          hasKey: true,
          fallbackModels: FALLBACK_MODELS,
          secondaryFallbackAvailable: hasSecondary,
          freeTierNote: 'Gemini Developer API Free Tier: 15 RPM / 1M TPM.',
          checkedAt: now,
        };
        return healthCache;
      } catch {
        // If secondary free fallback (Groq) is configured, report ready via secondary
        if (groqKey) {
          healthCache = {
            status: 'ready',
            provider: 'Groq Cloud (Free Tier Fallback)',
            model: 'llama-3.3-70b-versatile',
            activeProvider: 'groq',
            message: 'Gemini busy (503). Active free-tier fallback to Groq LLaMA 3.3 70B.',
            hasKey: true,
            fallbackModels: FALLBACK_MODELS,
            secondaryFallbackAvailable: true,
            freeTierNote: 'Groq Free Tier: 14,400 RPD / 100k TPM.',
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
    }

    healthCache = {
      status: 'unavailable',
      provider: 'Google Gemini',
      model: PRIMARY_MODEL,
      activeProvider: 'none',
      message: errObj?.message || 'Gemini service unreachable',
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
 * Executes generateContent with safe retry & model fallback for transient 503/429 errors.
 * Includes optional secondary free-tier provider fallback (Groq / OpenRouter) if configured.
 */
export async function generateContentWithFallbackAndRetry(
  ai: GoogleGenAI,
  params: GenerateContentParams
) {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
  let lastError: unknown = null;

  for (const model of models) {
    const maxRetries = 2; // 1 initial attempt + 1 retry for transient errors
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents as Parameters<typeof ai.models.generateContent>[0]['contents'],
          config: params.config,
        });
        recordActiveProviderStatus('gemini', model, true, `Connected via ${model}`);
        return response;
      } catch (err: unknown) {
        lastError = err;

        // Permanent errors (401, 400, 403): throw immediately
        if (isPermanentError(err)) {
          recordActiveProviderStatus('gemini', model, false, 'Authentication or parameter error');
          throw err;
        }

        // 404 (model not found): advance to next fallback model immediately
        const errObj = err as { status?: number; code?: number };
        const status = Number(errObj?.status || errObj?.code);
        if (status === 404) {
          break;
        }

        // Transient error with retries remaining: exponential backoff with jitter
        if (isTransientError(err) && attempt < maxRetries - 1) {
          const delay = 500 * Math.pow(2, attempt) + Math.random() * 200;
          await sleep(delay);
          continue;
        }

        // Transient error with retries exhausted: break to next model
        if (isTransientError(err)) {
          break;
        }

        break;
      }
    }
  }

  // If all Gemini models encountered transient failures, attempt secondary free fallback provider if configured
  if (params.messagesForFallback && isTransientError(lastError)) {
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
