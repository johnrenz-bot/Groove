import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getGeminiClient,
  getGeminiApiKey,
  GROOVEYY_SYSTEM_INSTRUCTION,
  generateContentWithFallbackAndRetry,
  getUserFriendlyErrorMessage,
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
    });

    return NextResponse.json({ text: response.text || '' });
  } catch (err: unknown) {
    console.error('Groovey Gemini generate error:', err);
    return NextResponse.json({ error: getUserFriendlyErrorMessage(err) }, { status: 500 });
  }
}
