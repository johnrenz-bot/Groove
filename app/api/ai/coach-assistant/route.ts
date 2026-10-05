import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { askCoachAssistant, type CoachContext } from '@/lib/openrouter';

/**
 * Coach AI Assistant — server side.
 *
 * SECURITY MODEL (the reason this route owns the lookup)
 *
 * The previous version trusted a `coach` object in the request body and had no
 * authentication at all. That let any caller, signed in or not:
 *
 *   - post arbitrary "coach facts" that were fed straight into the model prompt,
 *     so the assistant would confidently state invented rates or specialties, and
 *   - ask questions as anybody, because there was nothing to check.
 *
 * Now the request body carries only a prompt. The coach is resolved here, from
 * the database, using the caller's own verified session:
 *
 *   1. `getUser()` must return a session, or this is 401.
 *   2. The caller's `profiles.role` must be `client`, or this is 403.
 *   3. The coach is looked up from the real `coach_profiles` / `profiles` rows.
 *
 * No coach id from the browser is trusted for anything privileged, and no
 * service-role key is used in this file — the session client runs under the
 * caller's own RLS context, so a client cannot widen what it reads.
 *
 * DATA ACCURACY
 *
 * Every fact in the prompt comes from a real column. NULL fields are passed as
 * null and the model is told to say "not provided" rather than fill them in.
 * `cancellation_method` and `payment_handle` are NULL for every coach in this
 * project right now, so the assistant should say so rather than invent a policy.
 */

/** Ceiling on a single request; enough for a question and its answer. */
const MAX_PROMPT_LENGTH = 1000;
/** Keep the exchange bounded so one client cannot exhaust the API key. */
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Builds the verified coach facts from real database rows. */
async function loadCoachContext(coachId: string | null): Promise<CoachContext | null> {
  const supabase = await createClient();

  // With no id, use the first coach in the directory — the page's featured
  // assistant. Deterministic ordering so it does not flap between requests.
  let coachRowId: string = coachId ?? '';
  if (!coachRowId) {
    const { data: first } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'coach')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!first) return null;
    coachRowId = first.id;
  }

  // Readable under the caller's own permissions; nothing private is selected.
  const { data: profile } = await supabase
    .from('profiles')
    .select('firstname, lastname, city_name, bio')
    .eq('id', coachRowId)
    .eq('role', 'coach')
    .maybeSingle();

  if (!profile) return null;

  const { data: coach } = await supabase
    .from('coach_profiles')
    .select(
      'talents, genres, service_fee, duration, payment_type, payment_handle, notice_hours, notice_days, cancellation_method'
    )
    .eq('id', coachRowId)
    .maybeSingle();

  // `genres` is TEXT holding JSON shaped { skill, genres: [] }. Parsed here so
  // the model receives a readable list rather than raw JSON syntax.
  let genres: string[] = [];
  const raw = coach?.genres;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as { genres?: unknown };
      if (Array.isArray(parsed?.genres)) {
        genres = parsed.genres.filter((g: unknown): g is string => typeof g === 'string');
      }
    } catch {
      // Legacy comma-separated text.
      genres = raw
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);
    }
  } else if (Array.isArray(raw)) {
    genres = raw.filter((g): g is string => typeof g === 'string');
  }

  return {
    id: coachRowId,
    fullName: `${profile.firstname} ${profile.lastname}`.trim(),
    role: 'coach',
    talents: coach?.talents ?? null,
    genres: genres.length > 0 ? genres.join(', ') : null,
    bio: profile.bio ?? null,
    serviceFee: coach?.service_fee ?? null,
    // Duration is stored as e.g. "3 hours"; the fee is per session, so the two
    // must be quoted together rather than an hourly rate being invented.
    duration: coach?.duration ?? null,
    paymentType: coach?.payment_type ?? null,
    paymentHandle: coach?.payment_handle ?? null,
    noticeHours: coach?.notice_hours ?? null,
    noticeDays: coach?.notice_days ?? null,
    cancellationMethod: coach?.cancellation_method ?? null,
    location: [profile.city_name, 'Bulacan'].filter(Boolean).join(', ') || null,
    // Deliberately NOT passed: contact, email, address_summary, status and any
    // admin-only column. A client-facing assistant has no business quoting a
    // coach's contact details or verification state.
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate. No session, no assistant.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to use the coach assistant.' },
        { status: 401 }
      );
    }

    // 2. Only clients. This is a client-portal feature; a coach or an admin
    //    calling it is refused rather than served.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'client') {
      return NextResponse.json(
        { error: 'The coach assistant is available to client accounts only.' },
        { status: 403 }
      );
    }

    // 3. Parse the body. The only accepted fields are the prompt, the recent
    //    conversation and an optional coach id. Any `coach` payload from the
    //    client is ignored entirely.
    const body = (await req.json().catch(() => null)) as {
      prompt?: unknown;
      history?: unknown;
      coachId?: unknown;
    } | null;

    const rawPrompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!rawPrompt) {
      return NextResponse.json({ error: 'Please type a question first.' }, { status: 400 });
    }
    if (rawPrompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Please keep your question under ${MAX_PROMPT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // The id only selects WHICH coach's public facts are shown. It grants no
    // access, and the lookup above re-checks role='coach'.
    const coachId =
      typeof body?.coachId === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.coachId)
        ? body.coachId
        : null;

    const coach = await loadCoachContext(coachId);
    if (!coach) {
      return NextResponse.json(
        { error: 'No coach profile is available for the assistant right now.' },
        { status: 404 }
      );
    }

    // Recent turns so follow-up questions work. Sanitised and bounded.
    const history: ChatTurn[] = Array.isArray(body?.history)
      ? (body.history as unknown[])
          .filter(
            (m): m is ChatTurn =>
              typeof m === 'object' &&
              m !== null &&
              typeof (m as ChatTurn).content === 'string' &&
              ((m as ChatTurn).role === 'user' || (m as ChatTurn).role === 'assistant')
          )
          .slice(-MAX_HISTORY_MESSAGES)
          .map((m) => ({
            role: m.role,
            content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
          }))
      : [];

    const answer = await askCoachAssistant(rawPrompt, coach, history);

    return NextResponse.json({
      answer,
      // So the UI header matches the facts the model actually received rather
      // than a hard-coded name.
      coach: {
        fullName: coach.fullName,
        talents: coach.talents,
        serviceFee: coach.serviceFee,
      },
    });
  } catch (err) {
    console.error('AI Assistant API Error:', err);
    return NextResponse.json(
      { error: 'The assistant is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }
}
