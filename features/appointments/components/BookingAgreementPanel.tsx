'use client';

import { useEffect, useState } from 'react';
import { FileSignature, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SignAgreementModal } from '@/features/booking/components/SignAgreementModal';
import { ViewAgreementModal } from '@/features/booking/components/ViewAgreementModal';
import { agreementStatusView, type BookingStatus } from '@/features/booking/services/agreementStatus';
import {
  roleFor,
  signSignature,
  type BookingAgreement,
} from '@/features/booking/services/bookingAgreement';
import { createClient } from '@/lib/supabase/client';
import type { Agreement } from '@/lib/types';

/**
 * The agreement block on a booking card: read it, and sign it if it is your turn.
 *
 * WHY A WRAPPER INSTEAD OF THE MODALS DIRECTLY
 *   `SignAgreementModal` and `ViewAgreementModal` both need the SIGNED URLs of
 *   the two signature images, and the signing one also needs the viewer's role
 *   and id. Signatures live in the PRIVATE `contract-signatures` bucket, so those
 *   URLs can only be produced per-request by the viewer who is entitled to them.
 *   Doing that inline meant repeating the same three fetches on every page that
 *   shows an agreement; doing it here keeps it in one place and makes the loading
 *   state explicit instead of flashing empty signature boxes.
 *
 * STATUS IS NOT COMPUTED HERE
 *   The wording comes from `agreementStatusView`, the same pure function the
 *   messages thread uses, so a booking card and a conversation can never disagree
 *   about whether a signature is still outstanding.
 */
export function BookingAgreementPanel({
  agreement,
  bookingStatus,
  userId,
  onChanged,
}: {
  agreement: Agreement;
  /** The linked booking's status, which the agreement view needs. */
  bookingStatus: string | null;
  userId: string;
  /**
   * Called after a signature lands. The parent MUST reload rather than patch
   * local state: the second signature is what moves the booking to 'confirmed',
   * via the database's both-signed trigger, so the page cannot know the new
   * status without re-reading it.
   */
  onChanged?: () => void;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  /**
   * The signature images, resolved on demand and tagged with the paths they came
   * from. `null` means "not resolved yet", which is also how the loading state is
   * derived — a separate boolean would have to be reset synchronously inside the
   * effect that loads them.
   */
  const [signatures, setSignatures] = useState<{
    client: string | null;
    coach: string | null;
    paths: string;
  } | null>(null);

  const typed = agreement as unknown as BookingAgreement;
  const role = roleFor(typed, userId);
  const view = agreementStatusView(typed, userId, {
    id: agreement.appointment_id ?? 0,
    status: (bookingStatus as BookingStatus) ?? null,
  });

  const paths = `${typed.client_signature_path ?? ''}|${typed.coach_signature_path ?? ''}`;
  const resolved =
    signatures && signatures.paths === paths
      ? signatures
      : { client: null, coach: null, paths };
  const loadingUrls = (viewOpen || signOpen) && resolved.client === null && resolved.coach === null && signatures === null;

  // The signature images only matter once a modal is open, so they are fetched on
  // demand rather than for every booking on the page. Both state writes happen in
  // the async continuation, never synchronously in the effect body.
  useEffect(() => {
    if (!viewOpen && !signOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const [client, coach] = await Promise.all([
          signSignature(supabase, typed.client_signature_path),
          signSignature(supabase, typed.coach_signature_path),
        ]);
        if (!cancelled) setSignatures({ client, coach, paths });
      } catch {
        // A missing signature image must not break reading the document.
        if (!cancelled) setSignatures({ client: null, coach: null, paths });
      }
    })();
    return () => {
      cancelled = true;
    };
    // `typed` is a fresh object each render; the two paths are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOpen, signOpen, paths]);

  // Not a party: this row is visible because the reader is an admin or the
  // agreement is linked to a booking they can see. Nothing to sign.
  if (!role) return null;

  return (
    <>
      <div className="rounded-2xl border border-accent-border/40 bg-accent-soft/40 p-3.5 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-foreground">
          <FileSignature className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
          Session agreement
        </p>
        <p className="mt-1 leading-relaxed text-muted-foreground">{view.message}</p>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setViewOpen(true)}
            icon={<FileSignature className="h-3.5 w-3.5" />}
          >
            Read agreement
          </Button>
          {view.needsMySignature && (
            <Button
              type="button"
              size="sm"
              loading={loadingUrls}
              onClick={() => setSignOpen(true)}
            >
              Review &amp; sign
            </Button>
          )}
        </div>
      </div>

      {viewOpen && (
        <ViewAgreementModal
          open={viewOpen}
          agreement={typed}
          clientSignatureUrl={resolved.client}
          coachSignatureUrl={resolved.coach}
          onClose={() => setViewOpen(false)}
          onOpenSign={view.needsMySignature ? () => setSignOpen(true) : undefined}
          canSign={view.needsMySignature}
          isSigned={!view.needsMySignature}
          bookingConfirmed={bookingStatus === 'confirmed' || bookingStatus === 'completed'}
        />
      )}

      {signOpen && (
        <SignAgreementModal
          open={signOpen}
          agreement={typed}
          role={role}
          userId={userId}
          clientSignatureUrl={resolved.client}
          coachSignatureUrl={resolved.coach}
          onClose={() => setSignOpen(false)}
          onSigned={() => {
            setSignOpen(false);
            onChanged?.();
          }}
        />
      )}
    </>
  );
}

/** Inline spinner used while a booking card is loading its own data. */
export function AgreementSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      Loading agreement…
    </div>
  );
}

export default BookingAgreementPanel;