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
 * Every value below is the GroovePH premium-dark palette — carbon surfaces,
 * charcoal hairline borders and Groove Orange — recoloured per season. They do
 * not introduce a second hue family.
 */
export const GLOBAL_THEMES: GlobalTheme[] = [
  {
    id: 'dark',
    name: 'Dark Mode',
    category: 'core',
    description:
      'The signature GroovePH dark appearance: a carbon #111111 page, charcoal raised surfaces, and near-white text with Groove Orange carrying the primary action.',
    colorScheme: 'dark',
    swatches: {
      bg: '#111111',
      surface: '#151515',
      card: '#1E1E1E',
      border: '#383838',
      text: '#F5F5F5',
      mutedText: '#A3A3A3',
      accent: '#d6b36a',
      accentSoft: 'rgba(214, 179, 106, 0.14)',
    },
    features: ['Carbon page with charcoal surfaces', 'Near-white primary text at 15:1', 'Groove Orange controls with carbon ink'],
  },
  {
    id: 'light',
    name: 'Light Mode',
    category: 'core',
    description:
      'A warm Whitewashed Fence canvas with cream surfaces and deepened Groove Orange for every interactive element.',
    colorScheme: 'light',
    swatches: {
      bg: '#F7F0E1',
      surface: '#EFE6D2',
      card: '#FCF8EF',
      border: '#DDD1B8',
      text: '#353535',
      mutedText: '#6B6459',
      accent: '#d6b36a',
      accentSoft: 'rgba(214, 179, 106, 0.14)',
    },
    features: ['Whitewashed Fence canvas (#F7F0E1)', 'Groove Orange deepened for AA text', 'Warm one-pixel borders (#DDD1B8)'],
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
      accent: '#d6b36a',
      accentSoft: 'rgba(214, 179, 106, 0.14)',
    },
    features: ['Flatter cream page and card pairing', 'Same Groove Orange identity', 'Quieter dividers for long-form reading'],
  },
  {
    id: 'halloween',
    name: 'Halloween (Ember Night)',
    category: 'seasonal',
    description:
      'A cooler carbon night with a faintly tinted raised surface and Groove Orange carrying the festive highlight. Still unmistakably Groove PH.',
    colorScheme: 'dark',
    seasonalBadge: '🎃 Seasonal Event',
    activeSeason: 'October – November',
    seasonalTagline: 'Carbon Night & Ember Highlight',
    swatches: {
      bg: '#111111',
      surface: '#141310',
      card: '#1E1E1E',
      border: '#383838',
      text: '#F5F5F5',
      mutedText: '#A3A3A3',
      accent: '#d6b36a',
      accentSoft: 'rgba(214, 179, 106, 0.15)',
    },
    features: ['Carbon page with a cooler tinted surface', 'Groove Orange festive highlight', 'Carbon-ink controls unchanged from the default'],
  },
  {
    id: 'christmas',
    name: 'Christmas (Ember Night)',
    category: 'seasonal',
    description:
      'A warmed carbon night with the ember-orange accent carrying the holiday over the same monochrome interface.',
    colorScheme: 'dark',
    seasonalBadge: '🎄 Holiday Season',
    activeSeason: 'December – January',
    seasonalTagline: 'Carbon Night & Ember Highlight',
    swatches: {
      bg: '#111111',
      surface: '#161412',
      card: '#1E1E1E',
      border: '#383838',
      text: '#F5F5F5',
      mutedText: '#A3A3A3',
      accent: '#d6b36a',
      accentSoft: 'rgba(214, 179, 106, 0.15)',
    },
    features: ['Carbon page with a warmed tinted surface', 'Ember-orange holiday accent', 'Carbon-ink controls unchanged from the default'],
  },
];
