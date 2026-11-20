/**
 * T-Shirt Customizer — design schema.
 *
 * A `TeeDesign` is the complete, serializable snapshot of one customizer
 * session. It is deliberately plain JSON: no DOM nodes, no File objects and no
 * Supabase-specific fields. That keeps save, export, share and import on one
 * shape, and makes the schema safe to store in a JSONB column.
 */

export const TEE_VIEWS = ['front', 'back'] as const;
export type TeeView = (typeof TEE_VIEWS)[number];

export const TEE_FITS = ['boxy', 'oversized', 'regular'] as const;
export type TeeFit = (typeof TEE_FITS)[number];

export const TEE_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const;
export type TeeSize = (typeof TEE_SIZES)[number];

export const TEE_PATTERNS = [
  'none',
  'flame',
  'tribal',
  'racing',
  'swoosh',
  'geometric',
  'minimal',
  'side-panels',
  'gradient',
  'lightning',
  'custom',
] as const;
export type TeePattern = (typeof TEE_PATTERNS)[number];

export const TEE_PATTERN_REGIONS = ['all', 'body', 'sleeves'] as const;
export type TeePatternRegion = (typeof TEE_PATTERN_REGIONS)[number];

export const TEE_TEXT_SURFACES = ['front', 'back'] as const;
export type TeeTextSurface = (typeof TEE_TEXT_SURFACES)[number];
export type TeeTextAlign = 'left' | 'center' | 'right';

export const TEE_BACKGROUNDS = [
  'transparent',
  'black',
  'charcoal',
  'light-grey',
  'white',
  'concrete',
  'dark-gradient',
  'custom',
] as const;
export type TeeBackgroundId = (typeof TEE_BACKGROUNDS)[number];

export interface TeeBranding {
  /** Small emblem on the wearer's left chest (viewer's right). */
  emblem: boolean;
  /** Full-width tribal wordmark across the chest. */
  wordmark: boolean;
  /** Woven streetwear patch near the lower hem. */
  patch: boolean;
  /** Large wordmark across the upper back. */
  backGraphic: boolean;
  /** Woven inner-collar label: mini emblem + brand lines. */
  neckLabel: boolean;
  /** Size line on the inner-collar label. */
  neckLabelSize: boolean;
  /** Brand text printed on the inner-collar label. */
  neckLabelText: string;
  /** Cardboard hang tag at the side neckline. */
  hangTag: boolean;
  /** Main text printed on the cardboard hang tag. */
  hangTagText: string;
}

export interface TeeBackgroundEffects {
  spotlight: boolean;
  glow: boolean;
  vignette: boolean;
  floorShadow: boolean;
  studioLight: boolean;
}

export interface TeePresentation {
  background: TeeBackgroundId;
  /** Hex color used when background is 'custom'. */
  customBackground: string;
  effects: TeeBackgroundEffects;
}

export const TEE_ZONES = ['body', 'sleeves', 'collar', 'panels', 'accents'] as const;
export type TeeZone = (typeof TEE_ZONES)[number];

export type GradientType = 'linear' | 'radial';

export type BadgePlacement = 'chest-left' | 'chest-center';

/** Colors for the five independently editable zones of the shirt. */
export interface TeeZones {
  body: string;
  sleeves: string;
  collar: string;
  panels: string;
  accents: string;
}

export interface TeeGradient {
  enabled: boolean;
  type: GradientType;
  from: string;
  to: string;
  /** Degrees. Only used by linear gradients. */
  angle: number;
}

export interface TeeGradients {
  body: TeeGradient;
  sleeves: TeeGradient;
  collar: TeeGradient;
  panels: TeeGradient;
  accents: TeeGradient;
}

/** One wordmark / chest text. The array is kept for future multi-text designs. */
export interface TeeText {
  id: string;
  placement: 'chest';
  /** Which garment surface carries the print. Placement presets rely on this. */
  surface: TeeTextSurface;
  /** Single- or multi-line copy. Newlines are preserved by the sanitizer. */
  text: string;
  font: string;
  /** Font weight override (100–1000). */
  weight: number;
  color: string;
  /** Font size in SVG viewBox units (the shirt canvas is 1536 x 1024). */
  size: number;
  /** Horizontal position, 0–100 of the printable garment area. */
  x: number;
  /** Vertical position, 0–100 of the printable garment area. */
  y: number;
  letterSpacing: number;
  lineHeight: number;
  italic: boolean;
  /** Horizontal anchoring of the glyphs within the text box. */
  align: TeeTextAlign;
  /** 0–1, applied over the printable area. */
  opacity: number;
  /** Degrees. */
  rotation: number;
  visible: boolean;
  /** Locked layers cannot be dragged, edited or deleted on the canvas. */
  locked: boolean;
}

export interface TeeBadge {
  enabled: boolean;
  placement: BadgePlacement;
  text: string;
  color: string;
}

export interface TeeBackPrint {
  visible: boolean;
  name: string;
  number: string;
  font: string;
  color: string;
  size: number;
}

/**
 * A user-imported raster/SVG image, embedded as a data URL so the design
 * remains self-contained when exported to JSON.
 *
 * `x` and `y` are the image centre as fractions of the 1536 x 1024 canvas.
 * `width` and `height` are fractions of the viewBox width/height respectively.
 */
export interface TeeImage {
  id: string;
  name: string;
  src: string;
  mimeType: string;
  bytes: number;
  view: TeeView;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  flipX: boolean;
  /** Higher values render on top. */
  z: number;
  /** Locked objects cannot be moved, resized, rotated or deleted. */
  locked: boolean;
  /** Hidden objects stay in the document but render nowhere. */
  hidden: boolean;
}

export interface TeeDesign {
  schemaVersion: 1;
  id: string;
  userId: string | null;
  name: string;
  baseModel: 'groove-tee-v1';
  view: TeeView;
  fit: TeeFit;
  size: TeeSize;
  zones: TeeZones;
  pattern: TeePattern;
  /** Horizontal/vertical pattern placement offset, in viewBox-fraction units. */
  patternOffset: { x: number; y: number };
  /** Uniform scale of the pattern artwork (1 = authored size). */
  patternScale: number;
  /** 0–1 opacity of the whole pattern layer. */
  patternOpacity: number;
  /** Degrees; rotates the pattern around the garment centre. */
  patternRotation: number;
  /** Which garment regions the pattern is allowed to cover. */
  patternRegion: TeePatternRegion;
  /** Independent visibility of the pattern artwork layer. */
  patternVisible: boolean;
  branding: TeeBranding;
  presentation: TeePresentation;
  gradients: TeeGradients;
  texts: TeeText[];
  badge: TeeBadge;
  back: TeeBackPrint;
  images: TeeImage[];
  createdAt: string;
  updatedAt: string;
}

export interface TeeFont {
  key: string;
  label: string;
  family: string;
  weight: number;
  style?: 'normal' | 'italic';
  tracking?: string;
}

export interface TeeColorway {
  id: string;
  label: string;
  description: string;
  zones: TeeZones;
  gradient: TeeGradient;
}

export interface TeePatternMeta {
  id: TeePattern;
  label: string;
  description: string;
  /** Garment zone(s) the artwork is designed around. */
  area: string;
}

export interface TeeBackgroundMeta {
  id: TeeBackgroundId;
  label: string;
  description: string;
}

export interface TeeSizeChartRow {
  size: TeeSize;
  chest: string;
  length: string;
  sleeve: string;
}
