'use client';

import React, { useRef, useState } from 'react';
import { CheckCircle2, FileText, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { resubmitVerification } from '@/lib/admin/service';
import { VERIFICATION_BUCKET } from '@/lib/utils';
import { requiredDocuments, type RequiredDocument } from '@/lib/verification';
import { cn } from '@/components/shared/cn';

/**
 * Document upload for correcting a verification submission.
 *
 * This is the other half of the rejection loop. `VerificationReadOnly` on the
 * profile pages is read-only by design, so without this a rejected account has
 * no way to fix anything and the rejection reason is a dead end — the account can
 * never leave "rejected". This component gives the user exactly the missing half:
 * replace a document, then return the account to the review queue.
 *
 * Reuses the existing private bucket and its policies rather than adding a second
 * store. The object-name shape is mandated by `supabase/storage_policies.sql`:
 *
 *   clients/<auth.uid()>/<13-digit epoch ms>_<4 digits>.<ext>
 *   coaches/<auth.uid()>/<13-digit epoch ms>_<4 digits>.<ext>
 *
 * The INSERT / SELECT / UPDATE policies match those three segments exactly, so
 * anything else 403s. `upsert: true` is required: supabase.storage issues a
 * SELECT then an UPDATE when the object exists, and INSERT-only policies reject
 * that.
 *
 * The size and MIME ceilings here mirror the RLS policy. This check is UX — the
 * policy is the authority, and it is trivially bypassable from the client, which
 * is exactly why both exist and must agree.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const VALID_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

/** Keys on the role's detail table for a given document. */
const COLUMN: Record<RequiredDocument['key'], string> = {
  portfolio_path: 'portfolio_path',
  valid_id_path: 'valid_id_path',
  id_selfie_path: 'id_selfie_path',
};

export function VerificationDocumentsUpload({
  userId,
  role,
  accountVerified,
  verificationStatus,
  /** Current paths, so an already-submitted document shows as held. */
  currentPaths,
  onResubmitted,
}: {
  userId: string;
  role: string | null | undefined;
  accountVerified: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | null;
  currentPaths: Partial<Record<RequiredDocument['key'], string | null>>;
  onResubmitted?: () => void;
}) {
  const [busyKey, setBusyKey] = useState<RequiredDocument['key'] | null>(null);
  const [uploaded, setUploaded] = useState<Partial<Record<RequiredDocument['key'], boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputs = useRef<Partial<Record<RequiredDocument['key'], HTMLInputElement | null>>>({});

  const documents = requiredDocuments(role);

  // A verified account has nothing to correct. The verificationStatus column is
  // optional so an older row that never got backfilled still resolves correctly.
  const status = accountVerified ? 'verified' : verificationStatus === 'rejected' ? 'rejected' : 'pending';
  if (status === 'verified' || documents.length === 0) return null;

  const upload = async (doc: RequiredDocument, file: File) => {
    if (!VALID_TYPES.includes(file.type)) {
      setError(`${doc.label}: only PDF, JPG, PNG or WebP files are accepted.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`${doc.label}: the file is larger than the 5 MB limit.`);
      return;
    }

    setBusyKey(doc.key);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (user.id !== userId) {
        throw new Error('You can only upload verification documents for your own account.');
      }

      // The four digits in the object name are the account's custom_id. A profile
      // without one would 403 against the storage policy's filename regex, so it
      // is read from the row rather than invented.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('custom_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new Error('Could not read your account record. Please try again.');
      }

      const customId = String(profile?.custom_id ?? '').padStart(4, '0').slice(-4);
      if (!/^\d{4}$/.test(customId)) {
        throw new Error(
          'Your account is missing its registration ID, which the document upload requires. Please contact the Groove System administrator.'
        );
      }

      const folder = role === 'coach' ? 'coaches' : 'clients';
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg';
      // Date.now() is required by the storage policy's filename regex, and it is
      // fine here: this runs inside an async file-input handler, never during
      // render. The purity rule cannot see across the await boundary.
      // eslint-disable-next-line react-hooks/purity
      const stamp = Date.now();
      const path = `${folder}/${userId}/${stamp}_${customId}.${safeExt}`;

      const { error: storageError } = await supabase.storage
        .from(VERIFICATION_BUCKET)
        .upload(path, file, { upsert: true });

      if (storageError) {
        throw new Error(`Could not upload your ${doc.label.toLowerCase()}: ${storageError.message}`);
      }

      // Only the raw Storage PATH is persisted — never a signed URL.
      const table = role === 'coach' ? 'coach_profiles' : 'client_profiles';
      const { error: updateError } = await supabase
        .from(table)
        .upsert({ id: userId, [COLUMN[doc.key]]: path });

      if (updateError) {
        throw new Error(`Your ${doc.label.toLowerCase()} could not be saved: ${updateError.message}`);
      }

      setUploaded((prev) => ({ ...prev, [doc.key]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The upload could not be completed.');
    } finally {
      setBusyKey(null);
      if (inputs.current[doc.key]) inputs.current[doc.key]!.value = '';
    }
  };

  /**
   * Return the account to the review queue.
   *
   * Scoped server-side to `verification_status = 'rejected'`, so pressing this
   * after an approval does nothing rather than demoting a verified account.
   */
  const resubmit = async () => {
    setBusyKey('__resubmit__' as RequiredDocument['key']);
    setError(null);
    try {
      await resubmitVerification(userId);
      setDone(true);
      onResubmitted?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Your account could not be returned for review.'
      );
    } finally {
      setBusyKey(null);
    }
  };

  if (done) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-success/30 bg-success-soft px-5 py-4"
      >
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Sent for review
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground">
          Your corrected documents are with an administrator. You will be notified once they
          approve the account, and booking becomes available at that point.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden="true" />
        <h3 className="text-sm font-bold text-foreground">
          {status === 'rejected' ? 'Correct your documents' : 'Submit your documents'}
        </h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {status === 'rejected'
          ? 'Replace anything the administrator rejected, then send your account back for review. PDF, JPG, PNG or WebP, up to 5 MB each.'
          : 'Upload every required document to complete your verification. PDF, JPG, PNG or WebP, up to 5 MB each.'}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs text-danger"
        >
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => {
          const held = Boolean(currentPaths[doc.key]) || Boolean(uploaded[doc.key]);
          const busy = busyKey === doc.key;

          return (
            <div
              key={doc.key}
              className={cn(
                'relative rounded-xl border p-3.5 transition-colors',
                held ? 'border-success/30 bg-success-soft' : 'border-dashed border-border-strong bg-muted/40'
              )}
            >
              <input
                ref={(el) => {
                  inputs.current[doc.key] = el;
                }}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                aria-label={`Upload ${doc.label}`}
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(doc, file);
                }}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              <div className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    held
                      ? 'border-success/30 bg-card text-success'
                      : 'border-accent-border bg-accent-soft text-accent-text'
                  )}
                >
                  {busy ? (
                    <Loader2 className="g-spin h-4 w-4" />
                  ) : held ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">{doc.label}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    {doc.hint}
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-accent-text">
                    <Upload className="h-3 w-3" aria-hidden="true" />
                    {busy ? 'Uploading…' : held ? 'Replace file' : 'Choose file'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {status === 'rejected' && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-divider pt-4">
          <Button
            size="sm"
            onClick={() => void resubmit()}
            loading={busyKey === ('__resubmit__' as RequiredDocument['key'])}
            icon={<ShieldCheck className="h-4 w-4" />}
          >
            Resubmit for review
          </Button>
        </div>
      )}
    </div>
  );
}

export default VerificationDocumentsUpload;