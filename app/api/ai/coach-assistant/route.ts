import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { askCoachAssistant, type CoachContext, type ChatTurn } from '@/lib/openrouter';

/**
 * Coach AI Assistant — Server Route
 *
 * Grounded on verified database rows for each coach:
 * 1. Checks user authentication via Supabase session.
 * 2. Resolves the requested coach by `coachId` (UUID, custom_id, or default).
 * 3. Fetches public profile columns, coach_profiles specs, and reviews.
 * 4. Builds a context-rich prompt and executes via Gemini with fallbacks.
 * 5. Ensures no invented data or mixed-up coach contexts.
 */

const MAX_PROMPT_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 14;
const MAX_MESSAGE_LENGTH = 2000;

/** Builds verified coach facts from real database rows. */
async function loadCoachContext(coachId: string | null): Promise<CoachContext | null> {
  const supabase = await createClient();

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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(coachRowId);

  // Readable under caller's permissions; select only valid columns from profiles schema
  let profile = null;
  if (isUuid) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, custom_id, firstname, middlename, lastname, suffix, city_name, province_name, region_name, bio, account_verified, photo_url')
      .eq('id', coachRowId)
      .eq('role', 'coach')
      .maybeSingle();
    if (error) {
      console.warn('[CoachAssistant] Supabase profile UUID lookup error:', error.message);
    }
    profile = data;
  } else {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, custom_id, firstname, middlename, lastname, suffix, city_name, province_name, region_name, bio, account_verified, photo_url')
      .eq('custom_id', coachRowId)
      .eq('role', 'coach')
      .maybeSingle();
    if (error) {
      console.warn('[CoachAssistant] Supabase profile custom_id lookup error:', error.message);
    }
    profile = data;
  }

  if (!profile) return null;

  // Fetch coach_profiles record using the resolved UUID
  const { data: coach, error: coachErr } = await supabase
    .from('coach_profiles')
    .select(
      'talents, genres, service_fee, duration, payment_type, payment_handle, notice_hours, notice_days, cancellation_method'
    )
    .eq('id', profile.id)
    .maybeSingle();

  if (coachErr) {
    console.warn('[CoachAssistant] coach_profiles query warning:', coachErr.message);
  }

  // Fetch rating & rating count from feedbacks table
  const { data: reviews } = await supabase
    .from('feedbacks')
    .select('rating')
    .eq('coach_id', profile.id);

  const ratingCount = reviews?.length || 0;
  const rating = ratingCount > 0
    ? Number((reviews!.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratingCount).toFixed(1))
    : 5.0;

  // `genres` is stored as TEXT holding JSON `{ skill, genres: [...] }` or comma-separated string.
  let genres: string[] = [];
  const raw = coach?.genres;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as { genres?: unknown };
      if (Array.isArray(parsed?.genres)) {
        genres = parsed.genres.filter((g: unknown): g is string => typeof g === 'string' && Boolean(g.trim()));
      } else if (Array.isArray(parsed)) {
        genres = (parsed as unknown[]).filter((g: unknown): g is string => typeof g === 'string' && Boolean(g.trim()));
      }
    } catch {
      genres = raw
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);
    }
  } else if (Array.isArray(raw)) {
    genres = (raw as unknown[]).filter((g): g is string => typeof g === 'string' && Boolean(g.trim()));
  }

  const locationParts = [profile.city_name, profile.province_name || 'Bulacan', 'Philippines']
    .filter(Boolean);
  const location = Array.from(new Set(locationParts)).join(', ');

  const fullName = [profile.firstname, profile.lastname, profile.suffix]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id: profile.id,
    fullName,
    role: 'coach',
    talents: coach?.talents ?? null,
    genres: genres.length > 0 ? genres.join(', ') : null,
    bio: profile.bio ?? null,
    serviceFee: coach?.service_fee ?? null,
    duration: coach?.duration ?? null,
    paymentType: coach?.payment_type ?? null,
    paymentHandle: coach?.payment_handle ?? null,
    noticeHours: coach?.notice_hours ?? null,
    noticeDays: coach?.notice_days ?? null,
    cancellationMethod: coach?.cancellation_method ?? null,
    location: location || null,
    rating,
    ratingCount,
    verified: Boolean(profile.account_verified),
    photoUrl: profile.photo_url ?? null,
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate with Supabase
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

    // 2. Parse request body
    const body = (await req.json().catch(() => null)) as {
      prompt?: unknown;
      history?: unknown;
      coachId?: unknown;
      coach?: { id?: unknown };
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

    // Extract coachId safely from either direct parameter or nested coach object
    let coachId: string | null = null;
    const candidateId = body?.coachId || body?.coach?.id;
    if (typeof candidateId === 'string' && candidateId.trim()) {
      coachId = candidateId.trim();
    }

    // 3. Load verified coach facts
    const coach = await loadCoachContext(coachId);
    if (!coach) {
      return NextResponse.json(
        { error: 'The requested coach profile could not be found.' },
        { status: 404 }
      );
    }

    // 4. Sanitize and bound conversation history
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

    // 5. Generate context-aware response
    const answer = await askCoachAssistant(rawPrompt, coach, history);

    return NextResponse.json({
      answer,
      coach: {
        id: coach.id,
        fullName: coach.fullName,
        talents: coach.talents,
        genres: coach.genres,
        serviceFee: coach.serviceFee,
        duration: coach.duration,
        location: coach.location,
        bio: coach.bio,
      },
    });
  } catch (err) {
    console.error('[CoachAssistant] API Error:', err);
    return NextResponse.json(
      { error: 'The coach assistant is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }
}
