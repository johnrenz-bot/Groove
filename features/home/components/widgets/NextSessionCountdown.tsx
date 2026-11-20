'use client';

/**
 * Next-session countdown — client-side clock, ticks once per second when the
 * session is today, once per minute otherwise, and holds a stable value on the
 * server render. When there is no session it shows the honest empty state.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Timer, CalendarDays } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SessionWithClient, SessionWithCoach } from '../../types';

function parseSessionDateTime(session: { date: string; start_time: string | null }): Date | null {
  const match = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(session.start_time ?? '');
  if (!match) return null;
  const base = new Date(session.date);
  if (Number.isNaN(base.getTime())) return null;
  base.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return base;
}

function formatRemaining(target: Date, now: Date): { days: number; hours: number; minutes: number; seconds: number; past: boolean } {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds, past: false };
}

export function NextSessionCountdown({
  session,
  emptyCta,
  scheduleHref = '/client/messages?view=board',
}: {
  session: SessionWithCoach | SessionWithClient | null;
  emptyCta: { label: string; href: string };
  scheduleHref?: string;
}) {
  const target = useMemo(() => (session ? parseSessionDateTime(session) : null), [session]);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (!target) return;
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  const remaining = target ? formatRemaining(target, now) : null;
  const isToday = target
    ? target.toDateString() === now.toDateString()
    : false;

  return (
    <PanelCard icon={<Timer className="h-4 w-4" />} title="Next Session" viewAllHref={scheduleHref} viewAllLabel="Schedule">
      {!session ? (
        <EmptyState
          compact
          icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
          title="No session on the calendar yet"
          description="Book a session and it will show up here with a live countdown."
          actionHref={emptyCta.href}
          action={emptyCta.label}
        />
      ) : (
        <div className="py-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {isToday ? 'Today' : target ? target.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Upcoming'}
            {session.start_time ? ` · ${session.start_time}` : ''}
          </p>
          <p className="mt-3 font-sans text-5xl font-semibold tabular-nums tracking-tight text-accent-text" aria-live="polite">
            {remaining && !remaining.past ? (
              remaining.days > 0 ? (
                <>
                  {remaining.days}
                  <span className="mx-1 text-2xl font-semibold text-muted-foreground">d</span>
                  {remaining.hours}
                  <span className="mx-1 text-2xl font-semibold text-muted-foreground">h</span>
                  {remaining.minutes}
                  <span className="mx-1 text-2xl font-semibold text-muted-foreground">m</span>
                </>
              ) : (
                <>
                  {String(remaining.hours).padStart(2, '0')}:{String(remaining.minutes).padStart(2, '0')}:
                  {String(remaining.seconds).padStart(2, '0')}
                </>
              )
            ) : (
              <span className="text-3xl text-muted-foreground">Started</span>
            )}
          </p>
          <p className="mt-3 truncate text-xs text-muted-foreground">
            {session.talent || 'Session'} · {session.is_online ? 'Online' : session.location?.trim() || 'SJDM, Bulacan'}
          </p>
        </div>
      )}
    </PanelCard>
  );
}

export default NextSessionCountdown;

