'use client';

/**
 * DnD is VALID-ONLY and role-gated; the same matrix backs the keyboard menu.
 * Transition rules live in ../services/boardRules (shared with the tests).
 */
import React, { useMemo, useCallback, useState } from 'react';
import { GripVertical, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBookingDate, formatClock } from '@/features/appointments/services/bookingTime';
import { Badge } from '@/components/ui/Badge';
import { statusMeta } from '@/features/appointments/services/bookingStatus';
import type { BookingDetail } from '@/features/appointments/services/bookingService';
import type { HubRole } from '../types';
import type { HubActionKind } from '../services/hubActions';
import { BOARD_COLUMNS, bucketOf, canRoleDrop, moveOptions } from '../services/boardRules';

export function HubBoardView({
  rows,
  role,
  busyId,
  onAction,
  onOpen,
}: {
  rows: BookingDetail[];
  role: HubRole;
  busyId: number | null;
  flashKey?: string;
  onAction: (detail: BookingDetail, action: HubActionKind) => Promise<boolean>;
  onOpen: (bookingId: number) => void;
}) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  // Drop feedback for keyboard/pointer moves that the guard rejected.
  const [moveFeedback, setMoveFeedback] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, BookingDetail[]>();
    for (const col of BOARD_COLUMNS) map.set(col.id, []);
    for (const d of rows) {
      map.get(bucketOf(d.appointment.status))?.push(d);
    }
    return map;
  }, [rows]);

  const startDrag = useCallback((event: React.DragEvent<HTMLElement>, detail: BookingDetail) => {
    event.dataTransfer.setData('text/hub-booking-id', String(detail.appointment.id));
    event.dataTransfer.effectAllowed = 'move';
    const ghost = event.currentTarget.cloneNode(true) as HTMLElement;
    ghost.style.opacity = '0.75';
    ghost.style.maxWidth = '16rem';
    event.dataTransfer.setDragImage(ghost, 20, 20);
  }, []);

  const onDrop = useCallback(async (event: React.DragEvent<HTMLElement>, colId: string) => {
    event.preventDefault();
    setDragOverCol(null);
    const rawId = event.dataTransfer.getData('text/hub-booking-id');
    const id = Number(rawId);
    if (!Number.isFinite(id)) return;
    const detail = rows.find((d) => d.appointment.id === id);
    if (!detail) return;
    const status = detail.appointment.status;

    const allowed = (target: string) => canRoleDrop(status, target, role);
    if (!allowed(colId)) {
      setMoveFeedback('That move is not allowed from here. Use the buttons on the card instead.');
      window.setTimeout(() => setMoveFeedback(null), 4000);
      return;
    }

    const action: HubActionKind | null =
      colId === 'accepted' ? 'accept'
      : colId === 'agreement' ? 'accept' // accepted -> agreement IS the accept flow
      : colId === 'closed' && status === 'pending' ? 'decline'
      : colId === 'closed' && status === 'accepted' ? 'decline'
      : colId === 'closed' ? 'cancel'
      : colId === 'confirmed' && status === 'agreement_required' ? null // signatures required
      : colId === 'in_progress' ? 'start'
      : colId === 'completed' ? 'complete'
      : null;

    if (!action) {
      setMoveFeedback('This step needs the action buttons - signing has to happen there.');
      window.setTimeout(() => setMoveFeedback(null), 4000);
      return;
    }
    const ok = await onAction(detail, action);
    if (!ok) {
      setMoveFeedback('The booking did not change. Refresh and try the button on the card.');
      window.setTimeout(() => setMoveFeedback(null), 5000);
    }
  }, [rows, role, onAction]);

  const runMove = useCallback(
    async (detail: BookingDetail, action: HubActionKind) => {
      const ok = await onAction(detail, action);
      setOpenMenuId(null);
      if (!ok) {
        setMoveFeedback('The booking did not change. Refresh and try again.');
        window.setTimeout(() => setMoveFeedback(null), 5000);
      }
    },
    [onAction]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {moveFeedback && (
        <p
          role="status"
          aria-live="polite"
          className="mx-3 mt-2 shrink-0 rounded-2xl border border-border bg-warning-soft px-3 py-2 text-[11px] text-warning"
        >
          {moveFeedback}
        </p>
      )}
      <div
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain px-3 pb-6 pt-2"
        aria-label="Bookings board"
      >
        {BOARD_COLUMNS.map((col) => {
        const cards = grouped.get(col.id) ?? [];
        return (
          <section
            key={col.id}
            aria-label={col.title}
            className="snap-start mr-3 flex w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-card"
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => void onDrop(e, col.id)}
          >
            <header className="flex shrink-0 items-center justify-between gap-2   border-b border-divider px-3 py-2.5">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">{col.title}</h2>
                <p className="text-[9px] text-muted-foreground">{col.hint}</p>
              </div>
              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-border bg-background px-2 text-[10px] font-bold tabular-nums text-muted-foreground">
                {cards.length}
              </span>
            </header>
            <div className="min-h-[6rem] flex-1 space-y-2 overflow-y-auto p-2">
              {cards.length === 0 ? (
                <p className="rounded-xl border border-border border border-dashed border-divider px-3 py-6 text-center text-[10px] text-muted-foreground">
                  Nothing here yet.
                </p>
              ) : cards.map((d) => {
                const a = d.appointment;
                const meta = statusMeta(a.status);
                const busy = busyId === a.id;
                const counterpartName =
                  [a.coach?.firstname, a.coach?.lastname].filter(Boolean).join(' ') ||
                  a.name ||
                  '(no name)';
                return (
                  <article
                    key={a.id}
                    draggable={!busy && !isTerminal(a.status)}
                    onDragStart={(e) => startDrag(e, d)}
                    className={cn(
                      'relative rounded-xl border border-border border border-border/60 bg-background p-2.5 transition-shadow',
                      busy && 'opacity-70',
                      dragOverCol === col.id && 'ring-2 ring-ring'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{counterpartName}</p>
                        <p className="truncate text-[10px] tabular-nums text-muted-foreground">
                          {a.talent || 'Dance'}{a.experience ? ` | ${a.experience}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <GripVertical className="h-4 w-4 text-subtle-foreground" aria-hidden="true" />
                        <button
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === a.id}
                          onClick={() => setOpenMenuId(openMenuId === a.id ? null : a.id)}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {openMenuId === a.id ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <span className="tabular-nums">{formatBookingDate(a.date)} | {formatClock(a.start_time)}</span>
                      <Badge variant={badgeVariant(meta.badge)} dot>{meta.label}</Badge>
                    </div>
                    {a.purpose && <p className="mt-1 truncate text-[10px] text-muted-foreground">{a.purpose}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {role === 'coach' && a.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onAction(d, 'accept')}
                            className="inline-flex h-7 cursor-pointer items-center rounded-full border border-border bg-accent px-2 text-[10px] font-bold text-accent-foreground hover:brightness-110"
                          >
                            {busy ? '...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onAction(d, 'decline')}
                            className="inline-flex h-7 cursor-pointer items-center rounded-full border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground hover:border-border-strong hover:text-foreground"
                          >
                            {busy ? '...' : 'Decline'}
                          </button>
                        </>
                      )}
                      {role === 'coach' && a.status === 'confirmed' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onAction(d, 'start')}
                          className="inline-flex h-7 cursor-pointer items-center rounded-full border border-border bg-accent px-2 text-[10px] font-bold text-accent-foreground hover:brightness-110"
                        >
                          Start session
                        </button>
                      )}
                      {role === 'coach' && a.status === 'in_progress' && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onAction(d, 'complete')}
                            className="inline-flex h-7 cursor-pointer items-center rounded-full border border-border bg-success-soft px-2 text-[10px] font-bold text-success"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onAction(d, 'no_show')}
                            className="inline-flex h-7 cursor-pointer items-center rounded-full border border-border bg-danger-soft px-2 text-[10px] font-bold text-danger"
                          >
                            No-show
                          </button>
                        </>
                      )}
                    </div>
                    {openMenuId === a.id && (
                      <div role="menu" aria-label="Card actions" className="absolute right-0 top-8 z-30 w-52 rounded-xl border border-border border border-border bg-background p-1.5 shadow-lg">
                        <button role="menuitem" type="button" onClick={() => { setOpenMenuId(null); onOpen(a.id); }} className="flex w-full cursor-pointer items-center rounded-lg px-2 py-1.5 text-left text-[11px] hover:border-border-strong hover:bg-muted">Open case</button>
                        <p className="px-2 pb-1 pt-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-subtle-foreground">
                          Move to
                        </p>
                        {moveOptions(a.status, role).map((opt) => (
                          <button
                            key={`${opt.target}-${opt.action}`}
                            role="menuitem"
                            type="button"
                            disabled={busy}
                            onClick={() => void runMove(d, opt.action)}
                            className="flex w-full cursor-pointer items-center rounded-lg px-2 py-1.5 text-left text-[11px] hover:border-border-strong hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {opt.label}
                          </button>
                        ))}
                        <button role="menuitem" type="button" onClick={() => { setOpenMenuId(null); void onAction(d, 'cancel'); }} className="flex w-full cursor-pointer items-center rounded-lg px-2 py-1.5 text-left text-[11px] text-danger hover:border-border-strong hover:bg-danger-soft">Cancel booking</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );
}

function isTerminal(status: string): boolean {
  return ['completed','declined','cancelled','expired','no_show'].includes(status);
}
function badgeVariant(b: string): 'pending' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' {
  return b === 'pending' ? 'pending' : b === 'info' ? 'scheduled' : b === 'success' ? 'confirmed' : b === 'neutral' ? 'completed' : 'cancelled';
}

