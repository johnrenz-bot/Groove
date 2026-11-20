/**
 * AI provider error helpers — re-exports of the provider stack's retry and
 * error classification. One import path for callers that need to decide
 * whether to retry, fall back, or surface a user-facing message.
 */
export {
  isTransientError,
  isPermanentError,
  isDailyQuotaError,
  redactSecrets,
  getUserFriendlyErrorMessage,
  computeBackoffDelayMs,
} from './providers/gemini';
