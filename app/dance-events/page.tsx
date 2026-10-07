import { redirect } from 'next/navigation';
import { checkDanceAccess, DanceEventsFeed } from '@/features/dance';
import { PageHeader } from '@/components/shared/SectionHeader';

/**
 * /dance-events — Dance competitions, workshops, news and results.
 *
 * This page guard is a CONVENIENCE, not the security boundary. It stops a
 * non-Dance user from reaching the UI at all, but the real control is the
 * server-side role check inside /api/dance-events, which runs before any
 * upstream fetch and returns 401/403. Even if this redirect were bypassed, no
 * event data would be returned.
 *
 * The redirect target preserves the signed-in user: a non-Dance user is signed
 * in and simply lacks the discipline, so bouncing them to /login would be wrong
 * and confusing.
 */
export default async function DanceEventsPage() {
  const access = await checkDanceAccess();

  if (!access.allowed) {
    redirect('/');
  }

  // Rendered only after the server has confirmed access, so the feed component
  // never mounts for a denied user and never fires a request.

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Dance community"
        title="Dance Events & News"
        description="Competitions, workshops, results and official news, pulled directly from the publishers themselves. Every item links to its official source."
      />

      <DanceEventsFeed />
    </div>
  );
}
