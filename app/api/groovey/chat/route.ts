import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkGrooveyChatRate,
  validateChatBody,
  MAX_BODY_BYTES,
} from '@/lib/grooveyValidation';
import {
  getGeminiClient,
  getGeminiApiKey,
  GROOVEYY_SYSTEM_INSTRUCTION,
  generateContentWithFallbackAndRetry,
  getUserFriendlyErrorMessage,
  isDailyQuotaError,
} from '@/features/groovey/server/gemini';
import { getGroovePhKnowledge } from '@/lib/groovey/groovePhKnowledge';
import { isAboutPlatformMessage, isAboutGrooveyyMessage } from '@/features/groovey/utils/isAboutPlatform';

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

    // 2. Rate limit: shared 30/5min bucket with /api/groovey/chat/stream.
    const rate = checkGrooveyChatRate(user.id);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      );
    }

    // 3. Reject oversized payloads before buffering the body.
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request payload is too large.' }, { status: 413 });
    }

    // 4. Validate request body
    const body = await req.json().catch(() => null);
    const validation = validateChatBody(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { discipline, level } = (body ?? {}) as { discipline?: unknown; level?: unknown };
    if (discipline !== undefined && (typeof discipline !== 'string' || discipline.length > 100)) {
      return NextResponse.json({ error: 'discipline must be a string of at most 100 characters.' }, { status: 400 });
    }
    if (level !== undefined && (typeof level !== 'string' || level.length > 100)) {
      return NextResponse.json({ error: 'level must be a string of at most 100 characters.' }, { status: 400 });
    }

    // 3. Verify server API configuration
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server. Please set it in .env.local.' },
        { status: 503 }
      );
    }

    const ai = getGeminiClient();

    let contextualSystemInstruction = GROOVEYY_SYSTEM_INSTRUCTION;
    // Narrow the validated optionals for the template strings below.
    const safeDiscipline = discipline as string | undefined;
    const safeLevel = level as string | undefined;

    if (safeDiscipline && safeDiscipline !== 'General') {
      contextualSystemInstruction += `\nCURRENT SESSION DISCIPLINE: ${safeDiscipline}.`;
    }
    if (safeLevel && safeLevel !== 'All') {
      contextualSystemInstruction += `\nARTIST PROFICIENCY LEVEL: ${safeLevel}.`;
    }

    // Check if the last user message is asking about the platform
    const lastUserMessage = [...validation.messages].reverse().find((m) => m.role === 'user');
    const isPlatformQuery = lastUserMessage ? isAboutPlatformMessage(lastUserMessage.text) : false;
    const isGrooveyyQuery = lastUserMessage ? isAboutGrooveyyMessage(lastUserMessage.text) : false;

    // PLATFORM QUESTION MODE: High-priority block prepended for platform questions
    if (isPlatformQuery) {
      const platformModeBlock = `PLATFORM QUESTION MODE: The user is asking about the GroovePH platform. Answer ONLY from the GroovePH facts below. Do not use outside knowledge about any "Groove" event, competition, championship, or organization. GroovePH is a web platform, NOT a dance competition, championship, event, or organization. Never describe it as one.`;
      contextualSystemInstruction = platformModeBlock + '\n\n' + contextualSystemInstruction;
    }

    // Append GroovePH platform knowledge block (single source from lib/config/projectInfo.ts)
    contextualSystemInstruction += `\n\n${getGroovePhKnowledge()}`;

    const contextWindow = validation.messages;
    const contents = contextWindow.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const response = await generateContentWithFallbackAndRetry(ai, {
      contents,
      config: {
        systemInstruction: contextualSystemInstruction,
        temperature: 0.7,
      },
      messagesForFallback: contextWindow,
    });

    return NextResponse.json({ text: response.text || '' });
  } catch (err: unknown) {
    console.error('Groovey Gemini generate error:', err);
    // Quota exhaustion is a 429, not a server fault; surface the correct status code.
    const status = isDailyQuotaError(err) ? 429 : 500;
    return NextResponse.json({ error: getUserFriendlyErrorMessage(err) }, { status });
  }
}