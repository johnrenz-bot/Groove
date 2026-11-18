'use client';

/**
 * HubInbox - the left column of the hub (shared by both roles).
 *
 * Filters: All | Your turn | Unread | Active | Closed. Counts per tab are
 * computed from the same rows the list renders. The search box searches the
 * partner's name, the session type AND the talent discipline, so a coach can
 * type "jazz" and find a student who requested jazz.
 */
import React, { useMemo, useState } from 'react';
import { Search, X, MessageSquare } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { useNow } from '@/features/appointments/hooks/useNow';
import { availableActions } from '@/features/appointments/services/bookingStatus';
import type { InboxRow } from '../types';
import type { HubRole, InboxFilter } from '../types';
import { HubSidebarRow } from './HubSidebarRow';
import { isActiveStatus } from '@/features/appointments/services/bookingTime';
import { isTerminalStatus } from '@/features/appointments/services/bookingTime';

const FILTERS: { value: InboxFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'your-turn', label: 'Your turn' },
  { value: 'unread', label: 'Unread' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

export function HubInbox({
  rows,
  role,
  filter,
  onFilterChange,
  selected,
  onSelect,
  onNewMessage,
}: {
  rows: InboxRow[];
  role: HubRole;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  selected: string | null;
  onSelect: (partnerId: string) => void;
  /** Open the inline "New message" entry - one thread per person allowed. */
  onNewMessage: () => void;
}) {
  const [query, setQuery] = useState('');
  const nowMs = useNow();

  const counts = useMemo(() => {
    const out = { all: rows.length, 'your-turn': 0, unread: 0, active: 0, closed: 0 };
    for (const row of rows) {
      const status = row.booking?.appointment.status ?? null;
      const actions = status
        ? availableActions({ status, role, coachVerified: true }).map((a) => a.action)
        : [];
      const yourTurn =
        role === 'coach'
          ? actions.length > 0 && status !== 'in_progress'
          : status === 'agreement_required';
      if (yourTurn) out['your-turn'] += 1;
      if (row.unread > 0) out.unread += 1;
      if (status && isActiveStatus(status)) out.active += 1;
      if (status && isTerminalStatus(status)) out.closed += 1;
    }
    return out;
  }, [rows, role]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const status = row.booking?.appointment.status ?? null;
      if (filter === 'your-turn') {
        const actions = status
          ? availableActions({ status, role, coachVerified: true }).map((a) => a.action)
          : [];
        const yourTurn =
          role === 'coach'
            ? actions.length > 0 && status !== 'in_progress'
            : status === 'agreement_required';
        if (!yourTurn) return false;
      } else if (filter === 'unread') {
        if (row.unread <= 0) return false;
      } else if (filter === 'active') {
        if (!status || !isActiveStatus(status)) return false;
      } else if (filter === 'closed') {
        if (!status || !isTerminalStatus(status)) return false;
      }
      if (!q) return true;
      const partnerName = [row.partner.firstname, row.partner.lastname].filter(Boolean).join(' ').toLowerCase();
      const haystack = [
        partnerName,
        row.partner.username ?? '',
        row.booking?.appointment.talent ?? '',
        row.booking?.appointment.session_type ?? '',
        row.booking?.appointment.date ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, filter, query, role]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-3">
        <h2 className="text-sm font-bold text-foreground">
          {role === 'client' ? 'Your coaches' : 'Your students'}
        </h2>
        <button
          type="button"
          onClick={onNewMessage}
          aria-label="Start a new conversation"
          title="Start a new conversation"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-accent-text transition hover:border-accent-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <label className="relative mx-3 mb-2 block shrink-0">
        <span className="sr-only">Search conversations</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          inputMode="search"
          placeholder="Search name, discipline"
          aria-label="Search conversations"
          className="h-11 w-full rounded-2xl border border-border bg-card pl-9 pr-9 text-xs text-foreground outline-none placeholder:text-subtle-foreground focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </label>

      {/* Filter row — horizontal scroll with snap + fade edges, nothing clipped */}
      <div className="relative shrink-0">
        <div
          role="group"
          aria-label="Filter conversations"
          className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-3 pb-2 pt-0.5 scroll-pl-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FILTERS.map((item) => {
            const active = item.value === filter;
            const count = counts[item.value as keyof typeof counts];
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange(item.value)}
                className={cn(
                  'inline-flex h-9 shrink-0 snap-start cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-accent text-accent-foreground' : ' border border-border bg-card text-muted-foreground hover:border-accent-border hover:text-foreground'
                )}
              >
                {item.label}
                <span className={cn('tabular-nums', active ? 'text-accent-foreground/85' : 'text-subtle-foreground')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {/* Fade edges signal scrollability; hidden on wide screens */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-card to-transparent md:hidden"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-card to-transparent md:hidden"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4" role="list" aria-label="Conversations">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
            <p className="text-xs text-muted-foreground">
              {query
                ? `Nothing matches "${query}".`
                : role === 'client'
                  ? 'No conversations yet. Open a coach profile and send a booking request.'
                  : 'No conversations yet. Students who book you will appear here.'}
            </p>
            {!query && (
              <a
                href={role === 'client' ? '/client/talent' : '/coach/profile'}
                className="mt-1 inline-flex h-10 items-center rounded-full border border-border bg-accent px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {role === 'client' ? 'Find a coach' : 'Review your profile'}
              </a>
            )}
          </div>
        ) : (
          visible.map((row) => (
            <div key={row.partnerId} role="listitem">
              <HubSidebarRow
                row={row}
                role={role}
                selected={row.partnerId === selected}
                onSelect={onSelect}
                nowMs={nowMs}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

