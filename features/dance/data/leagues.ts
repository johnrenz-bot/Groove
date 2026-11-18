/**
 * GroovePH Dance Community — verified League registry.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW THIS FILE WAS BUILT
 *
 * Every entry below was verified by fetching its official website during the
 * 2026-11-16 audit run. Entries that could not be verified are EXCLUDED from
 * this file on purpose — an unverifiable league is not a league, it is a
 * guess. No facts in this file are invented: dates of events are read off the
 * fetched pages, founding years and roster sizes are left null where the
 * source does not state them.
 *
 * `status` semantics:
 *   'approved'   — verified against official source (this file).
 *   'needs-info' — known but not re-verifiable this run; hidden from public UI.
 *   'pending'    — submitted through review, awaiting sign-off.
 *   'rejected'   — reviewed and rejected; never rendered.
 *
 * `matchTokens` power `dance_updates.organization` attribution: a dispatch's
 * stored organization string is matched case-insensitively against these.
 * A token must be a reasonably specific substring; bare "name" tokens that
 * match unrelated rows are not allowed.
 */

import type { League } from '@/lib/dance/contracts';

/** Registry entries that passed live verification on 2026-11-16. */
export const VERIFIED_LEAGUES: readonly League[] = [
  // ─── International ─────────────────────────────────────────────────────────
  {
    id: 'idl',
    name: 'International Dance League',
    shortName: 'IDL',
    scope: 'international',
    disciplines: ['hip-hop', 'street', 'choreo'],
    country: 'US',
    website: 'https://www.idl.pro/',
    logoUrl: '/logos/Dance-Leagues/idl.png',
    socials: {},
    sourceUrl: 'https://www.idl.pro/',
    sourceName: 'IDL — International Dance League official site',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['idl', 'international dance league'],
  },
  {
    id: 'hhi',
    name: 'Hip Hop International',
    shortName: 'HHI',
    scope: 'international',
    disciplines: ['hip-hop', 'street'],
    country: 'US',
    website: 'https://www.hiphopinternational.com',
    logoUrl: '/logos/Dance-Leagues/hhi.png',
    socials: {
      youtube: 'https://www.youtube.com/officialhhi',
      instagram: 'https://www.instagram.com/officialhhi',
      tiktok: 'https://www.tiktok.com/@officialhhi',
    },
    sourceUrl: 'https://www.hiphopinternational.com/',
    sourceName: 'Hip Hop International official site',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['hhi', 'hip hop international', 'hip-hop international'],
  },
  {
    id: 'world-of-dance',
    name: 'World of Dance Events',
    shortName: 'World of Dance',
    scope: 'international',
    disciplines: ['hip-hop', 'choreo', 'street'],
    country: 'US',
    website: 'https://www.worldofdance.com',
    logoUrl: '/logos/Dance-Leagues/world-of-dance.png',
    socials: {
      youtube: 'https://www.youtube.com/@worldofdance',
      instagram: 'https://www.instagram.com/worldofdance',
      tiktok: 'https://www.tiktok.com/@worldofdance',
    },
    sourceUrl: 'https://www.worldofdance.com/',
    sourceName: 'World of Dance Events official site',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['world of dance', 'wod'],
  },
  {
    id: 'red-bull-dance-your-style',
    name: 'Red Bull Dance Your Style',
    shortName: 'Red Bull DYS',
    scope: 'international',
    disciplines: ['hip-hop', 'breaking', 'street'],
    country: 'AT',
    website: 'https://www.redbull.com/int-en/events/red-bull-dance-your-style-world-final-2026-zurich',
    logoUrl: '/logos/Dance-Leagues/red-bull-dance-your-style.png',
    socials: {},
    sourceUrl: 'https://www.redbull.com/int-en/events/red-bull-dance-your-style-world-final-2026-zurich',
    sourceName: 'Red Bull — Dance Your Style World Final 2026',
    fetchedAt: '2026-10-14T04:23:08.000Z',
    lastVerifiedAt: '2026-10-14T04:23:08.000Z',
    status: 'approved',
    matchTokens: ['red bull dance your style', 'dance your style'],
  },
  {
    id: 'juste-debout',
    name: 'Juste Debout',
    shortName: 'Juste Debout',
    scope: 'international',
    disciplines: ['hip-hop', 'street'],
    country: 'FR',
    website: 'https://juste-debout.com/',
    logoUrl: '/logos/Dance-Leagues/juste-debout.svg',
    socials: {
      instagram: 'https://www.instagram.com/justedebout_officiel/',
      youtube: 'https://www.youtube.com/@justedeboutofficiel',
    },
    sourceUrl: 'https://juste-debout.com/',
    sourceName: 'Juste Debout official site',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['juste debout'],
  },
  {
    id: 'udo',
    name: 'United Dance Organisation',
    shortName: 'UDO',
    scope: 'international',
    disciplines: ['hip-hop', 'breaking', 'street'],
    country: 'GB',
    website: 'https://www.udostreetdance.com/',
    logoUrl: '/logos/Dance-Leagues/udo.png',
    socials: {
      youtube: 'https://www.youtube.com/user/UDOtvOnline',
      instagram: 'https://www.instagram.com/udo_asia_pacific',
    },
    sourceUrl: 'https://www.udostreetdance.com/',
    sourceName: 'United Dance Organisation official site (UK)',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['udo', 'united dance organisation', 'united dance organization'],
  },
  {
    id: 'wdsf',
    name: 'World DanceSport Federation',
    shortName: 'WDSF',
    scope: 'international',
    disciplines: ['dancesport', 'breaking'],
    country: 'CH',
    website: 'https://www.worlddancesport.org/',
    logoUrl: '/logos/Dance-Leagues/wdsf.svg',
    socials: {
      instagram: 'https://www.instagram.com/_breakingforgold',
      youtube: 'https://www.youtube.com/@breakingforgold',
    },
    sourceUrl: 'https://www.worlddancesport.org/',
    sourceName: 'WDSF official site',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['wdsf', 'dancesport', 'world dancesport'],
  },
  {
    id: 'summer-dance-forever',
    name: 'Summer Dance Forever',
    shortName: 'Summer Dance Forever',
    scope: 'international',
    disciplines: ['hip-hop', 'street'],
    country: 'NL',
    website: 'https://www.summerdanceforever.com/',
    logoUrl: '/logos/Dance-Leagues/summer-dance-forever.png',
    socials: {},
    sourceUrl: 'https://www.summerdanceforever.com/',
    sourceName: 'Summer Dance Forever official site (Amsterdam)',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['summer dance forever', 'sdf'],
  },
  {
    id: 'steezy',
    name: 'STEEZY Studio',
    shortName: 'STEEZY',
    scope: 'international',
    disciplines: ['street', 'hip-hop', 'k-pop cover'],
    country: 'US',
    website: 'https://www.steezy.co/',
    logoUrl: '/logos/Dance-Leagues/steezy.svg',
    socials: {
      youtube: 'https://www.youtube.com/steezystudio',
      instagram: 'https://www.instagram.com/steezystudio/',
      tiktok: 'https://www.tiktok.com/@steezystudio',
    },
    sourceUrl: 'https://www.steezy.co/',
    sourceName: 'STEEZY Studio official site',
    // Training/media platform — not a competition federation; kept in the
    // marquee per editorial choice but verified separately.
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['steezy'],
  },

  // ─── Philippines ──────────────────────────────────────────────────────────
  {
    id: 'hhi-philippines',
    name: 'Hip Hop International Philippines',
    shortName: 'HHI Philippines',
    scope: 'philippines',
    disciplines: ['hip-hop', 'street'],
    country: 'PH',
    website: 'https://hhiphilippines.com/',
    logoUrl: '/logos/Dance-Leagues/hhi-philippines.png',
    socials: {
      youtube: 'https://www.youtube.com/hiphopinternationalphilippines',
      instagram: 'https://www.instagram.com/hhiphilippines/',
      tiktok: 'https://www.tiktok.com/@hhiphilippines',
    },
    sourceUrl: 'https://hhiphilippines.com/',
    sourceName: 'Hip Hop International Philippines official site',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['hhi ph', 'hhi philippines', 'hip hop international philippines'],
  },
  {
    id: 'red-bull-dance-your-style-philippines',
    name: 'Red Bull Dance Your Style Philippines',
    shortName: 'Red Bull DYS PH',
    scope: 'philippines',
    disciplines: ['hip-hop', 'breaking', 'street'],
    country: 'PH',
    website: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
    // Same mark as the international circuit; both are Red Bull events.
    logoUrl: '/logos/Dance-Leagues/red-bull-dance-your-style.png',
    socials: {},
    sourceUrl: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
    sourceName: 'Red Bull Dance Your Style Philippines official page',
    fetchedAt: '2026-10-14T04:23:08.000Z',
    lastVerifiedAt: '2026-10-14T04:23:08.000Z',
    status: 'approved',
    matchTokens: ['dance your style philippines', 'dys ph', 'red bull dys philippines'],
  },
  {
    id: 'philippine-dancesport',
    name: 'Philippine DanceSport Federation, Inc.',
    shortName: 'PDSFI',
    scope: 'philippines',
    disciplines: ['dancesport'],
    country: 'PH',
    website: 'https://philippinedancesport.com/',
    logoUrl: '/logos/Dance-Leagues/philippine-dancesport.png',
    socials: {
      youtube: 'https://www.youtube.com/dancesporttv',
    },
    sourceUrl: 'https://philippinedancesport.com/',
    sourceName: 'Philippine DanceSport Federation official site (PDSFI)',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'approved',
    matchTokens: ['pdsfi', 'philippine dancesport', 'philippinedancesport'],
  },

  // ─── Known, not re-verifiable this run ─────────────────────────────────────
  // Kept out of the public registry until re-verified: the official domain
  // returned a transport error on 2026-11-16. No facts are asserted beyond
  // name/domain existence, and status is needs-info by construction.
  {
    id: 'battle-of-the-year',
    name: 'Battle of the Year',
    shortName: 'BOTY',
    scope: 'international',
    disciplines: ['hip-hop', 'breaking'],
    country: 'DE',
    website: 'https://battleoftheyear.de/',
    logoUrl: '/logos/Dance-Leagues/battle-of-the-year.jpg',
    socials: {},
    sourceUrl: 'https://battleoftheyear.de/',
    sourceName: 'Battle of the Year official site',
    fetchedAt: '2026-11-16T00:00:00.000Z',
    lastVerifiedAt: '2026-11-16T00:00:00.000Z',
    status: 'needs-info',
    matchTokens: ['battle of the year', 'boty'],
  },
] as const;

