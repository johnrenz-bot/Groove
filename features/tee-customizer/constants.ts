/**
 * T-Shirt Customizer — editable option catalogue.
 *
 * Everything a customer can choose lives here so adding a colorway, pattern or
 * font is a one-file change. See README.md for the checklist.
 */

import type {
  TeeBackgroundMeta,
  TeeColorway,
  TeeFont,
  TeePatternMeta,
  TeeSizeChartRow,
  TeeZones,
} from './types.ts';

// Re-exported so UI panels can import the catalogue and the enums from one place.
export { TEE_FITS, TEE_SIZES } from './types.ts';

export const DEFAULT_DESIGN_NAME = 'Untitled tee';

export const MAX_TEE_IMAGES = 12;
export const MAX_DESIGN_TEXT_LENGTH = 80;
export const MAX_BACK_NAME_LENGTH = 14;
export const MAX_BACK_NUMBER_LENGTH = 2;
export const MAX_BADGE_TEXT_LENGTH = 4;

/** 5 MB — the same ceiling as the rest of the platform's uploads. */
export const MAX_TEE_IMAGE_BYTES = 5 * 1024 * 1024;

/** Guards against a malicious or accidentally huge .json import. */
export const MAX_DESIGN_JSON_BYTES = 14 * 1024 * 1024;

export const TEE_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'] as const;

export const TEE_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
] as const;

export const TEE_IMAGE_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.svg,.gif,image/png,image/jpeg,image/webp,image/svg+xml,image/gif';

export const TEE_FONTS: TeeFont[] = [
  {
    key: 'impact',
    label: 'Impact',
    family: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
    weight: 400,
    tracking: '0.02em',
  },
  {
    key: 'black',
    label: 'Arial Black',
    family: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
    weight: 900,
    tracking: '-0.03em',
  },
  {
    key: 'grotesk',
    label: 'Grotesk',
    family: 'Inter, ui-sans-serif, system-ui, sans-serif',
    weight: 900,
    tracking: '-0.05em',
  },
  {
    key: 'varsity',
    label: 'Varsity',
    family: "'Trebuchet MS', 'Arial Narrow', sans-serif",
    weight: 800,
    tracking: '0.04em',
  },
  {
    key: 'serif',
    label: 'Serif',
    family: "'Source Serif 4', Georgia, serif",
    weight: 700,
    style: 'italic',
    tracking: '-0.02em',
  },
  {
    key: 'wide',
    label: 'Wide',
    family: 'Verdana, Geneva, sans-serif',
    weight: 700,
    tracking: '0.08em',
  },
];

export const DEFAULT_FONT_KEY = 'impact';

export function getFont(key: string): TeeFont {
  return TEE_FONTS.find((font) => font.key === key) ?? TEE_FONTS[0];
}

const CORE_WHITE_ZONES: TeeZones = {
  body: '#FBFBFB',
  sleeves: '#FBFBFB',
  collar: '#FBFBFB',
  panels: '#EDEDED',
  accents: '#1F2937',
};

const CRIMSON_ZONES: TeeZones = {
  body: '#3B0A12',
  sleeves: '#120A0B',
  collar: '#120A0B',
  panels: '#B21E2A',
  accents: '#F3E8D7',
};

const NAVY_ZONES: TeeZones = {
  body: '#101A33',
  sleeves: '#0A1020',
  collar: '#0A1020',
  panels: '#2F6FB2',
  accents: '#D9E8F5',
};

const CREAM_ZONES: TeeZones = {
  body: '#E8DCC0',
  sleeves: '#173A2C',
  collar: '#173A2C',
  panels: '#2F6B4F',
  accents: '#F4EBD3',
};

const RED_WHITE_ZONES: TeeZones = {
  body: '#B51424',
  sleeves: '#F2ECE3',
  collar: '#F2ECE3',
  panels: '#7C0B16',
  accents: '#F2ECE3',
};

const BLACKOUT_ZONES: TeeZones = {
  body: '#0C0C0C',
  sleeves: '#191919',
  collar: '#191919',
  panels: '#2A2A2A',
  accents: '#d6b36a',
};

const ELECTRIC_ZONES: TeeZones = {
  body: '#0B0B14',
  sleeves: '#15152A',
  collar: '#0B0B14',
  panels: '#4B2BFF',
  accents: '#5CE1E6',
};

const SKY_ZONES: TeeZones = {
  body: '#F0F4F8',
  sleeves: '#1F4E8C',
  collar: '#1F4E8C',
  panels: '#8FB9E8',
  accents: '#10243F',
};

/**
 * Ready-made colorways. The gradient values are used by the Gradient Fade
 * pattern and by the panel gradient control; toggling gradients off exposes the
 * flat zone colors beside them.
 */
