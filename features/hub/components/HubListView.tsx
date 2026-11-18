'use client';

/**
 * HubListView - sortable, filterable compact list of the viewer's cases.
 * Same data as the board, different presentation; zero new queries.
 */
import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { formatBookingDate, formatClock } from '@/features/appointments/services/bookingTime';
import { statusMeta } from '@/features/appointments/services/bookingStatus';
import { Badge } from '@/components/ui/Badge';
import type { BookingDetail } from '@/features/appointments/services/bookingService';
import type { HubRole } from '../types';
import type { HubActionKind } from '../services/hubActions';

type SortKey = 'date' | 'status' | 'counterpart';

export function HubListView({
  rows,
  role,
  onOpen,
}: {
  rows: BookingDetail[];
  role: HubRole;
  busyId: number | null;
  onAction: (detail: BookingDetail, action: HubActionKind) => Promise<boolean>;
  onOpen: (bookingId: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const copy = [...rows];
    const dir = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === 'date') {
        const at = `${a.appointment.date}T${a.appointment.start_time}`;
        const bt = `${b.appointment.date}T${b.appointment.start_time}`;
        return at.localeCompare(bt) * dir;
      }
      if (sortKey === 'status') {
        return (statusMeta(a.appointment.status).label.localeCompare(statusMeta(b.appointment.status).label)) * dir;
      }
      const an = [a.appointment.coach?.firstname, a.appointment.coach?.lastname, a.appointment.name].filter(Boolean).join(' ').trim();
      const bn = [b.appointment.coach?.firstname, b.appointment.coach?.lastname, b.appointment.name].filter(Boolean).join(' ').trim();
      return an.localeCompare(bn) * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const thBtn = (key: SortKey, label: string) => (
    <button type="button" onClick={() => toggle(key)} className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {label}
      {sortKey === key ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
    </button>
  );

  const badgeVariant = (b: string) =>
    b === 'pending' ? 'pending' : b === 'info' ? 'scheduled' : b === 'success' ? 'confirmed' : b === 'neutral' ? 'completed' : 'cancelled';

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0   bg-card">
          <tr className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <th className="px-3 py-2.5">{thBtn('counterpart', 'Who')}</th>
            <th className="px-3 py-2.5">{thBtn('date', 'Date')}</th>
            <th className="px-3 py-2.5">Time</th>
            <th className="px-3 py-2.5">Discipline</th>
            <th className="px-3 py-2.5">{thBtn('status', 'Status')}</th>
            <th className="px-3 py-2.5 text-right"> </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {sorted.map((d) => {
            const a = d.appointment;
            const meta = statusMeta(a.status);
            const name =
              [a.coach?.firstname, a.coach?.lastname].filter(Boolean).join(' ') ||
              a.name ||
              '(no name)';
            return (
              <tr key={a.id} className="transition-colors hover:bg-muted/30">
                <td className="px-3 py-2.5 font-semibold text-foreground">{role === 'client' ? `Coach ${name}` : name}</td>
                <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{formatBookingDate(a.date)}</td>
                <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{formatClock(a.start_time)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{a.talent || 'Dance'}</td>
                <td className="px-3 py-2.5"><Badge variant={badgeVariant(meta.badge)} dot>{meta.label}</Badge></td>
                <td className="px-3 py-2.5 text-right">
                  <button type="button" onClick={() => onOpen(a.id)} className="inline-flex h-9 cursor-pointer items-center rounded-full border border-border bg-card px-3 text-[10px] font-semibold text-muted-foreground hover:border-border-strong hover:text-foreground">
                    Open
                  </button>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No cases match.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

