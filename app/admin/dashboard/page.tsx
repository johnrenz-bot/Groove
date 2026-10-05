'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Sparkles,
  Calendar,
  LifeBuoy,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  TrendingUp,
  AlertTriangle,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { AdminSkeletonStat, AdminSkeletonRows } from '@/components/admin/AdminPrimitives';
import {
  bucketTalents,
  statusBadge,
  TALENT_BUCKETS,
  fullName,
} from '@/lib/admin/presentation';
import { fetchBookings, fetchOverview } from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import { useAdminRevision } from '@/components/admin/AdminContext';
import { formatDate, formatTimeAgo, formatCurrency } from '@/lib/utils';
import { cn } from '@/components/shared/cn';

/**
 * The admin landing page.
 *
 * Built around the questions an operator actually asks on arrival: how many
 * people are on the platform, what is waiting for approval, what is unresolved,
 * and what happened recently. Every stat links to the page where that number can
 * be acted on, so the dashboard is a launcher rather than a dead-end report.
 */

interface Metric {
  key: string;
  label: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
  href: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

export default function AdminDashboardPage() {
  const revision = useAdminRevision();

  const overview = useAdminData(() => fetchOverview(), [revision]);
  const bookings = useAdminData(() => fetchBookings(6), [revision]);

  const o = overview.data;

  const metrics: Metric[] = o
    ? [
        {
          key: 'clients',
          label: 'Clients',
          value: o.clients,
          hint: `${o.newThisWeek} joined in the last 7 days`,
          icon: Users,
          href: '/admin/clients',
        },
        {
          key: 'coaches',
          label: 'Coaches',
          value: o.coaches,
          hint: `${o.coachVerification.unverified} awaiting verification`,
          icon: Sparkles,
          href: '/admin/coaches',
        },
        {
          key: 'bookings',
          label: 'Bookings',
          value: o.bookingsTotal,
          hint: `${o.bookingsPending} pending · ${o.bookingsToday} today`,
          icon: Calendar,
          href: '/admin/bookings',
        },
        {
          key: 'tickets',
          label: 'Open Tickets',
          value: o.openTickets,
          hint: `${o.totalTickets} total inquiries`,
          icon: LifeBuoy,
          href: '/admin/inquiries',
          tone: o.openTickets > 0 ? 'warning' : 'default',
        },
        {
          key: 'verification',
          label: 'Awaiting Verification',
          value: o.pendingVerification,
          hint: 'Documents submitted and waiting on review',
          icon: ShieldCheck,
          // Points at the review queue, not the general account table: this
          // number is cleared in one place, so the stat must launch there.
          href: '/admin/verifications',
          tone: o.pendingVerification > 0 ? 'warning' : 'success',
        },
        {
          key: 'suspended',
          label: 'Suspended',
          value: o.suspended,
          hint: 'Accounts currently blocked',
          icon: AlertTriangle,
          href: '/admin/users',
          tone: o.suspended > 0 ? 'danger' : 'default',
        },
        {
          key: 'notices',
          label: 'Active Notices',
          value: o.activeNotices,
          hint: 'Maintenance banners shown to all users',
          icon: Megaphone,
          href: '/admin/maintenance',
        },
        {
          key: 'revenue',
          label: 'Contracted Value',
          value: formatCurrency(o.revenueEstimate),
          hint: 'Sum of signed agreement prices',
          icon: TrendingUp,
          href: '/admin/transactions',
        },
      ]
    : [];

  const talentCounts = o ? bucketTalents(o.coachTalents) : {};
  const talentTotal = Object.values(talentCounts).reduce((a, b) => a + b, 0);

  const bookingMix = o
    ? [
        { label: 'Pending', value: o.bookingsPending, variant: 'pending' as const },
        { label: 'Confirmed', value: o.bookingsConfirmed, variant: 'confirmed' as const },
        { label: 'Completed', value: o.bookingsCompleted, variant: 'completed' as const },
        { label: 'Cancelled', value: o.bookingsCancelled, variant: 'cancelled' as const },
      ]
    : [];

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="System Overview"
        title="Admin Control Center"
        description="Live platform metrics across accounts, bookings, support, and system health."
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success-soft px-3.5 py-1.5 text-xs font-semibold text-success" role="status">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Database Connected
          </span>
        }
      />

      <section aria-labelledby="metrics-heading" className="space-y-4">
        <h2
          id="metrics-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground"
        >
          Key metrics
        </h2>

