import HubRoute, { buildHubMetadata } from '@/features/performing-arts/components/HubRoute';

export const metadata = buildHubMetadata('client', 'Client');

/**
 * /client/performing-arts-philippines
 *
 * The performing-arts hub inside the client portal, sitting under the portal
 * header alongside Dashboard, Find Coaches, Appointments and Calendar.
 *
 * Auth and role are enforced by the Supabase middleware, which treats every
 * /client path as protected and bounces a coach to their own portal.
 */
export default function ClientPerformingArtsPage() {
  return <HubRoute role="client" />;
}