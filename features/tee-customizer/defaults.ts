/**
 * Default design factory.
 *
 * Kept separate from constants so every caller gets a fresh, mutable snapshot
 * rather than sharing arrays or objects.
 */

import {
  DEFAULT_COLORWAY_ID,
  DEFAULT_DESIGN_NAME,
  DEFAULT_FONT_KEY,
  getColorway,
} from './constants.ts';
import type { TeeDesign } from './types.ts';

export function createDesignId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  // RFC 4122 v4 fallback for browsers without crypto.randomUUID. Design ids are
  // stored in a UUID column, so this must stay a real UUID.
  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20)}`;
}

export function createDefaultDesign(overrides: Partial<TeeDesign> = {}): TeeDesign {
  const colorway = getColorway(DEFAULT_COLORWAY_ID);
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    id: createDesignId(),
    userId: null,
    name: DEFAULT_DESIGN_NAME,
    baseModel: 'groove-tee-v1',
    view: 'front',
    fit: 'boxy',
    size: 'L',
    zones: { ...colorway.zones },
    pattern: 'none',
    patternOffset: { x: 0, y: 0 },
    patternScale: 1,
    patternOpacity: 1,
    patternRotation: 0,
    patternRegion: 'all',
    patternVisible: true,
    branding: {
      emblem: true,
      wordmark: false,
      patch: true,
      backGraphic: false,
      neckLabel: false,
      neckLabelSize: false,
      neckLabelText: 'GROOVE PH',
      hangTag: false,
      hangTagText: 'GROOVE',
    },
    presentation: {
      background: 'charcoal',
      customBackground: '#1a1a1f',
      effects: {
        spotlight: true,
        glow: false,
        vignette: true,
        floorShadow: true,
        studioLight: false,
      },
    },
    gradients: {
      body: { ...colorway.gradient },
      sleeves: {
        enabled: false,
        type: 'linear',
        from: colorway.zones.sleeves,
        to: '#23242A',
        angle: 120,
      },
      collar: {
        enabled: false,
        type: 'radial',
        from: colorway.zones.collar,
        to: '#171512',
        angle: 90,
      },
      panels: { enabled: true, type: 'linear', from: '#D93A2E', to: '#6E0A12', angle: 140 },
      accents: {
        enabled: false,
        type: 'linear',
        from: colorway.zones.accents,
        to: '#B85C00',
        angle: 90,
      },
    },
    texts: [
      {
        id: 'chest-text',
        placement: 'chest',
        surface: 'front',
        text: 'GROOVE PH',
        font: DEFAULT_FONT_KEY,
        weight: 400,
        color: colorway.zones.accents,
        size: 62,
        x: 50,
        y: 39,
        letterSpacing: 1,
        lineHeight: 1.15,
        italic: false,
        align: 'center',
        opacity: 1,
        rotation: 0,
        visible: false,
        locked: false,
      },
    ],
    badge: {
      enabled: false,
      placement: 'chest-left',
      text: 'GP',
      color: colorway.zones.accents,
    },
    back: {
      visible: true,
      name: 'GROOVE',
      number: '01',
      font: 'black',
      color: colorway.zones.accents,
      size: 84,
    },
    images: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
