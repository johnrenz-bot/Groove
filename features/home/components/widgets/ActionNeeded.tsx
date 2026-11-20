'use client';

/**
 * Action Needed — the client's signature queue.
 *
 * Shows agreements awaiting the client's signature. When there are none it
 * renders nothing dramatic: a short reassurance and where to look next.
 * Never invents an action that does not exist.
 */

import React from 'react';
import { PenLine, CheckCircle2 } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { ActionItem } from '../../types';

export function ActionNeeded({ items }: { items: ActionItem[] }) {
  return (
    <PanelCard
      icon={<PenLine className="h-4 w-4" />}
      title="Action Needed"
      viewAllHref="/client/messages?view=board"
      viewAllLabel="View all"
    >
      {items.length === 0 ? (
        <EmptyState
          compact
          icon={<CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />}
          title="Nothing waiting on you"
          description="When a coach sends an agreement or a booking needs your confirmation, it will appear here."
        />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                className={cn(
                  'group flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft p-3',
                  'transition-colors hover:border-warning/60 hover:bg-warning-soft/70',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
                )}
              >
                <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{item.subtitle}</span>
                </span>
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

export default ActionNeeded;

