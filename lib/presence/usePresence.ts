'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { displayStatus, type Presence } from '@/lib/presence';

/**
 * Live presence for every account on the page, kept in sync with the database.
 *
 * WHY ONE STORE RATHER THAN A HOOK PER COMPONENT
 *   A status change has to be visible in the header, the messages contact list,
 *   a coach card, and a profile header at the same time. If each of those
 *   subscribed on its own, four subscriptions would deliver the same event four
 *   times, and a list of fifty coaches would open fifty sockets. This is a
 *   module-level external store — the same pattern ThemeProvider uses — so every
 *   consumer reads one shared value and there is exactly one channel for the
 *   whole app. `useSyncExternalStore` keeps that safe: React reads the current
 *   map during render, so there is no setState-in-effect and no cascading render.
 *
 * WHY REALTIME postgres_changes
 *   `public.profiles` is added to the `supabase_realtime` publication by
 *   supabase/presence_realtime.sql. Without that, a subscription silently never
 *   fires — no error, no events — which is the failure mode worth naming.
 *
 * OWN-WRITE OPTIMISM, AND WHY IT IS BOUNDED
 *   When the signed-in user changes their own status, the write resolves before
 *   the broadcast comes back, so the value is applied locally at that moment.
 *   The broadcast then arrives and sets the same value, which is a no-op. This
 *   is not a mock: the database is still the authority, and the local write only
 *   happens *after* Supabase confirmed the row was actually updated (see
 *   StatusSelect, which refuses to report a save that touched no rows).
 *
 * CLEANUP
 *   The channel is created once per authenticated user and removed on unmount
 *   and whenever the signed-in id changes, so navigating between role portals
 *   cannot leave an orphaned socket behind. `cancelled` guards the async status
 *   fetch so a late response cannot write into an unmounted store.
 */

/** id -> presence. Insertion order is irrelevant; lookups are by id. */
type StatusMap = Readonly<Record<string, Presence>>;

let snapshot: StatusMap = {};
let selfId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

const getSnapshot = () => snapshot;

/**
 * The server snapshot, as ONE frozen object created once at module load.
 *
 * It must be the same reference on every call. `useSyncExternalStore` compares
 * the snapshot by identity (`Object.is`) to decide whether anything changed
 * since the last render, so a getter that builds a fresh `{}` on each call
 * reports a change on every single render. React then re-renders, calls the
 * getter again, gets a different object, and loops — which is exactly the
 * "The result of getServerSnapshot should be cached to avoid an infinite loop"
 * error this replaces.
 *
 * The previous version was `(): StatusMap => ({})`.
 *
 * Frozen because it is shared by every consumer: anything that could mutate it
 * would corrupt the snapshot for all of them, and it is also the value the
 * client falls back to before the first realtime event.
 *
 * Empty is the truthful server value — presence is client state that arrives
 * over the realtime channel after hydration, so there is genuinely nothing to
 * report on the server.
 */
const EMPTY_SNAPSHOT: StatusMap = Object.freeze({} as StatusMap);

const getServerSnapshot = (): StatusMap => EMPTY_SNAPSHOT;

/**
 * Merge one account's status in. Exported so a component that already holds the
 * profile row (the header, which fetched the identity) can seed the store
 * without waiting for a second round trip.
 */
export function seedPresence(id: string, status: string | null | undefined) {
  if (!id) return;
  snapshot = { ...snapshot, [id]: displayStatus(status) };
  emit();
}

/** Apply a confirmed change from our own write. */
export function setPresence(id: string, status: string | null | undefined) {
  seedPresence(id, status);
}

/** The status currently known for an account, or undefined if never seen. */
export function presenceOf(id: string | null | undefined): Presence | undefined {
  return id ? snapshot[id] : undefined;
}

/**
 * Mounts the single shared subscription. Rendered once, in the root layout, so
 * presence is live on every route without each screen opting in.
 */
export function PresenceRealtime({ userId }: { userId: string | null }) {
  useEffect(() => {
    // Sign-out (or a session that never resolved) tears the channel down and
    // clears the cache, so the next person to sign in on this browser does not
    // briefly see the previous person's presence.
    if (!userId) {
      if (selfId !== null) {
        selfId = null;
        snapshot = {};
        emit();
      }
      return;
    }

    if (selfId === userId) return;
    selfId = userId;
    let cancelled = false;

    const supabase = createClient();

    // Seed from the signed-in user's own row so the header renders the right
    // dot on first paint rather than after a round trip.
    void supabase
      .from('profiles')
      .select('id, status')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        snapshot = { ...snapshot, [data.id]: displayStatus(data.status) };
        emit();
      });

    const channel = supabase
      .channel(`presence:${userId}`)
      .on(
        'postgres_changes',
        // UPDATE only. An INSERT is a signup and carries no presence a page is
        // waiting on; a DELETE needs no presence update either.
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const row = payload.new as { id?: string; status?: string } | null;
          if (!row?.id || cancelled) return;
          const next = displayStatus(row.status);
          // Guard against a needless emit: several components may be mounted,
          // and an unchanged value must not re-render all of them.
          if (snapshot[row.id] === next) return;
          snapshot = { ...snapshot, [row.id]: next };
          emit();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      selfId = null;
      snapshot = {};
      emit();
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}

/**
 * Reads the live presence of one account.
 *
 * `fallback` is what the caller already knows from its own fetched row, so a
 * first paint shows the persisted value instead of a blank dot before the
 * subscription's first event arrives.
 */
export function usePresence(
  id: string | null | undefined,
  fallback?: string | null
): Presence {
  const live = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = (id ? live[id] : undefined) ?? displayStatus(fallback);
  return useMemo(() => value, [value]);
}

/** Presence for a list of accounts in one subscription read. */
export function usePresenceMap(
  fallback: Readonly<Record<string, string | null | undefined>>
): Record<string, Presence> {
  const live = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    const out: Record<string, Presence> = {};
    Object.keys(fallback).forEach((id) => {
      out[id] = live[id] ?? displayStatus(fallback[id]);
    });
    return out;
  }, [live, fallback]);
}

/**
 * Writes a status change and reflects it once the database has confirmed it.
 *
 * Shared by every presence control so the save semantics are identical
 * everywhere: `select()` is what makes a policy-blocked write detectable, and
 * `updated.length === 0` is the case PostgREST reports as HTTP 200 with no error.
 */
export function useSetPresence(userId: string | null | undefined) {
  const commit = useCallback(
    async (next: string): Promise<void> => {
      if (!userId) throw new Error('You must be signed in to change your status.');

      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: next })
        .eq('id', userId)
        .select('id, status')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          'The database accepted the request but saved no rows. Your status was not changed.'
        );
      }

      // The row is confirmed written, so the local value is now true. The
      // realtime broadcast will repeat this with the same value.
      seedPresence(data.id, data.status);
    },
    [userId]
  );

  return commit;
}