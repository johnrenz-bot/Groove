import HubRoute, { buildHubMetadata } from '@/features/performing-arts/components/HubRoute';

export const metadata = buildHubMetadata('coach', 'Coach');

/**
 * /coach/performing-arts-philippines
 *
 * The performing-arts hub inside the coach portal, sitting under the portal
 * header alongside Dashboard, Showcase, Bookings and Calendar.
 *
 * Auth and role are enforced by the Supabase middleware, which treats every
 * /coach path as protected and bounces a client to their own portal.
 */
export default function CoachPerformingArtsPage() {
  return <HubRoute role="coach" />;
}