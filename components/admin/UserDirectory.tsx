'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Users, ShieldCheck, Ban, Eye, MapPin, Star } from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  AdminTable,
  AdminFilter,
  Pagination,
  paginate,
  type AdminColumn,
} from '@/components/admin/AdminTable';
import { AdminEmptyState, AdminErrorState, AdminToast } from '@/components/admin/AdminStates';
import { AdminSkeletonStat } from '@/components/admin/AdminPrimitives';
import { AdminUserDrawer } from '@/components/admin/AdminUserDrawer';
import { useAdmin } from '@/components/admin/AdminContext';
import { fetchUsers, type AdminUserRecord } from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import {
  fullName,
  locationOf,
  statusBadge,
  statusLabel,
  verificationBadge,
} from '@/lib/admin/presentation';
import { getInitials, formatDate, formatCurrency } from '@/lib/utils';

const PAGE_SIZE = 12;

/**
 * The role-scoped account directory behind /admin/users, /admin/coaches, and
 * /admin/clients.
 *
 * Extracted because the three pages are the same view with a different role
 * filter. Sharing it means a fix to verification, suspension, editing, or
 * deletion lands in all three at once — which is the whole point of "manage
 * Coach and Client records from one centralized interface".
 *
 * Columns differ by role: coaches show discipline, rate, and duration; clients
 * show their talent interest. Everything else — search, filters, drawer, delete
 * route — is identical.
 */
