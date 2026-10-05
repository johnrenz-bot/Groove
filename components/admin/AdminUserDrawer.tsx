'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Ban,
  CircleCheck,
  Save,
  FileCheck,
  MapPin,
  Mail,
  Phone,
  AtSign,
  IdCard,
  Trash2,
  Bell,
  ExternalLink,
  ImageOff,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/admin/AdminStates';
import { useAdmin } from '@/components/admin/AdminContext';
import { fullName, locationOf, statusBadge, statusLabel } from '@/lib/admin/presentation';
import {
  setUserSuspension,
  updateClientProfile,
  updateCoachProfile,
  updateUserProfile,
  type AdminUserRecord,
} from '@/lib/admin/service';
import { VerificationReviewPanel } from '@/components/verification/VerificationReviewPanel';
import { VerifiedBadge } from '@/components/verification/VerifiedBadge';
import { canApproveVerification, approvalBlockMessage } from '@/lib/verification';
import { getInitials, formatDate, formatCurrency, parseGenres, VERIFICATION_BUCKET, SIGNED_URL_TTL_SECONDS } from '@/lib/utils';
import { cn } from '@/components/shared/cn';
import { createClient } from '@/lib/supabase/client';

/**
 * The user inspector, shared by the Users, Coaches, and Clients pages.
 *
 * One drawer rather than three: the underlying record is a `profiles` row plus a
 * role-specific detail row, so the inspection, edit, and status controls are
 * genuinely the same operations. Duplicating it per role would guarantee the
 * three copies drift.
 *
 * Every destructive control routes through `ConfirmDialog`, and each action
 * reports its own outcome — the old inline confirm() gave no feedback at all
 * when an action failed.
 */

type EditableProfileField =
  | 'firstname'
  | 'middlename'
  | 'lastname'
  | 'contact'
  | 'status'
  | 'bio'
  | 'address_summary';

interface Props {
  user: AdminUserRecord | null;
  onClose: () => void;
  onChanged: () => void;
  onDelete?: (user: AdminUserRecord) => void;
  busyKey?: string | null;
}

