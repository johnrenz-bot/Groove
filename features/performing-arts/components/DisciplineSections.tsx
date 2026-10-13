'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CoachCard } from '@/components/shared/CoachCard';
import { EmptyState } from '@/components/shared/EmptyState';
import type { FullCoach } from '@/lib/types';
import { coachMatchesDiscipline, type Discipline } from '../data/disciplines';

/**
 * Coaches in one discipline.
 *
 * THE QUERY IS THE EXISTING ONE
 *   Same `profiles` → `coach_profiles` select as `/client/talent`, and the same
 *   `CoachCard`. Reusing both means a coach looks identical here and in the main
 *   directory, and there is no second definition of what a coach card is.
 *
 *   It is NOT `GET /api/users`. That endpoint selects `PUBLIC_PROFILE_COLUMNS`
 *   only and never joins `coach_profiles`, so it physically cannot filter by
 *   discipline. Adding a `talent` parameter there would be the tidier long-term
 *   fix, but that is a change to a shared API used by the directory, the search
 *   hook and the admin console — out of scope for a page that only needs to read.
 *
 * NO TEACHER, NO CALL, NO SEO NOISE
 *   A zero-result grid renders an honest empty state rather than padding with
 *   coaches from other disciplines. Same reasoning as
 *   `features/dance/services/danceEventSources.ts`, which ships empty rather
 *   than inventing events.
 */
export function DisciplineCoachGrid({ discipline }: { discipline: Discipline }) {
  const [coaches, setCoaches] = useState<FullCoach[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('*, coach_profile:coach_profiles(*)')
        .eq('role', 'coach');

      if (queryError) throw queryError;
      setCoaches((data as FullCoach[]) ?? []);
      setError(null);
    } catch {
      // The grid is the point of the page, so a failure is stated rather than
      // silently showing "no coaches found" — those are very different things.
      setError('We could not load coaches right now. Please try again in a moment.');
      setCoaches([]);
    }
  }, []);

  useEffect(() => {
    // The load is started from a timer rather than called inline. `setState` in
    // an effect body is a cascading render — react-hooks/set-state-in-effect
    // rejects it — and here it would also be pointless: `coaches === null` is
    // already the loading state, so there is nothing to set until the response
    // arrives. Deferring by a tick puts the request on a real async boundary,
    // the same shape `useUserSearch` uses for its debounce.
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (error) {
    return (
      <EmptyState
        title="Coaches unavailable"
        description={error}
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm font-semibold text-accent-text underline underline-offset-4"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (coaches === null) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-64 rounded-2xl border border-border bg-card g-skeleton"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  const matching = coaches.filter((coach) =>
    coachMatchesDiscipline(coach.coach_profile?.talents, discipline.match)
  );

  if (matching.length === 0) {
    return (
      <EmptyState
        title={`No ${discipline.label.toLowerCase()} coaches listed yet`}
        description="Be the first — register as a coach and set your discipline, and you will appear here and in the directory."
        action={
          <Link
            href="/register/coach"
            className="text-sm font-semibold text-accent-text underline underline-offset-4"
          >
            Register as a coach
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {matching.map((coach) => (
        <CoachCard key={coach.id} coach={coach} />
      ))}
    </div>
  );
}

/**
 * Upcoming classes for one discipline.
 *
 * `sessions` are PLACEHOLDER data — see the note on `PLACEHOLDER_CLASSES`. The
 * section says so on its face rather than presenting invented classes as real
 * ones, and "Book now" goes to the coach directory, which is somewhere a person
 * can genuinely end up. Booking a class that does not exist would be the only
 * dishonest button on the page.
 */
export function DisciplineClasses({
  sessions,
  isPlaceholder,
  findCoachesHref,
}: {
  sessions: Array<{
    id: string;
    title: string;
    coach: string;
    date: string;
    time: string;
    duration: string;
    location: string;
    seats: number;
  }>;
  isPlaceholder?: boolean;
  findCoachesHref: string;
}) {
  const formatter = new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div>
      {isPlaceholder && (
        <p className="mb-4 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Sample schedule.</strong> Groove does not yet
          run open classes — sessions here are booked one-to-one with a coach. These entries
          show what the section will look like once classes exist.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                {formatter.format(new Date(`${session.date}T${session.time}`))} · {session.time}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{session.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{session.coach}</span>
                <span>{session.duration}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {session.location}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {session.seats} seats
                </span>
              </p>
            </div>
            <Link
              href={findCoachesHref}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-px"
            >
              Book now
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
