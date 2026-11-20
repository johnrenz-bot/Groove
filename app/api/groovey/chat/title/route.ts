import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkGrooveyTitleRate,
  validateTitleBody,
  MAX_BODY_BYTES,
} from '@/lib/grooveyValidation';
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

    // 2. Rate limit: 10 req/min per authenticated user.
    const rate = checkGrooveyTitleRate(user.id);
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
    const validation = validateTitleBody(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { prompt } = validation;

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
