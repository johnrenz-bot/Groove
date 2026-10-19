import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
        { error: 'GEMINI_API_KEY is not configured on the server. Please set it in .env.local.' },
        { status: 503 }
      );
    }

    const ai = getGeminiClient();

    let contextualSystemInstruction = GROOVEYY_SYSTEM_INSTRUCTION;
    if (discipline && discipline !== 'General') {
      contextualSystemInstruction += `\nCURRENT SESSION DISCIPLINE: ${discipline}.`;
    }
    if (level && level !== 'All') {
      contextualSystemInstruction += `\nARTIST PROFICIENCY LEVEL: ${level}.`;
    }

    // Check if the last user message is asking about the platform
    const lastUserMessage = [...messages].reverse().find((m: { role: string; content?: string }) => m.role === 'user');
    const isPlatformQuery = lastUserMessage ? isAboutPlatformMessage(lastUserMessage.content || '') : false;
    const isGrooveyyQuery = lastUserMessage ? isAboutGrooveyyMessage(lastUserMessage.content || '') : false;

    // PLATFORM QUESTION MODE: High-priority block prepended for platform questions
    if (isPlatformQuery) {
      const platformModeBlock = `PLATFORM QUESTION MODE: The user is asking about the GroovePH platform. Answer ONLY from the GroovePH facts below. Do not use outside knowledge about any "Groove" event, competition, championship, or organization. GroovePH is a web platform, NOT a dance competition, championship, event, or organization. Never describe it as one.`;
      contextualSystemInstruction = platformModeBlock + '\n\n' + contextualSystemInstruction;
    }

    // Append GroovePH platform knowledge block (single source from lib/config/projectInfo.ts)
    contextualSystemInstruction += `\n\n${getGroovePhKnowledge()}`;

    const contextWindow = messages.slice(-16);
    const contents = contextWindow.map((msg: { role: string; content?: string; text?: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content || msg.text || '' }],
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