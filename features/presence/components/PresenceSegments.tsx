'use client';

import React, { useState } from 'react';
import { cn } from '@/components/shared/cn';
import { SELF_ASSIGNABLE, statusMeta, type Presence } from '../utils/presence';
import { usePresence, useSetPresence } from '../hooks/usePresence';

/**
 * Compact presence segment control — Online / Away / Busy / Offline, 24px tall.
 * Writes are optimistic-ish: the pill flips once the write resolves (presence
 * seeding is synchronous in the hook, so the segment flips immediately).
 */
export function PresenceSegments({
  userId,
  fallbackStatus,
  className,
}: {
  userId: string;
  fallbackStatus?: string | null;
  className?: string;
}) {
  const current = usePresence(userId, fallbackStatus);
  const commit = useSetPresence(userId);
  const [pending, setPending] = useState<Presence | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (next: Presence) => {
    if (pending || next === current) return;
    setPending(next);
    setError(null);
    try {
      await commit(next);
    } catch {
      setError('Could not save your status.');
    } finally {
      setPending(null);
    }
  };

  return (
    <span className={cn('dash-spm-status-wrap', className)}>
      <span className="dash-spm-status" role="group" aria-label="Status">
        {SELF_ASSIGNABLE.map((opt) => {
          const active = current === opt.value;
          const busy = pending === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              data-value={opt.value}
              data-active={active || undefined}
              className="dash-spm-seg"
              aria-pressed={active}
              disabled={pending !== null}
              title={opt.hint}
              onClick={() => void choose(opt.value)}
            >
              <span className="dash-spm-seg-dot" aria-hidden="true" />
              <span>{busy ? 'Saving…' : opt.label}</span>
            </button>
          );
        })}
      </span>
      <span className="sr-only" aria-live="polite">
        {error ??
          (pending
            ? `Setting status to ${statusMeta(pending).label}…`
            : `Status: ${statusMeta(current).label}`)}
      </span>
    </span>
  );
}

export default PresenceSegments;
