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
} from '@/components/booking/SessionAgreementDocument';
import { SignAgreementModal } from '@/components/booking/SignAgreementModal';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import {
  fetchBookingAgreement,
  roleFor,
  signSignature,
  type BookingAgreement,
  type SigningRole,
} from '@/lib/bookingAgreement';

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
  const [expanded, setExpanded] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [clientSigUrl, setClientSigUrl] = useState<string | null>(null);
  const [coachSigUrl, setCoachSigUrl] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  /**
   * Everything the card shows, gathered in one pass. PURE with respect to React
   * state: it reads and returns, it never calls setState.
   *
   * Split out from `load` so the mount effect can await it and apply the result
   * itself. Folding the setState calls back into this function is what made the
   * linter see `load()` as a state-setting call being invoked synchronously
   * inside an effect.
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
      // A failed read must not take the conversation down; the card simply
      // stays absent, which is correct when there is nothing to show.
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
      // setState happens only after this await, so the effect body never calls
      // it synchronously. Same fetch, same result as before.
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

  const printPdf = () => {
    // Print-to-PDF: the document is already laid out as a document, and the
    // print stylesheet in globals.css drops the app chrome. This produces a real
    // PDF of exactly what the parties signed, with no extra dependency and no
    // round trip that could leak the signed images.
    window.print();
  };

  if (loading) {
    return (
      <div className="mx-auto my-4 flex w-full max-w-3xl items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-6 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading session agreement…
      </div>
    );
  }

  if (!agreement || !role) return null;

  return (
    <>
      <section
        aria-label="Session agreement"
        className="mx-auto my-5 w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-5 py-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text">
            <FileSignature className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent-text">
              Groove System
            </p>
            <p className="text-sm font-bold text-foreground">Session Agreement</p>
          </div>

          <div className="ml-auto flex items-center gap-2 text-[11px] font-semibold">
            <span
              className={
                agreement.client_signed_at
                  ? 'text-success'
                  : 'text-muted-foreground'
              }
            >
              {agreement.client_signed_at ? '✓' : '⏳'} Client
            </span>
            <span aria-hidden="true" className="text-muted-foreground">·</span>
            <span
              className={
                agreement.coach_signed_at ? 'text-success' : 'text-muted-foreground'
              }
            >
              {agreement.coach_signed_at ? '✓' : '⏳'} Coach
            </span>
          </div>
        </div>

        {bookingConfirmed && (
          <div className="flex items-center gap-2 border-b border-border bg-success/10 px-5 py-3 text-[12px] font-bold text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Agreement fully signed — booking confirmed
          </div>
        )}
        {bothSigned && !bookingConfirmed && (
          <div className="flex items-center gap-2 border-b border-border bg-accent-soft px-5 py-3 text-[12px] font-semibold text-accent-text">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Both parties have signed. Confirming the booking…
          </div>
        )}

        <div className="px-5 py-6">
          {expanded ? (
            <SessionAgreementDocument
              agreement={agreement}
              clientSignatureUrl={clientSigUrl}
              coachSignatureUrl={coachSigUrl}
              sessionTime={sessionTime}
              sessionGoal={sessionGoal}
            />
          ) : (
            /* Also on paper, so the collapsed preview matches the expanded
               document instead of flipping to dark when it is opened. */
            <AgreementPaper className="p-5 sm:p-6">
              <p className="text-[13px] leading-relaxed text-foreground/90">
                This Session Agreement is made between the Client and the Coach for the
                purpose of confirming the details, responsibilities, and terms of the agreed
                performing arts session. Both parties acknowledge and agree to the session
                details, applicable fees, responsibilities, cancellation terms, and other
                conditions stated in the full agreement.
              </p>
            </AgreementPaper>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/20 px-5 py-4">
          {!mySigned ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSignOpen(true)}
              icon={<FileSignature className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Review &amp; Sign Agreement
            </Button>
          ) : (
            <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-success">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              You have signed
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? 'Collapse Agreement' : 'View Full Agreement'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={printPdf}
            icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Download PDF
          </Button>
        </div>
      </section>

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
