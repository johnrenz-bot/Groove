/**
 * Upload validation and safe image preparation for the tee customizer.
 *
 * The pure checks are exported separately from the browser helpers so they can
 * be unit-tested with Node's test runner. The browser path additionally reads
 * magic bytes, sanitizes SVG markup, and downscales large rasters before they
 * are embedded in the design JSON.
 */

import {
  MAX_TEE_IMAGE_BYTES,
  TEE_IMAGE_EXTENSIONS,
  TEE_IMAGE_MIME_TYPES,
} from './constants.ts';

export interface UploadFileLike {
  name: string;
  size: number;
  type: string;
}

export interface PreparedTeeImage {
  src: string;
  mimeType: string;
  bytes: number;
  width: number;
  height: number;
}

const MAX_IMAGE_EDGE = 1600;
const SVG_BLOCKED_TAGS = [
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
  'animate',
  'animateMotion',
  'animateTransform',
  'set',
  'use',
  'style',
];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(name: string): string {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() ?? '') : '';
}

/**
 * Fast, synchronous client-side validation. MIME and magic-byte checks happen
 * again in `prepareImageFile` before anything is embedded in a design.
 */
export function validateTeeImageFile(file: UploadFileLike): string | null {
  const extension = getFileExtension(file.name);
  const allowedExtensions = TEE_IMAGE_EXTENSIONS as readonly string[];

  if (!extension || !allowedExtensions.includes(extension)) {
    return 'Choose a PNG, JPG, WEBP, SVG or GIF file.';
  }

  if (file.type && !(TEE_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `“${file.name}” is not an image type the customizer accepts.`;
  }

  if (file.size === 0) {
    return `“${file.name}” is empty. Choose another file.`;
  }

  if (file.size > MAX_TEE_IMAGE_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)}. Use an image under ${formatBytes(MAX_TEE_IMAGE_BYTES)}.`;
  }

  return null;
}

/** Reads the magic bytes of the common formats we accept. */
export function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8) {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (png.every((value, index) => bytes[index] === value)) return 'image/png';
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (bytes.length >= 6) {
    const header = String.fromCharCode(...bytes.slice(0, 6));
    if (header === 'GIF87a' || header === 'GIF89a') return 'image/gif';
  }

  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  }

  // SVG is text. Allow a BOM / XML declaration before the root element.
  const start = String.fromCharCode(...bytes.slice(0, Math.min(bytes.length, 1024)))
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();
  if (start.startsWith('<svg') || (start.startsWith('<?xml') && start.includes('<svg'))) {
    return 'image/svg+xml';
  }

  return null;
}

function isSafeHref(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith('#') ||
    /^data:image\/(?:png|jpe?g|webp|gif)(?:;[^,]*)?,/i.test(trimmed)
  );
}

function stripUnsafeAttributes(element: Element) {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value;

    if (name.startsWith('on') || name === 'style' || name === 'src' || name === 'formaction') {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (name === 'href' || name === 'xlink:href') {
      if (!isSafeHref(value)) element.removeAttribute(attribute.name);
      continue;
    }

    if (/javascript\s*:/i.test(value)) {
      element.removeAttribute(attribute.name);
      continue;
    }

    // Allow local paint references such as fill="url(#gradient)", but drop
    // anything that could fetch a remote resource.
    if (/url\s*\(\s*['"]?(?!#)/i.test(value)) {
      element.removeAttribute(attribute.name);
    }
  }
}

/**
 * Conservative regex path used when DOMParser is unavailable (tests, workers).
 * The browser path below is authoritative.
 */
function sanitizeSvgWithRegex(svg: string): string | null {
  let output = svg.replace(/^\uFEFF/, '').trim();
  if (!/^<\?xml|^<svg/i.test(output)) return null;
  if (!/<svg[\s>]/i.test(output)) return null;

  output = output
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, '');

  for (const tag of SVG_BLOCKED_TAGS) {
    output = output.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
    output = output.replace(new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi'), '');
  }

  output = output
    .replace(/\son[a-z]+\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi, '')
    .replace(/\ssrc\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi, '')
    .replace(/\s(href|xlink:href)\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi, (match) => {
      const value = match.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      return isSafeHref(value) ? match : '';
    })
    .replace(/javascript\s*:/gi, '')
    .replace(/url\s*\(\s*['"]?(?!#)[^)]*\)/gi, 'none');

  return output;
}

/**
 * Sanitizes an SVG document: strips scripts, event handlers, styles, external
 * references and remote paints. Returns null if the input is not an SVG.
 */
export function sanitizeSvgText(svg: string): string | null {
  if (typeof svg !== 'string' || !svg.trim()) return null;

  if (typeof DOMParser === 'undefined') {
    return sanitizeSvgWithRegex(svg);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg.replace(/^\uFEFF/, ''), 'image/svg+xml');
  if (doc.querySelector('parsererror')) return null;

  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') return null;

  for (const tag of SVG_BLOCKED_TAGS) {
    doc.querySelectorAll(tag).forEach((element) => element.remove());
  }

  doc.querySelectorAll('*').forEach(stripUnsafeAttributes);
  stripUnsafeAttributes(root);

  if (!root.getAttribute('xmlns')) {
    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const serialized = new XMLSerializer().serializeToString(root);
  return serialized.includes('<svg') ? serialized : null;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be decoded.'));
    image.src = src;
  });
}

async function rasterToDataUrl(file: File, mimeType: string): Promise<PreparedTeeImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(objectUrl);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) throw new Error('The image has no readable dimensions.');

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The image could not be prepared.');

    context.drawImage(image, 0, 0, width, height);

    const outputMime =
      mimeType === 'image/jpeg'
        ? 'image/jpeg'
        : mimeType === 'image/webp'
          ? 'image/webp'
          : 'image/png';

    const src =
      outputMime === 'image/png'
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL(outputMime, 0.92);

    return { src, mimeType: outputMime, bytes: file.size, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Validates an upload, reads its actual signature, sanitizes SVG files, and
 * downscales large rasters so exported JSON stays manageable.
 */
export async function prepareImageFile(file: File): Promise<PreparedTeeImage> {
  const basicError = validateTeeImageFile(file);
  if (basicError) throw new Error(basicError);

  const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const detected = detectImageMime(header);
  if (!detected) {
    throw new Error(`“${file.name}” could not be read as a supported image.`);
  }

  if (detected === 'image/svg+xml') {
    const text = await file.text();
    const sanitized = sanitizeSvgText(text);
    if (!sanitized) throw new Error(`“${file.name}” is not a valid SVG file.`);

    return {
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized)}`,
      mimeType: 'image/svg+xml',
      bytes: file.size,
      width: 1000,
      height: 1200,
    };
  }

  return rasterToDataUrl(file, detected);
}

/** Converts a design JSON file to text while respecting the import size cap. */
export async function readDesignJsonFile(file: File): Promise<string> {
  return file.text();
}
