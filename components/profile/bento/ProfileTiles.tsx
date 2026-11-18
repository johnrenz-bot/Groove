'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/* ==========================================================================
   PROFILE COMPLETION TILE (owner mode only)
   --------------------------------------------------------------------------
   A slim full-width tile prompting the member to finish their profile.
   Hidden once every item is complete.
   ========================================================================== */

export type CompletionItem = { id: string; label: string };

export function CompletionTile({
  items,
  completedIds,
  onItemClick,
  onDismiss,
}: {
  items: CompletionItem[];
  completedIds: string[];
  onItemClick: (id: string) => void;
  onDismiss: () => void;
}) {
  const total = items.length;
  const done = completedIds.length;
  const percent = total === 0 ? 100 : Math.round((done / total) * 100);

  if (done >= total) return null;

  return (
    <section
      className="flex items-center gap-3 rounded-2xl border border-accent-border/50 bg-accent-soft/50 px-4 py-3 sm:gap-4"
      aria-label="Finish your profile"
    >
      <CompletionRing percent={percent} done={done} total={total} />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold text-[var(--foreground)]">
          {done} of {total} complete
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {items.map((item) => {
            const isDone = completedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item.id)}
                aria-pressed={isDone}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
                  isDone
                    ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
                    : 'border-[rgba(255,255,255,0.1)] text-[var(--muted-foreground)] hover:border-[var(--accent-border)] hover:text-[var(--accent-text)]'
                )}
              >
                {isDone ? (
                  <Check className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">+</span>
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}

function CompletionRing({ percent, done, total }: { percent: number; done: number; total: number }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        flex: 'none',
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="img"
      aria-label={`${percent}% complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--accent)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--foreground)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {Math.round((done / Math.max(1, total)) * 100)}%
      </span>
    </span>
  );
}
