import {
  getGeminiClient,
  getGeminiApiKey,
  generateContentWithFallbackAndRetry,
  generateFreeFallbackProvider,
} from '@/features/groovey/server/gemini';

export interface CoachContext {
  id?: string;
  fullName: string;
  role?: string | null;
  talents?: string | null;
  genres?: string | null;
  bio?: string | null;
  serviceFee?: number | null;
  hourlyRate?: number | null;
  location?: string | null;
  duration?: string | null;
  paymentType?: string | null;
  paymentProvider?: string | null;
  paymentHandle?: string | null;
  noticeHours?: number | null;
  noticeDays?: number | null;
  cancellationMethod?: string | null;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
  status?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  verified?: boolean | null;
  photoUrl?: string | null;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Builds the truthful, grounded system prompt for a specific coach assistant.
 */
export function buildCoachSystemPrompt(coach: CoachContext): string {
  const fact = (value: string | number | null | undefined) =>
    value === null || value === undefined || value === '' ? '(not provided)' : String(value);

  const feeDescription = coach.serviceFee
    ? `PHP ${coach.serviceFee} per session${coach.duration ? ` (${coach.duration})` : ''}`
    : '(not provided)';

  const ratingsDescription =
    coach.rating !== undefined && coach.rating !== null
      ? `${coach.rating} / 5.0 (${coach.ratingCount ?? 0} reviews)`
      : '(not provided)';

  const coachInfo = `
VERIFIED COACH PROFILE DATA (from Groove PH Database):
- Full Name: Coach ${coach.fullName}
- Primary Discipline: ${fact(coach.talents)}
- Specific Styles / Genres / Specialties: ${fact(coach.genres)}
- Background, Bio & Experience: ${fact(coach.bio)}
- Session Fee: ${feeDescription}
- Session Duration: ${fact(coach.duration)}
- Location: ${fact(coach.location)}
- Payment Method: ${fact(coach.paymentType)}
- Payment Handle: ${fact(coach.paymentHandle)}
- Notice Requirement: ${
    coach.noticeHours || coach.noticeDays
      ? `${fact(coach.noticeHours)} hours / ${fact(coach.noticeDays)} days notice required`
      : '(not provided)'
  }
- Cancellation Method: ${fact(coach.cancellationMethod)}
- Ratings & Reviews: ${ratingsDescription}
- Account Verification: ${coach.verified ? 'Verified Performing Arts Coach' : 'Registered Coach'}
`.trim();

  return `
You are the dedicated AI Coach Assistant for Coach ${coach.fullName} on Groove PH (GrooveSystem), the performing-arts platform in San Jose del Monte, Bulacan, Philippines.

PRIMARY ROLE:
You represent Coach ${coach.fullName} specifically. Answer questions accurately, warmly, and clearly regarding Coach ${coach.fullName}'s specialties, dance/music/acting styles, beginner suitability, unique coaching strengths, session rates, and booking guidance.

${coachInfo}

ABSOLUTE TRUTHFULNESS & GROUNDING RULES:
1. NEVER INVENT INFORMATION: Everything you state about Coach ${coach.fullName}, their styles, rates, schedule, location, policies, or background MUST be derived from the "VERIFIED COACH PROFILE DATA" above.
2. MISSING DETAILS: If a detail reads "(not provided)" or is not listed (such as private phone numbers, personal email, specific unlisted styles, or live real-time calendar availability), you MUST politely and clearly state that it is not listed on their public profile, and invite the user to message the coach directly via Groove PH or check the booking calendar.
3. STYLES & GENRES: When asked "What styles does this coach teach?", enumerate their listed primary discipline and specific genres/styles accurately and enthusiastically.
4. BEGINNER SUITABILITY: When asked "Is this coach suitable for beginners?", provide an encouraging and context-aware response based on their disciplines and bio. Explain that their coaching sessions accommodate students at varying stages, and suggest specifying their experience level when booking.
5. WHAT MAKES THIS COACH DIFFERENT / UNIQUE: When asked "What makes this coach different?", highlight their distinct combination of disciplines, genres, background experience, and artistic approach as stated in their bio.
6. PRICING & SESSIONS: Quote their session fee and duration accurately as a flat per-session fee. Do not calculate or invent an hourly rate unless specified.
7. GENERAL COACHING & PREP ADVICE: If the user asks for practice, warm-up, or preparation advice for their upcoming session with Coach ${coach.fullName}, you may provide practical performing arts tips (structured as clean bullet points or numbered steps) as general guidance.
8. TONE & FORMATTING: Warm, professional, articulate, and encouraging. Use clean Markdown formatting with bold highlights and bullet points for readability. Keep responses concise and easy to read on mobile.
`.trim();
}

/**
 * Executes a question answering turn for a coach assistant.
 * Uses GrooveSystem's Gemini integration first with multi-tier fallback.
 */
export async function askCoachAssistant(
  userPrompt: string,
  coach: CoachContext,
  history: ChatTurn[] = []
): Promise<string> {
  const systemPrompt = buildCoachSystemPrompt(coach);

  // 1. Try Gemini engine if configured
  const geminiApiKey = getGeminiApiKey();
  if (geminiApiKey) {
    try {
      const ai = getGeminiClient();

      const contextTurns = history.slice(-12).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const contents = [
        ...contextTurns,
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ];

      const response = await generateContentWithFallbackAndRetry(ai, {
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        },
      });

      if (response?.text && response.text.trim()) {
        return response.text.trim();
      }
    } catch (geminiErr) {
      console.warn('[CoachAssistant] Gemini execution error, attempting fallback:', geminiErr);
    }
  }

  // 2. Try Secondary Free Fallback Provider (Groq / OpenRouter)
  try {
    const fallbackMessages = [
      ...history.slice(-12).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userPrompt },
    ];

    const fallbackResult = await generateFreeFallbackProvider({
      messages: fallbackMessages,
      systemInstruction: systemPrompt,
      temperature: 0.3,
    });

    if (fallbackResult && fallbackResult.trim()) {
      return fallbackResult.trim();
    }
  } catch (fallbackErr) {
    console.warn('[CoachAssistant] Secondary fallback failed:', fallbackErr);
  }

  // 3. Fallback direct OpenRouter call if OPENROUTER_API_KEY is present
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey && openRouterKey !== 'your-openrouter-api-key') {
    try {
      const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Groove Performing Arts Platform',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          return content.trim();
        }
      }
    } catch (openRouterErr) {
      console.warn('[CoachAssistant] OpenRouter direct fallback failed:', openRouterErr);
    }
  }

  // 4. Deterministic graceful response if no AI keys are available
  return `Hello! I am Coach ${coach.fullName}'s Groove Assistant. Coach ${coach.fullName} specializes in **${coach.talents || 'Performing Arts'}**${coach.genres ? ` (*${coach.genres}*)` : ''}. Their session fee is **${coach.serviceFee ? `₱${coach.serviceFee}` : 'available upon request'}**${coach.duration ? ` for ${coach.duration}` : ''}. Feel free to message Coach ${coach.fullName} or book a session directly on Groove PH!`;
}
