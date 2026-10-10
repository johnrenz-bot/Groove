'use client';

/**
 * ONE Session Agreement inside a conversation.
 *
 * Placed in the message thread so the document sits in the conversation it
 * belongs to, rather than on a separate screen the two parties have to find.
 * Both sides read the same `public.agreements` row for the same appointment, so
 * they cannot disagree about what was agreed.
 *
 * ONE CARD, ONE AGREEMENT
 *   This component renders a single agreement that it is GIVEN. It no longer
 *   queries "the agreement for this conversation" and pick one — that is what
 *   hid every booking but one when a coach and a client had several sessions
 *   between them. The parent (`AgreementThread`) fetches the real set and maps
 *   one card per agreement, oldest first.
 *
 * STATUS
 *   Every status sentence comes from `agreementStatusView`, which derives it
 *   from this agreement's own signature columns AND its own linked booking. The
 *   critical rule lives there: completed / cancelled / declined are resolved
 *   FIRST, so a finished session never claims its confirmation is "still in
 *   flight" — which is what the previous `bothSigned && !confirmed` check did.
 *
 * REALTIME
 *   Two subscriptions, both scoped to THIS agreement and its booking:
 *     - `agreements`  → a signature landing on this document
 *     - `appointments`→ the booking flipping to confirmed / completed / cancelled
 *   `agreements`, `appointments` and `booking_events` are all added to
 *   supabase_realtime by 02_booking_schema.sql §11, so both fire. Each carries
 *   the row it changed, and the reload is read-only, so a duplicate event is
 *   harmless.
 *
 *   An INSERT subscription is included as well, because a brand-new agreement is
 *   exactly the event that must appear without a refresh — a brand new card
 *   mounts before it has an id to filter on, so the parent owns that case.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSignature,
  ShieldCheck,
} from 'lucide-react';
import { ViewAgreementModal } from './ViewAgreementModal';
import { SignAgreementModal } from './SignAgreementModal';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import {
  agreementReference,
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
  roleFor,
  signSignature,
  type BookingAgreement,
  type SigningRole,
} from '../services/bookingAgreement';
import {
  agreementStatusView,
  sessionDateFor,
  sessionLocationFor,
  sessionTypeFor,
  type AgreementBooking,
} from '../services/agreementStatus';

/** The gold the existing contract design uses. Kept in one place. */
const GOLD = '#f2b84b';

