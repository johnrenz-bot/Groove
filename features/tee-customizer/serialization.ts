/**
 * Pure design serialization and validation.
 *
 * This module deliberately has no browser or Supabase imports so it can be
 * imported by the server share page and by Node's test runner.
 */

import {
  MAX_BACK_NAME_LENGTH,
  MAX_BACK_NUMBER_LENGTH,
  MAX_BADGE_TEXT_LENGTH,
  MAX_DESIGN_TEXT_LENGTH,
  MAX_TEE_IMAGE_BYTES,
  MAX_TEE_IMAGES,
  TEE_IMAGE_MIME_TYPES,
} from './constants.ts';
import { createDefaultDesign, createDesignId } from './defaults.ts';
import { sanitizeSvgText } from './fileValidation.ts';
import {
  TEE_FITS,
  TEE_PATTERNS,
  TEE_PATTERN_REGIONS,
  TEE_SIZES,
  TEE_VIEWS,
  TEE_BACKGROUNDS,
  type BadgePlacement,
  type TeeBackgroundEffects,
  type TeeBranding,
  type TeeDesign,
  type TeeGradient,
  type TeeImage,
  type TeeText,
  type TeeTextAlign,
} from './types.ts';

export const DESIGN_SCHEMA_VERSION = 1;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const SAFE_IMAGE_SRC = /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml)(?:;[^,]*)?,/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class DesignValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DesignValidationError';
  }
}

export type DesignParseResult =
  | { ok: true; design: TeeDesign }
  | { ok: false; error: string };

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/**
 * Removes control characters and angle brackets, trims, and caps length.
 * SVG text is escaped by React, but this also keeps exported JSON readable and
 * prevents hidden markup from surviving a round trip.
 */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeNumberText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).replace(/\D/g, '').slice(0, maxLength);
}

/**
 * Multi-line variant of sanitizeText: keeps newlines (the text editor allows
 * soft line breaks), strips angle brackets and control characters, collapses
 * repeated spaces and trims, and caps the total length.
 */
export function sanitizeTextMultiline(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

export function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value.trim())
    ? value.trim().toLowerCase()
    : fallback;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeGradient(value: unknown, fallback: TeeGradient): TeeGradient {
  const raw = asRecord(value);
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
    type: raw.type === 'radial' ? 'radial' : 'linear',
    from: normalizeColor(raw.from, fallback.from),
    to: normalizeColor(raw.to, fallback.to),
    angle: clampNumber(raw.angle, fallback.angle, 0, 360),
  };
}

const TEXT_ALIGNS: readonly TeeTextAlign[] = ['left', 'center', 'right'];

function normalizeText(value: unknown, index: number, fallback: TeeText): TeeText {
  const raw = asRecord(value);
  return {
    id: sanitizeText(raw.id, 80) || `chest-text-${index}`,
    placement: 'chest',
    surface: pickEnum(raw.surface, TEE_VIEWS, fallback.surface ?? 'front'),
    text: sanitizeTextMultiline(raw.text, MAX_DESIGN_TEXT_LENGTH),
    font: sanitizeText(raw.font, 40) || fallback.font,
    weight: clampNumber(raw.weight, fallback.weight ?? 800, 100, 1000),
    color: normalizeColor(raw.color, fallback.color),
    size: clampNumber(raw.size, fallback.size, 10, 110),
    x: clampNumber(raw.x, fallback.x, 0, 100),
    y: clampNumber(raw.y, fallback.y, 0, 100),
    letterSpacing: clampNumber(raw.letterSpacing, fallback.letterSpacing, -4, 14),
    lineHeight: clampNumber(raw.lineHeight, fallback.lineHeight ?? 1.15, 0.8, 2),
    italic: typeof raw.italic === 'boolean' ? raw.italic : fallback.italic,
    align: pickEnum(raw.align, TEXT_ALIGNS, fallback.align ?? 'center'),
    opacity: clampNumber(raw.opacity, fallback.opacity ?? 1, 0, 1),
    rotation: clampNumber(raw.rotation, fallback.rotation ?? 0, -180, 180),
    visible: typeof raw.visible === 'boolean' ? raw.visible : fallback.visible,
    locked: typeof raw.locked === 'boolean' ? raw.locked : (fallback.locked ?? false),
  };
}

function normalizeBadge(value: unknown, fallback: TeeDesign['badge']): TeeDesign['badge'] {
  const raw = asRecord(value);
  const placement: BadgePlacement =
    raw.placement === 'chest-center' ? 'chest-center' : 'chest-left';
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
    placement,
    text: sanitizeText(raw.text, MAX_BADGE_TEXT_LENGTH).toUpperCase(),
    color: normalizeColor(raw.color, fallback.color),
  };
}