        {overview.loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <AdminSkeletonStat key={i} />
            ))}
          </div>
        ) : overview.error ? (
          <AdminErrorState
            message={overview.error}
            onRetry={overview.refresh}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Link
                  key={metric.key}
                  href={metric.href}
                  className="g-card g-card-hover group flex flex-col p-5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                        metric.tone === 'danger' && 'border-danger/30 bg-danger-soft text-danger',
                        metric.tone === 'warning' &&
                          'border-warning/30 bg-warning-soft text-warning',
                        metric.tone === 'success' &&
                          'border-success/30 bg-success-soft text-success',
                        (!metric.tone || metric.tone === 'default') &&
                          'border-accent-border bg-accent-soft text-accent-text'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-subtle-foreground transition-colors group-hover:text-accent-text" />
                  </div>
                  <p className="mt-4 text-2xl font-bold tabular-nums tracking-[-0.03em] text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-subtle-foreground">
                    {metric.hint}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Talent distribution */}
        <Card className="lg:col-span-5" padding="lg">
          <CardHeader
            icon={<Sparkles className="h-4 w-4" />}
            title="Coach Talent Mix"
            subtitle={`${talentTotal} coach${talentTotal === 1 ? '' : 's'} classified by discipline`}
            action={
              <Link
                href="/admin/coaches"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-accent-border hover:bg-accent-soft"
              >
                Manage <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {talentTotal === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No coach disciplines recorded yet.
            </p>
          ) : (
            <div className="space-y-5">
              {TALENT_BUCKETS.map((bucket) => {
                const value = talentCounts[bucket.key] ?? 0;
                const pct = Math.round((value / talentTotal) * 100);
                return (
                  <div key={bucket.key}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{bucket.label}</span>
                      <span className="font-bold tabular-nums text-accent-text">
                        {value} · {pct}%
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${bucket.label}: ${value} coaches, ${pct} percent`}
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Booking pipeline */}
        <Card className="lg:col-span-7" padding="lg">
          <CardHeader
            icon={<Calendar className="h-4 w-4" />}
            title="Booking Pipeline"
            subtitle="Every session on the platform by status"
            action={
              <Link
                href="/admin/bookings"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-accent-border hover:bg-accent-soft"
              >
                All bookings <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {!o || o.bookingsTotal === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No bookings have been created yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {bookingMix.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-border bg-muted p-4"
                  >
                    <p className="text-2xl font-bold tabular-nums tracking-[-0.03em] text-foreground">
                      {item.value}
                    </p>
                    <div className="mt-2">
                      <Badge variant={item.variant} dot>
                        {item.label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {o.bookingsToday} booking{o.bookingsToday === 1 ? '' : 's'} scheduled today
                </span>
                <span className="tabular-nums">{o.bookingsTotal} all time</span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card padding="lg">
        <CardHeader
          icon={<Clock className="h-4 w-4" />}
          title="Recent Booking Activity"
          subtitle="The latest session requests across the platform"
          action={
            <Link
              href="/admin/bookings"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-accent-border hover:bg-accent-soft"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />

        {bookings.loading ? (
          <AdminSkeletonRows rows={4} />
        ) : bookings.error ? (
          <AdminErrorState message={bookings.error} onRetry={bookings.refresh} />
        ) : !bookings.data || bookings.data.length === 0 ? (
          <EmptyState
            compact
            icon={<Calendar className="h-5 w-5" />}
            title="No bookings yet"
            description="Session requests from clients will appear here as soon as they are made."
          />
        ) : (
          <ul className="space-y-2.5">
            {bookings.data.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-bold text-foreground">
                    {b.name}
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      with {fullName(b.coach)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.session_type}
                    {b.talent ? ` · ${b.talent}` : ''} · {formatDate(b.date)} · {b.start_time}–
                    {b.end_time}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="hidden text-[11px] tabular-nums text-subtle-foreground sm:inline">
                    {formatTimeAgo(b.created_at)}
                  </span>
                  <Badge variant={statusBadge(b.status)} dot>
                    {b.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Attention row */}
      {o && (o.pendingVerification > 0 || o.openTickets > 0 || o.suspended > 0) && (
        <section aria-labelledby="attention-heading" className="space-y-4">
          <h2
            id="attention-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground"
          >
            Needs attention
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {o.pendingVerification > 0 && (
            <AttentionCard
              icon={<ShieldCheck className="h-4 w-4" />}
              tone="warning"
              title={`${o.pendingVerification} account${o.pendingVerification === 1 ? '' : 's'} awaiting verification`}
              description="Review ID documents and approve or reject."
              href="/admin/verifications"
              label="Review"
            />
          )}
          {o.openTickets > 0 && (
            <AttentionCard
              icon={<LifeBuoy className="h-4 w-4" />}
              tone="warning"
              title={`${o.openTickets} open support ticket${o.openTickets === 1 ? '' : 's'}`}
              description="Inquiries from the landing page and in-app support."
              href="/admin/inquiries"
              label="Respond"
            />
          )}
          {o.suspended > 0 && (
            <AttentionCard
              icon={<AlertTriangle className="h-4 w-4" />}
              tone="danger"
              title={`${o.suspended} suspended account${o.suspended === 1 ? '' : 's'}`}
              description="These accounts cannot book or send messages."
              href="/admin/users"
              label="Review"
            />
          )}
          </div>
        </section>
      )}
    </div>
  );
}

/** Call-to-action tile used in the "needs attention" row. */
function AttentionCard({
  icon,
  title,
  description,
  href,
  label,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  label: string;
  tone: 'warning' | 'danger';
}) {
  return (
    <Link
      href={href}
      className={cn(
        'g-card g-card-hover group flex items-start gap-3.5 p-5 transition-colors',
        tone === 'danger' ? 'border-danger/30' : 'border-warning/30'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
          tone === 'danger'
            ? 'border-danger/30 bg-danger-soft text-danger'
            : 'border-warning/30 bg-warning-soft text-warning'
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-accent-text">
          {label} <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <ArrowUpRight
        aria-hidden="true"
        className="mt-0.5 hidden h-4 w-4 shrink-0 text-subtle-foreground transition-colors group-hover:text-accent-text sm:block"
      />
    </Link>
  );
}