export function AdminUserDrawer({ user, onClose, onChanged, onDelete, busyKey }: Props) {
  const { logAction } = useAdmin();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<EditableProfileField, string>>({
    firstname: '',
    middlename: '',
    lastname: '',
    contact: '',
    status: 'active',
    bio: '',
    address_summary: '',
  });
  const [coachFee, setCoachFee] = useState('');
  const [coachDuration, setCoachDuration] = useState('');
  const [clientTalent, setClientTalent] = useState('');
  const [confirm, setConfirm] = useState<null | 'suspend' | 'delete'>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Verification review lives in its own panel so the users table, the coaches
  // and clients directories, and /admin/verifications all enforce the same
  // rules through one component. This drawer used to carry a bare boolean
  // approve/revoke that could mark an account verified with no documents.
  const [reviewOpen, setReviewOpen] = useState(false);

  // Reset local state whenever a different user is opened, so a previous
  // account's edits never appear against the next one.
  useEffect(() => {
    if (!user) return;
    setEditing(false);
    setActionError(null);
    setForm({
      firstname: user.firstname ?? '',
      middlename: user.middlename ?? '',
      lastname: user.lastname ?? '',
      contact: user.contact ?? '',
      status: String(user.status ?? 'active'),
      bio: user.bio ?? '',
      address_summary: user.address_summary ?? '',
    });
    setCoachFee(user.coach_profile?.service_fee != null ? String(user.coach_profile.service_fee) : '');
    setCoachDuration(user.coach_profile?.duration ?? '');
    setClientTalent(user.client_profile?.talent ?? '');
  }, [user]);

  const idDoc =
    user?.role === 'coach'
      ? user.coach_profile?.valid_id_path ?? null
      : user?.client_profile?.valid_id_path ?? null;
  const selfieDoc = user?.coach_profile?.id_selfie_path ?? null;
  const portfolioDoc = user?.coach_profile?.portfolio_path ?? null;

  // The stored values are Storage PATHS, not URLs, and the bucket is private,
  // so each document needs a short-lived signed URL before it can be shown.
  // Signing is async and per-user, so the paths stay the source of truth and
  // only the resolved URLs land in state.
  const [idUrl, setIdUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);

  useEffect(() => {
    const paths = [
      [idDoc, setIdUrl] as const,
      [selfieDoc, setSelfieUrl] as const,
      [portfolioDoc, setPortfolioUrl] as const,
    ];

    // Clear first so a previous user's document never lingers behind the
    // "Not uploaded" placeholder while the new URL is still being signed.
    for (const [, setUrl] of paths) setUrl(null);
    if (!paths.some(([path]) => path)) return;

    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      await Promise.all(
        paths.map(async ([path, setUrl]) => {
          if (!path) return;
          // An absolute URL is already usable; only storage paths need signing.
          if (path.startsWith('http://') || path.startsWith('https://')) {
            setUrl(path);
            return;
          }
          const { data, error } = await supabase.storage
            .from(VERIFICATION_BUCKET)
            .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
          if (cancelled) return;
          // A failed signing must leave the placeholder in place rather than
          // render a broken image.
          setUrl(error ? null : data?.signedUrl ?? null);
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [idDoc, selfieDoc, portfolioDoc]);

  if (!user) return null;

  const isCoach = user.role === 'coach';
  const isSuspended = user.status === 'suspended';
  const isVerified = Boolean(user.account_verified);
  // Why approval is unavailable, if it is. Shown on the control so the admin
  // learns what is missing before opening the review panel.
  const blockMessage = canApproveVerification(user) ? null : approvalBlockMessage(user);

  /** Renders JSON-ish genre storage as names only — never the raw column. */
  const genreList = parseGenres(user.coach_profile?.genres);


  /** Wraps a mutation so the audit trail records it and the panel closes cleanly. */
  const runAction = async (action: () => Promise<void>) => {
    setSaving(true);
    setActionError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The action could not be completed.');
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const handleSuspendChange = (suspended: boolean) =>
    runAction(async () => {
      await setUserSuspension(user.id, suspended, 'Suspended by administrator');
      logAction(
        suspended ? 'suspend' : 'reinstate',
        'profile',
        user.id,
        `${suspended ? 'Suspended' : 'Reinstated'} ${fullName(user)}`
      );
    });

  const handleSave = () =>
    runAction(async () => {
      await updateUserProfile(user.id, {
        firstname: form.firstname.trim(),
        middlename: form.middlename.trim() || null,
        lastname: form.lastname.trim(),
        contact: form.contact.trim() || null,
        status: form.status as AdminUserRecord['status'],
        bio: form.bio.trim() || null,
        address_summary: form.address_summary.trim() || null,
      });

      if (isCoach) {
        await updateCoachProfile(user.id, {
          ...(coachFee !== '' ? { service_fee: Number(coachFee) || 0 } : {}),
          ...(coachDuration.trim() ? { duration: coachDuration.trim() } : {}),
        });
      } else if (user.role === 'client' && clientTalent.trim()) {
        await updateClientProfile(user.id, { talent: clientTalent.trim() });
      }

      logAction('update', 'profile', user.id, `Updated details for ${fullName(user)}`);
      setEditing(false);
    });

  return (
    <>
      <Modal
        open={Boolean(user)}
        onClose={onClose}
        size="xl"
        title={fullName(user)}
        description={`${user.username} · ${user.role}`}
        footer={
          editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-auto text-danger hover:bg-danger-soft"
                  onClick={() => setConfirm('delete')}
                  icon={<Trash2 className="h-4 w-4" />}
                  disabled={busyKey === user.id}
                >
                  Delete
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button size="sm" onClick={() => setEditing(true)} icon={<Save className="h-4 w-4" />}>
                Edit details
              </Button>
            </>
          )
        }
      >
        {actionError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
          >
            {actionError}
          </div>
        )}

        {/* Identity header */}
        <div className="flex flex-wrap items-center gap-4 border-b border-divider pb-5">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-accent-border bg-accent-soft text-lg font-bold text-accent-text"
          >
            {user.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitials(user.firstname, user.lastname)
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{user.role}</Badge>
              <Badge variant={statusBadge(user.status)} dot>
                {statusLabel(user.status)}
              </Badge>
              <VerifiedBadge verified={isVerified} />
              {user.email_verified && <Badge variant="neutral">Email confirmed</Badge>}
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
              <MetaRow icon={<Mail className="h-3.5 w-3.5" />} label={user.email} />
              <MetaRow icon={<Phone className="h-3.5 w-3.5" />} label={user.contact || 'No contact number'} />
              <MetaRow icon={<AtSign className="h-3.5 w-3.5" />} label={`@${user.username}`} />
              <MetaRow icon={<MapPin className="h-3.5 w-3.5" />} label={locationOf(user)} />
              {user.custom_id && <MetaRow icon={<IdCard className="h-3.5 w-3.5" />} label={`ID ${user.custom_id}`} />}
              <MetaRow label={`Joined ${formatDate(user.created_at)}`} />
            </dl>
          </div>
        </div>

        {/* Status controls */}
        {!editing && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatusControl
              tone={isVerified ? 'success' : 'warning'}
              title={isVerified ? 'Verification approved' : 'Awaiting verification'}
              description={
                isVerified
                  ? 'This account has full platform access.'
                  : blockMessage ??
                    'Review the submitted documents, then approve or reject with a reason.'
              }
              actionLabel={isVerified ? 'Review verification' : 'Review documents'}
              actionIcon={<ShieldCheck className="h-4 w-4" />}
              onAction={() => setReviewOpen(true)}
              disabled={busyKey === user.id || saving}
            />

            <StatusControl
              tone={isSuspended ? 'danger' : 'default'}
              title={isSuspended ? 'Account suspended' : 'Account active'}
              description={
                isSuspended
                  ? user.suspended_reason || 'Blocked by an administrator.'
                  : 'Suspending blocks booking and messaging.'
              }
              actionLabel={isSuspended ? 'Reinstate account' : 'Suspend account'}
              actionIcon={isSuspended ? <CircleCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              onAction={() => setConfirm('suspend')}
              disabled={busyKey === user.id || saving}
            />
          </div>
        )}

        {/* Role-specific commercial record */}
        {isCoach && user.coach_profile && !editing && (
          <section className="mt-6">
            <SectionTitle icon={<SparkleIcon />} title="Coaching record" />
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fact label="Discipline" value={user.coach_profile.talents} />
              <Fact
                label="Session fee"
                value={formatCurrency(user.coach_profile.service_fee ?? 0)}
              />
              <Fact label="Duration" value={user.coach_profile.duration || '—'} />
              <Fact label="Payment" value={user.coach_profile.payment_type || '—'} />
              <Fact
                label="Notice (hours)"
                value={String(user.coach_profile.notice_hours ?? 0)}
              />
              <Fact label="Notice (days)" value={String(user.coach_profile.notice_days ?? 0)} />
              <Fact
                label="Payment handle"
                value={user.coach_profile.payment_handle || '—'}
              />
              <Fact
                label="Genres"
                value={genreList.length > 0 ? genreList.join(', ') : '—'}
              />
            </dl>
          </section>
        )}

        {user.role === 'client' && user.client_profile && !editing && (
          <section className="mt-6">
            <SectionTitle icon={<IdCard className="h-4 w-4" />} title="Client record" />
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fact label="Primary talent" value={user.client_profile.talent || '—'} />
              <Fact label="Verified" value={isVerified ? 'Yes' : 'No'} />
              <Fact label="Email" value={user.email_verified ? 'Confirmed' : 'Unconfirmed'} />
              <Fact label="Member since" value={formatDate(user.created_at)} />
            </dl>
          </section>
        )}

        {/* Verification documents — a compact preview here; the full review,
            with approve/reject and per-document state, is in the review panel. */}
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <SectionTitle icon={<FileCheck className="h-4 w-4" />} title="Verification documents" />
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="mb-3 cursor-pointer text-xs font-semibold text-accent-text transition-colors hover:underline hover:underline-offset-4"
            >
              Open full review
            </button>
          </div>
          {user.verification_rejection_reason && !isVerified && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-danger">
                Rejection reason
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">
                {user.verification_rejection_reason}
              </p>
              {user.verification_rejected_document && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Document: {user.verification_rejected_document}
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DocumentPreview label="Government ID" url={idUrl} />
            {isCoach && <DocumentPreview label="ID with selfie" url={selfieUrl} />}
            {isCoach && portfolioUrl && (
              <DocumentPreview label="Portfolio" url={portfolioUrl} />
            )}
          </div>
        </section>

        {/* Bio */}
        <section className="mt-6">
          <SectionTitle icon={<IdCard className="h-4 w-4" />} title="About" />
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {user.bio || 'No biography provided.'}
          </p>
        </section>

        {/* Edit form */}
        {editing && (
          <section className="mt-6 space-y-4 border-t border-divider pt-6">
            <SectionTitle icon={<Save className="h-4 w-4" />} title="Edit account details" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                value={form.firstname}
                onChange={(e) => setForm((f) => ({ ...f, firstname: e.target.value }))}
              />
              <Input
                label="Middle name"
                value={form.middlename}
                onChange={(e) => setForm((f) => ({ ...f, middlename: e.target.value }))}
              />
              <Input
                label="Last name"
                value={form.lastname}
                onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))}
              />
              <Input
                label="Contact number"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              />
              <Select
                label="Account status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="offline">Offline</option>
              </Select>
              <Input
                label="Address"
                value={form.address_summary}
                onChange={(e) => setForm((f) => ({ ...f, address_summary: e.target.value }))}
              />
            </div>

            <Textarea
              label="Biography"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />

            {isCoach && (
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-muted p-4 sm:grid-cols-2">
                <Input
                  label="Session fee (PHP)"
                  type="number"
                  min={0}
                  value={coachFee}
                  onChange={(e) => setCoachFee(e.target.value)}
                />
                <Input
                  label="Session duration"
                  value={coachDuration}
                  onChange={(e) => setCoachDuration(e.target.value)}
                  hint="e.g. 1 hour, 90 minutes"
                />
              </div>
            )}

            {user.role === 'client' && (
              <Input
                label="Primary talent"
                value={clientTalent}
                onChange={(e) => setClientTalent(e.target.value)}
              />
            )}
          </section>
        )}
      </Modal>

      {/* Destructive confirmations */}
      <ConfirmDialog
        open={confirm === 'suspend'}
        title={isSuspended ? 'Reinstate this account?' : 'Suspend this account?'}
        message={
          isSuspended
            ? `${fullName(user)} will regain access to booking and messaging.`
            : `${fullName(user)} will be signed out of protected actions and unable to book sessions or send messages. Their profile and history are preserved.`
        }
        confirmLabel={isSuspended ? 'Reinstate account' : 'Suspend account'}
        destructive={!isSuspended}
        loading={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={() => handleSuspendChange(!isSuspended)}
      />

      {/* Verification review, shared with /admin/verifications. */}
      {reviewOpen && (
        <VerificationReviewPanel
          user={user}
          onClose={() => setReviewOpen(false)}
          onReviewed={() => {
            onChanged();
            setReviewOpen(false);
          }}
        />
      )}

      <ConfirmDialog
        open={confirm === 'delete'}
        title="Permanently delete this account?"
        message={
          <>
            This removes <strong>{fullName(user)}</strong> and every related record: bookings,
            agreements, messages, and posts. This cannot be undone. To keep the history and only
            remove access, suspend the account instead.
          </>
        }
        confirmLabel="Delete permanently"
        destructive
        loading={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          onDelete?.(user);
          setConfirm(null);
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Presentational helpers                                                      */
/* -------------------------------------------------------------------------- */

function MetaRow({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
      {icon && <span className="shrink-0 text-subtle-foreground">{icon}</span>}
      <span className="truncate">{label}</span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold text-foreground" title={String(value)}>
        {value}
      </dd>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
      <span className="text-accent-text">{icon}</span>
      {title}
    </h4>
  );
}

function SparkleIcon() {
  return <Bell className="h-4 w-4" />;
}

function DocumentPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="group relative block overflow-hidden rounded-xl border border-border transition-opacity hover:opacity-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="h-44 w-full bg-muted object-cover" />
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-overlay px-2 py-1 text-[10px] font-semibold text-foreground">
            <ExternalLink className="h-3 w-3" />
            Open
          </span>
        </a>
      ) : (
        <div className="flex h-44 items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-xs text-muted-foreground">
          <ImageOff className="h-4 w-4" />
          Not uploaded
        </div>
      )}
    </div>
  );
}

function StatusControl({
  tone,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  disabled,
}: {
  tone: 'success' | 'warning' | 'danger' | 'default';
  title: string;
  description: string;
  actionLabel: string;
  actionIcon: React.ReactNode;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        tone === 'success' && 'border-success/30 bg-success-soft',
        tone === 'warning' && 'border-warning/30 bg-warning-soft',
        tone === 'danger' && 'border-danger/30 bg-danger-soft',
        tone === 'default' && 'border-border bg-muted'
      )}
    >
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      <Button
        variant={tone === 'success' || tone === 'default' ? 'outline' : 'primary'}
        size="sm"
        className="mt-3"
        onClick={onAction}
        disabled={disabled}
        icon={actionIcon}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

export default AdminUserDrawer;