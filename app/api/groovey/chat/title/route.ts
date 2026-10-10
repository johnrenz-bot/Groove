import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getGeminiClient,
  getGeminiApiKey,
  generateContentWithFallbackAndRetry,
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

    // 2. Parse request body
    const body = await req.json().catch(() => null);
    const { prompt } = body || {};

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json({ title: prompt.slice(0, 32).trim() });
    }

    const ai = getGeminiClient();
    const response = await generateContentWithFallbackAndRetry(ai, {
      contents: `Generate a concise 3 to 5 word session title for this performing arts coaching request: "${prompt}". Return ONLY the title text, with no quotes or punctuation at the end.`,
      config: {
        maxOutputTokens: 20,
        temperature: 0.4,
      },
    });

    const title = response.text ? response.text.trim().replace(/^["']|["']$/g, '') : prompt.slice(0, 30);
    return NextResponse.json({ title: title || 'Performing Arts Session' });
  } catch (error: unknown) {
    console.error('Groovey title generation error:', error);
    return NextResponse.json({ title: 'Performing Arts Session' });
  }
}
