'use client';

/**
 * HubView — the shared unified page for Client and Coach portals.
 *
 * Deep-linked state (all preserved from the legacy /messages page):
 *   ?view     = inbox | board | list | calendar
 *   ?section  = messages | appointment | agreement | schedule
 *   ?conversation or ?user = <profile id>  (preferred spelling + legacy)
 *   ?booking  = <booking id>               (select this specific booking)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { MessageSquare, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/components/providers/SessionProvider';
import {
  loadHubSnapshot,
  type HubSnapshot,
} from '@/features/hub/services/hubService';
import {
  runHubTransition,
  type HubActionKind,
} from '@/features/hub/services/hubActions';
import type { BookingDetail } from '@/features/appointments/services/bookingService';
import { availableActions } from '@/features/appointments/services/bookingStatus';
import { useBookingsLive } from '@/features/appointments/hooks/useBookingsLive';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';
import type { Profile } from '@/lib/types';
import type { HubRole, HubSection, HubView as HubViewName } from '@/features/hub/types';
import { HubViewShell } from './components/HubViewShell';
import { EmptyState } from '@/components/ui/EmptyState';

export function HubView({ role }: { role: HubRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status: sessionStatus, profile } = useSession();
  const { notifySuccess } = useSuccessNotifications();

  const [snapshot, setSnapshot] = useState<HubSnapshot | null>(null);
  const [fullProfile, setFullProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  // Render states derive straight from the session provider; the only async
  // piece is upgrading the thin session profile to a full row.
  // session-ready signals used by the render branches.
  const sessionKnownButSignedOut = sessionStatus !== 'loading' && !profile;

  // Snapshot depends on the full row, which loads once below.
  const selfProfile = fullProfile;

  const view = ((): HubViewName => {
    const v = searchParams.get('view');
    return v === 'board' ? 'board' : v === 'list' ? 'list' : v === 'calendar' ? 'calendar' : 'inbox';
  })();
  const section = ((): HubSection => {
    const s = searchParams.get('section');
    return s === 'appointment' || s === 'agreement' || s === 'schedule' ? s : 'messages';
  })();
  const conversationId = searchParams.get('conversation') ?? searchParams.get('user');
  const bookingId = (() => {
    const raw = searchParams.get('booking');
    const n = raw ? Number(raw) : null;
    return n !== null && Number.isFinite(n) ? n : null;
  })();

  const setQuery = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === '') next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const fetchAll = useCallback(async () => {
    if (!selfProfile) return;
    try {
      const supabase = createClient();
      const snap = await loadHubSnapshot(supabase, { viewer: selfProfile, role });
      setSnapshot(snap);
      setLoading(false);
      setFlashKey((k) => k + 1);
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : 'Could not load this page.');
      setLoading(false);
    }
  }, [selfProfile, role]);

  // Load the full self row once (async-only setState; nothing synchronous
  // runs inside the effect body).
  useEffect(() => {
    if (sessionStatus === 'loading' || !profile) return;
    const supabase = createClient();
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      if (cancelled) return;
      setFullProfile((data as Profile | null) ?? (profile as Profile));
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, profile]);

  useEffect(() => {
    if (!selfProfile) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await loadHubSnapshot(createClient(), {
          viewer: selfProfile,
          role,
        });
        if (cancelled) return;
        setSnapshot(snap);
        setLoading(false);
        setFlashKey((k) => k + 1);
      } catch (err) {
        if (cancelled) return;
        setSnapshot(null);
        setError(err instanceof Error ? err.message : 'Could not load this page.');
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selfProfile, role]);

  // Realtime via the existing shared hook.
  const { mode: liveMode } = useBookingsLive({
    enabled: Boolean(selfProfile),
    viewerId: selfProfile?.id ?? null,
    role,
    onRefresh: () => {
      void fetchAll().catch(() => {
        /* silent — don't spam the user while they type */
      });
    },
  });

  const selectedConversation = useMemo(() => {
    if (!snapshot) return null;
    if (conversationId) {
      return snapshot.rows.find((r) => r.partnerId === conversationId) ?? null;
    }
    if (bookingId !== null) {
      return (
        snapshot.rows.find((r) => r.booking?.appointment.id === bookingId) ??
        null
      );
    }
    // Auto-select the freshest case on first visit when nothing is deep-linked.
    if (snapshot.rows.length > 0) {
      return [...snapshot.rows].sort((a, b) => {
        const ad = a.booking?.appointment.date ?? '';
        const bd = b.booking?.appointment.date ?? '';
        return bd.localeCompare(ad);
      })[0];
    }
    return null;
  }, [snapshot, conversationId, bookingId]);

  const selectedDetail = selectedConversation?.booking ?? null;
  const selectedPartner = selectedConversation?.partner ?? null;

  // Publish the sidebar badge + breadcrumb suffix for this session. The chrome
  // reads them via window events — no extra fetches, no shared channel.
  useEffect(() => {
    if (!snapshot || typeof window === 'undefined') return;
    let turn = 0;
    for (const row of snapshot.rows) {
      const status = row.booking?.appointment.status ?? null;
      if (role === 'client') {
        if (status === 'agreement_required') turn += 1;
      } else if (status) {
        const actions = availableActions({ status, role: 'coach', coachVerified: true });
        if (actions.length > 0) turn += 1;
      }
    }
    const unread = snapshot.rows.reduce((sum, row) => sum + row.unread, 0);
    window.dispatchEvent(new CustomEvent('hub:badge', { detail: turn + unread }));
    return () => {
      window.dispatchEvent(new CustomEvent('hub:crumb', { detail: null }));
    };
  }, [snapshot, role]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const name = selectedPartner
      ? [selectedPartner.firstname, selectedPartner.lastname].filter(Boolean).join(' ').trim() ||
        selectedPartner.username ||
        null
      : null;
    window.dispatchEvent(new CustomEvent('hub:crumb', { detail: name }));
    return () => {
      window.dispatchEvent(new CustomEvent('hub:crumb', { detail: null }));
    };
  }, [selectedPartner]);

  // After the inline request form succeeds, reload so the new case appears
  // and deep-links itself via ?booking=.
  const handleRequestCreated = useCallback(() => {
    void fetchAll().catch(() => {
      /* refresh is best-effort here */
    });
  }, [fetchAll]);

  const runAction = useCallback(
    async (detail: BookingDetail, action: HubActionKind) => {
      setBusyId(detail.appointment.id);
      const supabase = createClient();
      const result = await runHubTransition(supabase, { detail, action });
      if (!result.ok) {
        notifySuccess({
          title: 'Could not update booking',
          description: result.message ?? 'Refresh and try again.',
          tone: 'danger',
          dedupeKey: `hub-action-fail-${action}-${detail.appointment.id}`,
        });
      } else {
        notifySuccess({
          title: 'Booking updated',
          tone: 'success',
          dedupeKey: `hub-action-ok-${action}-${detail.appointment.id}`,
        });
      }
      await fetchAll().catch(() => {
        /* the action succeeded; refresh is best-effort here */
      });
      setBusyId(null);
      return result.ok;
    },
    [fetchAll, notifySuccess]
  );

  if (sessionKnownButSignedOut) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-6 w-6" aria-hidden="true" />}
        title="Sign in required"
        description="The hub is a members-only surface. Sign in to see your bookings."
        action={
          <a
            href="/login"
            className="inline-flex h-11 items-center rounded-full border border-border bg-accent px-5 text-xs font-bold text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign in
          </a>
        }
      />
    );
  }

  if (loading || !selfProfile) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-6 w-6 animate-spin text-accent-text" aria-label="Loading" />
      </div>
    );
  }

  return (
    <HubViewShell
      title='Messages & Bookings'
      eyebrow={role === 'client' ? 'Client inbox' : 'Coach inbox'}
      liveMode={liveMode}
      onRefresh={() => {
        setRefreshing(true);
        void fetchAll()
          .catch((err) => setError(err instanceof Error ? err.message : 'Could not refresh.'))
          .finally(() => setRefreshing(false));
      }}
      refreshing={refreshing}
      defaultView={view}
      onViewChange={(next) => setQuery({ view: next === 'inbox' ? null : next, section: null })}
      activeSection={section}
      onSectionChange={(next) => setQuery({ section: next })}
      role={role}
      viewer={selfProfile}
      selected={selectedDetail}
      partnerProfile={selectedPartner}
      rows={snapshot?.bookings ?? []}
      inboxRows={snapshot?.rows ?? []}
      busyId={busyId}
      actionError={error}
      flashKey={String(flashKey)}
      onAction={runAction}
      selectedConversationId={selectedPartner?.id ?? null}
      onSelectConversation={(partnerId) =>
        setQuery({
          conversation: partnerId,
          user: null,
          booking: null,
          view: null,
          section: 'messages',
        })
      }
      onDeselect={() => setQuery({ conversation: null, user: null, booking: null })}
      onBookingFromBoard={(bookingIdParam: number) =>
        setQuery({
          booking: String(bookingIdParam),
          user: null,
          conversation: null,
          view: 'inbox',
          section: 'appointment',
        })
      }
      onRequestCreated={handleRequestCreated}
    />
  );
}

export default HubView;

