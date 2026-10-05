'use client';

import React, { useMemo, useState } from 'react';
import { Users, ShieldCheck, Ban, Eye, MapPin, Sparkles, Loader2, Search } from 'lucide-react';
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
import { getInitials, formatDate } from '@/lib/utils';

const PAGE_SIZE = 12;

type RoleTab = 'all' | 'coach' | 'client' | 'admin';

/**
 * Centralized account management: every registered user, every role, one table.
 *
 * This is the page the coaches and clients pages delegate to — see
 * /admin/coaches and /admin/clients, which render the same table pre-filtered by
 * role rather than duplicating it.
 */
export default function AdminUsersPage() {
  const { revision, notifyChange, logAction } = useAdmin();

  const [tab, setTab] = useState<RoleTab>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [talentFilter, setTalentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUserRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, error, refresh } = useAdminData(() => fetchUsers(), [revision]);

  const users = data ?? [];

  const counts = useMemo(
    () => ({
      all: users.length,
      coach: users.filter((u) => u.role === 'coach').length,
      client: users.filter((u) => u.role === 'client').length,
      admin: users.filter((u) => u.role === 'admin').length,
    }),
    [users]
  );

  const talentOptions = useMemo(() => {
    const values = new Set(
      users.map((u) => u.coach_profile?.talents).filter((v): v is string => Boolean(v))
    );
    return [{ value: 'all', label: 'All disciplines' }, ...Array.from(values).map((v) => ({ value: v, label: v }))];
  }, [users]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (tab !== 'all' && u.role !== tab) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (verificationFilter === 'verified' && !u.account_verified) return false;
      if (verificationFilter === 'unverified' && u.account_verified) return false;
      if (talentFilter !== 'all' && u.coach_profile?.talents !== talentFilter) return false;
      if (!term) return true;
      return `${u.firstname} ${u.middlename ?? ''} ${u.lastname} ${u.email} ${u.username} ${
        u.custom_id ?? ''
      } ${u.coach_profile?.talents ?? ''} ${locationOf(u)}`
        .toLowerCase()
        .includes(term);
    });
  }, [users, tab, search, statusFilter, verificationFilter, talentFilter]);

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
      header: 'Role',
      cell: (u) => (
        <div className="space-y-1">
          <Badge variant={u.role === 'admin' ? 'accent' : 'neutral'}>{u.role}</Badge>
          {u.coach_profile?.talents && (
            <p className="text-[11px] text-muted-foreground">{u.coach_profile.talents}</p>
          )}
          {u.client_profile?.talent && u.client_profile.talent !== 'N/A' && (
            <p className="text-[11px] text-muted-foreground">{u.client_profile.talent}</p>
          )}
        </div>
      ),
      hideBelow: 'sm',
    },
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
      cell: (u) => (
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {formatDate(u.created_at)}
        </span>
      ),
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

  const pendingCount = users.filter((u) => u.role !== 'admin' && !u.account_verified).length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="Account Management"
        title="Users & Verification"
        description="Every registered account across all roles. Review verification documents, edit profiles, and control account access."
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
            icon={<Users className="h-4 w-4" />}
            label="Total accounts"
            value={users.length}
            hint={`${counts.client} clients · ${counts.coach} coaches`}
          />
          <SummaryTile
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Awaiting verification"
            value={pendingCount}
            hint={pendingCount > 0 ? 'Review the submitted IDs' : 'Nothing waiting'}
            tone={pendingCount > 0 ? 'warning' : 'success'}
          />
          <SummaryTile
            icon={<Ban className="h-4 w-4" />}
            label="Suspended"
            value={suspendedCount}
            hint={suspendedCount > 0 ? 'Access currently blocked' : 'No suspended accounts'}
            tone={suspendedCount > 0 ? 'danger' : 'success'}
          />
        </div>
      )}

      {/* Tabs + filters */}
      <div className="flex flex-col gap-4">
        <AdminTabs
          value={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
          tabs={[
            { value: 'all', label: 'All users', count: counts.all, icon: Users },
            { value: 'coach', label: 'Coaches', count: counts.coach, icon: Sparkles },
            { value: 'client', label: 'Clients', count: counts.client, icon: Users },
            { value: 'admin', label: 'Admins', count: counts.admin, icon: ShieldCheck },
          ]}
        />

        <div className="g-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="user-search" className="sr-only">
              Search accounts
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground"
            />
            <input
              id="user-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, username, ID, or location…"
              className="g-input pl-10"
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
              label="Discipline"
              value={talentFilter}
              onChange={(v) => {
                setTalentFilter(v);
                setPage(1);
              }}
              options={talentOptions}
            />
          </div>
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
                title="No accounts yet"
                description="Registered clients and coaches will appear here."
                icon={<Users className="h-5 w-5" />}
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
            Showing {slice.length} of {filtered.length} matching account
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

      {deletingId && (
        <div className="sr-only" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Deleting account
        </div>
      )}
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
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1.5 truncate text-[11px] text-subtle-foreground">{hint}</p>
      </div>
    </div>
  );
}