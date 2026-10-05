'use client';

import React, { useState } from 'react';
import { Megaphone, Trash2, ExternalLink, Send, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminToast,
  ConfirmDialog,
} from '@/components/admin/AdminStates';
import { AdminSkeletonRows } from '@/components/admin/AdminPrimitives';
import { useAdmin } from '@/components/admin/AdminContext';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
} from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import { formatDateTime, formatTimeAgo } from '@/lib/utils';
import type { Announcement } from '@/lib/types';

/**
 * Broadcast announcements to every client and coach.
 *
 * Replaces /admin/control, which mixed announcements with a theme switcher that
 * set a `data-theme` attribute no stylesheet read — it looked functional and
 * changed nothing. Theme management now lives at /admin/theme, where it actually
 * writes the platform settings every portal reads.
 */
export default function AdminAnnouncementsPage() {
  const { notifyChange } = useAdmin();
  const { data, loading, error, refresh } = useAdminData(() => fetchAnnouncements(), []);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const announcements = data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setFormError('A message is required.');
      return;
    }
    // A relative path only. An absolute URL here would be rendered as a link on
    // the client and coach dashboards, which makes this an open-redirect lever.
    if (ctaUrl.trim() && !ctaUrl.trim().startsWith('/')) {
      setFormError('The link must be an internal path, for example /client/talent.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await createAnnouncement({
        title: title.trim() || 'System Announcement',
        message: message.trim(),
        cta_label: ctaLabel.trim() || null,
        cta_url: ctaUrl.trim() || null,
      });
      setTitle('');
      setMessage('');
      setCtaLabel('');
      setCtaUrl('');
      setToast('Announcement published to all portals.');
      notifyChange();
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not publish this announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Announcement) => {
    setSaving(true);
    try {
      await deleteAnnouncement(a.id);
      setConfirmDelete(null);
      setToast('Announcement deleted.');
      refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not delete this announcement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="Broadcast"
        title="Announcements"
        description="Publish platform-wide notices. Every announcement appears on the client and coach dashboards immediately."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Composer */}
        <Card className="lg:col-span-5 h-fit" padding="lg">
          <CardHeader
            icon={<Megaphone className="h-4 w-4" />}
            title="New announcement"
            subtitle="Visible to all clients and coaches"
          />
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
              >
                {formError}
              </div>
            )}

            <Input
              label="Headline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Audition Season Open"
              hint="Shown in bold above the message. Defaults to 'System Announcement'."
            />

            <Textarea
              label="Message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the details every user should see…"
            />

            <Input
              label="Link label"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="e.g. Learn more"
            />

            <Input
              label="Link path"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="/client/talent"
              hint="Internal path only, starting with /."
            />

            <Button
              type="submit"
              className="w-full"
              loading={saving}
              disabled={!message.trim()}
              icon={<Send className="h-4 w-4" />}
            >
              Publish announcement
            </Button>
          </form>
        </Card>

        {/* Published list */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
            Published announcements
            <span className="ml-2 tabular-nums text-muted-foreground">({announcements.length})</span>
          </h3>

          {loading ? (
            <AdminSkeletonRows rows={3} />
          ) : error ? (
            <AdminErrorState message={error} onRetry={refresh} />
          ) : announcements.length === 0 ? (
            <AdminEmptyState
              title="No announcements published"
              description="Platform notices you publish will be listed here."
              icon={<Inbox className="h-5 w-5" />}
            />
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="rounded-[20px] border border-border bg-card p-5 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-foreground">{a.title}</h4>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {a.author} · {formatDateTime(a.created_at)} · {formatTimeAgo(a.created_at)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-subtle-foreground hover:bg-danger-soft hover:text-danger"
                      onClick={() => setConfirmDelete(a)}
                      aria-label={`Delete announcement ${a.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {a.message}
                  </p>
                  {a.cta_url && (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent-soft px-3 py-1 text-[11px] font-semibold text-accent-text">
                      {a.cta_label || 'View'}
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this announcement?"
        message={
          confirmDelete
            ? `"${confirmDelete.title}" will be removed from every client and coach dashboard.`
            : ''
        }
        confirmLabel="Delete announcement"
        destructive
        loading={saving}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}