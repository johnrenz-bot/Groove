'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldX,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { useAdmin } from '@/components/admin/AdminContext';
import { ConfirmDialog } from '@/components/admin/AdminStates';
import { reviewVerification, type AdminUserRecord } from '@/lib/admin/service';
import { fullName, locationOf } from '@/lib/admin/presentation';
import { formatDateTime } from '@/lib/utils';
import {
  approvalBlockMessage,
  canApproveVerification,
  documentSlots,
  verificationStatusOf,
} from '@/lib/verification';
import { DocumentLightbox, VerificationDocumentCard } from './VerificationDocumentCard';
import { VerificationStatusBadge } from './VerifiedBadge';

/**
 * The verification review panel.
 *
 * One panel serves the queue and the account drawer, because reviewing a
 * submission is the same act wherever it is started from — and three copies
 * would drift on the rules that matter (which documents are required, whether
 * approval is even possible).
 *
 * What it enforces:
 *   - Approval is disabled, with the missing documents named, unless every
 *     required document for that role is present.
 *   - Rejection requires a reason, and that reason is persisted on the profile so
 *     the account owner can read it.
 *   - Both decisions go through `reviewVerification`, which is RBAC-bound by the
 *     admin's own session and re-checked by the database.
 */

interface Props {
  user: AdminUserRecord | null;
  onClose: () => void;
  onReviewed: () => void;
}

