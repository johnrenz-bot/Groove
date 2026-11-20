/**
 * Studio stage backgrounds — presentation chrome for the live preview.
 *
 * IMPORTANT: these styles are applied to the editor's stage container only.
 * They never enter the SVG the export pipeline rasterizes, so exported PNGs
 * (and especially the transparent artwork export) never pick up a backdrop.
 */

import type { CSSProperties } from 'react';
import type { TeeBackgroundId } from '../types';

/** Classic alpha checkerboard for the 'transparent' presentation. */
const CHECKER: CSSProperties = {
  backgroundColor: '#15151a',
  backgroundImage:
    'conic-gradient(#232329 0 25%, #191920 0 50%, #232329 0 75%, #191920 0)',
  backgroundSize: '26px 26px',
};

const FINE_NOISE =
  'repeating-linear-gradient(12deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 22px), repeating-linear-gradient(101deg, rgba(0,0,0,0.055) 0 3px, transparent 3px 30px)';

export function stageBackgroundStyle(
  background: TeeBackgroundId,
  customBackground: string
): CSSProperties {
  switch (background) {
    case 'transparent':
      return CHECKER;
    case 'black':
      return { background: '#000000' };
    case 'charcoal':
      return {
        background:
          'radial-gradient(ellipse at 50% 36%, #24242b 0%, #16161c 52%, #0e0e12 100%)',
      };
    case 'light-grey':
      return {
        background:
          'radial-gradient(ellipse at 50% 34%, #f0f0f3 0%, #d6d6dc 55%, #b6b6bf 100%)',
      };
    case 'white':
      return {
        background:
          'radial-gradient(ellipse at 50% 34%, #ffffff 0%, #f1f1f3 62%, #d8d8dd 100%)',
      };
    case 'concrete':
      return {
        backgroundColor: '#76767b',
        backgroundImage: `${FINE_NOISE}, radial-gradient(circle at 21% 30%, rgba(255,255,255,0.15), transparent 44%), radial-gradient(circle at 78% 64%, rgba(0,0,0,0.24), transparent 48%), radial-gradient(circle at 45% 88%, rgba(255,255,255,0.09), transparent 40%)`,
      };
    case 'dark-gradient':
      return {
        background:
          'linear-gradient(158deg, #202027 0%, #131319 45%, #07070b 100%)',
      };
    case 'custom':
      return {
        background: `radial-gradient(ellipse at 50% 36%, ${lightenHex(customBackground, 0.12)} 0%, ${customBackground} 55%, ${darkenHex(customBackground, 0.32)} 100%)`,
      };
    default:
      return { background: '#0e0e11' };
  }
}

/** Swatch preview style for the background picker (same visual as the stage). */
export function stageSwatchStyle(id: TeeBackgroundId, customBackground: string): CSSProperties {
  return stageBackgroundStyle(id, customBackground);
}

/** Rough luminance of a #rrggbb color (0–1). */
export function hexLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const int = Number.parseInt(full || '000000', 16);
  if (Number.isNaN(int)) return 0;
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLightBackground(background: TeeBackgroundId, customBackground: string): boolean {
  if (background === 'light-grey' || background === 'white') return true;
  if (background === 'custom') return hexLuminance(customBackground) > 0.62;
  return false;
}

function clampHex(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function lightenHex(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  const t = (channel: number) => clampHex(channel + 255 * amount);
  return toHex(t(r), t(g), t(b));
}

function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  const t = (channel: number) => clampHex(channel * (1 - amount));
  return toHex(t(r), t(g), t(b));
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.padEnd(6, '0');
  const int = Number.parseInt(full.slice(0, 6) || '000000', 16);
  if (Number.isNaN(int)) return { r: 0, g: 0, b: 0 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
