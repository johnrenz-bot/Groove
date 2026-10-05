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
import { SessionAgreementDocument } from '@/components/booking/SessionAgreementDocument';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import {
  fullName,
  signAgreement,
  type BookingAgreement,
  type SigningRole,
} from '@/lib/bookingAgreement';

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

  if (!open) return null;

  const alreadySigned = role === 'client' ? agreement.client_signed_at : agreement.coach_signed_at;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Review and sign session agreement"
      >
        <div className="my-auto w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text">
              <FileSignature className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-foreground">
                Review &amp; Sign Agreement
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Signing as {role === 'client' ? 'Client' : 'Coach'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto cursor-pointer rounded-lg px-2 py-1 text-lg leading-none text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="max-h-[52vh] overflow-y-auto px-5 py-6">
            <SessionAgreementDocument
              agreement={agreement}
              clientSignatureUrl={clientSignatureUrl}
              coachSignatureUrl={coachSignatureUrl}
            />
          </div>

          <div className="space-y-4 border-t border-border px-5 py-5">
            {alreadySigned ? (
              <p className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-[13px] font-semibold text-success">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                You have already signed this agreement. Signatures cannot be changed once
                recorded.
              </p>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="agreement-legal-name"
                    className="text-[12px] font-semibold text-foreground"
                  >
                    Type your full legal name
                  </label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {expectedName
                      ? `Your profile name is ${expectedName}. Type it exactly as it should appear on the agreement.`
                      : 'Type your name exactly as it should appear on the agreement.'}
                  </p>
                  <input
                    id="agreement-legal-name"
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Full legal name"
                    autoComplete="name"
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent-border"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                  />
                  <span className="text-[13px] leading-relaxed text-foreground">
                    I have read, understood, and agree to this Session Agreement.
                  </span>
                </label>

                {error && (
                  <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-[12px] font-medium text-danger">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={onClose} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setPadOpen(true)}
                    disabled={!canOpenPad}
                    title={
                      canOpenPad
                        ? undefined
                        : 'Enter your legal name and tick the consent box first'
                    }
                  >
                    {saving ? 'Saving…' : 'Sign Agreement'}
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
