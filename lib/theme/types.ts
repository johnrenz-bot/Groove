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

export const GLOBAL_THEMES: GlobalTheme[] = [
  {
    id: 'dark',
    name: 'Dark Mode',
    category: 'core',
    description: 'The signature Groove PH dark appearance with obsidian layered surfaces and Groove Gold accents.',
    colorScheme: 'dark',
    swatches: {
      bg: '#0B0D10',
      surface: '#0F1216',
      card: '#111519',
      border: '#232830',
      text: '#EDEFF3',
      mutedText: '#9BA3AE',
      accent: '#E8A93B',
      accentSoft: 'rgba(232, 169, 59, 0.12)',
    },
    features: ['High-contrast dark obsidian layers', 'Groove Gold brand accents', 'Optimized for low-light coaching'],
  },
  {
    id: 'light',
    name: 'Light Mode',
    category: 'core',
    description: 'Clean, crisp neutral white surfaces with refined slate typography and Groove Gold highlights.',
    colorScheme: 'light',
    swatches: {
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      mutedText: '#64748B',
      accent: '#E8A93B',
      accentSoft: '#FFFBEB',
    },
    features: ['Minimalist crisp white surfaces', 'High-readability slate text', 'Warm amber navigation'],
  },
  {
    id: 'classic',
    name: 'Classic (Claude-Inspired)',
    category: 'core',
    description: 'Warm off-white ivory background, cream card surfaces, subtle beige borders, and restrained burnt-orange rust accents.',
    colorScheme: 'light',
    swatches: {
      bg: '#F7F4EF',
      surface: '#F0EBE4',
      card: '#F0EBE4',
      border: '#E5DDD2',
      text: '#242321',
      mutedText: '#827A72',
      accent: '#A94F12',
      accentSoft: 'rgba(169, 79, 18, 0.10)',
    },
    features: ['Warm ivory (#F7F4EF) & cream (#F0EBE4)', 'Subtle beige borders (#E5DDD2)', 'Restrained burnt-orange rust (#A94F12)'],
  },
  {
    id: 'halloween',
    name: 'Halloween (Spooky Night)',
    category: 'seasonal',
    description: 'Spooky midnight obsidian and violet slate surfaces with glowing pumpkin orange highlights and festive details.',
    colorScheme: 'dark',
    seasonalBadge: '🎃 Seasonal Event',
    activeSeason: 'October – November',
    seasonalTagline: 'Spooky Night & Glowing Pumpkin',
    swatches: {
      bg: '#0C0A12',
      surface: '#13101C',
      card: '#171322',
      border: '#2C243E',
      text: '#F4F0FB',
      mutedText: '#A39BB5',
      accent: '#FF7A18',
      accentSoft: 'rgba(255, 122, 24, 0.14)',
    },
    features: ['Midnight obsidian & violet slate', 'Glowing pumpkin orange (#FF7A18)', 'Seasonal holiday atmosphere'],
  },
  {
    id: 'christmas',
    name: 'Christmas (Nordic Pine)',
    category: 'seasonal',
    description: 'Nordic winter pine night surfaces with crisp snow highlights, holiday crimson accents, and festive warmth.',
    colorScheme: 'dark',
    seasonalBadge: '🎄 Holiday Season',
    activeSeason: 'December – January',
    seasonalTagline: 'Nordic Pine & Holiday Crimson',
    swatches: {
      bg: '#0A1310',
      surface: '#0F1D18',
      card: '#13251F',
      border: '#234538',
      text: '#F0FDF4',
      mutedText: '#94B5A5',
      accent: '#E53935',
      accentSoft: 'rgba(229, 57, 53, 0.15)',
    },
    features: ['Evergreen Nordic pine surfaces', 'Holiday crimson red (#E53935)', 'Festive winter seasonal details'],
  },
];
