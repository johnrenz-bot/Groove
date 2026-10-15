import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getGeminiClient,
  getGeminiApiKey,
  GROOVEYY_SYSTEM_INSTRUCTION,
  PRIMARY_MODEL,
  isTransientError,
  isPermanentError,
  isDailyQuotaError,
  extractQuotaInfo,
  getErrorStatus,
  computeBackoffDelayMs,
  markModelQuotaCooldown,
  clearModelCooldown,
  getModelCooldown,
  getModelChain,
  MAX_ATTEMPTS_PER_MODEL,
  RETRY_TOTAL_BUDGET_MS,
  getUserFriendlyErrorMessage,
  sleep,
  recordActiveProviderStatus,
  streamFreeFallbackProvider,
} from '@/features/groovey/server/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate with Supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to use Groovey.' },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const body = await req.json().catch(() => null);
    const { messages, discipline, level } = body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Valid messages array is required' }, { status: 400 });
    }

    // 3. Verify server API configuration
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set in the server environment. Please configure it in .env.local.' },
        { status: 503 }
      );
    }

    const ai = getGeminiClient();

    // Build context-specific prompt
    let contextualSystemInstruction = GROOVEYY_SYSTEM_INSTRUCTION;
    if (discipline && discipline !== 'General') {
      contextualSystemInstruction += `\n\nCURRENT SESSION DISCIPLINE FOCUS: ${discipline}. Prioritize coaching frameworks and vocabulary specific to this art form.`;
    }
    if (level && level !== 'All') {
      contextualSystemInstruction += `\nARTIST PROFICIENCY LEVEL: ${level}. Calibrate terminology and complexity appropriately.`;
    }

    // Transform messages format for Google GenAI SDK (last 16 messages)
    const contextWindow = messages.slice(-16);
    const contents = contextWindow.map((msg: { role: string; content?: string; text?: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content || msg.text || '' }],
    }));

    const encoder = new TextEncoder();
    const modelsToTry = getModelChain();
    const startedAt = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        let chunksSent = 0;
        let lastError: unknown = null;

        for (const model of modelsToTry) {
          // Skip models already known to be quota-blocked. Google's per-day quota is
          // dimensioned per model, so the next model in the chain still has budget.
          if (getModelCooldown(model) > 0) {
            continue;
          }

          for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
            try {
              const responseStream = await ai.models.generateContentStream({
                model,
                contents,
                config: {
                  systemInstruction: contextualSystemInstruction,
                  temperature: 0.7,
                },
              });

              for await (const chunk of responseStream) {
                const text = chunk.text;
                if (text) {
                  chunksSent++;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              }

              // Successfully completed streaming
              clearModelCooldown(model);
              recordActiveProviderStatus('gemini', model, true);
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            } catch (err: unknown) {
              lastError = err;

              // CRITICAL: If chunks have already been sent to the client, do NOT transparently
              // restart or fallback, which would duplicate output in the UI.
              if (chunksSent > 0) {
                console.error(`Stream interrupted after sending ${chunksSent} chunks on ${model}:`, err);
                const friendlyMsg =
                  'The coaching stream was interrupted due to high server demand. Please send a new message to continue.';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: friendlyMsg })}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }

              // Permanent errors: fail immediately without retry or fallback
              if (isPermanentError(err)) {
                recordActiveProviderStatus('gemini', model, false, 'Authentication error');
                const friendlyMsg = getUserFriendlyErrorMessage(err);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: friendlyMsg })}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }

              const status = getErrorStatus(err);

              // 404 (model not supported/found): advance immediately to next fallback model
              if (status === 404) {
                break;
              }

              // Daily free-tier cap: retrying now cannot succeed. Cool this model down
              // for the rest of its quota window and fail over to a model with its own budget.
              if (isDailyQuotaError(err)) {
                const { retryAfterSeconds } = extractQuotaInfo(err);
                const cooldownMs =
                  retryAfterSeconds !== null
                    ? Math.min(retryAfterSeconds * 1000, 24 * 60 * 60 * 1000)
                    : 60 * 60 * 1000;
                markModelQuotaCooldown(model, Date.now() + cooldownMs);
                console.warn(
                  `[Groovey] ${model} daily quota exhausted. Failing over to the next model.`
                );
                break;
              }

              const budgetExhausted = Date.now() - startedAt >= RETRY_TOTAL_BUDGET_MS;

              // Transient error: bounded exponential backoff with jitter, honoring Retry-After.
              if (isTransientError(err) && attempt < MAX_ATTEMPTS_PER_MODEL - 1 && !budgetExhausted) {
                const { retryAfterSeconds } = extractQuotaInfo(err);
                const delay = computeBackoffDelayMs(attempt, retryAfterSeconds);
                await sleep(delay);
                continue;
              }

              // Retries exhausted for this model (or total budget spent): try the next model.
              if (isTransientError(err)) {
                console.warn(`[Groovey] Model ${model} unavailable. Falling back...`);
              }

              break;
            }
          }
        }

        // If all Gemini models failed before any chunk was sent, attempt secondary free fallback provider (Groq / OpenRouter) if configured
        if (chunksSent === 0 && isTransientError(lastError)) {
          try {
            const fallbackSucceeded = await streamFreeFallbackProvider(
              {
                messages: contextWindow,
                systemInstruction: contextualSystemInstruction,
                temperature: 0.7,
              },
              (textChunk) => {
                chunksSent++;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textChunk })}\n\n`));
              }
            );

            if (fallbackSucceeded && chunksSent > 0) {
              recordActiveProviderStatus('groq', 'llama-3.3-70b-versatile', true, 'Groq free fallback active');
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }
          } catch (fbErr) {
            console.error('[Groovey] Secondary free fallback stream also failed:', fbErr);
          }
        }

        // All models and retries failed before any chunk was sent
        recordActiveProviderStatus('gemini', PRIMARY_MODEL, false, 'All models unavailable');
        console.error('All configured models failed in chat stream:', lastError);
        const finalErrorMessage = getUserFriendlyErrorMessage(lastError);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: finalErrorMessage })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    console.error('API Stream Handler Error:', err);
    return NextResponse.json({ error: getUserFriendlyErrorMessage(err) }, { status: 500 });
  }
}
