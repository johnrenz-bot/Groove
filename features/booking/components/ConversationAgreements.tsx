'use client';

/**
 * The "Session Agreements" half of a conversation.
 *
 * WHAT MOVED HERE
 *   The agreement cards used to be interleaved at the bottom of the message
 *   feed, so a conversation with a year of sessions behind it was mostly
 *   agreement cards and the actual conversation had to be scrolled past. They
 *   now have their own section next to Messages, and this component is what
 *   that section renders.
 *
 * NOTHING IS RE-FETCHED HERE
 *   `AgreementThread` owns the single query, the single realtime pair, the
 *   ordering and the de-duplication. This component is handed the rows it
 *   already has and only decides how to present them. That is why it takes
 *   `rows` rather than an id pair: a second fetch here would double the
 *   subscriptions and let the two copies disagree.
 *
 * CURRENT vs HISTORY
 *   `rows` arrives oldest-first, so the LAST row is the most recent booking. The
 *   "current" agreement is the newest one that has not finished — the one a
 *   session is still in flight for. A booking that is completed, cancelled or
 *   declined can never be current, which is the same terminal-first rule
 *   `agreementStatusView` applies to the status sentence; using it here too means
 *   the card in the "Current" slot can never contradict its own status line.
 *
 *   If every booking has finished, the newest row is still shown as current —
 *   an empty "current" slot next to a full history reads as a bug, and the most
 *   recent session is the one a user came here for.
 *
 * ACTIONS ARE THE EXISTING ONES
 *   Every card is a real `SessionAgreementCard`, so View Full Agreement, Review
 *   & Sign and PDF come from the same component, modals and handlers they always
 *   did, with the same realtime updates underneath. Nothing about signing is
 *   reimplemented here.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  FileSignature,
  History,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import { SessionAgreementCard } from './SessionAgreementCard';
import { AgreementTermsForm } from './AgreementTermsForm';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { agreementReference, type ConversationAgreement } from '../services/bookingAgreement';
import {
  agreementStatusView,
  type AgreementStatusKind,
  type AgreementStatusView,
} from '../services/agreementStatus';
import { cn } from '@/components/shared/cn';

/** Statuses that mean the session is still in flight, so the row is "current". */
const IN_FLIGHT: AgreementStatusKind[] = [
  'awaiting_both',
  'awaiting_other',
  'awaiting_you',
  'confirming',
  'confirmed',
];

const TONE_BADGE: Record<AgreementStatusView['tone'], 'approved' | 'pending' | 'neutral'> = {
  success: 'approved',
  warning: 'pending',
  neutral: 'neutral',
};

/**
 * Split into the agreement to act on and the rest.
 *
 * Exported because the split is a rule, not a layout detail, and the tests
 * assert it directly — this is the piece most likely to be got wrong.
 */
export function splitAgreements(
  rows: ConversationAgreement[],
  currentUserId: string
): { current: ConversationAgreement | null; history: ConversationAgreement[] } {
  if (rows.length === 0) return { current: null, history: [] };

  const views = new Map<number, AgreementStatusView>();
  for (const row of rows) {
    views.set(row.id, agreementStatusView(row, currentUserId, row.booking));
  }

  // rows are oldest-first, so iterate backwards for "newest that is still live".
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (IN_FLIGHT.includes(views.get(row.id)!.kind)) {
      return { current: row, history: rows.slice(0, i).concat(rows.slice(i + 1)) };
    }
  }

  // Everything has finished. The newest is still the one worth showing first.
  return { current: rows[rows.length - 1], history: rows.slice(0, -1) };
}

/** How many agreements are still waiting on the signed-in party's signature. */
function countUnmine(
  history: ConversationAgreement[],
  current: ConversationAgreement | null,
  currentUserId: string
): number {
  let n = 0;
  const consider = (row: ConversationAgreement | null) => {
    if (!row) return;
    const iAmClient = row.client_id === currentUserId;
    const mine = iAmClient ? row.client_signed_at : row.coach_signed_at;
    if (!mine) n += 1;
  };
  consider(current);
  for (const row of history) consider(row);
  return n;
}

