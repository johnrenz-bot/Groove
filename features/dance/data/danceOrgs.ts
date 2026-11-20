/**
 * Local league logo assets and the carousel's org view.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH
 *
 * `VERIFIED_LEAGUES` (features/dance/data/leagues.ts) is the verified registry:
 * every entry carries sourceUrl/fetchedAt/status. This file DERIVES the
 * `DanceOrg[]` the carousel renders from it — it no longer keeps a second,
 * hand-maintained list. When a league's status is downgraded to needs-info it
 * disappears from the carousel automatically.
 */

import type { DanceOrg } from '@/lib/dance/types';
import type { League } from '@/lib/dance/contracts';
import { VERIFIED_LEAGUES, PUBLIC_LEAGUES, leagueForOrganization } from './leagues.ts';

/** Map a registry League to the DanceOrg shape the carousel renders. */
export function leagueToDanceOrg(league: League, index = 0): DanceOrg {
  return {
    id: league.id,
    name: league.name,
    slug: league.id,
    website_url: league.website,
    logo_url: league.logoUrl,
    logo_source_url: league.sourceUrl,
    logo_verified: league.status === 'approved',
    sort_order: index + 1,
    created_at: league.fetchedAt,
    updated_at: league.lastVerifiedAt,
  };
}

export const VERIFIED_DANCE_ORGS: DanceOrg[] = PUBLIC_LEAGUES.map((league, index) =>
  leagueToDanceOrg(league, index)
);

/**
 * Resolves verified authentic organization logo asset.
 *
 * Driven by the registry: the organization's text picks the league with the
 * longest matching token (so "HHI Philippines" wins over "HHI"), and the logo
 * shown is that league's verified mark. An organization that matches no
 * approved league returns an unverified placeholder — the UI renders a text
 * pill instead of a broken image.
 */
export function getOrgLogo(
  orgName: string,
  eventTitle?: string
): {
  logoUrl: string | null;
  isVerified: boolean;
  alt: string;
} {
  // Prefer the event title when it names a league explicitly — that is where
  // e.g. "HHI Philippines 2027" vs an international-HHI row gets decided.
  const fromTitle = leagueForOrganization(eventTitle);
  if (fromTitle && fromTitle.status === 'approved' && fromTitle.logoUrl) {
    return { logoUrl: fromTitle.logoUrl, isVerified: true, alt: `${fromTitle.name} logo` };
  }

  const fromOrg = leagueForOrganization(orgName);
  if (fromOrg && fromOrg.status === 'approved' && fromOrg.logoUrl) {
    return { logoUrl: fromOrg.logoUrl, isVerified: true, alt: `${fromOrg.name} logo` };
  }

  return {
    logoUrl: null,
    isVerified: false,
    alt: orgName,
  };
}

/** Kept for callers that need every registry entry, including needs-info. */
export { VERIFIED_LEAGUES };
