/**
 * Deterministic color math for the Figma-style picker.
 * No dependencies: HSV <-> RGB <-> HSL <-> HEX, all in sRGB.
 */

export interface Hsv {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

export interface Hsl {
  h: number;
  s: number; // 0-100
  l: number; // 0-100
}

export interface Rgb {
  r: number; // 0-255
  g: number;
  b: number;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function normalizeHue(h: number): number {
  const wrapped = h % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function hexToRgb(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, '');
  let full = value;
  if (value.length === 3) {
    full = value.split('').map((c) => c + c).join('');
  } else if (value.length === 4) {
    full = value.split('').map((c) => c + c).join('').slice(0, 6);
  } else if (value.length === 8) {
    full = value.slice(0, 6);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const int = Number.parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((channel) => clampByte(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }

  return { h: normalizeHue(h), s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hue = normalizeHue(h);
  const sat = clamp01(s);
  const val = clamp01(v);
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hue < 60) [rp, gp, bp] = [c, x, 0];
  else if (hue < 120) [rp, gp, bp] = [x, c, 0];
  else if (hue < 180) [rp, gp, bp] = [0, c, x];
  else if (hue < 240) [rp, gp, bp] = [0, x, c];
  else if (hue < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: clampByte((rp + m) * 255),
    g: clampByte((gp + m) * 255),
    b: clampByte((bp + m) * 255),
  };
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }

  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h: Math.round(normalizeHue(h)), s: Math.round(clamp01(s) * 100), l: Math.round(clamp01(l) * 100) };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = normalizeHue(h);
  const sat = clamp01(s / 100);
  const lum = clamp01(l / 100);
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lum - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hue < 60) [rp, gp, bp] = [c, x, 0];
  else if (hue < 120) [rp, gp, bp] = [x, c, 0];
  else if (hue < 180) [rp, gp, bp] = [0, c, x];
  else if (hue < 240) [rp, gp, bp] = [0, x, c];
  else if (hue < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: clampByte((rp + m) * 255),
    g: clampByte((gp + m) * 255),
    b: clampByte((bp + m) * 255),
  };
}

/** Parses a #rgb / #rrggbb string into HSV; returns null when invalid. */
export function hexToHsv(hex: string): Hsv | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsv(rgb) : null;
}

export function hsvToHex(hsv: Hsv): string {
  return rgbToHex(hsvToRgb(hsv));
}

const RECENT_KEY = 'groove.tee.recent-colors';
const RECENT_LIMIT = 10;

export function readRecentColors(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === 'string' && hexToRgb(entry) !== null)
      .map((entry) => entry.toLowerCase())
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function pushRecentColor(hex: string): string[] {
  const normalized = hex.toLowerCase();
  try {
    const next = [normalized, ...readRecentColors().filter((entry) => entry !== normalized)].slice(
      0,
      RECENT_LIMIT
    );
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [normalized];
  }
}
