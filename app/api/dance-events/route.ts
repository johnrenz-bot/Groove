import { NextResponse } from 'next/server';
import { checkDanceAccess } from '@/lib/danceAccess';
import { fetchAllSources, dedupeEvents, SOURCES, type DanceEvent } from '@/lib/danceEventSources';

/**
 * GET /api/dance-events — Dance competitions, workshops, news and results.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ORDER OF OPERATIONS IS THE SECURITY PROPERTY
 * The role check runs FIRST and returns before any upstream fetch. A caller who
 * is not an allowed Dance user therefore cannot cause a request to a
 * third-party publisher, and receives no event data at all. Hiding the nav entry
 * in the UI is a courtesy on top of this, never the control.
 *
 * Status codes:
 *   401 — not signed in
 *   403 — signed in but not a Dance user (or not an admin)
 *
 * CACHING
 * `revalidate: 1800` gives the framework cache per source fetch, so a burst of
 * clients does not multiply requests to the publisher. 30 minutes suits an
 * editorial feed and is well inside normal polite-interval practice.
 *
 * FAILURE ISOLATION
 * Every source is fetched independently (Promise.all over per-source promises
 * that never reject), so one dead feed degrades that source only. The response
 * always reports which sources succeeded, failed, and how many events each
 * contributed — including when everything failed.
 *
 * NO STORAGE
 * Nothing is written to the database. No table, column, policy or enum is
 * involved, so no migration is required.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await checkDanceAccess();

  if (!access.allowed) {
    // No body beyond the reason: nothing about the event data leaks to a denied
    // caller, and nothing tells them which sources are configured.
    return NextResponse.json(
      { error: access.reason, events: [], sources: [] },
      { status: access.status, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const results = await fetchAllSources();

  const all: DanceEvent[] = results.flatMap((r) => r.events);
  const events = dedupeEvents(all).sort((a, b) => {
    // Upcoming first, undated last, then newest first.
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
  });

  const sourceStatus = results.map((r) => ({
    key: r.source,
    label: r.label,
    ok: r.error === null,
    count: r.events.length,
    error: r.error,
  }));

  // No sources configured would be a build-time mistake, not a data condition.
  const everySourceFailed = results.length > 0 && results.every((r) => r.error !== null);

  return NextResponse.json(
    {
      events,
      sources: sourceStatus,
      total: events.length,
      // A partial outage is reported distinctly from "genuinely nothing today",
      // so the UI can say which one it is instead of implying an empty calendar.
      degraded: everySourceFailed || sourceStatus.some((s) => !s.ok),
      // When this was generated, so the UI can show "last updated" honestly
      // rather than implying the publishers' data is live to the second.
      fetchedAt: new Date().toISOString(),
      configuredSources: SOURCES.length,
    },
    {
      status: 200,
      // Private: this payload is per-viewer, gated on a server-side role check.
      headers: { 'Cache-Control': 'private, max-age=600' },
    }
  );
}
