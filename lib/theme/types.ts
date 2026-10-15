export type GlobalThemeId = 'dark' | 'light' | 'classic' | 'halloween' | 'christmas';

export type GlobalThemeCategory = 'core' | 'seasonal';

export interface GlobalThemeSwatches {
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  mutedText: string;
  accent: string;
  accentSoft: string;
}

export interface GlobalTheme {
  id: GlobalThemeId;
  name: string;
  category: GlobalThemeCategory;
  description: string;
  colorScheme: 'dark' | 'light';
  swatches: GlobalThemeSwatches;
  seasonalBadge?: string;
  activeSeason?: string;
  seasonalTagline?: string;
  features: string[];
}

/**
 * The catalogue rendered by `/admin/theme`.
 *
 * This is presentation metadata only — the swatches drive the little preview
 * mockups in the admin cards, and the description/features strings drive the
 * copy under each card. It is deliberately NOT the source of truth for the
 * actual CSS: those live in `app/globals.css` under the matching selector. The
 * two must be kept in step, or a preview will show a palette the theme does not
 * actually paint.
 *
 * Every value below is one of the five GroovePH brand colors or a derived shade
 * of one. Seasonal themes recolour the Carbon foundation and swap which brand
 * color carries the accent — they do not introduce a sixth hue.
 */
export const GLOBAL_THEMES: GlobalTheme[] = [
  {
    id: 'dark',
    name: 'Dark Mode',
    category: 'core',
    description:
      'The signature Groove PH dark appearance: a pure black page, near-black raised surfaces, and cream text and controls.',
    colorScheme: 'dark',
    swatches: {
      bg: '#000000',
      surface: '#171717',
      card: '#171717',
      border: '#353535',
      text: '#F7F0E1',
      mutedText: '#A8A093',
      accent: '#F7F0E1',
      accentSoft: 'rgba(247, 240, 225, 0.10)',
    },
    features: ['Pure black page with near-black surfaces', 'Cream primary text at 15:1', 'Cream controls on black labels'],
  },
  {
    id: 'light',
    name: 'Light Mode',
    category: 'core',
    description:
      'A warm Whitewashed Fence canvas with cream surfaces and Slate for every interactive element.',
    colorScheme: 'light',
    swatches: {
      bg: '#F7F0E1',
      surface: '#EFE6D2',
      card: '#FCF8EF',
      border: '#DDD1B8',
      text: '#353535',
      mutedText: '#6B6459',
      accent: '#2F3A45',
      accentSoft: '#DDE2E6',
    },
    features: ['Whitewashed Fence canvas (#F7F0E1)', 'Slate at 10.9:1 for text and buttons', 'Warm one-pixel borders (#DDD1B8)'],
  },
  {
    id: 'classic',
    name: 'Classic (Editorial Warm)',
    category: 'core',
    description:
      'The same warm cream foundation, flattened: the page and its cards sit closer together, which reads more like a printed page.',
    colorScheme: 'light',
    swatches: {
      bg: '#F7F0E1',
      surface: '#EFE6D2',
      card: '#FAF5E9',
      border: '#DDD1B8',
      text: '#353535',
      mutedText: '#6B6459',
      accent: '#2F4E8C',
      accentSoft: 'rgba(47, 78, 140, 0.09)',
    },
    features: ['Flatter cream page and card pairing', 'Same Unity Blue identity', 'Quieter dividers for long-form reading'],
  },
  {
    id: 'halloween',
    name: 'Halloween (Sunburst Night)',
    category: 'seasonal',
    description:
      'A cooler black night with a charcoal-tinted raised surface and Sunburst Yellow carrying the festive highlight. Still unmistakably Groove PH.',
    colorScheme: 'dark',
    seasonalBadge: '🎃 Seasonal Event',
    activeSeason: 'October – November',
    seasonalTagline: 'Black Night & Sunburst Highlight',
    swatches: {
      bg: '#000000',
      surface: '#151517',
      card: '#151517',
      border: '#353535',
      text: '#F7F0E1',
      mutedText: '#A49C93',
      accent: '#F7F0E1',
      accentSoft: 'rgba(247, 240, 225, 0.10)',
    },
    features: ['Black page with a cooler charcoal surface', 'Sunburst Yellow festive highlight', 'Cream controls unchanged from the default'],
  },
  {
    id: 'christmas',
    name: 'Christmas (Relief Night)',
    category: 'seasonal',
    description:
      'A warmed black night with Relief Red carrying the holiday accent, over the same cream interface.',
    colorScheme: 'dark',
    seasonalBadge: '🎄 Holiday Season',
    activeSeason: 'December – January',
    seasonalTagline: 'Black Night & Relief Red',
    swatches: {
      bg: '#000000',
      surface: '#171614',
      card: '#171614',
      border: '#353535',
      text: '#F7F0E1',
      mutedText: '#AAA297',
      accent: '#F7F0E1',
      accentSoft: 'rgba(247, 240, 225, 0.10)',
    },
    features: ['Black page with a warmed near-black surface', 'Relief Red holiday accent', 'Cream controls unchanged from the default'],
  },
];
