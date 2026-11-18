'use client';

/**
 * Coach availability toggle — writes profiles.status.
 *
 * Same semantics as every availability control: only confirmed rows are
 * accepted as saved (useSetPresence refuses a 0-row write), the realtime
 * broadcast repeats the value, and the busy/away/offline options match the
 * shared presence model.
 */

import React, { useState } from 'react';
import { Circle } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { SELF_ASSIGNABLE, displayStatus, type Presence } from '@/features/presence/utils/presence';
import { useSetPresence } from '@/features/presence/hooks/usePresence';
import { cn } from '@/components/shared/cn';

const DOT: Record<Presence, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  busy: 'bg-danger',
  offline: 'bg-muted-foreground',
};

export function AvailabilityToggle({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string | null | undefined;
}) {
  const [status, setStatus] = useState<Presence>(() => displayStatus(currentStatus));
  const [pending, setPending] = useState<Presence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const commit = useSetPresence(userId);

  const select = async (next: Presence) => {
    if (next === status || pending) return;
    setPending(next);
    setError(null);
    const previous = status;
    setStatus(next); // optimistic — the write is confirmed before the UI settles

    try {
      await commit(next);
    } catch (err) {
      setStatus(previous); // the database is the authority — roll back
      setError(err instanceof Error ? err.message : 'Your status was not saved.');
    } finally {
      setPending(null);
    }
  };

  return (
    <PanelCard icon={<Circle className="h-4 w-4" />} title="Availability" viewAllHref="/coach/profile" viewAllLabel="Profile">
      <p className="text-[11px] text-muted-foreground">
        Students see this on your profile and while messaging you.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Set your availability">
        {SELF_ASSIGNABLE.map((option) => {
          const active = status === option.value;
          const busy = pending === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => select(option.value)}
              aria-pressed={active}
              aria-busy={busy || undefined}
              disabled={pending !== null}
              title={option.hint}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70',
                active
                  ? 'border-transparent bg-accent text-accent-foreground'
                  : 'border-border bg-muted/40 text-foreground hover:bg-muted'
              )}
            >
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', DOT[option.value])} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-xs font-bold">{option.label}</span>
                <span className={cn('block truncate text-[9px]', active ? 'text-accent-foreground/80' : 'text-muted-foreground')}>
                  {option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-danger">
          {error}
        </p>
      )}
    </PanelCard>
  );
}

export default AvailabilityToggle;