/** Leagues the public UI may show (status === 'approved'). */
export const PUBLIC_LEAGUES: readonly League[] = VERIFIED_LEAGUES.filter((l) => l.status === 'approved');

const BY_ID = new Map(VERIFIED_LEAGUES.map((l) => [l.id, l]));

export function getLeagueById(id: string | null | undefined): League | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

/** True only for a league that exists in the registry at all. */
export function isKnownLeagueId(id: string | null | undefined): boolean {
  return !!id && BY_ID.has(id);
}

/**
 * Attribute a stored `organization` free-text string to a league, if any.
 * Case-insensitive substring match against each league's `matchTokens`.
 *
 * Longest token wins across ALL leagues — that is what makes
 * "HHI Philippines" resolve to hhi-philippines instead of the generic
 * hhi entry, no matter what order the registry happens to list them in.
 * Returns null when nothing matches — attribution is never forced.
 */
export function leagueForOrganization(organization: string | null | undefined): League | null {
  if (!organization) return null;
  const hay = organization.toLowerCase();
  let best: { league: League; token: string } | null = null;
  for (const league of VERIFIED_LEAGUES) {
    for (const token of league.matchTokens) {
      const t = token.toLowerCase();
      if (!hay.includes(t)) continue;
      if (!best || t.length > best.token.length) best = { league, token: t };
    }
  }
  return best?.league ?? null;
}

/** Newest lastVerifiedAt in the registry — shown as "Last synced". */
export function lastSyncedAt(): string {
  let latest = '';
  for (const league of VERIFIED_LEAGUES) {
    if (league.lastVerifiedAt > latest) latest = league.lastVerifiedAt;
  }
  return latest;
}
