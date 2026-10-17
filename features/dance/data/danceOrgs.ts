import type { DanceOrg } from '@/lib/dance/types';

/**
 * Verified Dance Leagues & Organizations data.
 * Purely local dataset adhering to GroovePH's no-Supabase / no-database requirement.
 *
 * Each verified organization points to its local asset in `/logos/` and official website.
 * Organizations with no verifiable logo have `logo_url: null` and `logo_verified: false`,
 * rendering an elegant text-pill fallback as specified.
 */
export const VERIFIED_DANCE_ORGS: DanceOrg[] = [
  {
    id: 'idl',
    name: 'IDL (International Dance League)',
    slug: 'idl',
    website_url: 'https://www.idl.pro/',
    logo_url: '/logos/idl.png',
    logo_source_url: 'https://www.idl.pro/',
    logo_verified: true,
    sort_order: 1,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'steezy',
    name: 'STEEZY Studio',
    slug: 'steezy',
    website_url: 'https://www.steezy.co/',
    logo_url: '/logos/steezy.svg',
    logo_source_url: 'https://www.steezy.co/',
    logo_verified: true,
    sort_order: 2,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'world-of-dance',
    name: 'World of Dance',
    slug: 'world-of-dance',
    website_url: 'https://www.worldofdance.com/',
    logo_url: '/logos/world-of-dance.png',
    logo_source_url: 'https://www.worldofdance.com/',
    logo_verified: true,
    sort_order: 3,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'hhi',
    name: 'Hip Hop International',
    slug: 'hhi',
    website_url: 'https://hiphopinternational.com/',
    logo_url: '/logos/hhi.png',
    logo_source_url: 'https://hiphopinternational.com/',
    logo_verified: true,
    sort_order: 4,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'red-bull-dance-your-style',
    name: 'Red Bull Dance Your Style',
    slug: 'red-bull-dance-your-style',
    website_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
    logo_url: '/logos/red-bull-dance-your-style.png',
    logo_source_url: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
    logo_verified: true,
    sort_order: 5,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'the-royal-family',
    name: 'The Royal Family',
    slug: 'the-royal-family',
    website_url: 'https://www.theroyalfamilydancecrew.com/',
    logo_url: '/logos/crews/RoyalFam/Logo.png',
    logo_source_url: 'https://www.theroyalfamilydancecrew.com/',
    logo_verified: true,
    sort_order: 6,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'udo',
    name: 'UDO (United Dance Organisation)',
    slug: 'udo',
    website_url: 'https://www.udostreetdance.com/',
    logo_url: '/logos/udo.png',
    logo_source_url: 'https://www.udostreetdance.com/',
    logo_verified: true,
    sort_order: 6,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'wdsf',
    name: 'WDSF (World DanceSport Federation)',
    slug: 'wdsf',
    website_url: 'https://www.worlddancesport.org/',
    logo_url: '/logos/wdsf.svg',
    logo_source_url: 'https://www.worlddancesport.org/',
    logo_verified: true,
    sort_order: 7,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'philippine-dancesport',
    name: 'Philippine DanceSport Federation',
    slug: 'philippine-dancesport',
    website_url: 'https://philippinedancesport.com/',
    logo_url: '/logos/philippine-dancesport.png',
    logo_source_url: 'https://philippinedancesport.com/',
    logo_verified: true,
    sort_order: 8,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'hhi-philippines',
    name: 'HHI Philippines',
    slug: 'hhi-philippines',
    website_url: 'https://hhiphilippines.com/',
    logo_url: '/logos/hhi-philippines.png',
    logo_source_url: 'https://hhiphilippines.com/',
    logo_verified: true,
    sort_order: 9,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'summer-dance-forever',
    name: 'Summer Dance Forever',
    slug: 'summer-dance-forever',
    website_url: 'https://www.summerdanceforever.com/',
    logo_url: '/logos/summer-dance-forever.png',
    logo_source_url: 'https://www.summerdanceforever.com/',
    logo_verified: true,
    sort_order: 10,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'juste-debout',
    name: 'Juste Debout',
    slug: 'juste-debout',
    website_url: 'https://juste-debout.com/',
    logo_url: '/logos/juste-debout.svg',
    logo_source_url: 'https://juste-debout.com/',
    logo_verified: true,
    sort_order: 11,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'battle-of-the-year',
    name: 'Battle of the Year',
    slug: 'battle-of-the-year',
    website_url: 'https://battleoftheyear.de/',
    logo_url: null,
    logo_source_url: null,
    logo_verified: false,
    sort_order: 12,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
];

/**
 * Resolves verified authentic organization logo asset.
 * Prioritizes event-specific marks (e.g. HHI Philippines vs international HHI).
 * Returns null if the organization cannot be verified with platform standards.
 */
export function getOrgLogo(
  orgName: string,
  eventTitle?: string
): {
  logoUrl: string | null;
  isVerified: boolean;
  alt: string;
} {
  const norm = (orgName || '').toLowerCase();
  const titleNorm = (eventTitle || '').toLowerCase();

  if (norm.includes('red bull')) {
    return {
      logoUrl: '/logos/red-bull-dance-your-style.png',
      isVerified: true,
      alt: 'Red Bull Dance Your Style logo',
    };
  }

  if (norm.includes('hhi') || norm.includes('hip hop international')) {
    if (
      norm.includes('philippines') ||
      titleNorm.includes('philippines') ||
      titleNorm.includes('manila')
    ) {
      return {
        logoUrl: '/logos/hhi-philippines.png',
        isVerified: true,
        alt: 'HHI Philippines Championships logo',
      };
    }
    return {
      logoUrl: '/logos/hhi.png',
      isVerified: true,
      alt: 'Hip Hop International logo',
    };
  }

  if (norm.includes('steezy')) {
    return {
      logoUrl: '/logos/steezy.svg',
      isVerified: true,
      alt: 'STEEZY Studio logo',
    };
  }

  if (norm.includes('world of dance') || norm.includes('wod')) {
    return {
      logoUrl: '/logos/world-of-dance.png',
      isVerified: true,
      alt: 'World of Dance logo',
    };
  }

  if (norm.includes('juste debout')) {
    return {
      logoUrl: '/logos/juste-debout.svg',
      isVerified: true,
      alt: 'Juste Debout logo',
    };
  }

  if (norm.includes('udo')) {
    return {
      logoUrl: '/logos/udo.png',
      isVerified: true,
      alt: 'UDO logo',
    };
  }

  if (norm.includes('idl') || norm.includes('international dance league')) {
    return {
      logoUrl: '/logos/idl.png',
      isVerified: true,
      alt: 'IDL logo',
    };
  }

  if (norm.includes('wdsf')) {
    return {
      logoUrl: '/logos/wdsf-white.svg',
      isVerified: true,
      alt: 'WDSF logo',
    };
  }

  if (norm.includes('philippine dancesport')) {
    return {
      logoUrl: '/logos/philippine-dancesport.png',
      isVerified: true,
      alt: 'Philippine DanceSport Federation logo',
    };
  }

  if (norm.includes('summer dance forever')) {
    return {
      logoUrl: '/logos/summer-dance-forever.png',
      isVerified: true,
      alt: 'Summer Dance Forever logo',
    };
  }

  return {
    logoUrl: null,
    isVerified: false,
    alt: orgName,
  };
}

