/**
 * Shared AI provider configuration — the model chain and retry budget the
 * provider stack uses, re-exported for visibility and diagnostics.
 */
export {
  PRIMARY_MODEL,
  FALLBACK_MODELS,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_AFTER_HONOR_MAX_MS,
  RETRY_TOTAL_BUDGET_MS,
  MAX_ATTEMPTS_PER_MODEL,
  RETRY_AFTER_UNUSEFUL_THRESHOLD_SECONDS,
  getModelChain,
  getGeminiApiKey,
  getGroqApiKey,
  getOpenRouterApiKey,
} from './providers/gemini';
