'use client';

/**
 * Profile completion checklist.
 *
 * Computed from real profile columns — never a fake percentage. Shows the
 * top missing items as links to where they get fixed.
 */

import React from 'react';
import Link from 'next/link';
import { UserCheck, Check, Circle } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import type { ChecklistItem } from '../../types';

export function ProfileCompletion({
  items,
  href,
}: {
  items: ChecklistItem[];
  /** Where to send the user when they want to fix everything at once. */
  href: string;
}) {
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const missing = items.filter((item) => !item.done).slice(0, 3);

  return (
    <PanelCard
      icon={<UserCheck className="h-4 w-4" />}
      title="Profile Completion"
      viewAllHref={href}
      viewAllLabel="Complete"
    >
      <div className="flex items-center gap-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Profile completion"
          className="relative h-12 w-12 shrink-0 rounded-full border border-border bg-muted"
        >
          <span className="absolute inset-0 flex items-center justify-center text-xs font-black tabular-nums text-foreground">
            {percent}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {done} of {total} steps done
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {missing.length === 0
              ? 'Your profile is complete. Nice work.'
              : 'Finish the items below to unlock booking and verification.'}
          </p>
        </div>
      </div>

      {missing.length > 0 && (
        <ul className="mt-4 space-y-2">
          {missing.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Circle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {missing.length === 0 && (
        <p className="mt-3 flex items-center gap-2 text-[11px] text-success">
          <Check className="h-4 w-4" aria-hidden="true" /> All steps complete
        </p>
      )}
    </PanelCard>
  );
}

export default ProfileCompletion;

