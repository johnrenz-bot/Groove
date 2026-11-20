/**
 * Mockup asset registry.
 *
 * The renderer is driven by the manifest at `public/assets/apparel/groove-photo-tee/manifest.json`,
 * produced by `scripts/build-photo-tee-assets.mjs` from the actual garment
 * photographs under `public/image/Shirts/`. Everything downstream — the SVG
 * preview, the import thumbnails, the logo picker and the export inliner —
 * reads from here, so there is exactly one source of truth for asset paths
 * and dimensions.
 *
 * The mockup IS a photograph (see `manifest.note`): the base garment is the
 * photo white-balanced toward a near-white base so multiply compositing keeps
 * the woven texture and fold shading intact. Original photography stays at
 * `/image/Shirts/` untouched; the derived, aligned assets (masks, shading,
 * highlight, neutralised base) live under `/assets/apparel/groove-photo-tee/`.
 */

import manifest from '@/public/assets/apparel/groove-photo-tee/manifest.json';
import type { TeeView } from './types';

export type MockupZoneKey =
  | 'silhouette'
  | 'body'
  | 'left-sleeve'
  | 'right-sleeve'
  | 'cuffs'
  | 'collar'
  | 'printable';

/** Zones that carry an independent multiply-recolourable fill. */
export const RECOLORABLE_ZONES: MockupZoneKey[] = ['body', 'left-sleeve', 'right-sleeve', 'cuffs', 'collar'];

export interface MockupViewAssets {
  mockup: string;
  mockupFallback: string;
  /** Path of the untouched photography this asset set was derived from. */
  sourceMockup: string;
  shading: string;
  highlight: string;
  masks: Record<MockupZoneKey, string>;
  boxes: Record<MockupZoneKey, { x: number; y: number; width: number; height: number }>;
  /** Pixel-aligned garment bounding box inside the canvas (both views). */
  garment: { x: number; y: number; width: number; height: number };
}

interface ManifestView {
  mockup: string;
  mockupFallback: string;
  sourceMockup: string;
  shading: string;
  highlight: string;
  garment: { x: number; y: number; width: number; height: number };
  masks: Record<MockupZoneKey, string>;
  boxes: Record<MockupZoneKey, { x: number; y: number; width: number; height: number }>;
}

const manifestViews = manifest.views as unknown as Record<TeeView, ManifestView>;

export const MOCKUP_CANVAS = manifest.canvas;
export const SHIRT_VIEWBOX = { width: MOCKUP_CANVAS.width, height: MOCKUP_CANVAS.height } as const;
export const MOCKUP_MODEL = manifest.model;
export const MOCKUP_NOTE = manifest.note;

export function getMockupAssets(view: TeeView): MockupViewAssets {
  return manifestViews[view];
}

/** Every external asset the SVG references — used to preload and to inline on export. */
export function mockupAssetUrls(): string[] {
  const urls = new Set<string>();
  for (const view of ['front', 'back'] as const) {
    const assets = getMockupAssets(view);
    urls.add(assets.mockup);
    urls.add(assets.shading);
    urls.add(assets.highlight);
    for (const mask of Object.values(assets.masks)) urls.add(mask);
  }
  return [...urls];
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/**
 * Sanity-checks the asset pipeline's output in the browser: every asset must
 * load and every mask must match the photo's dimensions, otherwise zone
 * coloring silently misaligns. Problems come back as human-readable strings;
 * the helper also logs a warning so nothing looks "just fine but broken".
 */
export async function validateMockupAssets(): Promise<string[]> {
  const problems: string[] = [];
  const expected = `${MOCKUP_CANVAS.width}×${MOCKUP_CANVAS.height}`;

  for (const view of ['front', 'back'] as const) {
    const assets = getMockupAssets(view);
    const check = async (url: string, label: string) => {
      const image = await loadImage(url);
      if (!image) {
        problems.push(`${view}: ${label} failed to load (${url})`);
        return;
      }
      const size = `${image.naturalWidth}×${image.naturalHeight}`;
      if (image.naturalWidth !== MOCKUP_CANVAS.width || image.naturalHeight !== MOCKUP_CANVAS.height) {
        problems.push(`${view}: ${label} is ${size}, expected ${expected}`);
      }
    };

    await check(assets.mockup, 'mockup');
    for (const [zone, url] of Object.entries(assets.masks)) {
      await check(url, `${zone} mask`);
    }
    await check(assets.shading, 'shading layer');
    await check(assets.highlight, 'highlight layer');
  }

  if (problems.length > 0 && typeof console !== 'undefined') {
    console.warn(`[tee-customizer] mockup assets failed validation:\n${problems.join('\n')}`);
  }
  return problems;
}
