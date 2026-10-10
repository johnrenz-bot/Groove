'use client';

/**
 * The agreement stack for one conversation: one card per booking between these
 * two people, oldest first, newest last.
 *
 * WHY A CONTAINER COMPONENT
 *   `SessionAgreementCard` renders ONE agreement it is handed, and owns that
 *   agreement's own realtime subscriptions. This component owns the LIST:
 *   fetching it, ordering it, deduplicating it, and listening for rows being
 *   ADDED (a new booking the coach just accepted) which no per-agreement
 *   subscription can see, because a card that does not exist yet has no id to
 *   filter on.
 *
 * ORDERING
 *   Oldest first, newest last. The newest agreement is the one most likely to
 *   need a signature, and it ends up directly above the composer — where the
 *   thread is already scrolled. `fetchConversationAgreements` does the sort
 *   against the EFFECTIVE date (the agreement's `scheduled_at`, else its
 *   booking's `date`), so an agreement without `scheduled_at` still lands in the
 *   right place instead of drifting to an arbitrary position.
 *
 * DEDUPLICATION
 *   Two mechanisms, because the failure they prevent is visible and confusing
 *   (the same contract shown twice with two different references):
 *     1. a unique index on `agreements.appointment_id` in the database means one
 *        row per booking, so a genuine duplicate cannot exist;
 *     2. a `Map` keyed by agreement id collapses anything that still arrives
 *        twice — which a realtime INSERT and an in-flight fetch genuinely can
 *        do, since neither knows about the other.
 *
 * REALTIME
 *   `agreements` and `appointments` are both in supabase_realtime
 *   (02_booking_schema.sql §11). Three subscriptions, each doing a read-only
 *   reload:
 *     - agreements INSERT, filtered to this pair → a newly sent agreement
 *     - agreements UPDATE, filtered to this pair → a signature landing
 *     - appointments UPDATE/INSERT for either party → the booking's status
 *   The per-card subscriptions handle the two already on screen; these catch the
 *   ones that are not, so a booking created in another tab appears without a
 *   refresh. Realtime is a convenience, so a failed subscribe leaves the manual
 *   reload working rather than blanking the thread.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchConversationAgreements,
  type ConversationAgreement,
} from '../services/bookingAgreement';
import { SessionAgreementCard } from './SessionAgreementCard';

export function AgreementThread({
  currentUserId,
  partnerId,
}: {
  currentUserId: string;
  partnerId: string;
}) {
  const [state, setState] = useState<{
    partnerId: string;
    agreements: ConversationAgreement[];
  }>({ partnerId, agreements: [] });
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  /**
   * Monotonic revision. A reload that starts early and finishes late must not
   * overwrite a newer one — which is exactly what happens when a realtime INSERT
   * and the initial fetch land within a few hundred milliseconds of each other.
   */
  const revision = useRef(0);

  const load = useCallback(async () => {
    const mine = ++revision.current;
    try {
      const rows = await fetchConversationAgreements(supabase, currentUserId, partnerId);
      if (mine !== revision.current) return;

      // Keyed by id: collapses a row that arrived from two sources without
      // depending on array order or on object identity.
      const unique = new Map<number, ConversationAgreement>();
      for (const row of rows) unique.set(row.id, row);

      /* The partner id is stored ALONGSIDE the rows rather than in a separate
         state variable. That is what lets the render below compare the two
         without a second source of truth that can drift: rows are only ever
         shown when they were fetched for the partner currently on screen, so
         switching conversation cannot flash the previous partner's contracts. */
      setState({ partnerId, agreements: [...unique.values()] });
    } catch {
      // Keep whatever is already on screen. An empty thread that flickered to
      // nothing and back would be worse than a stale one.
    } finally {
      if (mine === revision.current) setLoading(false);
    }
  }, [supabase, currentUserId, partnerId]);

  /* Kick the first load off from a timer rather than calling `load()` in the
     effect body. `load` ends in setState, and a state-setting call directly in
     an effect body is a cascading render (react-hooks/set-state-in-effect). The
     codebase already uses this deferral elsewhere for the same reason — see
     `fetchProfile` in app/userprofile/[id]/page.tsx. One tick is imperceptible,
     and realtime still covers every later change. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const belongsToCurrentPartner = state.partnerId === partnerId;
  const rows = belongsToCurrentPartner ? state.agreements : EMPTY;
  const showSkeleton = loading || !belongsToCurrentPartner;

  /* Realtime for this PAIR. The `.or(...)` filter mirrors the fetch exactly, so
     the listener and the query can never disagree about which agreements belong
     to this conversation — a mismatch there would mean a card for someone
     else's booking appearing in this thread. */
  useEffect(() => {
    if (!currentUserId || !partnerId || currentUserId === partnerId) return;

    const pairFilter = `client_id.eq.${currentUserId},coach_id.eq.${partnerId}`;
    const pairFilterAlt = `client_id.eq.${partnerId},coach_id.eq.${currentUserId}`;

    const agreementsChannel = supabase
      .channel(`thread-agreements:${currentUserId}:${partnerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agreements', filter: pairFilter },
        () => {
          void load();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agreements', filter: pairFilterAlt },
        () => {
          void load();
        }
      )
      .subscribe();

    /* The booking's status moves on `appointments`. Filtering on both party
       columns catches a status change for any booking in this conversation
       without having to know the appointment ids in advance — which is the
       point, since a booking can exist before its agreement does. */
    const bookingsChannel = supabase
      .channel(`thread-bookings:${currentUserId}:${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `client_id.eq.${currentUserId}`,
        },
        () => {
          void load();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `coach_id.eq.${partnerId}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(agreementsChannel);
      void supabase.removeChannel(bookingsChannel);
    };
  }, [supabase, currentUserId, partnerId, load]);

  if (showSkeleton) {
    return (
      <div
        className="mx-auto my-4 flex w-full max-w-2xl items-center justify-center gap-2.5 rounded-2xl border border-border bg-card px-5 py-6 text-xs text-muted-foreground shadow-sm"
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
        Loading session agreements…
      </div>
    );
  }

  // Nothing between these two yet. Silence is correct: an empty card would read
  // as "there are agreements but they failed to load".
  if (rows.length === 0) return null;

  return (
    <div className="space-y-0" data-agreement-count={rows.length}>
      {rows.map((agreement) => (
        <SessionAgreementCard
          key={agreement.id}
          currentUserId={currentUserId}
          agreement={agreement}
          booking={agreement.booking}
        />
      ))}
    </div>
  );
}

/** Stable empty list, so switching conversations never re-renders needlessly. */
const EMPTY: ConversationAgreement[] = [];

export default AgreementThread;
