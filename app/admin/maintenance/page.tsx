'use client';

import React, { useState } from 'react';
import { Wrench, Plus, Trash2, Clock, ToggleLeft, ToggleRight, AlertCircle, Info } from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select, Textarea } from '@/components/ui/Input';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminToast,
  ConfirmDialog,
} from '@/components/admin/AdminStates';
import { AdminSkeletonRows } from '@/components/admin/AdminPrimitives';
import { useAdmin } from '@/components/admin/AdminContext';
import {
  createMaintenanceNotice,
  deleteMaintenanceNotice,
  fetchMaintenanceNotices,
  toggleMaintenanceNotice,
} from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/components/shared/cn';

/**
 * System maintenance banners.
 *
 * The same `maintenance_notices` rows the `MaintenanceBanner` component reads in
 * every dashboard shell — publishing here shows the banner to admins, coaches,
 * and clients alike. Toggling `is_active` off is the emergency stop; the old
 * version only offered delete, which meant no way to retract a notice without
 * destroying it.
 */

const TYPE_META: Record<string, { label: string; tone: string; icon: typeof AlertCircle }> = {
  warning: { label: 'Maintenance', tone: 'warning', icon: Wrench },
  info: { label: 'Information', tone: 'info', icon: Info },
  alert: { label: 'Critical', tone: 'danger', icon: AlertCircle },
};

export default function AdminMaintenancePage() {
  const { notifyChange } = useAdmin();
  const { data, loading, error, refresh } = useAdminData(() => fetchMaintenanceNotices(), []);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('warning');
  const [message, setMessage] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notices = data ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setFormError('A message is required.');
      return;
    }
    // An end before the start would render a banner for a window that already
    // closed. Catch it here rather than publishing something nonsensical.
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setFormError('The end time must be after the start time.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await createMaintenanceNotice({
        title: title.trim() || 'System Maintenance Notice',
        type,
        message: message.trim(),
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      });
      setTitle('');
      setMessage('');
      setStartsAt('');
      setEndsAt('');
      notifyChange();
      refresh();
      setToast('Maintenance notice published to all users.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not publish this notice.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await toggleMaintenanceNotice(id, !isActive);
      notifyChange();
      refresh();
      setToast(isActive ? 'Notice deactivated.' : 'Notice is now live.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not update this notice.');
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    try {
      await deleteMaintenanceNotice(id);
      setConfirmDelete(null);
      notifyChange();
      refresh();
      setToast('Maintenance notice deleted.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not delete this notice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Maintenance Notices"
        description="Publish a banner across every dashboard. Deactivate to retract it without deleting the record."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Composer */}
        <Card className="lg:col-span-5 h-fit" padding="lg">
          <CardHeader
            icon={<Plus className="h-4 w-4" />}
            title="Create notice"
            subtitle="Shown at the top of every dashboard"
          />
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
              >
                {formError}
              </div>
            )}

            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled System Upgrade"
            />

            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="warning">Maintenance (amber)</option>
              <option value="info">Information (blue)</option>
              <option value="alert">Critical alert (red)</option>
            </Select>

            <Textarea
              label="Message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain the downtime window, affected features, and estimated return time…"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Starts at"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                hint="Optional. Immediate if blank."
              />
              <Input
                label="Ends at"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                hint="Optional. Indefinite if blank."
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={saving}
              disabled={!message.trim()}
              icon={<Plus className="h-4 w-4" />}
            >
              Publish notice
            </Button>
          </form>
        </Card>

        {/* Notice list */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
            Published notices
            <span className="ml-2 tabular-nums text-muted-foreground">({notices.length})</span>
          </h3>

          {loading ? (
            <AdminSkeletonRows rows={3} />
          ) : error ? (
            <AdminErrorState message={error} onRetry={refresh} />
          ) : notices.length === 0 ? (
            <AdminEmptyState
              title="No maintenance notices"
              description="Publish a notice to show a banner at the top of every dashboard."
              icon={<Wrench className="h-5 w-5" />}
            />
          ) : (
            <ul className="space-y-3">
              {notices.map((n) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.warning;
                const Icon = meta.icon;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      'rounded-[20px] border p-5 transition-opacity',
                      n.is_active ? 'border-border bg-card' : 'border-border bg-muted opacity-70'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                            meta.tone === 'danger' && 'border-danger/30 bg-danger-soft text-danger',
                            meta.tone === 'info' && 'border-info/30 bg-info-soft text-info',
                            meta.tone === 'warning' &&
                              'border-warning/30 bg-warning-soft text-warning'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDateTime(n.created_at)} · {n.created_by || 'Admin'}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant={n.is_active ? (meta.tone === 'danger' ? 'cancelled' : 'pending') : 'neutral'}
                          dot={n.is_active}
                        >
                          {n.is_active ? 'Live' : 'Inactive'}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggle(n.id, n.is_active)}
                          aria-label={n.is_active ? `Deactivate ${n.title}` : `Activate ${n.title}`}
                          title={n.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {n.is_active ? (
                            <ToggleRight className="h-6 w-6 text-warning" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-subtle-foreground" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-subtle-foreground hover:bg-danger-soft hover:text-danger"
                          onClick={() => setConfirmDelete(n.id)}
                          aria-label={`Delete ${n.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {n.message}
                    </p>

                    {(n.starts_at || n.ends_at) && (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {n.starts_at ? formatDateTime(n.starts_at) : 'Now'} →{' '}
                        {n.ends_at ? formatDateTime(n.ends_at) : 'Indefinite'}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this notice?"
        message="The notice is removed permanently. Deactivating it instead keeps the record but hides the banner."
        confirmLabel="Delete notice"
        destructive
        loading={saving}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete !== null && handleDelete(confirmDelete)}
      />

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}