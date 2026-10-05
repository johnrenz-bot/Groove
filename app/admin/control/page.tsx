'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Palette,
  Wrench,
  Bell,
  Send,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Clock,
  Lock,
  LockOpen,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  AdminErrorState,
  AdminToast,
  ConfirmDialog,
} from '@/components/admin/AdminStates';
import { AdminSkeletonRows } from '@/components/admin/AdminPrimitives';
import { useAdmin } from '@/components/admin/AdminContext';
import {
  createAnnouncement,
  createMaintenanceNotice,
  deleteAnnouncement,
  fetchAnnouncements,
  fetchMaintenanceNotices,
  fetchOverview,
  fetchPlatformSettings,
  savePlatformSetting,
  toggleMaintenanceNotice,
} from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import { ACCENTS, useTheme } from '@/components/theme/ThemeProvider';
import { formatDateTime, formatTimeAgo } from '@/lib/utils';
import { cn } from '@/components/shared/cn';
import type { Announcement, MaintenanceNotice } from '@/lib/types';

/**
 * Operations control room — the single page for the platform's outbound comms
 * and live banners.
 *
 * This route previously existed as "System Control", a page that mixed a theme
 * switcher with an announcement form. The theme switcher set a `data-theme`
 * attribute that no stylesheet read, so it looked functional and did nothing.
 * Rather than leave the route dead, it now earns its place as the one screen
 * that answers "what is the platform currently telling users, and how do I
 * change that right now":
 *
 *   - broadcast an announcement
 *   - send a direct notification
 *   - raise or retract a maintenance banner
 *   - switch the accent and the platform base theme
 *
 * It reuses the same service functions as the dedicated Announcements,
 * Maintenance, and Appearance pages rather than reimplementing them, so a fix in
 * one shows up here. Those pages remain the place for deeper work (scheduling
 * windows, live preview); this is the fast-path console.
 */

const MAINTENANCE_TYPES: { value: string; label: string }[] = [
  { value: 'warning', label: 'Maintenance' },
  { value: 'info', label: 'Information' },
  { value: 'alert', label: 'Critical alert' },
];

