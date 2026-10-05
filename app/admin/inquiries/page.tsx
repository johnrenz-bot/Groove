'use client';

import React, { useMemo, useState } from 'react';
import {
  LifeBuoy,
  Paperclip,
  Trash2,
  Eye,
  Mail,
  Clock,
  AlertTriangle,
  Download,
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
  deleteTicket,
  fetchTickets,
  updateTicket,
  type AdminTicketRecord,
} from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import { statusBadge, TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/admin/presentation';
import { formatDateTime, formatTimeAgo } from '@/lib/utils';
import { cn } from '@/components/shared/cn';

const PAGE_SIZE = 12;

/**
 * Support inquiries from the landing page and the in-app help form.
 *
 * Reads the same `tickets` table the public form writes to via /api/tickets.
 * Status and priority are editable inline from the detail view so triage does
 * not require opening each ticket.
 */
export default function AdminInquiriesPage() {
  const { revision, notifyChange, logAction } = useAdmin();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminTicketRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminTicketRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, refresh } = useAdminData(() => fetchTickets(), [revision]);

  const tickets = data ?? [];

  const counts = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((t) => t.status === 'open').length,
      pending: tickets.filter((t) => t.status === 'pending').length,
      closed: tickets.filter((t) => t.status === 'closed' || t.status === 'resolved').length,
      critical: tickets.filter((t) => t.priority === 'critical' || t.priority === 'high').length,
    }),
    [tickets]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (!term) return true;
      return `${t.name} ${t.email} ${t.subject} ${t.message} ${t.attachment_name ?? ''}`
        .toLowerCase()
        .includes(term);
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const { page: safePage, pageCount, slice } = paginate(filtered, page, PAGE_SIZE);

  const hasFilters = Boolean(search) || statusFilter !== 'all' || priorityFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setPage(1);
  };

  const patchTicket = async (ticket: AdminTicketRecord, patch: Record<string, string>) => {
    setBusyId(String(ticket.id));
    try {
      await updateTicket(ticket.id, patch);
      setSelected((current) => (current && current.id === ticket.id ? { ...current, ...patch } : current));
      setToast(`Ticket #${ticket.id} updated.`);
      logAction(
        'triage',
        'ticket',
        String(ticket.id),
        `Ticket #${ticket.id} → ${Object.entries(patch).map(([k, v]) => `${k}: ${v}`).join(', ')}`
      );
      notifyChange();
      refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not update this ticket.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (ticket: AdminTicketRecord) => {
    setBusyId(String(ticket.id));
    try {
      await deleteTicket(ticket.id);
      setConfirmDelete(null);
      setSelected(null);
      setToast(`Ticket #${ticket.id} deleted.`);
      logAction('delete', 'ticket', String(ticket.id), `Deleted ticket #${ticket.id}`);
      notifyChange();
      refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not delete this ticket.');
    } finally {
      setBusyId(null);
    }
  };

  const columns: AdminColumn<AdminTicketRecord>[] = [
    {
      key: 'subject',
      header: 'Inquiry',
      cell: (t) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{t.subject}</p>
          <p className="truncate text-xs text-muted-foreground">{t.message}</p>
        </div>
      ),
    },
    {
      key: 'sender',
      header: 'Sender',
      cell: (t) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{t.name}</p>
          <p className="truncate text-xs text-muted-foreground">{t.email}</p>
        </div>
      ),
      hideBelow: 'sm',
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (t) => (
        <Badge variant={statusBadge(t.priority)} dot>
          {t.priority}
        </Badge>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (t) => (
        <Badge variant={statusBadge(t.status)} dot>
          {t.status}
        </Badge>
      ),
    },
    {
      key: 'received',
      header: 'Received',
      cell: (t) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
          <span className="whitespace-nowrap">{formatTimeAgo(t.created_at)}</span>
        </div>
      ),
      hideBelow: 'xl',
    },
    {
      key: 'actions',
      header: 'Manage',
      align: 'right',
      cell: (t) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(t);
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
              setConfirmDelete(t);
            }}
            aria-label={`Delete ticket ${t.id}`}
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
        eyebrow="Support"
        title="Inquiries & Tickets"
        description="Every inquiry submitted from the public landing page and the in-app help form, with triage controls."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminSkeletonStat key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile label="Total inquiries" value={counts.total} hint="All time" />
          <SummaryTile
            label="Open"
            value={counts.open}
            hint={counts.open > 0 ? 'Awaiting a first response' : 'Nothing open'}
            tone={counts.open > 0 ? 'warning' : 'success'}
          />
          <SummaryTile
            label="High priority"
            value={counts.critical}
            hint={counts.critical > 0 ? 'Needs attention first' : 'No urgent items'}
            tone={counts.critical > 0 ? 'danger' : 'success'}
          />
          <SummaryTile
            label="Resolved"
            value={counts.closed}
            hint={`${counts.pending} in progress`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="g-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="ticket-search" className="sr-only">
            Search inquiries
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground"
          />
          <input
            id="ticket-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by sender, subject, or message…"
            className="g-input pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminFilter
            label="Ticket status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Any status' },
              ...TICKET_STATUSES.map((s) => ({ value: s, label: s })),
            ]}
          />
          <AdminFilter
            label="Priority"
            value={priorityFilter}
            onChange={(v) => {
              setPriorityFilter(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Any priority' },
              ...TICKET_PRIORITIES.map((p) => ({ value: p, label: p })),
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
            rowKey={(t) => t.id}
            loading={loading}
            onRowClick={setSelected}
            empty={
              <AdminEmptyState
                filtered={hasFilters}
                onClearFilters={clearFilters}
                title="No inquiries yet"
                description="Questions submitted from the landing page and the in-app help form will appear here."
                icon={<LifeBuoy className="h-5 w-5" />}
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
            Showing {slice.length} of {filtered.length} inquir
            {filtered.length === 1 ? 'y' : 'ies'}.
          </p>
        </>
      )}

      {/* Ticket detail */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected ? selected.subject : ''}
        description={selected ? `Ticket #${selected.id} · submitted ${formatDateTime(selected.created_at)}` : ''}
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
                Delete ticket
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => patchTicket(selected, { status: 'resolved' })}
                loading={busyId === String(selected.id)}
                disabled={selected.status === 'resolved' || selected.status === 'closed'}
              >
                Mark resolved
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-6">
            {/* Triage controls */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TICKET_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busyId === String(selected.id)}
                      onClick={() => patchTicket(selected, { status })}
                      className={cn(
                        'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors disabled:opacity-50',
                        selected.status === status
                          ? 'border-accent-border bg-accent-soft text-accent-text'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Priority
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TICKET_PRIORITIES.map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      disabled={busyId === String(selected.id)}
                      onClick={() => patchTicket(selected, { priority })}
                      className={cn(
                        'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors disabled:opacity-50',
                        selected.priority === priority
                          ? 'border-accent-border bg-accent-soft text-accent-text'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Sender */}
            <section className="rounded-2xl border border-border bg-muted p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Sender
              </h4>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="font-semibold text-foreground">{selected.name}</span>
                <a
                  href={`mailto:${selected.email}`}
                  className="inline-flex items-center gap-1.5 text-accent-text hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {selected.email}
                </a>
                {selected.user_id && (
                  <span className="text-xs text-muted-foreground">Registered account</span>
                )}
              </div>
            </section>

            {/* Message */}
            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Message
              </h4>
              <p className="whitespace-pre-line rounded-2xl border border-border bg-muted px-4 py-3 text-sm leading-relaxed text-foreground">
                {selected.message}
              </p>
            </section>

            {/* Attachment */}
            {selected.attachment_path && (
              <section>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Attachment
                </h4>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Paperclip className="h-4 w-4 shrink-0 text-accent-text" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {selected.attachment_name || 'Attached file'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selected.attachment_mime}
                        {selected.attachment_size
                          ? ` · ${(selected.attachment_size / 1024).toFixed(0)} KB`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <a
                    href={selected.attachment_path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Open
                  </a>
                </div>
              </section>
            )}

            {/* Spam warning */}
            {selected.priority === 'critical' && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Marked critical. Delete the ticket if it is spam rather than a genuine inquiry.
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this inquiry?"
        message={
          confirmDelete ? (
            <>
              <strong>{confirmDelete.subject}</strong> from {confirmDelete.name} will be permanently
              removed from the support queue. This cannot be undone.
            </>
          ) : ''
        }
        confirmLabel="Delete ticket"
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
  tone?: 'default' | 'warning' | 'success' | 'danger';
}) {
  return (
    <div className="g-card p-5">
      <p className="text-2xl font-bold tabular-nums tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-1.5 text-[11px]',
          tone === 'warning' && 'text-warning',
          tone === 'danger' && 'text-danger',
          tone === 'success' && 'text-success',
          tone === 'default' && 'text-subtle-foreground'
        )}
      >
        {hint}
      </p>
    </div>
  );
}