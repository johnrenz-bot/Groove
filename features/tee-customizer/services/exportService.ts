'use client';

import { designFileName, serializeDesign } from '../serialization';
import { SHIRT_VIEWBOX } from '../mockupAssets';
import type { TeeDesign } from '../types';

const EXPORT_BACKGROUND = '#111111';

function loadSvgImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The preview could not be rendered.'));
    image.src = src;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('An export asset could not be encoded.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Replaces every non-data-URL `href`/`xlink:href` on `<image>` nodes with a
 * data URL. The live preview references `/assets/…` mockups and masks; an SVG
 * rasterized via `<img>` has no base URL, so without this the export comes
 * out with missing garment and zones.
 */
async function inlineExternalAssets(svg: SVGSVGElement): Promise<void> {
  const nodes = [...svg.querySelectorAll('image')];
  const urls = new Set<string>();
  for (const node of nodes) {
    for (const attr of ['href', 'xlink:href'] as const) {
      const value = node.getAttribute(attr);
      if (value && !value.startsWith('data:')) urls.add(value);
    }
  }
  if (urls.size === 0) return;

  const cache = new Map<string, string>();
  await Promise.all(
    [...urls].map(async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        cache.set(url, await blobToDataUrl(await response.blob()));
      } catch {
        // Leave the URL untouched; the browser may still resolve it (rare).
      }
    })
  );

  for (const node of nodes) {
    for (const attr of ['href', 'xlink:href'] as const) {
      const value = node.getAttribute(attr);
      if (value && cache.has(value)) node.setAttribute(attr, cache.get(value)!);
    }
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportDesignJson(design: TeeDesign) {
  const blob = new Blob([serializeDesign(design)], { type: 'application/json' });
  downloadBlob(blob, designFileName(design, 'json'));
}

/**
 * Serializes the live SVG into a PNG. The editor's selection handles carry
 * `data-export-ignore` and are removed from the clone, so a screenshot never
 * includes editing chrome.
 */
export async function exportDesignPng(
  svg: SVGSVGElement,
  design: TeeDesign,
  options: {
    width?: number;
    transparent?: boolean;
    background?: string;
    filename?: string;
  } = {}
) {
  const width = options.width ?? 1600;
  const aspect = SHIRT_VIEWBOX.height / SHIRT_VIEWBOX.width;
  const height = Math.round(width * aspect);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export-ignore="true"]').forEach((node) => node.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  // SVG re-rendered as an <img> cannot fetch external resources, so every
  // same-origin asset (mockup, masks, shading) is inlined as a data URL.
  await inlineExternalAssets(clone);

  if (!options.transparent) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', options.background ?? EXPORT_BACKGROUND);
    clone.insertBefore(rect, clone.firstChild);
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadSvgImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The export canvas is unavailable.');
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) throw new Error('The PNG could not be created.');
    downloadBlob(blob, options.filename ?? designFileName(design, 'png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand('copy');
      input.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