export function VerificationReviewPanel({ user, onClose, onReviewed }: Props) {
  const { admin, logAction } = useAdmin();

  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [document, setDocument] = useState<string>('');

  // A previous account's reason must never appear against the next one.
  //
  // Done as the documented "adjusting state during render" pattern rather than in
  // an effect: storing the id the state belongs to and comparing it during render
  // is the sanctioned way to reset on a prop change. An effect here would render
  // one frame carrying the previous user's rejection reason into the new user's
  // panel, which is the exact bug this reset exists to prevent — and would trip
  // react-hooks/set-state-in-effect for a real reason, not a lint preference.
  //
  // `userId` is normalised, because `user?.id` is `undefined` when there is no
  // user while `resetFor` is `null`. Comparing the raw optional chain against
  // the normalised state made the guard permanently true while the panel was
  // closed — `undefined !== null` on every render — so this block kept queuing
  // the same identical state values during render and React aborted with
  // "Too many re-renders" the moment the page mounted the panel with no user
  // selected. Both sides of the comparison must use the same normalisation.
  const userId = user?.id ?? null;
  const [resetFor, setResetFor] = useState<string | null>(userId);
  if (userId !== resetFor) {
    setResetFor(userId);
    setError(null);
    setRejecting(false);
    setReason('');
    setDocument('');
    setConfirmApprove(false);
  }

  if (!user) return null;

  const status = verificationStatusOf(user);
  const slots = documentSlots(user);
  const approvable = canApproveVerification(user);
  const blockMessage = approvalBlockMessage(user);
  const roleLabel = user.role === 'coach' ? 'Coach' : 'Client';

  const decide = async (decision: 'approve' | 'reject') => {
    if (!user) return;
    setWorking(true);
    setError(null);
    try {
      await reviewVerification({
        userId: user.id,
        decision,
        role: user.role === 'coach' ? 'coach' : 'client',
        reason,
        document: document || null,
        reviewedBy: admin?.id ?? null,
        blockingMessage: decision === 'approve' ? blockMessage : null,
      });

      logAction(
        decision === 'approve' ? 'verify' : 'reject_verification',
        'profile',
        user.id,
        decision === 'approve'
          ? `Approved verification for ${fullName(user)} (${user.role})`
          : `Rejected verification for ${fullName(user)}: ${reason.trim()}`
      );

      onReviewed();
      onClose();
    } catch (err) {
      setError(verificationErrorMessage(err));
      setConfirmApprove(false);
      setRejecting(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <Modal
        open={Boolean(user)}
        onClose={onClose}
        size="2xl"
        title={`Verify ${roleLabel.toLowerCase()} — ${fullName(user)}`}
        description={`${roleLabel} account · ${user.username} · joined ${formatDateTime(user.created_at)}`}
      >
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Identity + state */}
        <div className="flex flex-col gap-4 border-b border-divider pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{roleLabel}</Badge>
              <VerificationStatusBadge status={status} />
              {user.suspended_at && <Badge variant="suspended">Suspended</Badge>}
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
              <MetaRow icon={<Mail className="h-3.5 w-3.5" />} label={user.email} />
              <MetaRow icon={<Phone className="h-3.5 w-3.5" />} label={user.contact || 'No contact'} />
              <MetaRow icon={<IdCard className="h-3.5 w-3.5" />} label={user.custom_id ? `ID ${user.custom_id}` : 'No custom ID'} />
              <MetaRow icon={<MapPin className="h-3.5 w-3.5" />} label={locationOf(user)} />
            </dl>
          </div>
        </div>

        {/* Requirement checklist */}
        <section className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden="true" />
              Required documents
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {slots.filter((s) => s.present).length} of {slots.length} submitted
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => (
              <VerificationDocumentCard
                key={slot.key}
                label={slot.label}
                hint={slot.hint}
                path={slot.path}
                required={slot.required}
                onOpen={(url) => setLightbox({ url, label: `${fullName(user)} — ${slot.label}` })}
              />
            ))}
          </div>

          {!approvable && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs text-warning"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Approval is not available.</strong>{' '}
                {blockMessage}
              </span>
            </div>
          )}
        </section>

        {/* Rejection history */}
        {user.verification_rejection_reason && status === 'rejected' && (
          <section className="mt-5 rounded-2xl border border-danger/30 bg-danger-soft p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-danger">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Rejection reason shown to the user
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {user.verification_rejection_reason}
            </p>
            {user.verification_rejected_document && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Document: {user.verification_rejected_document}
              </p>
            )}
            {user.verification_reviewed_at && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Reviewed {formatDateTime(user.verification_reviewed_at)}
              </p>
            )}
          </section>
        )}

        {/* Existing approval record */}
        {status === 'verified' && user.approved_at && (
          <section className="mt-5 flex items-start gap-2.5 rounded-2xl border border-success/30 bg-success-soft p-4">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">
              <strong className="font-semibold text-foreground">Verified</strong> on{' '}
              {formatDateTime(user.approved_at)}. Revoking returns the account to the queue.
            </p>
          </section>
        )}

        {/* Rejection form */}
        {rejecting && (
          <section className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground">
              <XCircle className="h-4 w-4 text-danger" aria-hidden="true" />
              Reason for rejection
            </h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              This is stored on the account and shown to the user, who then corrects the documents
              and resubmits. Say specifically what is wrong.
            </p>

            <div className="mt-3">
              <label htmlFor="reject-document" className="g-label">
                Which document (optional)
              </label>
              <select
                id="reject-document"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="g-input cursor-pointer"
              >
                <option value="">Not specific to one document</option>
                {slots.map((slot) => (
                  <option key={slot.key} value={slot.label}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3">
              <Textarea
                id="reject-reason"
                label={
                  <>
                    Reason <span className="text-danger">*</span>
                  </>
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                // `g-input` pins height to 48px, which would collapse a textarea
                // to a single line. These two classes restore an auto height that
                // still matches every other field in the app.
                className="h-auto min-h-[92px] resize-y py-3"
                placeholder="e.g. The government ID photo is too blurry to read the ID number, and the selfie does not show your face clearly."
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejecting(false)} disabled={working}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => void decide('reject')}
                loading={working}
                disabled={!reason.trim()}
                icon={<ShieldX className="h-4 w-4" />}
              >
                Reject verification
              </Button>
            </div>
          </section>
        )}

        {/* Decision actions */}
        {!rejecting && (
          <section className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-divider pt-5">
            <Button variant="outline" onClick={onClose} disabled={working}>
              Close
            </Button>
            {status !== 'rejected' && (
              <Button
                variant="outline"
                onClick={() => setRejecting(true)}
                disabled={working}
                className="border-danger/40 text-danger hover:bg-danger-soft hover:text-danger"
                icon={<XCircle className="h-4 w-4" />}
              >
                Reject…
              </Button>
            )}
            <Button
              onClick={() => setConfirmApprove(true)}
              disabled={!approvable || working}
              loading={working}
              icon={<BadgeCheck className="h-4 w-4" />}
            >
              {status === 'verified' ? 'Re-approve' : 'Approve verification'}
            </Button>
          </section>
        )}
      </Modal>

      {/* Approval is consequential, so it gets an explicit confirmation. */}
      <ConfirmDialog
        open={confirmApprove}
        title={status === 'verified' ? 'Confirm verified status?' : 'Approve this account?'}
        message={
          <>
            <strong>{fullName(user)}</strong> will be marked verified, the{' '}
            {user.role === 'coach' ? 'coach' : 'client'} will be notified, and booking will become
            available to them immediately.
          </>
        }
        confirmLabel="Approve verification"
        loading={working}
        onCancel={() => setConfirmApprove(false)}
        onConfirm={() => void decide('approve')}
      />

      <DocumentLightbox
        url={lightbox?.url ?? null}
        label={lightbox?.label ?? ''}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}

/**
 * Turn whatever the Supabase client threw into something an admin can act on.
 *
 * The previous `err instanceof Error ? err.message : <generic>` check hid every
 * real database failure. `@supabase/postgrest-js` returns a plain object of
 * shape `{ message, details, hint, code }` — NOT an Error subclass — so
 * `instanceof Error` is false and both Approve and Reject reported the same
 * useless "The verification decision could not be saved." even when Postgres
 * had named the missing column.
 *
 * The code is kept because it is the only stable identifier: `PGRST204` is a
 * missing column/function in the schema cache, `42501` is an RLS denial, and
 * `P0001` is a trigger RAISE. Postgres frequently puts the fix in `hint`, so
 * that is surfaced too when present.
 */
function verificationErrorMessage(err: unknown): string {
  const fallback = 'The verification decision could not be saved.';

  if (typeof err === 'string' && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;

  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const message = typeof e.message === 'string' ? e.message.trim() : '';
    const code = typeof e.code === 'string' ? e.code.trim() : '';
    const hint = typeof e.hint === 'string' ? e.hint.trim() : '';

    if (message) {
      return [code ? `${code}: ${message}` : message, hint].filter(Boolean).join(' — ');
    }
  }

  return fallback;
}

function MetaRow({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
      {icon && <span className="shrink-0 text-subtle-foreground">{icon}</span>}
      <span className="truncate">{label}</span>
    </div>
  );
}

export default VerificationReviewPanel;