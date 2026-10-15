import type { Metadata } from 'next';
import { PerformingArtsHub } from '@/features/performing-arts/components/PerformingArtsHub';
import { CONTENT_LAST_VERIFIED } from '@/features/performing-arts/data/content';
import type { HubRole } from '@/features/performing-arts/data/editorial';

/**
 * Shared route body for the two portal copies of the performing-arts hub.
 *
 * One component serves /client/… and /coach/… so the two portals can never drift
 * apart in layout or content. The only thing that varies is `role`, which selects
 * the Groove feature links shown in the hero and the closing section — a client
 * is pointed at booking, a coach at their own bookings and showcase.
 *
 * `portal` only shapes the metadata. Access control is NOT here: the Supabase
 * middleware classifies every /client and /coach path as protected and redirects
 * an unauthenticated visitor to /login, and bounces a user into the portal that
 * matches their own role. Adding a guard here as well would be a second,
 * divergent copy of that rule.
 */
export function buildHubMetadata(role: HubRole, portal: 'Client' | 'Coach'): Metadata {
  const audience =
    role === 'coach'
      ? 'Teach with context: reference material for your coaching, clients and curriculum.'
      : 'Book with context: reference material for choosing a coach and understanding the disciplines.';

  const title = `Performing Arts Philippines | ${portal} Portal`;
  const description = `Filipino performing arts reference for the ${portal.toLowerCase()} portal — dance, music, theater, vocal performance, cultural heritage, artists, organizations, events and education. ${audience}`;

  return {
    title,
    description,
    alternates: { canonical: `/${role}/performing-arts-philippines` },
    openGraph: {
      type: 'website',
      title,
      description,
      locale: 'en_PH',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    other: {
      'content-verified': CONTENT_LAST_VERIFIED,
    },
  };
}

export default function HubRoute({ role }: { role: HubRole }) {
  return <PerformingArtsHub role={role} />;
}