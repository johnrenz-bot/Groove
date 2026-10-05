'use client';

import React, { useMemo, useState } from 'react';
import {
  Settings2,
  Database,
  ShieldCheck,
  Bell,
  Send,
  Search,
  History,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, Textarea } from '@/components/ui/Input';
import { AdminEmptyState, AdminErrorState, AdminToast } from '@/components/admin/AdminStates';
import { AdminSkeletonRows } from '@/components/admin/AdminPrimitives';
import { useAdmin } from '@/components/admin/AdminContext';
import { fetchActivityLog, fetchOverview, fetchPlatformSettings } from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import { ADMIN_EMAIL } from '@/lib/admin/access';
import { formatDateTime, formatTimeAgo } from '@/lib/utils';

/**
 * System settings: the raw `system_settings` store, the admin broadcast tool,
 * and the activity log.
 *
 * Appearance has its own page (/admin/theme) because it is a two-control surface
 * with live preview; this page is for everything else plus the audit trail, which
 * is what an operator reaches for when something looks wrong.
 */
export default function AdminSettingsPage() {
  const { notifyChange, notifyUsers } = useAdmin();

  const settings = useAdminData(() => fetchPlatformSettings(), []);
  const activity = useAdminData(() => fetchActivityLog(25), []);
  // The overview already carries the recipient directory, so this page reuses it
  // rather than issuing a second full user query.
  const overview = useAdminData(() => fetchOverview(), []);

  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [sending, setSending] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const recipientOptions = useMemo(() => {
    const list = (overview.data?.recipients ?? [])
      .filter((u) => u.status !== 'suspended')
      .map((u) => ({ value: u.id, label: `${u.name} — ${u.role}` }));
    return [
      { value: 'all', label: 'All clients and coaches' },
      ...list,
    ];
  }, [overview.data]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      setBroadcastError('A title and a message are both required.');
      return;
    }

    setSending(true);
    setBroadcastError(null);
    try {
      const everyone = overview.data?.recipients ?? [];
      const targets =
        broadcastTarget === 'all'
          ? everyone.filter((u) => u.status !== 'suspended')
          : everyone.filter((u) => u.id === broadcastTarget && u.status !== 'suspended');

      if (targets.length === 0) {
        throw new Error('No eligible recipients for that selection.');
      }

      await notifyUsers(
        targets.map((t) => t.id),
        broadcastTitle.trim(),
        broadcastBody.trim()
      );

      setBroadcastTitle('');
      setBroadcastBody('');
      notifyChange();
      setToast(`Notification sent to ${targets.length} account${targets.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setBroadcastError(
        err instanceof Error ? err.message : 'Could not send this notification.'
      );
    } finally {
      setSending(false);
    }
  };

  const settingRows = settings.data
    ? Object.entries(settings.data).map(([key, value]) => ({ key, value: value || '—' }))
    : [];

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="System Settings"
        description="Platform configuration, direct notifications, and the administrative activity log."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Settings store */}
        <Card className="lg:col-span-5" padding="lg">
          <CardHeader
            icon={<Database className="h-4 w-4" />}
            title="Configuration store"
            subtitle="Current values in system_settings"
          />
          {settings.loading ? (
            <AdminSkeletonRows rows={3} />
          ) : settings.error ? (
            <AdminErrorState message={settings.error} onRetry={settings.refresh} />
          ) : (
            <ul className="space-y-2.5">
              {settingRows.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted px-4 py-3"
                >
                  <code className="truncate font-mono text-xs text-muted-foreground">{row.key}</code>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-accent-border bg-accent-soft px-4 py-3 text-xs text-accent-text">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-relaxed">
              Appearance settings are managed on the{' '}
              <a href="/admin/theme" className="font-semibold underline underline-offset-2">
                Appearance page
              </a>
              , where they can be previewed before saving.
            </p>
          </div>
        </Card>

        {/* Broadcast */}
        <Card className="lg:col-span-7" padding="lg">
          <CardHeader
            icon={<Bell className="h-4 w-4" />}
            title="Send a notification"
            subtitle="Delivered to the in-app notification bell"
          />
          <form onSubmit={handleBroadcast} className="space-y-4">
            {broadcastError && (
              <div
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
              >
                {broadcastError}
              </div>
            )}

            <Select
              label="Recipients"
              value={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.value)}
              hint={`${recipientOptions.length - 1} eligible accounts (suspended accounts are excluded).`}
            >
              {recipientOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>

            <div>
              <label htmlFor="broadcast-title" className="g-label">
                Title
              </label>
              <input
                id="broadcast-title"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Schedule change for next week"
                className="g-input"
              />
            </div>

            <Textarea
              label="Message"
              rows={4}
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              placeholder="Write the notification body…"
            />

            <Button
              type="submit"
              loading={sending}
              disabled={!broadcastTitle.trim() || !broadcastBody.trim()}
              icon={<Send className="h-4 w-4" />}
            >
              Send notification
            </Button>
          </form>
        </Card>
      </div>

      {/* Access policy */}
      <Card padding="lg">
        <CardHeader
          icon={<KeyRound className="h-4 w-4" />}
          title="Administrator access policy"
          subtitle="How this console decides who may use it"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <PolicyCard
            title="Authentication"
            body="A valid Supabase session is required. Unauthenticated requests to any admin route are redirected to sign in."
          />
          <PolicyCard
            title="Role"
            body="The profiles row must have role 'admin'. Read from the database, not from client-supplied session metadata."
          />
          <PolicyCard
            title="Email pin"
            body={
              <>
                The account email must be exactly{' '}
                <code className="font-mono text-accent-text">{ADMIN_EMAIL}</code>. Role alone is
                not sufficient, and the database policies enforce the same check.
              </>
            }
          />
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            Because admin access is tied to a single email address, that address is a
            single point of failure. Use a dedicated account with a strong password and
            two-factor authentication.
          </p>
        </div>
      </Card>

      {/* Activity log */}
      <Card padding="lg">
        <CardHeader
          icon={<History className="h-4 w-4" />}
          title="Administrative activity"
          subtitle="Recorded server-side so it cannot be altered from a client session"
          action={
            activity.data && activity.data.length > 0 ? (
              <Badge variant="neutral">{activity.data.length} recent</Badge>
            ) : undefined
          }
        />
        {activity.loading ? (
          <AdminSkeletonRows rows={4} />
        ) : activity.error ? (
          <AdminErrorState
            message={activity.error}
            onRetry={activity.refresh}
          />
        ) : !activity.data || activity.data.length === 0 ? (
          <AdminEmptyState
            title="No activity recorded yet"
            description="Administrative actions appear here once the audit route is wired up."
            icon={<History className="h-5 w-5" />}
          />
        ) : (
          <ul className="space-y-2.5">
            {activity.data.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {entry.summary || `${entry.action} on ${entry.entity}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.admin_email || 'System'} · {entry.action} · {entry.entity}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-subtle-foreground">
                  {formatTimeAgo(entry.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function PolicyCard({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}