export function SessionAgreementCard({
  currentUserId,
  agreement: agreementProp,
  booking,
  sessionTime,
  sessionGoal,
}: {
  currentUserId: string;
  /** The single agreement this card represents. Supplied by the parent. */
  agreement: BookingAgreement;
  /** Its linked booking, or null when unlinked / not visible. */
  booking?: AgreementBooking | null;
  sessionTime?: string | null;
  sessionGoal?: string | null;
}) {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [clientSigUrl, setClientSigUrl] = useState<string | null>(null);
  const [coachSigUrl, setCoachSigUrl] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  /* The PROP is the source of truth; realtime only supplies an OVERRIDE.
     The obvious alternative — copying the prop into state and re-syncing it
     whenever the parent re-fetches — needs either a render-phase setState or an
     effect that fires on every reload, and both were flagged by
     react-hooks/set-state-in-effect. This has neither: an override is simply
     ignored once it belongs to a different agreement, so switching conversations
     cannot leave the previous card's data on screen. */
  const [liveAgreement, setLiveAgreement] = useState<BookingAgreement | null>(null);
  const [liveBooking, setLiveBooking] = useState<AgreementBooking | null>(null);

  const agreement =
    liveAgreement && liveAgreement.id === agreementProp.id ? liveAgreement : agreementProp;
  const bookingState =
    liveBooking && agreementProp.appointment_id === liveBooking.id
      ? liveBooking
      : (booking ?? null);

  /**
   * Monotonic revision, used to discard a slow reload that lands after a newer
   * one. A ref, because it must change without triggering a render.
   *
   * It is `useRef`, NOT `useMemo({n:0})`: a memo object is treated as immutable
   * input, and React's compiler rejects writing to it. The whole point of this
   * value is to be written to.
   */
  const revision = useRef(0);

  const load = useCallback(async () => {
    const mine = ++revision.current;
    try {
      const { data: fresh } = await supabase
        .from('agreements')
        .select('*')
        .eq('id', agreementProp.id)
        .maybeSingle();
      if (!fresh || mine !== revision.current) return;

      // Signature URLs expire in an hour, so they are regenerated on every read
      // rather than cached across a long-lived thread.
      const [c, k] = await Promise.all([
        signSignature(supabase, fresh.client_signature_path),
        signSignature(supabase, fresh.coach_signature_path),
      ]);
      if (mine !== revision.current) return;

      let freshBooking: AgreementBooking | null = null;
      if (fresh.appointment_id) {
        const { data: appt } = await supabase
          .from('appointments')
          .select('id, status, date, start_time, end_time, location, session_type, is_online')
          .eq('id', fresh.appointment_id)
          .maybeSingle();
        freshBooking = (appt as AgreementBooking | null) ?? null;
      }
      if (mine !== revision.current) return;

      setLiveAgreement(fresh as BookingAgreement);
      setLiveBooking(freshBooking);
      setClientSigUrl(c);
      setCoachSigUrl(k);
    } catch {
      // A failed refresh leaves the last good render in place. Blanking the card
      // would be worse than showing slightly stale data.
    }
  }, [supabase, agreementProp.id]);

  // Initial signature URLs for the row we were handed.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [c, k] = await Promise.all([
        signSignature(supabase, agreementProp.client_signature_path),
        signSignature(supabase, agreementProp.coach_signature_path),
      ]);
      if (cancelled) return;
      setClientSigUrl(c);
      setCoachSigUrl(k);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, agreementProp.client_signature_path, agreementProp.coach_signature_path]);

  // Realtime: this agreement's own signature changes.
  useEffect(() => {
    const channel = supabase
      .channel(`agreement:${agreementProp.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agreements',
          filter: `id=eq.${agreementProp.id}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, agreementProp.id, load]);

  // Realtime: the booking's status — confirmed / completed / cancelled all land
  // here, not on `agreements`.
  useEffect(() => {
    if (!agreement.appointment_id) return;
    const channel = supabase
      .channel(`booking:${agreement.appointment_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `id=eq.${agreement.appointment_id}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, agreement.appointment_id, load]);

  const role: SigningRole | null = roleFor(agreement, currentUserId);
  const view = agreementStatusView(agreement, currentUserId, bookingState);
  const mySigned = Boolean(
    role === 'client' ? agreement.client_signed_at : agreement.coach_signed_at
  );
  const ref = agreementReference(agreement);

  const printPdf = () => {
    window.print();
  };

  if (!role) return null;

  const sessionDate = sessionDateFor(agreement, bookingState);
  const location = sessionLocationFor(agreement, bookingState);
  const sessionType = sessionTypeFor(agreement, bookingState);

  /* ── Compact: a finished or cancelled booking ──────────────────────────
     Collapsed by design. A conversation with a year of sessions behind it
     would otherwise be mostly expanded history, and the thing a user wants from
     a completed booking is the document and the PDF, not the tile grid. */
  if (view.presentation === 'compact') {
    return (
      <>
        <section
          aria-label={`Session agreement ${ref}`}
          className="mx-auto my-2.5 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground"
              >
                <FileSignature className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-foreground">Session Agreement</p>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {ref}
                  </span>
                  {/* The badge is the status. On a compact card there is no
                      status line, so this is the only place it appears. */}
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {view.message}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {sessionDate ? formatDate(sessionDate) : 'Date not recorded'}
                  {bookingState?.start_time
                    ? ` · ${formatTime(bookingState.start_time)}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewModalOpen(true)}
              >
                View Full Agreement
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={printPdf}
                aria-label={`Download agreement ${ref} as PDF`}
                icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                PDF
              </Button>
            </div>
          </div>
        </section>

        <ViewAgreementModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          agreement={agreement}
          clientSignatureUrl={clientSigUrl}
          coachSignatureUrl={coachSigUrl}
          sessionTime={sessionTime}
          sessionGoal={sessionGoal}
          canSign={false}
          isSigned={mySigned}
          bookingConfirmed={view.kind === 'confirmed'}
          onOpenSign={() => setSignOpen(true)}
        />

        <SignAgreementModal
          open={signOpen}
          onClose={() => setSignOpen(false)}
          agreement={agreement}
          role={role}
          userId={currentUserId}
          clientSignatureUrl={clientSigUrl}
          coachSignatureUrl={coachSigUrl}
          onSigned={load}
        />
      </>
    );
  }

  return (
    <>
      <section
        aria-label={`Session agreement summary ${ref}`}
        className="mx-auto my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-border-strong"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider bg-muted/30 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text"
            >
              <FileSignature className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">Session Agreement</p>
                {/* The reference is this booking's own `appointment_id`, so two
                    cards in one thread are distinguishable at a glance. */}
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {ref}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Groove Digital Performing Arts Contract</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <SignatureChip party="Client" signed={Boolean(agreement.client_signed_at)} />
            <SignatureChip party="Coach" signed={Boolean(agreement.coach_signed_at)} />
          </div>
        </div>

        {/* ONE status line, derived by agreementStatusView. `tone` drives colour
            only — the sentence itself is the accessible content, so this is a
            live region rather than an icon plus a tooltip. */}
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 border-b border-divider px-5 py-2.5 text-xs font-semibold ${
            view.tone === 'success'
              ? 'bg-success-soft text-success'
              : view.tone === 'warning'
                ? 'bg-accent-soft text-accent-text'
                : 'bg-muted/40 text-muted-foreground'
          }`}
        >
          {view.kind === 'confirmed' ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{view.message}</span>
        </div>

        {/* Compact summary view */}
        <div className="space-y-3 px-5 py-4 text-xs">
          {/* `break-words` rather than `truncate`: the old tiles clipped a long
              location or session type to an ellipsis, so the card silently
              disagreed with the document about where the session was. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Session Date">
              {sessionDate ? formatDate(sessionDate) : 'To be agreed'}
            </Tile>
            <Tile label="Rate / Fee" accent>
              {formatMoney(agreement.rate ?? agreement.appointment_price)}
            </Tile>
            <Tile label="Type">{sessionType ?? 'Not specified'}</Tile>
            <Tile label="Location">{location ?? 'Not specified'}</Tile>
          </div>

          {/* Time is its own row because it is the field most often missing
              from `scheduled_at`, and a date with no time reads as "any time". */}
          {(bookingState?.start_time || agreement.scheduled_at) && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Time: </span>
              {bookingState?.start_time
                ? `${formatTime(bookingState.start_time)}${
                    bookingState.end_time
                      ? ` – ${formatTime(bookingState.end_time)}`
                      : ''
                  }`
                : formatDateTime(agreement.scheduled_at)}
            </p>
          )}

          <p className="text-[12px] leading-relaxed text-muted-foreground">
            This digital agreement outlines the rehearsal session scope, mutual responsibilities, and cancellation notice. Open the full document to review complete terms and signatures.
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider bg-muted/20 px-5 py-3">
          <div className="flex items-center gap-2">
            {/* The gold CTA is reserved for the one state that can act on it:
                the other party has signed and this one has not. Everywhere else
                a "Review & Sign" button was either a dead end (already signed)
                or wrong (a cancelled booking still offering to be signed). */}
            {view.needsMySignature && !mySigned ? (
              <button
                type="button"
                onClick={() => setSignOpen(true)}
                style={{ backgroundColor: GOLD }}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl px-4 text-xs font-bold text-black shadow-sm transition hover:brightness-105 active:scale-[0.98]"
              >
                <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />
                Review &amp; Sign
              </button>
            ) : mySigned ? (
              <span className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-success">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Signed by you
              </span>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewModalOpen(true)}
            >
              View Full Agreement
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={printPdf}
            aria-label={`Download agreement ${ref} as PDF`}
            icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            PDF
          </Button>
        </div>
      </section>

      {/* Full Agreement Modal */}
      <ViewAgreementModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        agreement={agreement}
        clientSignatureUrl={clientSigUrl}
        coachSignatureUrl={coachSigUrl}
        sessionTime={sessionTime}
        sessionGoal={sessionGoal}
        canSign={view.needsMySignature && !mySigned}
        isSigned={mySigned}
        bookingConfirmed={view.kind === 'confirmed'}
        onOpenSign={() => setSignOpen(true)}
      />

      {/* Review & Sign Modal */}
      <SignAgreementModal
        open={signOpen}
        onClose={() => setSignOpen(false)}
        agreement={agreement}
        role={role}
        userId={currentUserId}
        clientSignatureUrl={clientSigUrl}
        coachSignatureUrl={coachSigUrl}
        onSigned={load}
      />
    </>
  );
}

/** Client / Coach signature chip. Same shape as before, extracted for reuse. */
function SignatureChip({ party, signed }: { party: string; signed: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${
        signed ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'
      }`}
    >
      <span aria-hidden="true">{signed ? '✓' : '⏳'}</span>
      <span>
        {party}
        <span className="sr-only">{signed ? ' — signed' : ' — not signed yet'}</span>
      </span>
    </span>
  );
}

/**
 * One summary tile.
 *
 * `break-words` instead of `truncate`: the previous tiles cut a long location or
 * session type to an ellipsis, which made the card quietly disagree with the
 * agreement about where and how the session runs.
 */
function Tile({
  label,
  children,
  accent = false,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-muted/40 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 break-words font-medium ${accent ? 'text-accent-text' : 'text-foreground'}`}
      >
        {children}
      </p>
    </div>
  );
}

export default SessionAgreementCard;
