'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Eye,
  Trash2,
  MapPin,
  Mail,
  Phone,
  Clock,
  MessageSquare,
  Sparkles,
  Check,
  Search,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  AdminTable,
  AdminFilter,
  Pagination,
  paginate,
  type AdminColumn,
} from '@/components/admin/AdminTable';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminToast,
  ConfirmDialog,
} from '@/components/admin/AdminStates';
import { AdminSkeletonStat } from '@/components/admin/AdminPrimitives';
import { useAdmin } from '@/components/admin/AdminContext';
import {
  deleteBooking,
  fetchBookings,
  setBookingStatus,
  type AdminBookingRecord,
} from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import { APPOINTMENT_STATUSES, fullName, statusBadge } from '@/lib/admin/presentation';
import { formatDate, formatDateTime, formatTimeAgo } from '@/lib/utils';
import type { AppointmentStatus } from '@/lib/types';

const PAGE_SIZE = 12;

/**
 * Platform-wide booking management.
 *
 * Reads and writes the same `appointments` rows the client and coach portals
 * use — there is no separate admin booking table. Status changes here are the
 * same operation a coach performs from their own appointments page, so an
 * administrative override and a peer action are indistinguishable in the data.
 */
export default function AdminBookingsPage() {
  const { revision, notifyChange, logAction } = useAdmin();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminBookingRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminBookingRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, refresh } = useAdminData(() => fetchBookings(), [revision]);

  const bookings = data ?? [];

  const counts = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled' || b.status === 'declined').length,
      today: bookings.filter((b) => b.date === new Date().toISOString().slice(0, 10)).length,
    }),
    [bookings]
  );

  const typeOptions = useMemo(() => {
    const values = new Set(bookings.map((b) => b.session_type).filter(Boolean));
    return [
      { value: 'all', label: 'Any session type' },
      ...Array.from(values).map((v) => ({ value: v, label: v })),
    ];
  }, [bookings]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (typeFilter !== 'all' && b.session_type !== typeFilter) return false;
      if (!term) return true;
      return `${b.name} ${b.email} ${b.contact} ${b.address} ${b.session_type} ${
        b.talent ?? ''
      } ${b.experience} ${b.purpose} ${b.message ?? ''} ${fullName(b.coach)}`
        .toLowerCase()
        .includes(term);
    });
  }, [bookings, search, statusFilter, typeFilter]);

  const { page: safePage, pageCount, slice } = paginate(filtered, page, PAGE_SIZE);

  const hasFilters = Boolean(search) || statusFilter !== 'all' || typeFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPage(1);
  };

  const handleStatusChange = async (
    booking: AdminBookingRecord,
    status: AppointmentStatus
  ) => {
    setBusyId(String(booking.id));
    try {
      await setBookingStatus(booking.id, status);
      setToast(`Booking #${booking.appointment_id} marked ${status}.`);
      logAction(
        'status_change',
        'appointment',
        String(booking.id),
        `Booking #${booking.appointment_id} set to ${status}`
      );
      // Keep the open inspector in sync with the change just made.
      setSelected((current) =>
        current && current.id === booking.id ? { ...current, status } : current
      );
      notifyChange();
      refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not update this booking.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (booking: AdminBookingRecord) => {
    setBusyId(String(booking.id));
    try {
      await deleteBooking(booking.id);
      setConfirmDelete(null);
      setSelected(null);
      setToast(`Booking #${booking.appointment_id} deleted.`);
      logAction(
        'delete',
        'appointment',
        String(booking.id),
        `Deleted booking #${booking.appointment_id} for ${booking.name}`
      );
      notifyChange();
      refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not delete this booking.');
    } finally {
      setBusyId(null);
    }
  };

  const columns: AdminColumn<AdminBookingRecord>[] = [
    {
      key: 'id',
      header: 'Ref',
      cell: (b) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">
          #{String(b.appointment_id).padStart(5, '0')}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      cell: (b) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{b.name}</p>
          <p className="truncate text-xs text-muted-foreground">{b.email}</p>
        </div>
      ),
    },
    {
      key: 'coach',
      header: 'Coach',
      cell: (b) => (
        <span className="text-sm text-foreground">{fullName(b.coach)}</span>
      ),
      hideBelow: 'sm',
    },
    {
      key: 'when',
      header: 'Session',
      cell: (b) => (
        <div className="space-y-0.5">
          <p className="text-sm text-foreground">{formatDate(b.date)}</p>
          <p className="text-[11px] text-muted-foreground">
            {b.start_time}–{b.end_time}
          </p>
        </div>
      ),
      hideBelow: 'md',
    },
    {
      key: 'type',
      header: 'Type',
      cell: (b) => (
        <div className="space-y-0.5">
          <p className="text-sm text-foreground">{b.session_type}</p>
          {b.talent && <p className="text-[11px] text-muted-foreground">{b.talent}</p>}
        </div>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (b) => (
        <Badge variant={statusBadge(b.status)} dot>
          {b.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Manage',
      align: 'right',
      cell: (b) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(b);
            }}
            icon={<Eye className="h-3.5 w-3.5" />}
          >
            Open
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-danger hover:bg-danger-soft"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(b);
            }}
            aria-label={`Delete booking ${b.appointment_id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="Session Management"
        title="Bookings"
        description="Every session request on the platform. Adjust status, inspect full booking detail, and remove cancelled records."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminSkeletonStat key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile label="Total bookings" value={counts.total} hint="All time" />
          <SummaryTile
            label="Awaiting confirmation"
            value={counts.pending}
            hint={counts.pending > 0 ? 'Needs a decision' : 'Nothing pending'}
            tone={counts.pending > 0 ? 'warning' : 'success'}
          />
          <SummaryTile label="Confirmed" value={counts.confirmed} hint="Scheduled sessions" />
          <SummaryTile
            label="Today"
            value={counts.today}
            hint={`${counts.cancelled} cancelled or declined`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="g-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="booking-search" className="sr-only">
            Search bookings
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground"
          />
          <input
            id="booking-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by client, coach, contact, address, or purpose…"
            className="g-input pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminFilter
            label="Booking status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Any status' },
              ...APPOINTMENT_STATUSES.map((s) => ({ value: s, label: s })),
            ]}
          />
          <AdminFilter
            label="Session type"
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
            options={typeOptions}
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
            rowKey={(b) => b.id}
            loading={loading}
            onRowClick={setSelected}
            empty={
              <AdminEmptyState
                filtered={hasFilters}
                onClearFilters={clearFilters}
                title="No bookings yet"
                description="Session requests from clients will appear here as soon as they are made."
                icon={<Calendar className="h-5 w-5" />}
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
            Showing {slice.length} of {filtered.length} booking
            {filtered.length === 1 ? '' : 's'}.
          </p>
        </>
      )}

      {/* Booking inspector */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={
          selected ? `Booking #${String(selected.appointment_id).padStart(5, '0')}` : ''
        }
        description={selected ? `${selected.session_type} session · ${formatDate(selected.date)}` : ''}
        footer={
          selected ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="mr-auto text-danger hover:bg-danger-soft"
                onClick={() => setConfirmDelete(selected)}
                icon={<Trash2 className="h-4 w-4" />}
              >
                Delete booking
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-6">
            {/* Status control */}
            <section>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Session status
              </h4>
              <div className="flex flex-wrap gap-2">
                {APPOINTMENT_STATUSES.map((status) => {
                  const active = selected.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(selected, status)}
                      disabled={busyId === String(selected.id) || active}
                      className={
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ' +
                        (active
                          ? 'border-accent-border bg-accent-soft text-accent-text'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50')
                      }
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {status}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Parties */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard title="Client" rows={[
                { icon: <Sparkles className="h-3.5 w-3.5" />, value: selected.name },
                { icon: <Mail className="h-3.5 w-3.5" />, value: selected.email },
                { icon: <Phone className="h-3.5 w-3.5" />, value: selected.contact },
                { icon: <MapPin className="h-3.5 w-3.5" />, value: selected.address },
              ]} />
              <InfoCard title="Coach" rows={[
                { icon: <Sparkles className="h-3.5 w-3.5" />, value: fullName(selected.coach) },
                { icon: <Mail className="h-3.5 w-3.5" />, value: selected.coach?.email || '—' },
                { icon: <Phone className="h-3.5 w-3.5" />, value: selected.coach?.contact || '—' },
                { icon: <MapPin className="h-3.5 w-3.5" />, value: selected.coach?.address_summary || '—' },
              ]} />
            </section>

            {/* Session detail */}
            <section>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Session detail
              </h4>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Fact label="Date" value={formatDate(selected.date)} />
                <Fact label="Time" value={`${selected.start_time}–${selected.end_time}`} />
                <Fact label="Type" value={selected.session_type} />
                <Fact label="Talent" value={selected.talent || '—'} />
                <Fact label="Experience" value={selected.experience} />
                <Fact label="Purpose" value={selected.purpose} />
                <Fact label="Requested" value={formatTimeAgo(selected.created_at)} />
                <Fact label="Reference" value={String(selected.appointment_id)} />
              </dl>
            </section>

            {/* Client message */}
            {(selected.message || selected.feedback) && (
              <section className="space-y-3">
                {selected.message && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5 text-accent-text" />
                      Client message
                    </h4>
                    <p className="whitespace-pre-line rounded-2xl border border-border bg-muted px-4 py-3 text-sm leading-relaxed text-foreground">
                      {selected.message}
                    </p>
                  </div>
                )}
                {selected.feedback && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5 text-accent-text" />
                      Session feedback
                    </h4>
                    <p className="whitespace-pre-line rounded-2xl border border-border bg-muted px-4 py-3 text-sm leading-relaxed text-foreground">
                      {selected.feedback}
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this booking?"
        message={
          confirmDelete ? (
            <>
              Booking <strong>#{confirmDelete.appointment_id}</strong> for {confirmDelete.name} will be
              permanently removed. This cannot be undone.
            </>
          ) : ''
        }
        confirmLabel="Delete booking"
        destructive
        loading={busyId === String(confirmDelete?.id)}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: number;
  hint: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  return (
    <div className="g-card p-5">
      <p className="text-2xl font-bold tabular-nums tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={
          'mt-1.5 text-[11px] ' +
          (tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : 'text-subtle-foreground')
        }
      >
        {hint}
      </p>
    </div>
  );
}

function InfoCard({ title, rows }: { title: string; rows: { icon: React.ReactNode; value: string }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <h5 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h5>
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-0.5 shrink-0 text-subtle-foreground">{row.icon}</span>
            <span className="min-w-0 break-words">{row.value}</span>
          </li>
        ))}
      </ul>
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