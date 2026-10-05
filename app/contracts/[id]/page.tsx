'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  CheckCircle2,
  ArrowLeft,
  Shield,
  Loader2,
} from 'lucide-react';
import { AppHeader } from '@/components/shared/Navbar';
import SignaturePadModal from '@/components/shared/SignaturePadModal';
import { Agreement, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sigPadOpen, setSigPadOpen] = useState(false);
  const [sigTarget, setSigTarget] = useState<'client' | 'coach'>('client');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /**
   * Short-lived signed URLs for the stored signature images. The columns hold
   * object PATHS; the bucket is private, so an <img src> of the raw path would
   * 403. Signed URLs are regenerated on every load rather than persisted.
   */
  const [signatureUrls, setSignatureUrls] = useState<{ client: string | null; coach: string | null }>({
    client: null,
    coach: null,
  });

  const fetchContract = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(p);

      const { data: agData, error } = await supabase
        .from('agreements')
        .select(`
          *,
          client:client_id(*),
          coach:coach_id(*)
        `)
        .eq('id', Number(resolvedParams.id))
        .single();

      if (!error && agData) {
        setAgreement(agData);

        // Resolve short-lived signed URLs for any signature already on file, so
        // an existing signature renders on load. Tolerates a legacy row that
        // stored a full URL rather than a path.
        const resolve = async (p: string | null | undefined) => {
          if (!p) return null;
          if (/^https?:\/\//i.test(p)) return p;
          const { data } = await supabase.storage
            .from('contract-signatures')
            .createSignedUrl(p, 3600);
          return data?.signedUrl ?? null;
        };
        const [clientUrl, coachUrl] = await Promise.all([
          resolve(agData.client_signature_path),
          resolve(agData.coach_signature_path),
        ]);
        setSignatureUrls({ client: clientUrl, coach: coachUrl });
      }
    } catch (err) {
      console.error('Error loading contract:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleApplySignature = async (dataUrl: string) => {
    if (!agreement || !currentUser) return;

    try {
      const supabase = createClient();

      if (!agreement.appointment_id) {
        throw new Error('This agreement is not linked to a booking yet.');
      }

      // Convert dataUrl to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Path shape is mandated by the storage RLS policy:
      //     contract-signatures/<appointment_id>/<party>-<unix>.png
      // foldername() excludes the leaf, so the booking id must be segment [2],
      // and the leaf must start with the party's role or the upload is refused.
      // The previous flat `sig_<agreementId>_<party>_<ts>.png` name could never
      // satisfy that policy, so uploads from this page failed silently as a
      // generic RLS error.
      const filename = `${sigTarget}-${Date.now()}.png`;
      const path = `${agreement.appointment_id}/${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from('contract-signatures')
        .upload(path, blob, { contentType: 'image/png', upsert: false });

      if (uploadErr) throw uploadErr;

      // Store the PATH, never a public URL. The bucket is private, so
      // getPublicUrl() produced an address that 403s forever; and storing a
      // signed URL would bake an expiry into a permanent record.
      const updatePayload: Record<string, string> = {};
      if (sigTarget === 'client') {
        updatePayload.client_signature_path = path;
      } else {
        updatePayload.coach_signature_path = path;
      }

      const { error: updateErr } = await supabase
        .from('agreements')
        .update(updatePayload)
        .eq('id', agreement.id);

      if (updateErr) throw updateErr;

      // Resolve a short-lived signed URL for immediate display. Re-fetching on
      // load does the same, so nothing permanent is stored.
      const { data: signed } = await supabase.storage
        .from('contract-signatures')
        .createSignedUrl(path, 3600);

      setAgreement({ ...agreement, ...updatePayload });
      setSignatureUrls((prev) => ({
        ...prev,
        [sigTarget === 'client' ? 'client' : 'coach']: signed?.signedUrl ?? null,
      }));
      setSuccessMsg('Signature applied and saved to digital contract!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Signature error:', err);
      // Surface the real reason instead of a generic alert — an RLS refusal and
      // a network failure need very different responses from the user.
      setSuccessMsg(null);
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to save signature.'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="g-spin h-8 w-8 text-accent" aria-hidden="true" />
        <span className="sr-only">Loading contract</span>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="g-card flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-sm text-muted-foreground">Agreement contract not found.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isClient = currentUser?.id === agreement.client_id;
  const isCoach = currentUser?.id === agreement.coach_id;

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <AppHeader
        userRole={currentUser?.role === 'coach' ? 'coach' : 'client'}
        userProfile={currentUser}
      />

      {/* ── Document. A ~70ch measure keeps the clauses readable. ── */}
      <main className="mx-auto max-w-3xl px-4 pt-8 md:px-8 md:pt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
          </button>
          <span className="g-pill-accent text-[11px] font-semibold uppercase tracking-[0.08em]">
            Digital Performing Arts Contract
          </span>
        </div>

        {successMsg && (
          <div
            role="status"
            className="mb-6 flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-3.5 py-3 text-xs text-success"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        <article className="g-card space-y-7 p-6 text-sm sm:p-8">
          {/* Header */}
          <header className="space-y-2 border-b border-divider pb-6 text-center">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Official Groove Digital Agreement
            </div>
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
              Coaching Service Agreement
            </h1>
            <p className="text-xs text-subtle-foreground">
              Contract Agreement #{String(agreement.id).padStart(4, '0')} · Established on{' '}
              {new Date(agreement.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </p>
          </header>

          {/* Parties Involved */}
          <section className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div className="space-y-1 rounded-2xl border border-divider bg-muted/40 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                Client / Student
              </span>
              <h2 className="text-sm font-bold text-foreground">
                {agreement.client?.firstname} {agreement.client?.lastname}
              </h2>
              <p className="text-muted-foreground">{agreement.client?.email}</p>
            </div>

            <div className="space-y-1 rounded-2xl border border-divider bg-muted/40 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                Coach / Instructor
              </span>
              <h2 className="text-sm font-bold text-foreground">
                Coach {agreement.coach?.firstname} {agreement.coach?.lastname}
              </h2>
              <p className="text-muted-foreground">{agreement.coach?.email}</p>
            </div>
          </section>

          {/* Agreed Terms */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-[-0.01em] text-foreground">
              <Shield className="h-4 w-4 text-success" aria-hidden="true" />
              Agreed Session Terms &amp; Pricing
            </h2>
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-divider bg-muted/40 px-3 py-3">
                <span className="text-muted-foreground">Service Rate:</span>
                <span className="font-bold text-success">
                  ₱{agreement.appointment_price || '500'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-divider bg-muted/40 px-3 py-3">
                <span className="text-muted-foreground">Session Duration:</span>
                <span className="font-bold text-foreground">
                  {agreement.session_duration || '1 Hour'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-divider bg-muted/40 px-3 py-3">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-bold capitalize text-foreground">
                  {agreement.payment_method || 'Cash on site'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-divider bg-muted/40 px-3 py-3">
                <span className="text-muted-foreground">Notice Requirement:</span>
                <span className="font-bold text-foreground">
                  {agreement.notice_hours || 24} hours
                </span>
              </div>
            </div>
          </section>

          {/* Legal clauses */}
          <section className="space-y-2 rounded-2xl border border-divider bg-muted/40 p-5 text-xs leading-relaxed text-muted-foreground">
            <h3 className="font-bold text-foreground">
              Standard Code of Conduct &amp; Rehearsal Guidelines
            </h3>
            <p>
              1. Both client and coach agree to conduct coaching sessions with professional respect and diligence.
            </p>
            <p>
              2. Cancellations must adhere to the advance notice policy specified above.
            </p>
            <p>
              3. Sessions take place at verified rehearsal studios or agreed online meeting links.
            </p>
          </section>

          {/* Signatures Area */}
          <section className="grid grid-cols-1 gap-6 border-t border-divider pt-6 sm:grid-cols-2">
            {/* Client Signature */}
            <div className="space-y-3 rounded-2xl border border-divider p-5 text-center">
              <span className="text-xs font-semibold text-muted-foreground">Client Signature</span>
              {signatureUrls.client ? (
                <div className="flex h-24 items-center justify-center rounded-xl border border-border bg-card p-2">
                  <img
                    src={signatureUrls.client}
                    alt="Client Signature"
                    className="max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-subtle-foreground">
                  Awaiting Client Signature
                </div>
              )}
              {isClient && (
                <button
                  type="button"
                  onClick={() => {
                    setSigTarget('client');
                    setSigPadOpen(true);
                  }}
                  className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
                >
                  {agreement.client_signature_path ? 'Resign Contract' : 'Sign as Client'}
                </button>
              )}
            </div>

            {/* Coach Signature */}
            <div className="space-y-3 rounded-2xl border border-divider p-5 text-center">
              <span className="text-xs font-semibold text-muted-foreground">Coach Signature</span>
              {signatureUrls.coach ? (
                <div className="flex h-24 items-center justify-center rounded-xl border border-border bg-card p-2">
                  <img
                    src={signatureUrls.coach}
                    alt="Coach Signature"
                    className="max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-subtle-foreground">
                  Awaiting Coach Signature
                </div>
              )}
              {isCoach && (
                <button
                  type="button"
                  onClick={() => {
                    setSigTarget('coach');
                    setSigPadOpen(true);
                  }}
                  className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
                >
                  {agreement.coach_signature_path ? 'Resign Contract' : 'Sign as Coach'}
                </button>
              )}
            </div>
          </section>
        </article>
      </main>

      {/* Signature Pad Modal */}
      {sigPadOpen && (
        <SignaturePadModal
          title={`Sign Agreement as ${sigTarget === 'client' ? 'Client' : 'Coach'}`}
          isOpen={sigPadOpen}
          onClose={() => setSigPadOpen(false)}
          onSave={handleApplySignature}
        />
      )}
    </div>
  );
}
