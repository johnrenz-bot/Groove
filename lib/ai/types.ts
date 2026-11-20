/**
 * Shared AI provider contract types.
 *
 * These re-export the types the Gemini/Groq/OpenRouter provider stack
 * (`lib/ai/providers/gemini.ts`) already publishes, so consumers have one
 * canonical import path for the provider contract.
 */
export type {
  FallbackMessage,
  GenerateContentParams,
  QuotaInfo,
  CachedHealth,
} from './providers/gemini';
