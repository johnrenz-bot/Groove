'use client';

/**
 * Review & sign the Session Agreement.
 *
 * The complete document is shown first, before the pad is reachable. Signing is
 * a consent act, so the consent checkbox and the typed legal name are both
 * required — the pad alone is too easy to complete without reading.
 *
 * Reuses SignaturePadModal for capture. Writes only this party's own column via
 * lib/bookingAgreement.signAgreement; the database stamps the timestamp and
 * moves the booking to CONFIRMED once both parties have signed. Nothing here
 * writes an appointment status.
 */

import React, { useState } from 'react';
import { FileSignature, ShieldCheck } from 'lucide-react';
import { SignaturePadModal } from '@/components/shared/SignaturePadModal';
import { SessionAgreementDocument } from './SessionAgreementDocument';
import { Button } from '@/components/ui/Button';
import {
  ModalCloseButton,
  MODAL_HEADER_CLASS,
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_CLASS,
  useModalDismiss,
} from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import { createClient } from '@/lib/supabase/client';
import {
  fullName,
  signAgreement,
  type BookingAgreement,
  type SigningRole,
} from '../services/bookingAgreement';

export function SignAgreementModal({
  open,
  onClose,
  agreement,
  role,
  userId,
  clientSignatureUrl,
  coachSignatureUrl,
  onSigned,
}: {
  open: boolean;
  onClose: () => void;
  agreement: BookingAgreement;
  role: SigningRole;
  userId: string;
  clientSignatureUrl: string | null;
  coachSignatureUrl: string | null;
  /** Called after the write succeeds so the card can refresh. */
  onSigned: () => void | Promise<void>;
}) {
  const [consent, setConsent] = useState(false);
  const [legalName, setLegalName] = useState('');
  const [padOpen, setPadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedName = fullName(role === 'client' ? agreement.client : agreement.coach);
  const canOpenPad = consent && legalName.trim().length >= 2 && !saving;

  const handleSignature = async (dataUrl: string) => {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      await signAgreement(supabase, { agreement, role, userId, dataUrl });
      await onSigned();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The signature could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const { backdropProps } = useModalDismiss({ open, onClose, disabled: saving });

  if (!open) return null;

  const alreadySigned = role === 'client' ? agreement.client_signed_at : agreement.coach_signed_at;

  return (
    <>
      <div
        className={cn(MODAL_OVERLAY_CLASS, 'animate-in fade-in')}
        role="dialog"
        aria-modal="true"
        aria-label="Review and sign session agreement"
        {...backdropProps}
      >
        <div className={cn(MODAL_PANEL_CLASS, 'max-w-3xl max-h-[92vh] animate-in fade-in zoom-in-95 duration-300 sm:select-text')}>
          {/* Fixed Header */}
          <header className={cn(MODAL_HEADER_CLASS, 'items-center px-5 py-4 sm:px-7 sm:py-5')}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text shadow-sm">
                <FileSignature className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold tracking-[-0.02em] text-foreground sm:text-lg">
                  Review &amp; Sign Agreement
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Signing as {role === 'client' ? 'Client' : 'Coach'} · Legally Binding Document
                </p>
              </div>
            </div>
            <ModalCloseButton onClose={onClose} disabled={saving} label="Close agreement dialog" />
          </header>

          {/* Scrollable Document */}
          <div className="g-scroll flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
            <SessionAgreementDocument
              agreement={agreement}
              clientSignatureUrl={clientSignatureUrl}
              coachSignatureUrl={coachSignatureUrl}
            />
          </div>

          {/* Sticky Signing & Consent Section */}
          <div className="shrink-0 space-y-3.5 border-t border-divider bg-muted/40 px-5 py-4 backdrop-blur-sm sm:px-7 sm:py-5">
            {alreadySigned ? (
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-4 py-2.5 text-xs font-semibold text-success">
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  You have already signed this agreement. Signatures cannot be modified once recorded.
                </p>
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                  <div>
                    <label
                      htmlFor="agreement-legal-name"
                      className="block text-xs font-semibold text-foreground"
                    >
                      Type your full legal name *
                    </label>
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      {expectedName
                        ? `Profile: ${expectedName}`
                        : 'Must match your government name'}
                    </p>
                    <input
                      id="agreement-legal-name"
                      type="text"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="e.g. John Doe"
                      autoComplete="name"
                      className="g-input mt-1.5 h-10 w-full text-xs"
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-card/60 p-3 hover:bg-card">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                    />
                    <span className="text-xs leading-relaxed text-foreground">
                      I have read, understood, and accept this Session Agreement and cancellation terms.
                    </span>
                  </label>
                </div>

                {error && (
                  <p role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-3.5 py-2 text-xs font-medium text-danger">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                  <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setPadOpen(true)}
                    disabled={!canOpenPad}
                    loading={saving}
                    icon={<FileSignature className="h-3.5 w-3.5" aria-hidden="true" />}
                    title={
                      canOpenPad
                        ? undefined
                        : 'Enter your legal name and accept terms first'
                    }
                  >
                    {saving ? 'Saving Signature…' : 'Sign Agreement'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <SignaturePadModal
        title="Draw your signature"
        isOpen={padOpen}
        onClose={() => setPadOpen(false)}
        onSave={handleSignature}
      />
    </>
  );
}

export default SignAgreementModal;
