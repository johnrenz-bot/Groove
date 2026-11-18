'use client';

/**
 * HubSidebarRow - one row in the hub inbox.
 *
 * Shows: avatar (with presence dot), name, discipline chip when a booking
 * exists, status chip, relative "Update <x> ago", unread badge. A single row
 * is the UI for ONE partner - never split per booking.
 */
import React from 'react';
import { cn } from '@/components/shared/cn';
import { getInitials } from '@/lib/utils';
import { statusMeta } from '@/features/appointments/services/bookingStatus';
import type { InboxRow } from '../types';
import type { HubRole } from '../types';
import { Badge } from '@/components/ui/Badge';

export function HubSidebarRow({
  row,
  role,
  selected,
  onSelect,
  nowMs,
}: {
  row: InboxRow;
  role: HubRole;
  selected: boolean;
  onSelect: (partnerId: string) => void;
  nowMs: number;
}) {
  const { partner } = row;
  const name =
    [partner.firstname, partner.lastname].filter(Boolean).join(' ').trim() ||
    partner.username ||
    (role === 'client' ? 'Coach' : 'Client');
  const showName = row.lastMessage ? row.lastMessage : 'No messages yet - start the thread';
  const status = row.booking?.appointment.status ?? null;
  const meta = status ? statusMeta(status) : null;
  const isActive =
    status !== null &&
    ['pending', 'accepted', 'agreement_required', 'confirmed', 'in_progress'].includes(status);
  const dateLabel = row.booking?.appointment.date
    ? new Date(row.booking.appointment.date + 'T00:00:00').toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(partner.id)}
      aria-current={selected ? 'true' : undefined}
      aria-label={`Conversation with ${name}${row.unread > 0 ? `, ${row.unread} unread` : ''}`}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'bg-accent-soft' : 'hover:bg-muted'
      )}
    >
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-xs font-bold text-accent-text">
        {partner.photo_url ? (
          // Avatar diverges from the shared tokenised set by design: partners keep their own photo.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partner.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          getInitials(partner.firstname ?? undefined, partner.lastname ?? undefined)
        )}
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-border bg-success"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-bold text-foreground">
            {role === 'coach' ? name : `Coach ${name}`}
          </span>
          {row.lastMessageAt && (
            <span className="shrink-0 text-[9px] tabular-nums text-subtle-foreground">
              {relativeLabel(row.lastMessageAt, nowMs)}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-snug text-muted-foreground">
          {showName}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {meta && (
            <Badge variant={meta.badge === 'info' ? 'scheduled' : meta.badge === 'danger' ? 'cancelled' : meta.badge === 'success' ? 'confirmed' : 'pending'} dot>
              {meta.label}
            </Badge>
          )}
          {dateLabel && (
            <span className="text-[10px] font-semibold tabular-nums text-subtle-foreground">
              {dateLabel}
            </span>
          )}
        </span>
      </span>
      {row.unread > 0 && (
        <span
          aria-label={`${row.unread} unread`}
          className="inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full border border-border bg-accent px-2 text-[10px] font-bold text-accent-foreground"
        >
          {row.unread > 99 ? '99+' : row.unread}
        </span>
      )}
    </button>
  );
}

function relativeLabel(iso: string, nowMs: number): string {
  const then = new Date(iso).getTime();
  const diff = nowMs - then;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

