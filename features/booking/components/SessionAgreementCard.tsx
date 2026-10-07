'use client';

/**
 * The Session Agreement inside a conversation.
 *
 * Placed in the message thread so the document sits in the conversation it
 * belongs to, rather than on a separate screen the two parties have to find.
 * Both sides read the same `public.agreements` row for the same appointment, so
 * they cannot disagree about what was agreed.
 *
 * REALTIME: a postgres_changes subscription on `agreements` scoped to this
 * agreement's id. When the other party signs, this card re-fetches and shows it
 * immediately — no polling, no refresh. When the second signature lands the
 * database moves the booking to CONFIRMED; the card re-reads the booking too so
 * it can say so.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSignature, Loader2, ShieldCheck } from 'lucide-react';
import {
  AgreementPaper,
  SessionAgreementDocument,
} from './SessionAgreementDocument';
import { ViewAgreementModal } from './ViewAgreementModal';
import { SignAgreementModal } from './SignAgreementModal';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import {
  agreementReference,
  fetchBookingAgreement,
  formatDate,
  formatMoney,
  roleFor,
  signSignature,
  type BookingAgreement,
  type SigningRole,
} from '../services/bookingAgreement';

export function SessionAgreementCard({
  currentUserId,
  partnerId,
  sessionTime,
  sessionGoal,
}: {
  currentUserId: string;
  partnerId: string;
  /** From the booking, so the agreement does not have to duplicate it. */
  sessionTime?: string | null;
  sessionGoal?: string | null;
}) {
  const [agreement, setAgreement] = useState<BookingAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [clientSigUrl, setClientSigUrl] = useState<string | null>(null);
  const [coachSigUrl, setCoachSigUrl] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  /**
   * Everything the card shows, gathered in one pass. PURE with respect to React
   * state: it reads and returns, it never calls setState.
   */
  const readAgreement = useCallback(async () => {
    try {
      const found = await fetchBookingAgreement(supabase, currentUserId, partnerId);
      if (!found) {
        return { agreement: null, clientSigUrl: null, coachSigUrl: null, confirmed: false };
      }

      // Signed URLs, never stored URLs. These expire in an hour and are
      // regenerated on every read and on every realtime refresh.
      const [c, k] = await Promise.all([
        signSignature(supabase, found.client_signature_path),
        signSignature(supabase, found.coach_signature_path),
      ]);

      // The booking status is the source of truth for "confirmed", never the
      // presence of two signature columns read client-side.
      let confirmed = false;
      if (found.appointment_id) {
        const { data: appt } = await supabase
          .from('appointments')
          .select('status')
          .eq('id', found.appointment_id)
          .maybeSingle();
        confirmed = appt?.status === 'confirmed';
      }

      return { agreement: found, clientSigUrl: c, coachSigUrl: k, confirmed };
    } catch {
      return { agreement: null, clientSigUrl: null, coachSigUrl: null, confirmed: false };
    }
  }, [supabase, currentUserId, partnerId]);

  /** Commit a read result to state. Kept separate so the two callers can differ. */
  const apply = useCallback((next: {
    agreement: BookingAgreement | null;
    clientSigUrl: string | null;
    coachSigUrl: string | null;
    confirmed: boolean;
  }) => {
    setAgreement(next.agreement);
    setClientSigUrl(next.clientSigUrl);
    setCoachSigUrl(next.coachSigUrl);
    setBookingConfirmed(next.confirmed);
  }, []);

  /** Read and apply in one step. Used by realtime callbacks and by onSigned. */
  const load = useCallback(async () => {
    try {
      apply(await readAgreement());
    } finally {
      setLoading(false);
    }
  }, [readAgreement, apply]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await readAgreement();
      if (cancelled) return;
      apply(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [readAgreement, apply]);

  // Realtime: only the fields that matter to this card, so a signature landing
  // does not re-render on unrelated agreement edits.
  useEffect(() => {
    if (!agreement?.id) return;
    const channel = supabase
      .channel(`agreement:${agreement.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agreements',
          filter: `id=eq.${agreement.id}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, agreement?.id, load]);

  // The booking flipping to confirmed happens on the appointments table, not
  // agreements, so that needs its own listener.
  useEffect(() => {
    if (!agreement?.appointment_id) return;
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
  }, [supabase, agreement?.appointment_id, load]);

  const role: SigningRole | null = agreement ? roleFor(agreement, currentUserId) : null;
  const mySigned = role === 'client' ? agreement?.client_signed_at : agreement?.coach_signed_at;
  const bothSigned = Boolean(agreement?.client_signed_at && agreement?.coach_signed_at);
  const ref = agreement ? agreementReference(agreement) : '';

  const printPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="mx-auto my-4 flex w-full max-w-2xl items-center justify-center gap-2.5 rounded-2xl border border-border bg-card px-5 py-6 text-xs text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
        Loading session agreement…
      </div>
    );
  }

  if (!agreement || !role) return null;

  return (
    <>
      <section
        aria-label="Session agreement summary"
        className="mx-auto my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-border-strong"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider bg-muted/30 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text">
              <FileSignature className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">Session Agreement</p>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {ref}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Groove Digital Performing Arts Contract</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${
                agreement.client_signed_at
                  ? 'bg-success-soft text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {agreement.client_signed_at ? '✓' : '⏳'} Client
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${
                agreement.coach_signed_at
                  ? 'bg-success-soft text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {agreement.coach_signed_at ? '✓' : '⏳'} Coach
            </span>
          </div>
        </div>

        {bookingConfirmed && (
          <div className="flex items-center gap-2 border-b border-divider bg-success-soft px-5 py-2.5 text-xs font-bold text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Agreement fully signed — booking confirmed
          </div>
        )}
        {bothSigned && !bookingConfirmed && (
          <div className="flex items-center gap-2 border-b border-divider bg-accent-soft px-5 py-2.5 text-xs font-semibold text-accent-text">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Both parties have signed. Confirming booking status…
          </div>
        )}

        {/* Compact summary view */}
        <div className="space-y-3 px-5 py-4 text-xs">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Session Date</p>
              <p className="mt-1 font-medium text-foreground">
                {formatDate(agreement.agreement_date) || 'Scheduled'}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Rate / Fee</p>
              <p className="mt-1 font-medium text-accent-text">
                {formatMoney(agreement.rate || agreement.appointment_price) || 'Agreed Rate'}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Type</p>
              <p className="mt-1 truncate font-medium text-foreground">
                {agreement.session_type || 'Rehearsal'}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Location</p>
              <p className="mt-1 truncate font-medium text-foreground">
                {agreement.location || 'SJDM Studio'}
              </p>
            </div>
          </div>

          <p className="text-[12px] leading-relaxed text-muted-foreground">
            This digital agreement outlines the rehearsal session scope, mutual responsibilities, and cancellation notice. Open the full document to review complete terms and signatures.
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider bg-muted/20 px-5 py-3">
          <div className="flex items-center gap-2">
            {!mySigned ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSignOpen(true)}
                icon={<FileSignature className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Review &amp; Sign
              </Button>
            ) : (
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-success">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Signed by you
              </span>
            )}

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
        canSign={!mySigned}
        isSigned={Boolean(mySigned)}
        bookingConfirmed={bookingConfirmed}
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

export default SessionAgreementCard;