export default function AdminControlPage() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  const { revision, notifyChange, logAction, notifyUsers } = useAdmin();

  const announcements = useAdminData(() => fetchAnnouncements(), [revision]);
  const notices = useAdminData(() => fetchMaintenanceNotices(), [revision]);
  const overview = useAdminData(() => fetchOverview(), [revision]);
  const settings = useAdminData(() => fetchPlatformSettings(), [revision]);

  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Announcement composer
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [confirmAnnouncement, setConfirmAnnouncement] = useState<Announcement | null>(null);

  // Direct notification composer
  const [notifyTarget, setNotifyTarget] = useState('all');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [notifyError, setNotifyError] = useState<string | null>(null);

  // Maintenance composer
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeType, setNoticeType] = useState('warning');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeError, setNoticeError] = useState<string | null>(null);

  const announcementRows = (announcements.data ?? []) as Announcement[];
  const noticeRows = (notices.data ?? []) as MaintenanceNotice[];
  const isLocked = settings.data?.theme_locked === 'true';
  const activeNotices = noticeRows.filter((n) => n.is_active);

  /* ---------------------------------------------------------------------- */
  /* Appearance                                                             */
  /* ---------------------------------------------------------------------- */

  const persistSetting = async (
    key: 'theme' | 'theme_accent' | 'theme_locked',
    value: string,
    optimistic: () => void,
    rollback: () => void,
    summary: string
  ) => {
    setSaving(key);
    try {
      await savePlatformSetting(key, value);
      optimistic();
      logAction('update', 'system_settings', key, summary);
      notifyChange();
      setToast('Appearance updated for all users.');
      settings.refresh();
    } catch (err) {
      rollback();
      setToast(err instanceof Error ? err.message : 'Could not save this setting.');
    } finally {
      setSaving(null);
    }
  };

  const handleAccent = (next: (typeof ACCENTS)[number]['value']) => {
    const previous = accent;
    void persistSetting(
      'theme_accent',
      next,
      () => setAccent(next),
      () => setAccent(previous),
      `Platform accent set to ${next}`
    );
  };

  const handleBaseTheme = (next: 'dark' | 'light') => {
    const previous = theme;
    void persistSetting(
      'theme',
      next,
      () => setTheme(next),
      () => setTheme(previous),
      `Platform base theme set to ${next}`
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Announcements                                                          */
  /* ---------------------------------------------------------------------- */

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setAnnouncementError('A message is required.');
      return;
    }
    // Relative path only. An absolute URL would render as a link on the client
    // and coach dashboards, which makes this an open-redirect lever.
    if (ctaUrl.trim() && !ctaUrl.trim().startsWith('/')) {
      setAnnouncementError('The link must be an internal path, for example /client/talent.');
      return;
    }

    setSaving('announcement');
    setAnnouncementError(null);
    try {
      await createAnnouncement({
        title: title.trim() || 'System Announcement',
        message: message.trim(),
        cta_label: ctaLabel.trim() || null,
        cta_url: ctaUrl.trim() || null,
      });
      logAction('create', 'announcement', undefined, `Published "${title.trim() || 'System Announcement'}"`);
      setTitle('');
      setMessage('');
      setCtaLabel('');
      setCtaUrl('');
      notifyChange();
      announcements.refresh();
      setToast('Announcement published to all portals.');
    } catch (err) {
      setAnnouncementError(
        err instanceof Error ? err.message : 'Could not publish this announcement.'
      );
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAnnouncement = async (a: Announcement) => {
    setSaving(`announcement-${a.id}`);
    try {
      await deleteAnnouncement(a.id);
      setConfirmAnnouncement(null);
      logAction('delete', 'announcement', String(a.id), `Deleted "${a.title}"`);
      announcements.refresh();
      setToast('Announcement deleted.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not delete this announcement.');
    } finally {
      setSaving(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Direct notifications                                                   */
  /* ---------------------------------------------------------------------- */

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyTitle.trim() || !notifyBody.trim()) {
      setNotifyError('A title and a message are both required.');
      return;
    }

    setSaving('notify');
    setNotifyError(null);
    try {
      // Suspended accounts are excluded: they cannot act on a notification
      // anyway, so sending one only burns rows in their bell.
      const eligible = (overview.data?.recipients ?? []).filter(
        (u) => u.status !== 'suspended'
      );
      const targets =
        notifyTarget === 'all' ? eligible : eligible.filter((u) => u.id === notifyTarget);

      if (targets.length === 0) {
        throw new Error('No eligible recipients for that selection.');
      }

      await notifyUsers(
        targets.map((t) => t.id),
        notifyTitle.trim(),
        notifyBody.trim()
      );

      logAction(
        'notify',
        'notification',
        undefined,
        `Notified ${targets.length} account(s): "${notifyTitle.trim()}"`
      );
      setNotifyTitle('');
      setNotifyBody('');
      notifyChange();
      setToast(`Notification sent to ${targets.length} account${targets.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : 'Could not send this notification.');
    } finally {
      setSaving(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Maintenance                                                            */
  /* ---------------------------------------------------------------------- */

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeMessage.trim()) {
      setNoticeError('A message is required.');
      return;
    }

    setSaving('notice');
    setNoticeError(null);
    try {
      await createMaintenanceNotice({
        title: noticeTitle.trim() || 'System Maintenance Notice',
        type: noticeType,
        message: noticeMessage.trim(),
      });
      logAction(
        'create',
        'maintenance_notice',
        undefined,
        `Raised banner: "${noticeTitle.trim() || 'System Maintenance Notice'}"`
      );
      setNoticeTitle('');
      setNoticeMessage('');
      notifyChange();
      notices.refresh();
      setToast('Maintenance banner is now live for all users.');
    } catch (err) {
      setNoticeError(err instanceof Error ? err.message : 'Could not publish this notice.');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleNotice = async (n: MaintenanceNotice) => {
    setSaving(`notice-${n.id}`);
    try {
      await toggleMaintenanceNotice(n.id, !n.is_active);
      logAction(
        n.is_active ? 'deactivate' : 'activate',
        'maintenance_notice',
        String(n.id),
        `${n.is_active ? 'Retracted' : 'Raised'} banner "${n.title}"`
      );
      notifyChange();
      notices.refresh();
      overview.refresh();
      setToast(n.is_active ? 'Banner retracted.' : 'Banner is now live.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not update this banner.');
    } finally {
      setSaving(null);
    }
  };

  /* ---------------------------------------------------------------------- */

  const recipientOptions = [
    { value: 'all', label: 'All clients and coaches' },
    ...(overview.data?.recipients ?? []).map((u) => ({
      value: u.id,
      label: `${u.name} — ${u.role}`,
    })),
  ];

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="System Control"
        description="What the platform is currently telling users, and the fastest way to change it."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {activeNotices.length > 0 ? (
              <Badge variant="pending" dot>
                {activeNotices.length} banner{activeNotices.length === 1 ? '' : 's'} live
              </Badge>
            ) : (
              <Badge variant="approved" dot>
                No active banners
              </Badge>
            )}
          </div>
        }
      />

      {/* Status strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusTile
          icon={<Megaphone className="h-4 w-4" />}
          label="Announcements"
          value={announcementRows.length}
          hint={announcementRows[0] ? `Latest ${formatTimeAgo(announcementRows[0].created_at)}` : 'None published'}
        />
        <StatusTile
          icon={<Wrench className="h-4 w-4" />}
          label="Maintenance banners"
          value={activeNotices.length}
          hint={`${noticeRows.length} total`}
          tone={activeNotices.length > 0 ? 'warning' : 'success'}
        />
        <StatusTile
          icon={<Bell className="h-4 w-4" />}
          label="Reachable accounts"
          value={(overview.data?.recipients ?? []).length}
          hint="Excluding suspended"
        />
        <StatusTile
          icon={<Palette className="h-4 w-4" />}
          label="Appearance"
          value={ACCENTS.find((a) => a.value === accent)?.label ?? accent}
          hint={`${theme} base · ${isLocked ? 'locked' : 'user choice allowed'}`}
          small
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Broadcast composer */}
        <Card className="lg:col-span-7" padding="lg">
          <CardHeader
            icon={<Megaphone className="h-4 w-4" />}
            title="Broadcast announcement"
            subtitle="Appears on the client and coach dashboards immediately"
            action={
              <Link
                href="/admin/announcements"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-accent-border hover:bg-accent-soft"
              >
                Manage <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <form onSubmit={handleBroadcast} className="space-y-4">
            {announcementError && (
              <div
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
              >
                {announcementError}
              </div>
            )}

            <Input
              label="Headline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Audition Season Open"
            />
            <Textarea
              label="Message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the details every user should see…"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>
            <Button
              type="submit"
              loading={saving === 'announcement'}
              disabled={!message.trim()}
              icon={<Megaphone className="h-4 w-4" />}
            >
              Publish announcement
            </Button>
          </form>

          {/* Recent announcements */}
          <div className="mt-6 border-t border-divider pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Recently published
            </p>
            {announcements.loading ? (
              <AdminSkeletonRows rows={2} />
            ) : announcements.error ? (
              <AdminErrorState message={announcements.error} onRetry={announcements.refresh} />
            ) : announcementRows.length === 0 ? (
              /* The shared EmptyState is the one with a `compact` variant that
               * suits a three-line slot inside a card. */
              <EmptyState
                compact
                title="Nothing published yet"
                description="Your first announcement will appear here."
                icon={<Megaphone className="h-5 w-5" />}
              />
            ) : (
              <ul className="space-y-2.5">
                {announcementRows.slice(0, 3).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{a.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {formatDateTime(a.created_at)} · {formatTimeAgo(a.created_at)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-subtle-foreground hover:bg-danger-soft hover:text-danger"
                      onClick={() => setConfirmAnnouncement(a)}
                      aria-label={`Delete ${a.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Appearance quick control */}
        <div className="space-y-6 lg:col-span-5">
          <Card padding="lg">
            <CardHeader
              icon={<Palette className="h-4 w-4" />}
              title="Accent palette"
              subtitle="Recolors every interface"
              action={
                <Link
                  href="/admin/theme"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-accent-border hover:bg-accent-soft"
                >
                  Preview <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="grid grid-cols-3 gap-2.5">
              {ACCENTS.map((option) => {
                const selected = accent === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleAccent(option.value)}
                    disabled={saving === 'theme_accent'}
                    aria-pressed={selected}
                    title={option.label}
                    className={cn(
                      'flex h-11 cursor-pointer items-center justify-center rounded-xl border transition-colors disabled:opacity-60',
                      selected ? 'border-accent-border ring-2 ring-accent' : 'border-border hover:border-border-strong'
                    )}
                    style={{ backgroundColor: `${option.swatch}22` }}
                  >
                    <span
                      aria-hidden="true"
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: option.swatch }}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-divider pt-4">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Base theme
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { value: 'dark' as const, label: 'Dark' },
                    { value: 'light' as const, label: 'Light' },
                  ]
                ).map((option) => {
                  const selected = settings.data?.theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleBaseTheme(option.value)}
                      disabled={saving === 'theme'}
                      aria-pressed={selected}
                      className={cn(
                        'cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60',
                        selected
                          ? 'border-accent-border bg-accent-soft text-accent-text'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div
                className={cn(
                  'mt-4 flex items-start justify-between gap-3 rounded-xl border p-3',
                  isLocked ? 'border-warning/30 bg-warning-soft' : 'border-border bg-muted'
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">
                    {isLocked ? 'Theme enforced' : 'User choice allowed'}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {isLocked
                      ? 'Personal preferences are overridden by the platform default.'
                      : 'A user\'s own saved preference wins over the platform default.'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isLocked ? 'outline' : 'ghost'}
                  className="shrink-0"
                  loading={saving === 'theme_locked'}
                  onClick={() =>
                    void persistSetting(
                      'theme_locked',
                      isLocked ? 'false' : 'true',
                      () => {},
                      () => {},
                      isLocked ? 'Theme enforcement disabled' : 'Theme enforcement enabled'
                    )
                  }
                  icon={isLocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                >
                  {isLocked ? 'Unlock' : 'Lock'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Maintenance quick control */}
          <Card padding="lg">
            <CardHeader
              icon={<Wrench className="h-4 w-4" />}
              title="Maintenance banner"
              subtitle="Retract without deleting"
              action={
                <Link
                  href="/admin/maintenance"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-accent-border hover:bg-accent-soft"
                >
                  Manage <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />

            {/* Active banners first — retracting is the time-critical action. */}
            {notices.loading ? (
              <AdminSkeletonRows rows={1} />
            ) : activeNotices.length > 0 ? (
              <ul className="mb-4 space-y-2">
                {activeNotices.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-warning">{n.title}</p>
                      <p className="truncate text-[11px] text-warning/80">
                        {formatDateTime(n.created_at)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-warning hover:bg-warning hover:text-warning"
                      loading={saving === `notice-${n.id}`}
                      onClick={() => handleToggleNotice(n)}
                      aria-label={`Retract ${n.title}`}
                      title="Retract banner"
                    >
                      <ToggleRight className="h-6 w-6" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            <form onSubmit={handleCreateNotice} className="space-y-3">
              {noticeError && (
                <div
                  role="alert"
                  className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
                >
                  {noticeError}
                </div>
              )}
              <Input
                label="Title"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="e.g. Scheduled upgrade"
              />
              <Select
                label="Type"
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value)}
              >
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Message"
                required
                rows={3}
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                placeholder="Explain the downtime window and expected return time…"
              />
              <Button
                type="submit"
                className="w-full"
                loading={saving === 'notice'}
                disabled={!noticeMessage.trim()}
                icon={<Wrench className="h-4 w-4" />}
              >
                Raise banner
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Direct notification */}
      <Card padding="lg">
        <CardHeader
          icon={<Send className="h-4 w-4" />}
          title="Send a direct notification"
          subtitle="Delivered to the in-app notification bell"
          action={
            <Link
              href="/admin/settings"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-accent-border hover:bg-accent-soft"
            >
              Full tool <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <form onSubmit={handleNotify} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            {notifyError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
              >
                {notifyError}
              </div>
            )}
            <Select
              label="Recipients"
              value={notifyTarget}
              onChange={(e) => setNotifyTarget(e.target.value)}
              hint="Suspended accounts are excluded."
            >
              {recipientOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-4">
            <Input
              label="Title"
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="e.g. Schedule change"
            />
          </div>
          <div className="flex flex-col justify-end gap-3 lg:col-span-4">
            <Input
              label="Message"
              value={notifyBody}
              onChange={(e) => setNotifyBody(e.target.value)}
              placeholder="Write the notification body…"
            />
            <Button
              type="submit"
              loading={saving === 'notify'}
              disabled={!notifyTitle.trim() || !notifyBody.trim()}
              icon={<Send className="h-4 w-4" />}
            >
              Send
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmAnnouncement)}
        title="Delete this announcement?"
        message={
          confirmAnnouncement
            ? `"${confirmAnnouncement.title}" will be removed from every client and coach dashboard.`
            : ''
        }
        confirmLabel="Delete announcement"
        destructive
        loading={saving === `announcement-${confirmAnnouncement?.id}`}
        onCancel={() => setConfirmAnnouncement(null)}
        onConfirm={() =>
          confirmAnnouncement && handleDeleteAnnouncement(confirmAnnouncement)
        }
      />

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Presentational helpers                                                      */
/* -------------------------------------------------------------------------- */

function StatusTile({
  icon,
  label,
  value,
  hint,
  tone = 'default',
  small = false,
}: {
  /** An already-rendered icon element, not an icon component — each call site
   * passes `<Megaphone className="…" />` directly. */
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: 'default' | 'warning' | 'success';
  small?: boolean;
}) {
  return (
    <div className="g-card p-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
            tone === 'warning' && 'border-warning/30 bg-warning-soft text-warning',
            tone === 'success' && 'border-success/30 bg-success-soft text-success',
            tone === 'default' && 'border-accent-border bg-accent-soft text-accent-text'
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
            {label}
          </p>
          <p
            className={cn(
              'mt-1 truncate font-bold tracking-[-0.02em] text-foreground',
              small ? 'text-base' : 'text-2xl tabular-nums'
            )}
          >
            {value}
          </p>
        </div>
      </div>
      <p className="mt-3 truncate text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}