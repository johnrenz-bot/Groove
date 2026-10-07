'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Eye,
  Inbox,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  AdminTable,
  AdminFilter,
  AdminTabs,
  Pagination,
  paginate,
  type AdminColumn,
} from '@/components/admin/AdminTable';
import { AdminEmptyState, AdminErrorState, AdminToast } from '@/components/admin/AdminStates';
import { AdminSkeletonStat } from '@/components/admin/AdminPrimitives';
import { useAdmin } from '@/components/admin/AdminContext';
import { fetchUsers, type AdminUserRecord } from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import { fullName, locationOf } from '@/lib/admin/presentation';
import {
  approvalBlockMessage,
  documentSlots,
  verificationStatusOf,
  type VerificationStatus,
} from '@/features/verification/services/verification';
import { VerificationStatusBadge } from '@/features/verification/components/VerifiedBadge';
import { VerificationReviewPanel } from '@/features/verification/components/VerificationReviewPanel';
import { getInitials, formatDate } from '@/lib/utils';

const PAGE_SIZE = 10;

/**
 * The admin verification queue.
 *
 * This is the "Verification Documents" destination in the console: every
 * non-admin account with its verification state, its required-document
 * checklist, and a direct route into the review panel. It exists as a page of
 * its own rather than a filter inside /admin/users because the review queue is a
 * daily task with a different shape — the operator is not browsing accounts, they
 * are clearing a backlog, and the column that matters is "can this be approved
 * yet", not email or location.
 *
 * All state shown here is real: no derived or optimistic verification values.
 * The data comes from the same `fetchUsers()` select the rest of the console
 * uses, filtered client-side, so it can never disagree with the users page.
 */

type StatusTab = 'pending' | 'rejected' | 'verified' | 'all';

