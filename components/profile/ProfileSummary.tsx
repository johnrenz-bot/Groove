'use client';

import React from 'react';
import { CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ProfileFieldRow } from '@/lib/profileFields';
import { VerificationStatusBadge } from '@/components/verification/VerifiedBadge';

/**
 * The read-only half of Profile: a clean summary of exactly the fields the
 * role's registration collects, plus verification status.
 *
 * The row list is supplied by the caller so a coach never sees a client field
 * and vice versa. Labels match the form labels exactly.
 */
export function ProfileSummary({
  rows,
  title,
  description,
  children,
}: {
  rows: ProfileFieldRow[];
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="g-card p-6">
      <header className="mb-5 border-b border-divider pb-4">
        <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </header>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
              {row.label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-foreground">
              {row.value === '' || row.value === null || row.value === undefined ? (
                <span className="text-subtle-foreground">Not provided</span>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      {children && <div className="mt-6 border-t border-divider pt-5">{children}</div>}
    </section>
  );
}

/**
 * Verification status. Always read-only: these flags are written by the
 * registration trigger and by admin approval, never by the account owner.
 */
export function VerificationStatus({
  emailVerified,
  accountVerified,
  status,
  extraRows = [],
  verificationStatus = 'pending',
  rejectionReason = null,
  rejectedDocument = null,
}: {
  emailVerified: boolean;
  /**
   * Kept in the prop contract because every caller already passes it, and it is
   * the fallback when no `verificationStatus` is supplied — a row written before
   * the new column existed still has to render the right badge.
   */
  accountVerified: boolean;
  status?: string;
  extraRows?: { label: string; uploaded: boolean }[];
  /** Three-state verification, from `verificationStatusOf()`. */
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  /** Why an admin rejected the submission, shown verbatim to the owner. */
  rejectionReason?: string | null;
  rejectedDocument?: string | null;
}) {
  // `account_verified` wins over the status column, mirroring
  // verificationStatusOf(): an approved account must never display as pending.
  const effectiveStatus = accountVerified ? 'verified' : verificationStatus;

  return (
    <section className="g-card p-6">
      <header className="mb-5 flex items-center gap-2 border-b border-divider pb-4">
        <ShieldAlert className="h-4 w-4 text-accent-text" aria-hidden="true" />
        <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">
          Verification Status
        </h2>
        <span className="ml-auto text-[11px] font-medium text-subtle-foreground">Read-only</span>
      </header>

      {/* A rejection has to be actionable, so the reason is shown here rather
          than only existing in an admin table. This is the whole point of
          storing it. */}
      {effectiveStatus === 'rejected' && rejectionReason && (
        <div
          role="status"
          className="mb-5 rounded-2xl border border-danger/30 bg-danger-soft p-4"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-danger">
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Verification rejected
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{rejectionReason}</p>
          {rejectedDocument && (
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
              Document: {rejectedDocument}
            </p>
          )}
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            Booking stays unavailable until this is corrected. Upload the corrected documents
            above, then an administrator will review your account again.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatusTile
          icon={emailVerified ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          tone={emailVerified ? 'success' : 'warning'}
          label="Email Verified"
          value={emailVerified ? 'Confirmed' : 'Pending confirmation'}
        />
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
          <VerificationStatusBadge status={effectiveStatus} />
          <span className="text-[11px] text-muted-foreground">
            {effectiveStatus === 'verified'
              ? 'Booking is available'
              : effectiveStatus === 'rejected'
                ? 'Needs correction'
                : 'Booking is unavailable'}
          </span>
        </div>
        {status && (
          <StatusTile
            icon={<ShieldAlert className="h-4 w-4" />}
            tone={status === 'suspended' ? 'danger' : 'neutral'}
            label="Account Status"
            value={status.charAt(0).toUpperCase() + status.slice(1)}
          />
        )}
        {extraRows.map((row) => (
          <StatusTile
            key={row.label}
            icon={row.uploaded ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            tone={row.uploaded ? 'success' : 'neutral'}
            label={row.label}
            value={row.uploaded ? 'Submitted' : 'Not submitted'}
          />
        ))}
      </div>
    </section>
  );
}

function StatusTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const toneClass = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    neutral: 'text-subtle-foreground',
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
      <span className={toneClass}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-foreground">{label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{value}</span>
      </span>
    </div>
  );
}

export { Badge };
export default ProfileSummary;