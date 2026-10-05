'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  MapPin,
  ExternalLink,
  Loader2,
  Trophy,
  GraduationCap,
  Newspaper,
  ListOrdered,
  TriangleAlert,
  RefreshCw,
} from 'lucide-react';
import type { DanceEvent, DanceEventCategory } from '@/lib/danceEventSources';

/**
 * Dance Events & News.
 *
 * Every card links to the PUBLISHER's own page. Nothing is copied from an
 * article: the summary is the feed's own short description, truncated, and the
 * card's only outbound action is "View Official Details". Entry, ticket and
 * registration information appears only when the publisher put a link in their
 * own feed — never inferred, never invented.
 *
 * The empty state distinguishes two very different situations that would
 * otherwise look identical:
 *   - every source failed  -> a problem, with a retry
 *   - sources fine, no items -> simply nothing published today
 */

const FILTERS: { id: DanceEventCategory | 'all'; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: CalendarDays },
  { id: 'competition', label: 'Competitions', icon: Trophy },
  { id: 'workshop', label: 'Workshops', icon: GraduationCap },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'results', label: 'Results', icon: ListOrdered },
];

const CATEGORY_ICON: Record<DanceEventCategory, React.ElementType> = {
  competition: Trophy,
  workshop: GraduationCap,
  news: Newspaper,
  results: ListOrdered,
};

interface SourceStatus {
  key: string;
  label: string;
  ok: boolean;
  count: number;
  error: string | null;
}

interface Payload {
  events: DanceEvent[];
  sources: SourceStatus[];
  total: number;
  degraded: boolean;
  fetchedAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Date not published';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-PH', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function DanceEventsFeed() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DanceEventCategory | 'all'>('all');
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dance-events');
      if (res.status === 401 || res.status === 403) {
        // The server refused. Surface its reason and do not retry in a loop.
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'You do not have access to Dance events.');
        setData(null);
        return;
      }
      if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
      setData((await res.json()) as Payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load Dance events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred: `load` sets state, and a state-setting call in an effect body is
    // what react-hooks/set-state-in-effect rejects.
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadKey]);

  const events = (data?.events ?? []).filter((e) => filter === 'all' || e.category === filter);
  const failed = (data?.sources ?? []).filter((s) => !s.ok);

  if (error) {
    return (
      <div className="g-card p-7 text-center">
        <TriangleAlert className="mx-auto h-6 w-6 text-danger" aria-hidden="true" />
        <p role="alert" className="mt-3 text-sm font-semibold text-foreground">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-foreground transition hover:border-accent-border"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div
        role="tablist"
        aria-label="Filter dance events"
        className="mb-5 flex flex-wrap items-center gap-1 border-b border-divider"
      >
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.id;
          const count =
            f.id === 'all'
              ? (data?.events.length ?? 0)
              : (data?.events ?? []).filter((e) => e.category === f.id).length;
          return (
            <button
              key={f.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                active
                  ? 'border-accent text-accent-text'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {f.label}
              {data && (
                <span className="tabular-nums text-subtle-foreground">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
          Loading events from official sources…
        </div>
      ) : events.length === 0 ? (
        <div className="g-card px-6 py-12 text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-subtle-foreground"
          >
            <CalendarDays className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-sm font-bold text-foreground">
            {failed.length > 0 && failed.length === (data?.sources.length ?? 0)
              ? 'Event sources are unavailable right now'
              : filter === 'all'
                ? 'No events published yet'
                : `No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} published yet`}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            {failed.length > 0 && failed.length === (data?.sources.length ?? 0) ? (
              <>
                Groove could not reach{' '}
                {failed.map((f) => f.label).join(', ')}
                {failed[0]?.error ? ` (${failed[0].error})` : ''}. This is a problem on our side or
                theirs, not a sign that nothing is happening. Please try again shortly.
              </>
            ) : (
              <>
                We only list what official publishers publish themselves. Nothing has been posted
                in this category yet — check back, or follow the source directly.
              </>
            )}
          </p>
          {failed.length > 0 && failed.length === (data?.sources.length ?? 0) && (
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-xs font-bold text-accent-foreground transition hover:bg-accent-hover"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const Icon = CATEGORY_ICON[e.category];
            return (
              <li
                key={e.id}
                className="g-card g-card-hover flex flex-col p-5 transition-opacity duration-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="g-eyebrow">
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {e.category}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
                    {e.organizer}
                  </span>
                </div>

                <h3 className="mt-2.5 text-sm font-bold leading-snug tracking-[-0.01em] text-foreground">
                  {e.title}
                </h3>

                <dl className="mt-2.5 space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3 shrink-0 text-accent-text" aria-hidden="true" />
                    <dt className="sr-only">Date</dt>
                    <dd>
                      <time dateTime={e.date ?? undefined}>{formatDate(e.date)}</time>
                      {e.endDate ? ` – ${formatDate(e.endDate)}` : ''}
                    </dd>
                  </div>
                  {e.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0 text-accent-text" aria-hidden="true" />
                      <dt className="sr-only">Location</dt>
                      <dd className="truncate">{e.location}</dd>
                    </div>
                  )}
                </dl>

                {e.summary && (
                  <p className="mt-2.5 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                    {e.summary}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4">
                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-text underline-offset-2 hover:underline"
                  >
                    View Official Details
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                  {e.registrationUrl && (
                    <a
                      href={e.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Registration
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Provenance: which publishers answered, and when. */}
      {data && (
        <div className="mt-6 space-y-2 border-t border-divider pt-4">
          <p className="text-[11px] text-subtle-foreground">
            Last updated {formatFetchedAt(data.fetchedAt)} ·{' '}
            {data.total} item{data.total === 1 ? '' : 's'} from{' '}
            {data.sources.map((s) => s.label).join(', ')}
          </p>
          {failed.length > 0 && failed.length < data.sources.length && (
            <p className="text-[11px] text-warning">
              Partially degraded — unavailable: {failed.map((f) => f.label).join(', ')}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default DanceEventsFeed;