export default function AdminVerificationPage() {
  const { revision, notifyChange, logAction } = useAdmin();

  const [tab, setTab] = useState<StatusTab>('pending');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUserRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data, loading, error, refresh } = useAdminData(
    () => fetchUsers(),
    [revision]
  );

  const users = useMemo(() => (data ?? []).filter((u) => u.role !== 'admin'), [data]);

  const statusOf = useMemo(() => {
    const map = new Map<string, VerificationStatus>();
    users.forEach((u) => map.set(u.id, verificationStatusOf(u)));
    return map;
  }, [users]);

  const counts = useMemo(
    () => ({
      pending: users.filter((u) => statusOf.get(u.id) === 'pending').length,
      rejected: users.filter((u) => statusOf.get(u.id) === 'rejected').length,
      verified: users.filter((u) => statusOf.get(u.id) === 'verified').length,
      all: users.length,
    }),
    [users, statusOf]
  );

  /** Accounts that cannot be approved yet because a document is missing. */
  const incompleteCount = useMemo(
    () => users.filter((u) => statusOf.get(u.id) === 'pending' && approvalBlockMessage(u)).length,
    [users, statusOf]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (tab !== 'all' && statusOf.get(u.id) !== tab) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!term) return true;
      const discipline = u.coach_profile?.talents ?? u.client_profile?.talent ?? '';
      return `${u.firstname} ${u.middlename ?? ''} ${u.lastname} ${u.email} ${u.username} ${
        u.custom_id ?? ''
      } ${discipline} ${locationOf(u)}`
        .toLowerCase()
        .includes(term);
    });
  }, [users, tab, roleFilter, search, statusOf]);

  const { page: safePage, pageCount, slice } = paginate(filtered, page, PAGE_SIZE);
  const hasFilters = Boolean(search) || roleFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setPage(1);
  };

  const columns: AdminColumn<AdminUserRecord>[] = [
    {
      key: 'account',
      header: 'Account',
      cell: (u) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-accent-border bg-accent-soft text-[11px] font-bold text-accent-text"
          >
            {u.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitials(u.firstname, u.lastname)
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{fullName(u)}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Account type',
      cell: (u) => (
        <div className="space-y-1">
          <Badge variant={u.role === 'coach' ? 'accent' : 'neutral'}>{u.role}</Badge>
          {u.role === 'coach' && u.coach_profile?.talents && (
            <p className="text-[11px] text-muted-foreground">{u.coach_profile.talents}</p>
          )}
          {u.role === 'client' && u.client_profile?.talent && u.client_profile.talent !== 'N/A' && (
            <p className="text-[11px] text-muted-foreground">{u.client_profile.talent}</p>
          )}
        </div>
      ),
      hideBelow: 'sm',
    },
    {
      key: 'documents',
      header: 'Documents',
      cell: (u) => {
        const slots = documentSlots(u);
        const present = slots.filter((s) => s.present).length;
        const complete = present === slots.length;
        return (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">
              {present} of {slots.length} submitted
            </p>
            <ul className="space-y-0.5">
              {slots.map((slot) => (
                <li
                  key={slot.key}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className={
                      slot.present
                        ? 'h-1.5 w-1.5 shrink-0 rounded-full bg-success'
                        : 'h-1.5 w-1.5 shrink-0 rounded-full bg-warning'
                    }
                  />
                  <span className="truncate">{slot.label}</span>
                </li>
              ))}
            </ul>
            {!complete && (
              <p className="flex items-center gap-1 text-[11px] font-semibold text-warning">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Cannot be approved
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => {
        const status = statusOf.get(u.id) ?? 'pending';
        return (
          <div className="space-y-1.5">
            <VerificationStatusBadge status={status} />
            {status === 'rejected' && u.verification_rejection_reason && (
              <p
                className="max-w-[220px] truncate text-[11px] text-muted-foreground"
                title={u.verification_rejection_reason}
              >
                {u.verification_rejection_reason}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'joined',
      header: 'Submitted',
      cell: (u) => (
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {formatDate(u.created_at)}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'actions',
      header: 'Review',
      align: 'right',
      cell: (u) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(u);
          }}
          icon={<Eye className="h-3.5 w-3.5" />}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="Verification Documents"
        title="Verification Review"
        description="Review the identity documents every coach and client submitted, then approve or reject with a reason they can act on."
      />

      {/* Summary strip */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AdminSkeletonStat key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryTile
            icon={<Clock className="h-4 w-4" />}
            label="Awaiting review"
            value={counts.pending}
            hint={
              counts.pending > 0
                ? `${incompleteCount} cannot be approved yet`
                : 'Queue is clear'
            }
            tone={counts.pending > 0 ? 'warning' : 'success'}
          />
          <SummaryTile
            icon={<XCircle className="h-4 w-4" />}
            label="Rejected"
            value={counts.rejected}
            hint={counts.rejected > 0 ? 'Waiting on the user to correct' : 'None rejected'}
            tone={counts.rejected > 0 ? 'danger' : 'success'}
          />
          <SummaryTile
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Verified"
            value={counts.verified}
            hint={`${counts.all} account${counts.all === 1 ? '' : 's'} in total`}
            tone="success"
          />
        </div>
      )}

      {/* Requirement reminder — the rule the approve button enforces. */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">Approval requirements.</strong> A coach
          needs a portfolio, a valid government ID, and a selfie holding that ID. A client needs a
          valid government ID. Approval stays unavailable until every required document is
          present — the database refuses it as well, not just this screen.
        </p>
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-col gap-4">
        <AdminTabs
          value={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
          tabs={[
            { value: 'pending', label: 'Pending', count: counts.pending, icon: Clock },
            { value: 'rejected', label: 'Rejected', count: counts.rejected, icon: XCircle },
            { value: 'verified', label: 'Verified', count: counts.verified, icon: BadgeCheck },
            { value: 'all', label: 'All accounts', count: counts.all, icon: Users },
          ]}
        />

        <div className="g-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="verification-search" className="sr-only">
              Search verification submissions
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground"
            />
            <input
              id="verification-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, username, ID, or discipline…"
              className="g-input pl-10"
            />
          </div>
          <AdminFilter
            label="Account type"
            value={roleFilter}
            onChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Coaches and clients' },
              { value: 'coach', label: 'Coaches only' },
              { value: 'client', label: 'Clients only' },
            ]}
          />
        </div>
      </div>

      {error ? (
        <AdminErrorState message={error} onRetry={refresh} />
      ) : (
        <>
          <AdminTable
            columns={columns}
            rows={slice}
            rowKey={(u) => u.id}
            loading={loading}
            onRowClick={setSelected}
            empty={
              <AdminEmptyState
                filtered={hasFilters}
                onClearFilters={clearFilters}
                title={
                  tab === 'pending'
                    ? 'No submissions waiting'
                    : tab === 'rejected'
                      ? 'Nothing rejected'
                      : 'No accounts yet'
                }
                description={
                  tab === 'pending'
                    ? 'Every submitted document has been reviewed. New registrations will appear here.'
                    : tab === 'rejected'
                      ? 'No account has been sent back for corrections.'
                      : 'Registered coaches and clients will appear here once they submit documents.'
                }
                icon={<Inbox className="h-5 w-5" />}
              />
            }
            footer={
              <Pagination
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                total={filtered.length}
                pageSize={PAGE_SIZE}
              />
            }
          />
          <p className="text-xs text-muted-foreground">
            Showing {slice.length} of {filtered.length} account
            {filtered.length === 1 ? '' : 's'}.
          </p>
        </>
      )}

      <VerificationReviewPanel
        user={selected}
        onClose={() => setSelected(null)}
        onReviewed={() => {
          setToast('Verification decision saved.');
          logAction(
            'verification_reviewed',
            'profile',
            selected?.id ?? null,
            selected ? `Reviewed verification for ${fullName(selected)}` : null
          );
          notifyChange();
          refresh();
        }}
      />

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}) {
  return (
    <div className="g-card flex items-center gap-4 p-5">
      <span
        aria-hidden="true"
        className={
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ' +
          (tone === 'warning'
            ? 'border-warning/30 bg-warning-soft text-warning'
            : tone === 'danger'
              ? 'border-danger/30 bg-danger-soft text-danger'
              : tone === 'success'
                ? 'border-success/30 bg-success-soft text-success'
                : 'border-accent-border bg-accent-soft text-accent-text')
        }
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums tracking-[-0.03em] text-foreground">{value}</p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1.5 truncate text-[11px] text-subtle-foreground">{hint}</p>
      </div>
    </div>
  );
}