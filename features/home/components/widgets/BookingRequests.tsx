'use client';

/**
 * Booking Requests — coach side.
 *
 * Real pending requests from `appointments` (status = 'pending'), with real
 * Accept/Decline actions:
 *   - Accept runs the shared agreement flow (buildAgreementTerms +
 *     acceptBooking, same compare-and-set transaction as the coach calendar).
 *   - Decline moves the booking to 'declined' via transitionBooking.
 * Every button carries its own loading state; a refused write leaves the
 * item in the list with an actionable message.
 */

import React, { useState } from 'react';
import { Inbox, Check, X, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { acceptBooking, transitionBooking } from '@/features/appointments/services/bookingService';
import { buildAgreementTerms } from '@/features/appointments/services/agreementTerms';
import type { SessionWithClient } from '../../types';

type PendingAction = 'accept' | 'decline' | null;

export function BookingRequests({
  requests,
  onChanged,
}: {
  requests: SessionWithClient[];
  /** Called after a successful accept/decline so the parent can refresh. */
  onChanged: () => void;
}) {
  // The parent passes a fresh `requests` array each refresh — we only track
  // which ids the user already resolved this session. No effect required.
  const [resolvedIds, setResolvedIds] = useState<Array<number | string>>([]);
  const [busyId, setBusyId] = useState<number | string | null>(null);
  const [busyAction, setBusyAction] = useState<PendingAction>(null);
  const [confirmDeclineId, setConfirmDeclineId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = requests.filter((request) => !resolvedIds.includes(request.id));

  const act = async (item: SessionWithClient, action: Exclude<PendingAction, null>) => {
    setBusyId(item.id);
    setBusyAction(action);
    setError(null);

    try {
      const supabase = createClient();

      if (action === 'accept') {
        const terms = await buildAgreementTerms(supabase, item);
        if (terms.error) {
          setError(`The request was not accepted because the agreement terms could not be prepared (${terms.error}).`);
          return;
        }
        const { agreementError } = await acceptBooking(supabase, {
          appointment: item,
          agreementRow: terms.row,
        });
        if (agreementError) {
          setError(agreementError);
          return;
        }
      } else {
        await transitionBooking(supabase, {
          appointmentId: Number(item.id),
          from: 'pending',
          to: 'declined',
        });
      }

      setResolvedIds((current) => [...current, item.id]);
      setConfirmDeclineId(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through. Please try again.');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  return (
    <PanelCard
      icon={<Inbox className="h-4 w-4" />}
      title="Booking Requests"
      viewAllHref="/coach/messages?view=board"
      viewAllLabel="View all"
    >
      {error && (
        <p role="alert" className="mb-3 rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          compact
          icon={<CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />}
          title="No pending requests"
          description="When a client books a session with you it will land here with their details."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((request) => {
            const clientName = request.client
              ? `${request.client.firstname} ${request.client.lastname}`.trim()
              : 'New client';
            const busy = busyId === request.id;
            const confirming = confirmDeclineId === request.id;

            return (
              <li
                key={request.id}
                className="rounded-2xl border border-warning/30 bg-warning-soft/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{clientName}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {request.date}
                      {request.start_time ? ` · ${request.start_time}` : ''}
                      {request.talent ? ` · ${request.talent}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-warning/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
                    Pending
                  </span>
                </div>

                {confirming ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground">
                      Decline this request?
                    </span>
                    <button
                      type="button"
                      onClick={() => act(request, 'decline')}
                      disabled={busy}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-danger/50 bg-danger-soft px-3 text-[10px] font-bold text-danger transition hover:bg-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      {busy && busyAction === 'decline' ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      ) : null}
                      Confirm decline
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeclineId(null)}
                      disabled={busy}
                      className="inline-flex h-7 items-center rounded-full px-3 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Keep request
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => act(request, 'accept')}
                      disabled={busy}
                      className="inline-flex h-7 items-center gap-1.5 rounded-full bg-success px-3 text-[10px] font-bold text-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      {busy && busyAction === 'accept' ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="h-3 w-3" aria-hidden="true" />
                      )}
                      {busy && busyAction === 'accept' ? 'Accepting…' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeclineId(request.id)}
                      disabled={busy}
                      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[10px] font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      Decline
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}

export default BookingRequests;