export function ConversationAgreements({
  rows,
  currentUserId,
  viewerRole,
  loading = false,
}: {
  rows: ConversationAgreement[];
  currentUserId: string;
  /** `client` sees a coach-authored document; `coach` authored it. */
  viewerRole: 'client' | 'coach';
  loading?: boolean;
}) {
  const [showTerms, setShowTerms] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { current, history } = splitAgreements(rows, currentUserId);

  if (loading) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2.5 p-10 text-center text-xs text-muted-foreground"
        role="status"
      >
        <FileSignature className="h-6 w-6 animate-pulse text-accent" aria-hidden="true" />
        Loading session agreements…
      </div>
    );
  }

  /* No agreements at all. Silence would read as a failure to load, so say what
     is actually true, and point at the ONE place the app creates them: the coach
     accepting a booking request. A client is sent there too, because the booking
     is what has to exist first either way. */
  if (!current) {
    return (
      <div className="g-scroll h-full overflow-y-auto p-4 sm:p-6">
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="No session agreements yet"
          description={
            viewerRole === 'coach'
              ? 'An agreement is created when you accept a booking request. Once you send it, it appears here for both of you to review and sign.'
              : 'When your coach accepts a booking request, an agreement is created for you to review and sign. It will appear here as soon as it is sent.'
          }
          actionHref={viewerRole === 'coach' ? '/coach/appointments' : '/client/appointments'}
          action={viewerRole === 'coach' ? 'Open Coaching Requests' : 'View my bookings'}
          className="mx-auto max-w-xl"
        />
      </div>
    );
  }

  const currentView = agreementStatusView(current, currentUserId, current.booking);
  const outstanding = countUnmine(history, current, currentUserId);

  return (
    <div className="g-scroll h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
        {/* ── Current agreement ──────────────────────────────────────────── */}
        <section aria-label="Current session agreement">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text"
              >
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">Current agreement</h3>
                <p className="text-[11px] text-muted-foreground">
                  {agreementReference(current)} · {currentView.message}
                </p>
              </div>
            </div>
            <Badge variant={TONE_BADGE[currentView.tone]} dot>
              {currentView.message}
            </Badge>
          </header>

          {/* The real card, so View Full Agreement / Review & Sign / PDF and the
              per-agreement realtime subscriptions are all unchanged. */}
          <SessionAgreementCard
            currentUserId={currentUserId}
            agreement={current}
            booking={current.booking}
          />

          {/* The same terms, field by field, for a quick read without opening
              the document. Collapsed by default so it does not bury the card's
              actions. */}
          <div className="mx-auto w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setShowTerms((v) => !v)}
              aria-expanded={showTerms}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-left text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted/60"
            >
              <span>View all terms</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  showTerms && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </button>
            {showTerms && (
              <AgreementTermsForm
                agreement={current}
                booking={current.booking}
                currentUserId={currentUserId}
                className="mt-2.5"
              />
            )}
          </div>
        </section>

        {/* ── Previous agreements ────────────────────────────────────────── */}
        {history.length > 0 && (
          <section aria-label="Previous session agreements">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:border-border-strong hover:bg-muted/60"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <History className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs font-bold text-foreground">Previous agreements</span>
                <Badge variant="neutral">{history.length}</Badge>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  historyOpen && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </button>

            {outstanding > 1 && !historyOpen && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {outstanding} of your agreements are still waiting on a signature. Open this
                list to review them.
              </p>
            )}

            {historyOpen && (
              <div className="mt-3 space-y-1">
                {history.map((row) => (
                  <SessionAgreementCard
                    key={row.id}
                    currentUserId={currentUserId}
                    agreement={row}
                    booking={row.booking}
                  />
                ))}
              </div>
            )}

            {outstanding > 1 && (
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Need the full document for an older session?{' '}
                <Link
                  href={viewerRole === 'coach' ? '/coach/appointments' : '/client/appointments'}
                  className="font-semibold text-accent-text hover:underline"
                >
                  Open bookings
                </Link>
                .
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default ConversationAgreements;