export function UserDirectory({
  role,
  eyebrow,
  title,
  description,
}: {
  role: 'coach' | 'client';
  eyebrow: string;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const { revision, notifyChange, logAction } = useAdmin();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [talentFilter, setTalentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUserRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, error, refresh } = useAdminData(
    () => fetchUsers(role),
    [role, revision]
  );

  const users = data ?? [];

  const counts = useMemo(
    () => ({
      total: users.length,
      verified: users.filter((u) => u.account_verified).length,
      unverified: users.filter((u) => !u.account_verified).length,
      suspended: users.filter((u) => u.status === 'suspended').length,
    }),
    [users]
  );

  const talentOptions = useMemo(() => {
    const values = new Set<string>();
    users.forEach((u) => {
      const value = role === 'coach' ? u.coach_profile?.talents : u.client_profile?.talent;
      if (value && value !== 'N/A') values.add(value);
    });
    return [
      { value: 'all', label: role === 'coach' ? 'All disciplines' : 'All interests' },
      ...Array.from(values).sort().map((v) => ({ value: v, label: v })),
    ];
  }, [users, role]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (verificationFilter === 'verified' && !u.account_verified) return false;
      if (verificationFilter === 'unverified' && u.account_verified) return false;
      const discipline = role === 'coach' ? u.coach_profile?.talents : u.client_profile?.talent;
      if (talentFilter !== 'all' && discipline !== talentFilter) return false;
      if (!term) return true;
      return `${u.firstname} ${u.middlename ?? ''} ${u.lastname} ${u.email} ${u.username} ${
        u.custom_id ?? ''
      } ${discipline ?? ''} ${locationOf(u)} ${u.bio ?? ''}`
        .toLowerCase()
        .includes(term);
    });
  }, [users, role, search, statusFilter, verificationFilter, talentFilter]);

  const { page: safePage, pageCount, slice } = paginate(filtered, page, PAGE_SIZE);

  const hasFilters =
    Boolean(search) || statusFilter !== 'all' || verificationFilter !== 'all' || talentFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setVerificationFilter('all');
    setTalentFilter('all');
    setPage(1);
  };

  const handleDelete = async (user: AdminUserRecord) => {
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not delete this account.');
      setSelected(null);
      setToast(`${fullName(user)} was deleted.`);
      logAction('delete', 'profile', user.id, `Deleted ${fullName(user)} (${user.role})`);
      notifyChange();
      refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not delete this account.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: AdminColumn<AdminUserRecord>[] = [
    {
      key: 'user',
      header: role === 'coach' ? 'Coach' : 'Client',
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
            <p className="truncate text-xs text-muted-foreground">
              {role === 'coach' && u.coach_profile?.talents
                ? u.coach_profile.talents
                : u.email}
            </p>
          </div>
        </div>
      ),
    },
    ...(role === 'coach'
      ? ([
          {
            key: 'rate',
            header: 'Session Rate',
            cell: (u: AdminUserRecord) => (
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(u.coach_profile?.service_fee ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {u.coach_profile?.duration || 'No duration set'}
                </p>
              </div>
            ),
            hideBelow: 'lg' as const,
          },
          {
            key: 'payment',
            header: 'Payment',
            cell: (u: AdminUserRecord) => (
              <Badge variant={u.coach_profile?.payment_type === 'online' ? 'scheduled' : 'neutral'}>
                {u.coach_profile?.payment_type || 'cash'}
              </Badge>
            ),
            hideBelow: 'xl' as const,
          },
        ] as AdminColumn<AdminUserRecord>[])
      : ([
          {
            key: 'interest',
            header: 'Interest',
            cell: (u: AdminUserRecord) => (
              <span className="text-sm text-foreground">
                {u.client_profile?.talent && u.client_profile.talent !== 'N/A'
                  ? u.client_profile.talent
                  : '—'}
              </span>
            ),
            hideBelow: 'lg' as const,
          },
        ] as AdminColumn<AdminUserRecord>[])),
    {
      key: 'location',
      header: 'Location',
      cell: (u) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
          <span className="truncate">{locationOf(u)}</span>
        </span>
      ),
      hideBelow: 'xl',
    },
    {
      key: 'verification',
      header: 'Verification',
      cell: (u) => (
        <Badge variant={verificationBadge(u.account_verified)} dot>
          {u.account_verified ? 'Verified' : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => (
        <Badge variant={statusBadge(u.status)} dot>
          {statusLabel(u.status)}
        </Badge>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (u) => <span className="text-xs text-muted-foreground">{formatDate(u.created_at)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'actions',
      header: 'Manage',
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
          Open
        </Button>
      ),
    },
  ];

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AdminSkeletonStat key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryTile
            icon={role === 'coach' ? <Sparkles className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            label={`Total ${role}s`}
            value={counts.total}
            hint={`${counts.verified} verified`}
          />
          <SummaryTile
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Awaiting verification"
            value={counts.unverified}
            hint={counts.unverified > 0 ? 'Documents ready for review' : 'Nothing waiting'}
            tone={counts.unverified > 0 ? 'warning' : 'success'}
          />
          <SummaryTile
            icon={<Ban className="h-4 w-4" />}
            label="Suspended"
            value={counts.suspended}
            hint={counts.suspended > 0 ? 'Access currently blocked' : 'No suspended accounts'}
            tone={counts.suspended > 0 ? 'danger' : 'success'}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <label htmlFor="directory-search" className="sr-only">
            Search
          </label>
          <input
            id="directory-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${role}s by name, email, username, or location…`}
            className="g-input pl-4"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminFilter
            label="Account status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Any status' },
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'offline', label: 'Offline' },
            ]}
          />
          <AdminFilter
            label="Verification"
            value={verificationFilter}
            onChange={(v) => {
              setVerificationFilter(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Any verification' },
              { value: 'verified', label: 'Verified' },
              { value: 'unverified', label: 'Unverified' },
            ]}
          />
          <AdminFilter
            label={role === 'coach' ? 'Discipline' : 'Interest'}
            value={talentFilter}
            onChange={(v) => {
              setTalentFilter(v);
              setPage(1);
            }}
            options={talentOptions}
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
                title={`No ${role}s registered yet`}
                description={
                  role === 'coach'
                    ? 'Coaches who complete the coach registration form will appear here.'
                    : 'Clients who complete the client registration form will appear here.'
                }
                icon={role === 'coach' ? <Sparkles className="h-5 w-5" /> : <Users className="h-5 w-5" />}
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
            Showing {slice.length} of {filtered.length} matching {role}
            {filtered.length === 1 ? '' : 's'}.
          </p>
        </>
      )}

      <AdminUserDrawer
        user={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          notifyChange();
          refresh();
        }}
        onDelete={handleDelete}
        busyKey={deletingId}
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
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

export default UserDirectory;