export const TEE_COLORWAYS: TeeColorway[] = [
  {
    id: 'core-white',
    label: 'Core White',
    description: 'The photographic blank — natural white cotton, dark prints.',
    zones: CORE_WHITE_ZONES,
    gradient: { enabled: false, type: 'linear', from: '#FFFFFF', to: '#EDEDED', angle: 160 },
  },
  {
    id: 'crimson',
    label: 'Crimson / Black',
    description: 'Deep maroon into black with a cream wordmark.',
    zones: CRIMSON_ZONES,
    gradient: { enabled: true, type: 'linear', from: '#4A0A14', to: '#0C0708', angle: 155 },
  },
  {
    id: 'navy',
    label: 'Navy / Sky',
    description: 'Midnight navy with a cold sky-blue panel.',
    zones: NAVY_ZONES,
    gradient: { enabled: true, type: 'linear', from: '#203B6E', to: '#080D1C', angle: 145 },
  },
  {
    id: 'cream',
    label: 'Cream / Green',
    description: 'Warm cream body with forest panels.',
    zones: CREAM_ZONES,
    gradient: { enabled: true, type: 'linear', from: '#F4EBD3', to: '#CDBB93', angle: 160 },
  },
  {
    id: 'red-white',
    label: 'Red / White',
    description: 'Competition red, white sleeves and trim.',
    zones: RED_WHITE_ZONES,
    gradient: { enabled: true, type: 'linear', from: '#D42030', to: '#7C0B16', angle: 150 },
  },
  {
    id: 'blackout',
    label: 'Blackout / Gold',
    description: 'Near-black body with a restrained gold accent.',
    zones: BLACKOUT_ZONES,
    gradient: { enabled: true, type: 'linear', from: '#1D1D1D', to: '#060606', angle: 165 },
  },
  {
    id: 'electric',
    label: 'Electric',
    description: 'Deep ink with an electric violet and cyan flash.',
    zones: ELECTRIC_ZONES,
    gradient: { enabled: true, type: 'linear', from: '#1B1450', to: '#07070F', angle: 135 },
  },
  {
    id: 'sky',
    label: 'Ice / Navy',
    description: 'Pale ice body with navy sleeves and a blue panel.',
    zones: SKY_ZONES,
    gradient: { enabled: true, type: 'linear', from: '#FFFFFF', to: '#D7E5F2', angle: 160 },
  },
];

export const DEFAULT_COLORWAY_ID = 'core-white';

export function getColorway(id: string): TeeColorway {
  return TEE_COLORWAYS.find((colorway) => colorway.id === id) ?? TEE_COLORWAYS[0];
}

export const TEE_PATTERNS: TeePatternMeta[] = [
  {
    id: 'none',
    label: 'None / Clean',
    description: 'Clean canvas — no panel artwork printed.',
    area: 'Full garment',
  },
  {
    id: 'flame',
    label: 'Inferno Flame',
    description: 'Layered twin flames rising from the hem with sleeve slashes.',
    area: 'Lower body · Sleeves',
  },
  {
    id: 'tribal',
    label: 'Apex Tribal',
    description: 'Symmetric claw slashes cutting in from the side panels.',
    area: 'Side body panels',
  },
  {
    id: 'racing',
    label: 'Racing Stripes',
    description: 'Diagonal triple racing stripes with pinstripe edges.',
    area: 'Side panels · Sleeves',
  },
  {
    id: 'swoosh',
    label: 'Velocity',
    description: 'Broad mirrored wing arcs sweeping hem to sleeve.',
    area: 'Full body',
  },
  {
    id: 'geometric',
    label: 'Geometric Panels',
    description: 'Ordered halftone arc rising from below the hem.',
    area: 'Chest · Shoulder',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Tone-on-tone seam pinstripes with a sleeve tick.',
    area: 'Side seams · Cuffs',
  },
  {
    id: 'side-panels',
    label: 'Techwear',
    description: 'Contrast side-body panels from underarm to hem with piping.',
    area: 'Side body panels',
  },
  {
    id: 'gradient',
    label: 'Abstract Flow',
    description: 'Soft symmetric fade washing in from both side panels.',
    area: 'Side panels · Lower body',
  },
  {
    id: 'lightning',
    label: 'Lightning',
    description: 'Mirrored lightning bolts arcing from the side seams.',
    area: 'Body · Sleeves',
  },
  {
    id: 'custom',
    label: 'Custom Artwork',
    description: 'Repeat your imported artwork across the garment as a print.',
    area: 'Full garment',
  },
];

