/**
 * COMPATIBILITY SHIM.
 *
 * The implementation of the Gemini/Groq/OpenRouter provider stack now lives in
 * `@/lib/ai/providers/gemini` (pure provider infrastructure, no Groovey-specific
 * copy). This shim keeps the historical import path working for callers that
 * import from `@/features/groovey/server/gemini`, and supplies the Grooveyy
 * system instruction as the default for `generateContentWithFallbackAndRetry`
 * when the caller does not pass one (every current caller relies on it).
 */
import { GROOVEYY_SYSTEM_INSTRUCTION } from './prompts/grooveySystemInstruction';
import {
  generateContentWithFallbackAndRetry as baseGenerate,
  type GenerateContentParams,
} from '@/lib/ai/providers/gemini';

export * from '@/lib/ai/providers/gemini';
export { GROOVEYY_SYSTEM_INSTRUCTION };

export async function generateContentWithFallbackAndRetry(
  ai: Parameters<typeof baseGenerate>[0],
  params: GenerateContentParams
) {
  const config = params?.config ?? {};
  return baseGenerate(ai, {
    ...params,
    config: {
      ...config,
      systemInstruction: config.systemInstruction ?? GROOVEYY_SYSTEM_INSTRUCTION,
    },
  });
}