function sanitizeEmbeddedSvg(src: string): string | null {
  if (!/^data:image\/svg\+xml/i.test(src)) return src;

  const comma = src.indexOf(',');
  if (comma < 0) return null;

  const meta = src.slice(0, comma);
  const payload = src.slice(comma + 1);

  let svg = '';
  try {
    if (/;base64/i.test(meta)) {
      const binary = atob(payload);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      svg = new TextDecoder().decode(bytes);
    } else {
      svg = decodeURIComponent(payload);
    }
  } catch {
    return null;
  }

  const clean = sanitizeSvgText(svg);
  if (!clean) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}`;
}

function normalizeImage(value: unknown, index: number): TeeImage | null {
  const raw = asRecord(value);
  const rawSrc = typeof raw.src === 'string' ? raw.src.trim() : '';

  // Imported designs are untrusted. Only embedded image data URLs are accepted;
  // remote URLs, javascript: URIs and file paths are rejected. Embedded SVGs go
  // through the same sanitizer as fresh uploads.
  if (!SAFE_IMAGE_SRC.test(rawSrc)) return null;
  const src = sanitizeEmbeddedSvg(rawSrc);
  if (!src) return null;

  const mimeType =
    typeof raw.mimeType === 'string' && (TEE_IMAGE_MIME_TYPES as readonly string[]).includes(raw.mimeType)
      ? raw.mimeType
      : 'image/png';

  const width = clampNumber(raw.width, 0.3, 0.02, 2);
  const height = clampNumber(raw.height, 0.3, 0.02, 2);

  return {
    id: sanitizeText(raw.id, 80) || `image-${index}`,
    name: sanitizeText(raw.name, 80) || 'Imported image',
    src,
    mimeType,
    bytes: clampNumber(raw.bytes, 0, 0, MAX_TEE_IMAGE_BYTES),
    view: pickEnum(raw.view, TEE_VIEWS, 'front'),
    x: clampNumber(raw.x, 0.5, -0.5, 1.5),
    y: clampNumber(raw.y, 0.45, -0.5, 1.5),
    width,
    height,
    rotation: clampNumber(raw.rotation, 0, -3600, 3600),
    opacity: clampNumber(raw.opacity, 1, 0, 1),
    flipX: typeof raw.flipX === 'boolean' ? raw.flipX : false,
    z: clampNumber(raw.z, index, 0, 999),
    locked: typeof raw.locked === 'boolean' ? raw.locked : false,
    hidden: typeof raw.hidden === 'boolean' ? raw.hidden : false,
  };
}

/**
 * Coerces any object into a valid TeeDesign, filling missing or malformed
 * fields from the defaults. Never throws.
 */
function normalizeBranding(value: unknown, fallback: TeeBranding): TeeBranding {
  const raw = asRecord(value);
  const bool = (key: keyof TeeBranding, fallbackValue: boolean) =>
    typeof raw[key] === 'boolean' ? (raw[key] as boolean) : fallbackValue;
  return {
    emblem: bool('emblem', fallback.emblem),
    wordmark: bool('wordmark', fallback.wordmark),
    patch: bool('patch', fallback.patch),
    backGraphic: bool('backGraphic', fallback.backGraphic),
    neckLabel: bool('neckLabel', fallback.neckLabel),
    neckLabelSize: bool('neckLabelSize', fallback.neckLabelSize),
    neckLabelText: sanitizeText(raw.neckLabelText ?? fallback.neckLabelText, 40) || fallback.neckLabelText,
    hangTag: bool('hangTag', fallback.hangTag),
    hangTagText: sanitizeText(raw.hangTagText ?? fallback.hangTagText, 20) || fallback.hangTagText,
  };
}

function normalizeEffects(value: unknown, fallback: TeeBackgroundEffects): TeeBackgroundEffects {
  const raw = asRecord(value);
  const bool = (key: keyof TeeBackgroundEffects, fallbackValue: boolean) =>
    typeof raw[key] === 'boolean' ? (raw[key] as boolean) : fallbackValue;
  return {
    spotlight: bool('spotlight', fallback.spotlight),
    glow: bool('glow', fallback.glow),
    vignette: bool('vignette', fallback.vignette),
    floorShadow: bool('floorShadow', fallback.floorShadow),
    studioLight: bool('studioLight', fallback.studioLight),
  };
}

const BACKGROUND_FALLBACK = { background: 'charcoal', customBackground: '#1a1a1f' } as const;

export function normalizeDesign(raw: unknown): TeeDesign {
  const base = createDefaultDesign();
  const source = asRecord(raw);

  if (!Object.keys(source).length) return base;

  const zonesRaw = asRecord(source.zones);
  const gradientsRaw = asRecord(source.gradients);
  const backRaw = asRecord(source.back);
  const rawTexts = Array.isArray(source.texts) ? source.texts.slice(0, 4) : base.texts;

  const texts = rawTexts.map((text, index) =>
    normalizeText(text, index, base.texts[0] ?? createDefaultDesign().texts[0])
  );

  const rawImages = Array.isArray(source.images) ? source.images.slice(0, MAX_TEE_IMAGES) : [];
  const usedIds = new Set<string>();
  const images = rawImages
    .map((image, index) => normalizeImage(image, index))
    .filter((image): image is TeeImage => image !== null)
    .map((image) => {
      const next = { ...image };
      while (usedIds.has(next.id)) next.id = `${next.id}-${Math.random().toString(16).slice(2, 6)}`;
      usedIds.add(next.id);
      return next;
    })
    .sort((a, b) => a.z - b.z)
    .map((image, index) => ({ ...image, z: index }));

  const createdAt =
    typeof source.createdAt === 'string' && !Number.isNaN(Date.parse(source.createdAt))
      ? source.createdAt
      : base.createdAt;
  const updatedAt =
    typeof source.updatedAt === 'string' && !Number.isNaN(Date.parse(source.updatedAt))
      ? source.updatedAt
      : createdAt;

  const presentationRaw = asRecord(source.presentation);
  const patternOffsetRaw = asRecord(source.patternOffset);

  return {
    schemaVersion: 1,
    id: sanitizeText(source.id, 80) || base.id,
    userId: typeof source.userId === 'string' && isUuid(source.userId) ? source.userId : null,
    name: sanitizeText(source.name, 80) || base.name,
    baseModel: 'groove-tee-v1',
    view: pickEnum(source.view, TEE_VIEWS, base.view),
    fit: pickEnum(source.fit, TEE_FITS, base.fit),
    size: pickEnum(source.size, TEE_SIZES, base.size),
    zones: {
      body: normalizeColor(zonesRaw.body, base.zones.body),
      sleeves: normalizeColor(zonesRaw.sleeves, base.zones.sleeves),
      collar: normalizeColor(zonesRaw.collar, base.zones.collar),
      panels: normalizeColor(zonesRaw.panels, base.zones.panels),
      accents: normalizeColor(zonesRaw.accents, base.zones.accents),
    },
    pattern: pickEnum(source.pattern, TEE_PATTERNS, base.pattern),
    patternOffset: {
      x: clampNumber(patternOffsetRaw.x, base.patternOffset.x, -0.18, 0.18),
      y: clampNumber(patternOffsetRaw.y, base.patternOffset.y, -0.18, 0.18),
    },
    patternScale: clampNumber(source.patternScale, base.patternScale, 0.5, 2),
    patternOpacity: clampNumber(source.patternOpacity, base.patternOpacity, 0, 1),
    patternRotation: clampNumber(source.patternRotation, base.patternRotation, -180, 180),
    patternRegion: pickEnum(source.patternRegion, TEE_PATTERN_REGIONS, base.patternRegion),
    patternVisible:
      typeof source.patternVisible === 'boolean' ? source.patternVisible : base.patternVisible,
    branding: normalizeBranding(source.branding, base.branding),
    presentation: {
      background: pickEnum(
        presentationRaw.background,
        TEE_BACKGROUNDS,
        base.presentation.background ?? BACKGROUND_FALLBACK.background
      ),
      customBackground: normalizeColor(
        presentationRaw.customBackground,
        base.presentation.customBackground ?? BACKGROUND_FALLBACK.customBackground
      ),
      effects: normalizeEffects(presentationRaw.effects, base.presentation.effects),
    },
    gradients: {
      body: normalizeGradient(gradientsRaw.body, base.gradients.body),
      sleeves: normalizeGradient(gradientsRaw.sleeves, base.gradients.sleeves),
      collar: normalizeGradient(gradientsRaw.collar, base.gradients.collar),
      panels: normalizeGradient(gradientsRaw.panels, base.gradients.panels),
      accents: normalizeGradient(gradientsRaw.accents, base.gradients.accents),
    },
    texts,
    badge: normalizeBadge(source.badge, base.badge),
    back: {
      visible: typeof backRaw.visible === 'boolean' ? backRaw.visible : base.back.visible,
      name: sanitizeText(backRaw.name, MAX_BACK_NAME_LENGTH),
      number: sanitizeNumberText(backRaw.number, MAX_BACK_NUMBER_LENGTH),
      font: sanitizeText(backRaw.font, 40) || base.back.font,
      color: normalizeColor(backRaw.color, base.back.color),
      size: clampNumber(backRaw.size, base.back.size, 40, 220),
    },
    images,
    createdAt,
    updatedAt,
  };
}

/**
 * Parses user-supplied JSON text. Returns a result object so the UI can show a
 * clear message instead of throwing inside an event handler.
 */
export function parseDesignJson(text: string): DesignParseResult {
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, error: 'The design file is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'That file does not contain a tee design.' };
  }

  const source = parsed as Record<string, unknown>;

  if (source.schemaVersion !== undefined && source.schemaVersion !== DESIGN_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'This design was made with a newer version of the customizer.',
    };
  }

  if (source.baseModel !== undefined && source.baseModel !== 'groove-tee-v1') {
    return { ok: false, error: 'This design uses an unsupported shirt template.' };
  }

  return { ok: true, design: normalizeDesign(source) };
}

/** Stable, pretty-printed JSON for the .json export and clipboard actions. */
export function serializeDesign(design: TeeDesign): string {
  return JSON.stringify(design, null, 2);
}

export function duplicateDesign(design: TeeDesign): TeeDesign {
  return normalizeDesign({
    ...design,
    id: createDesignId(),
    name: `${design.name} copy`.slice(0, 80),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export function designFileName(design: TeeDesign, extension: 'json' | 'png'): string {
  const slug =
    design.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'groove-tee';
  return `${slug}.${extension}`;
}