export const TEE_BACKGROUNDS: TeeBackgroundMeta[] = [
  {
    id: 'transparent',
    label: 'Transparent',
    description: 'Checkerboard alpha — exports stay genuinely transparent.',
  },
  {
    id: 'black',
    label: 'Pure Black',
    description: 'Clean gallery-black presentation.',
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    description: 'Premium apparel studio backdrop.',
  },
  {
    id: 'light-grey',
    label: 'Light Grey',
    description: 'Soft product-photography sweep.',
  },
  {
    id: 'white',
    label: 'White',
    description: 'Catalog-clean white cyclorama.',
  },
  {
    id: 'concrete',
    label: 'Concrete',
    description: 'Industrial streetwear concrete wall.',
  },
  {
    id: 'dark-gradient',
    label: 'Dark Gradient',
    description: 'Cinematic deep gradient falloff.',
  },
  {
    id: 'custom',
    label: 'Custom Color',
    description: 'Pick any studio backdrop color.',
  },
];

export const TEE_SIZE_CHART: TeeSizeChartRow[] = [
  { size: 'XS', chest: '34–36 in', length: '26 in', sleeve: '8.5 in' },
  { size: 'S', chest: '36–38 in', length: '27 in', sleeve: '9 in' },
  { size: 'M', chest: '39–41 in', length: '28 in', sleeve: '9.5 in' },
  { size: 'L', chest: '42–44 in', length: '29 in', sleeve: '10 in' },
  { size: 'XL', chest: '45–47 in', length: '30 in', sleeve: '10.5 in' },
  { size: '2XL', chest: '48–50 in', length: '31 in', sleeve: '11 in' },
  { size: '3XL', chest: '51–53 in', length: '32 in', sleeve: '11.5 in' },
];

export const TEE_FIT_COPY: Record<string, { label: string; description: string }> = {
  boxy: {
    label: 'Boxy',
    description: 'Straight body, dropped shoulder, square hem.',
  },
  oversized: {
    label: 'Oversized',
    description: 'Extra room through the chest and sleeve.',
  },
  regular: {
    label: 'Regular',
    description: 'A closer, classic tee silhouette.',
  },
};

/** Preset positions for an imported image, expressed as design fractions. */
export const IMAGE_PLACEMENTS = {
  'front-chest': { view: 'front' as const, x: 0.5, y: 0.4, width: 0.3 },
  'front-left-sleeve': { view: 'front' as const, x: 0.185, y: 0.4, width: 0.15 },
  'front-right-sleeve': { view: 'front' as const, x: 0.815, y: 0.4, width: 0.15 },
  'back-chest': { view: 'back' as const, x: 0.5, y: 0.33, width: 0.34 },
} as const;

export type ImagePlacementKey = keyof typeof IMAGE_PLACEMENTS;

/**
 * Built-in Groove PH brand marks.
 *
 * These are the actual uploaded brand files under `public/image/Shirts/Logo/`,
 * used verbatim — never recoloured or redrawn. All three are dark artwork
 * intended for light garments and ship with genuine alpha transparency.
 * (Paths are percent-encoded; on-disk names contain spaces and a double dot.)
 */
export interface TeeLogo {
  id: string;
  label: string;
  src: string;
  /** width / height of the source artwork. */
  aspect: number;
  description: string;
  /** Default width as a fraction of the canvas when first added. */
  defaultWidth: number;
}

export const TEE_LOGOS: TeeLogo[] = [
  {
    id: 'logo-emblem',
    label: 'Groove emblem',
    src: '/image/Shirts/Logo/Logo.png',
    aspect: 1278 / 1230,
    description: 'Circular GROOVE emblem. Left-chest and neck placement.',
    defaultWidth: 0.19,
  },
  {
    id: 'logo-wordmark',
    label: 'Groove tribal wordmark',
    src: '/image/Shirts/Logo/Text%20Logo.png',
    aspect: 2172 / 724,
    description: 'Wide tribal GROOVE lettering. Full-width chest or back print.',
    defaultWidth: 0.34,
  },
  {
    id: 'logo-patch',
    label: 'Streetwear woven patch',
    src: '/image/Shirts/Logo/patch%20label..png',
    aspect: 1774 / 887,
    description: 'Black woven STREETWEAR patch — EST. 2026 trade mark.',
    defaultWidth: 0.17,
  },
];

/** Suggested Groove PH palette shown in the color picker popover. */
export const GROOVE_PALETTE = [
  { name: 'Black', value: '#0C0C0C' },
  { name: 'White', value: '#F5F5F5' },
  { name: 'Crimson', value: '#B21E2A' },
  { name: 'Deep Red', value: '#7C0B16' },
  { name: 'Gold', value: '#d6b36a' },
  { name: 'Silver', value: '#C0C0C8' },
  { name: 'Charcoal', value: '#23232A' },
] as const;

export const BRAND_EMBLEM_SRC = '/image/Shirts/Logo/Logo.png';
export const BRAND_WORDMARK_SRC = '/image/Shirts/Logo/Text%20Logo.png';
export const BRAND_PATCH_SRC = '/image/Shirts/Logo/patch%20label..png';
