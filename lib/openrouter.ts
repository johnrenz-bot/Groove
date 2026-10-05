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
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function askCoachAssistant(
  userPrompt: string,
  coach: CoachContext,
  history: ChatTurn[] = []
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';

  // Every line below is a real column. `(not provided)` is deliberate: the
  // model is told to repeat it rather than fill the gap, so a NULL
  // cancellation_method can never become an invented policy.
  const fact = (value: string | number | null | undefined) =>
    value === null || value === undefined || value === '' ? '(not provided)' : String(value);

  const coachInfo = `
Coach Details (from the GrooveSystem database):
Full Name: ${coach.fullName}
Role: ${fact(coach.role)}
Talent / Discipline: ${fact(coach.talents)}
Genres: ${fact(coach.genres)}
About: ${fact(coach.bio)}
Service Fee: ${coach.serviceFee ? `PHP ${coach.serviceFee} per session` : '(not provided)'}
Session Duration: ${fact(coach.duration)}
Payment Method: ${fact(coach.paymentType)}
Payment Handle: ${fact(coach.paymentHandle)}
Notice Period: ${coach.noticeHours || coach.noticeDays ? `${fact(coach.noticeHours)} hours / ${fact(coach.noticeDays)} days` : '(not provided)'}
Cancellation Method: ${fact(coach.cancellationMethod)}
Location: ${fact(coach.location)}
  `.trim();

  const systemPrompt = `
You are the AI assistant for a specific coach listed on GrooveSystem, a
performing-arts platform in San Jose del Monte, Bulacan, Philippines.

ABSOLUTE RULE — NEVER INVENT FACTS
Everything you state about the coach, their rates, genres, schedule, location,
policies or availability must come from the "Coach Details" block below. If a
value there reads "(not provided)", you MUST say it is not provided or not
listed. Do NOT guess, estimate, infer from the genre list, or fill a gap with a
plausible-sounding default. Availability and schedule are never in the data, so
never state when the coach is free.
The fee is per session, not per hour. Do not compute an hourly rate.
This is a client-facing assistant: never reveal contact details, email, address,
verification status, or any administrative information.

VOICE
Write like a friendly professional coach: warm, concise, confidence-building.
Use short sentences. Match the user's language (English / Tagalog / Taglish).
Reply in Markdown; keep it short.

GENERAL PERFORMING ARTS ADVICE
For technique, rehearsal and preparation questions that are not coach-specific,
you may give practical, encouraging guidance as a short numbered list (1-6).
That advice is your own; label it clearly as general guidance, not as something
the coach personally prescribed.
If the topic is outside performing arts, say you specialise there and offer a
relevant alternative.

${coachInfo}
  `.trim();

  if (!apiKey || apiKey === 'your-openrouter-api-key') {
    return `Hello! I am Coach ${coach.fullName}'s Groove Assistant. Coach ${coach.fullName} specializes in ${coach.talents || 'performing arts'}. Their session fee is ${coach.serviceFee ? `₱${coach.serviceFee}` : 'available upon request'}. Please feel free to book a session through the appointment calendar!`;
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Groove Performing Arts Platform',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        // Prior turns first, so "what about evenings?" resolves against context.
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('OpenRouter error:', errText);
    throw new Error('AI Assistant request failed');
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}
