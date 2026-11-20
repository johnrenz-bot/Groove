/**
 * Provider infrastructure for GroovePH's AI features.
 *
 * `providers/gemini.ts` implements the Gemini client with a Groq → OpenRouter
 * free-tier fallback, retry/backoff with per-model quota cooldowns, and a
 * truthful health probe. It knows nothing about the Grooveyy persona — the
 * Groovey feature keeps its prompts under `features/groovey/server/`.
 */
export {
  FALLBACK_MODELS,
  MAX_ATTEMPTS_PER_MODEL,
  PRIMARY_MODEL,
  RETRY_AFTER_HONOR_MAX_MS,
  RETRY_AFTER_UNUSEFUL_THRESHOLD_SECONDS,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_TOTAL_BUDGET_MS,
  checkTruthfulHealth,
  clearModelCooldown,
  computeBackoffDelayMs,
  extractQuotaInfo,
  generateContentWithFallbackAndRetry,
  generateFreeFallbackProvider,
  getErrorStatus,
  getGeminiApiKey,
  getGeminiClient,
  getGroqApiKey,
  getModelChain,
  getModelCooldown,
  getOpenRouterApiKey,
  getUserFriendlyErrorMessage,
  isDailyQuotaError,
  isPermanentError,
  isTransientError,
  markModelQuotaCooldown,
  recordActiveProviderStatus,
  redactSecrets,
  sleep,
  streamFreeFallbackProvider,
} from './providers/gemini';
export type { CachedHealth, FallbackMessage, GenerateContentParams, QuotaInfo } from './providers/gemini';
