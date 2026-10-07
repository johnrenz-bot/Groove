'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, Trash2, FileText, MessageSquare, PenLine, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { AgreementSignature } from '@/features/booking/components/AgreementSignature';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  AdminTable,
  AdminTabs,
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
import { useAdmin } from '@/components/admin/AdminContext';
import {
  deleteAgreement,
  deleteFeedback,
  fetchAgreements,
  fetchFeedback,
} from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import { fullName } from '@/lib/admin/presentation';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import type { Agreement, Feedback } from '@/lib/types';

type Tab = 'agreements' | 'reviews';
const PAGE_SIZE = 12;

/**
 * Signed contracts and client reviews.
 *
 * Reads the `agreements` and `feedbacks` tables directly rather than through the
 * client's or coach's transaction views, so the console sees every record —
 * RLS permits this because the caller satisfies `is_admin()`.
 *
 * The contract inspector link goes to the same `/contracts/[id]` page the client
 * and coach see. An admin reading a contract is not a separate document type.
 */
export default function AdminTransactionsPage() {
  const { revision, notifyChange } = useAdmin();

  const [tab, setTab] = useState<Tab>('agreements');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmAgreement, setConfirmAgreement] = useState<Agreement | null>(null);
  const [confirmFeedback, setConfirmFeedback] = useState<Feedback | null>(null);
  /** Which agreement's signatures are being viewed, if any. Read-only. */
  const [signatureViewer, setSignatureViewer] = useState<Agreement | null>(null);
  const [busy, setBusy] = useState(false);

  const agreements = useAdminData(() => fetchAgreements(), [revision]);
  const feedback = useAdminData(() => fetchFeedback(), [revision]);

  const agreementRows = (agreements.data ?? []) as Agreement[];
  const reviewRows = (feedback.data ?? []) as Feedback[];

  const filteredAgreements = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return agreementRows;
    return agreementRows.filter((ag) =>
      `${fullName(ag.client)} ${fullName(ag.coach)} ${ag.appointment_price ?? ''} ${
        ag.payment_method ?? ''
      } ${ag.session_duration ?? ''}`
        .toLowerCase()
        .includes(term)
    );
  }, [agreementRows, search]);

  const filteredReviews = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return reviewRows;
    return reviewRows.filter((fb) =>
      `${fullName(fb.user)} ${fullName(fb.coach)} ${fb.comment} ${fb.rating}`
        .toLowerCase()
        .includes(term)
    );
  }, [reviewRows, search]);

  const agreementPage = paginate(filteredAgreements, page, PAGE_SIZE);
  const reviewPage = paginate(filteredReviews, page, PAGE_SIZE);

  const handleDeleteAgreement = async (ag: Agreement) => {
    setBusy(true);
    try {
      await deleteAgreement(ag.id);
      setConfirmAgreement(null);
      notifyChange();
      agreements.refresh();
      setToast('Contract deleted.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not delete this contract.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFeedback = async (fb: Feedback) => {
    setBusy(true);
    try {
      await deleteFeedback(fb.id);
      setConfirmFeedback(null);
      notifyChange();
      feedback.refresh();
      setToast('Review removed.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not remove this review.');
    } finally {
      setBusy(false);
    }
  };

  // Both tabs render through one AdminTable instance, so the column sets are
  // typed against the intersection of the two record shapes. Each array is still
  // authored for exactly one tab — the union exists only at the call site.
  const agreementColumns: AdminColumn<Agreement & Feedback>[] = [
    {
      key: 'id',
      header: 'Contract',
      cell: (ag: Agreement) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">
          #{String(ag.id).padStart(5, '0')}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      cell: (ag: Agreement) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{fullName(ag.client)}</p>
          <p className="truncate text-xs text-muted-foreground">{ag.client?.email}</p>
        </div>
      ),
    },
    {
      key: 'coach',
      header: 'Coach',
      cell: (ag: Agreement) => <span className="text-sm text-foreground">{fullName(ag.coach)}</span>,
      hideBelow: 'sm',
    },
    {
      key: 'terms',
      header: 'Terms',
      cell: (ag: Agreement) => (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(ag.appointment_price ?? 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {ag.session_duration || 'No duration'} · {ag.payment_method || 'Cash'}
          </p>
        </div>
      ),
      hideBelow: 'md',
    },
    {
      key: 'date',
      header: 'Signed',
      cell: (ag: Agreement) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(ag.agreement_date ?? ag.created_at)}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'signatures',
      header: 'Signatures',
      cell: (ag: Agreement) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={ag.client_signed_at ? 'approved' : 'pending'}>
            Client {ag.client_signed_at ? '✓' : '—'}
          </Badge>
          <Badge variant={ag.coach_signed_at ? 'approved' : 'pending'}>
            Coach {ag.coach_signed_at ? '✓' : '—'}
          </Badge>
          {/* The badges only prove a timestamp exists. This opens the actual
              images, resolved from the private bucket via a signed URL. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSignatureViewer(ag)}
            icon={<PenLine className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            View
          </Button>
        </div>
      ),
      hideBelow: 'xl',
    },
    {
      key: 'actions',
      header: 'Manage',
      align: 'right',
      cell: (ag: Agreement) => (
        <div className="flex justify-end gap-2">
          <Link
            href={`/contracts/${ag.id}`}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <PenLine className="h-3.5 w-3.5" />
            Inspect
          </Link>
          <Button
            size="icon"
            variant="ghost"
            className="text-danger hover:bg-danger-soft"
            onClick={() => setConfirmAgreement(ag)}
            aria-label={`Delete contract ${ag.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const reviewColumns: AdminColumn<Agreement & Feedback>[] = [
    {
      key: 'reviewer',
      header: 'Reviewer',
      cell: (fb: Feedback) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{fullName(fb.user)}</p>
          <p className="truncate text-xs text-muted-foreground">{fb.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'coach',
      header: 'Coach',
      cell: (fb: Feedback) => <span className="text-sm text-foreground">{fullName(fb.coach)}</span>,
      hideBelow: 'sm',
    },
    {
      key: 'rating',
      header: 'Rating',
      cell: (fb: Feedback) => (
        <span className="inline-flex items-center gap-1 text-sm font-bold text-warning">
          <Star className="h-3.5 w-3.5 fill-warning" />
          {fb.rating}
        </span>
      ),
    },
    {
      key: 'comment',
      header: 'Comment',
      cell: (fb: Feedback) => (
        <p className="max-w-md truncate text-sm italic text-muted-foreground">
          &ldquo;{fb.comment}&rdquo;
        </p>
      ),
    },
    {
      key: 'date',
      header: 'Posted',
      cell: (fb: Feedback) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(fb.created_at)}</span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'actions',
      header: 'Manage',
      align: 'right',
      cell: (fb: Feedback) => (
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:bg-danger-soft"
          onClick={() => setConfirmFeedback(fb)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </Button>
      ),
    },
  ];

  const isAgreements = tab === 'agreements';
  const active = isAgreements ? agreements : feedback;
  const rows = isAgreements ? agreementPage.slice : reviewPage.slice;
  const total = isAgreements ? filteredAgreements.length : filteredReviews.length;

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Contracts & Reviews"
        description="Every signed session agreement and every client review. Deleting a contract removes it from both parties' histories."
      />

      <div className="flex flex-col gap-4">
        <AdminTabs
          value={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
            setSearch('');
          }}
          tabs={[
            {
              value: 'agreements',
              label: 'Contracts',
              count: agreementRows.length,
              icon: FileText,
            },
            { value: 'reviews', label: 'Reviews', count: reviewRows.length, icon: MessageSquare },
          ]}
        />

        <div className="g-card p-4">
          <div className="relative">
            <label htmlFor="contract-search" className="sr-only">
              Search {tab}
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground"
            />
            <input
              id="contract-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                isAgreements
                  ? 'Search contracts by client, coach, or terms…'
                  : 'Search reviews by reviewer, coach, or comment…'
              }
              className="g-input pl-10"
            />
          </div>
        </div>
      </div>

      {active.loading ? (
        <AdminTable
          columns={isAgreements ? agreementColumns : reviewColumns}
          rows={[]}
          rowKey={(r) => String((r as Agreement).id)}
          loading
        />
      ) : active.error ? (
        <AdminErrorState message={active.error} onRetry={active.refresh} />
      ) : (
        <>
          <AdminTable
            columns={isAgreements ? agreementColumns : reviewColumns}
            rows={rows as (Agreement & Feedback)[]}
            rowKey={(r) => `${isAgreements ? 'ag' : 'fb'}-${r.id}`}
            empty={
              <AdminEmptyState
                filtered={Boolean(search)}
                onClearFilters={() => setSearch('')}
                title={
                  isAgreements ? 'No contracts yet' : 'No reviews yet'
                }
                description={
                  isAgreements
                    ? 'Signed session agreements between clients and coaches appear here.'
                    : 'Client feedback on completed sessions appears here.'
                }
                icon={isAgreements ? <FileText className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
              />
            }
            footer={
              <Pagination
                page={isAgreements ? agreementPage.page : reviewPage.page}
                pageCount={isAgreements ? agreementPage.pageCount : reviewPage.pageCount}
                onPageChange={setPage}
                total={total}
                pageSize={PAGE_SIZE}
              />
            }
          />
          <p className="text-xs text-muted-foreground">
            Showing {rows.length} of {total} {isAgreements ? 'contract' : 'review'}
            {total === 1 ? '' : 's'}.
          </p>
        </>
      )}

      {/* Read-only signature viewer. Resolves the stored paths to signed URLs
          from the private contract-signatures bucket; it never uploads and
          never writes, so an admin inspecting a contract cannot alter it. */}
      {signatureViewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Agreement signatures"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Agreement signatures</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Contract #{signatureViewer.id} · {fullName(signatureViewer.client)} &amp;{' '}
                  {fullName(signatureViewer.coach)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSignatureViewer(null)}
                aria-label="Close"
                className="cursor-pointer rounded-lg px-2 py-1 text-lg leading-none text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <AgreementSignature
                role="Client"
                path={signatureViewer.client_signature_path}
                signedAt={signatureViewer.client_signed_at}
              />
              <AgreementSignature
                role="Coach"
                path={signatureViewer.coach_signature_path}
                signedAt={signatureViewer.coach_signed_at}
              />
            </div>

            <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Agreement status</dt>
                <dd className="font-semibold text-foreground">
                  {signatureViewer.status ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Countersigned</dt>
                <dd className="font-semibold text-foreground">
                  {signatureViewer.countersigned_at
                    ? new Date(signatureViewer.countersigned_at).toLocaleString('en-PH')
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-semibold text-foreground">
                  {signatureViewer.version ?? '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex justify-end border-t border-border pt-4">
              <Button variant="outline" onClick={() => setSignatureViewer(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAgreement)}
        title="Delete this contract?"
        message={
          confirmAgreement
            ? `Contract #${confirmAgreement.id} between ${fullName(confirmAgreement.client)} and ${fullName(
                confirmAgreement.coach
              )} will be permanently removed. Both parties lose access to this agreement.`
            : ''
        }
        confirmLabel="Delete contract"
        destructive
        loading={busy}
        onCancel={() => setConfirmAgreement(null)}
        onConfirm={() => confirmAgreement && handleDeleteAgreement(confirmAgreement)}
      />

      <ConfirmDialog
        open={Boolean(confirmFeedback)}
        title="Remove this review?"
        message={
          confirmFeedback
            ? `The review from ${fullName(confirmFeedback.user)} will be deleted and the coach's rating recalculated without it.`
            : ''
        }
        confirmLabel="Remove review"
        destructive
        loading={busy}
        onCancel={() => setConfirmFeedback(null)}
        onConfirm={() => confirmFeedback && handleDeleteFeedback(confirmFeedback)}
      />

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}