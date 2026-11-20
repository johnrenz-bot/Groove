#!/usr/bin/env node
/**
 * Groove PH apparel asset pipeline.
 *
 * Turns two flat-lay garment photographs (front + back) into the layered asset
 * set the customizer renders:
 *
 *   mockup.png              neutralised photographic base garment
 *   silhouette-mask.png     the whole garment
 *   body-mask.png           torso only
 *   left/right-sleeve-mask  sleeves only
 *   cuffs-mask.png          sleeve end bands
 *   collar-mask.png         neckband
 *   side-panels-mask.png    outer torso bands
 *   hem-tag-mask.png        woven hem label area
 *   printable-mask.png      the safe print window (print rect ∪ sleeves, clipped to the garment)
 *   shading.png             multiply shadow map derived from the photo
 *   highlight.png           soft-light highlight map derived from the photo
 *
 * Why this exists: masks must be pixel-aligned with the photograph. Deriving
 * them from the same segmented alpha as the mockup guarantees alignment instead
 * of hand-drawn art that drifts the moment the photo changes.
 *
 * Usage:
 *   node scripts/build-apparel-assets.mjs
 *   node scripts/build-apparel-assets.mjs --front <path> --back <path>
 *
 * Requires `sharp` (already a project dependency).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'public/assets/apparel/boxy-tee/source');
const OUT_ROOT = path.join(ROOT, 'public/assets/apparel/boxy-tee');

/** Every view is normalised to this canvas so front and back share geometry. */
const CANVAS = { width: 1200, height: 1440 };
/** Garment height inside the canvas and its top offset. */
const GARMENT = { height: 1150, top: 122 };

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith('--')) {
      args[token.slice(2)] = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

async function resolveSource(explicit, fallbackPrefix) {
  if (explicit) return path.resolve(explicit);
  const entries = await fs.readdir(SOURCE_DIR).catch(() => []);
  const match = entries.find(
    (entry) => entry.startsWith(fallbackPrefix) && /\.(png|jpe?g|webp)$/i.test(entry)
  );
  if (!match) {
    throw new Error(
      `No ${fallbackPrefix}* image found in ${path.relative(ROOT, SOURCE_DIR)}. ` +
        'Generate one first or pass --front/--back.'
    );
  }
  return path.join(SOURCE_DIR, match);
}

/** Loads an image as RGBA raw pixels, downscaled to a workable width. */
async function loadRgba(file, maxWidth = 1400) {
  const pipeline = sharp(file).rotate();
  const meta = await pipeline.metadata();
  if (meta.width > maxWidth) {
    return pipeline.resize({ width: maxWidth, fit: 'inside', kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  }
  return pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Segments the garment from the studio backdrop.
 *
 * The photographs are a light garment on a darker seamless backdrop, so the
 * discriminator is luminance rather than raw colour distance: the backdrop is
 * estimated per row from its left/right margins and everything meaningfully
 * brighter than that margin becomes foreground. Contact shadows sit *below* the
 * backdrop luminance and are therefore excluded rather than painted into the
 * silhouette.
 *
 * The result is flood-filled from the border so dark folds inside the garment
 * are holes that get filled, while bright specks on the backdrop are dropped.
 */
function segmentGarment(data, width, height) {
  const margin = Math.max(4, Math.round(width * 0.06));
  const rowBackground = new Float32Array(height);
  const sample = [];

  for (let y = 0; y < height; y += 1) {
    sample.length = 0;
    for (let x = 0; x < margin; x += 1) {
      const index = (y * width + x) * 4;
      sample.push(luma(data[index], data[index + 1], data[index + 2]));
      const right = (y * width + (width - 1 - x)) * 4;
      sample.push(luma(data[right], data[right + 1], data[right + 2]));
    }
    rowBackground[y] = median(sample);
  }

  // Is the garment brighter or darker than its backdrop? Decide from the middle
  // of the frame versus the outer margins so the pipeline also survives a
  // light backdrop / dark garment pairing.
  let centreLuma = 0;
  let centreCount = 0;
  for (let y = Math.round(height * 0.3); y < Math.round(height * 0.7); y += 3) {
    for (let x = Math.round(width * 0.3); x < Math.round(width * 0.7); x += 3) {
      const index = (y * width + x) * 4;
      centreLuma += luma(data[index], data[index + 1], data[index + 2]);
      centreCount += 1;
    }
  }
  centreLuma /= Math.max(1, centreCount);
  const rimLuma = median(rowBackground);
  const brighter = centreLuma >= rimLuma;

  const raw = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const background = rowBackground[y];
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const value = luma(data[index], data[index + 1], data[index + 2]);
      const delta = brighter ? value - background : background - value;
      raw[y * width + x] = delta > 13 ? 1 : 0;
    }
  }

  // Flood fill the backdrop from the border. Anything the fill cannot reach is
  // garment (including dark folds that fell below the threshold).
  const outside = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (outside[index] || raw[index]) return;
    outside[index] = 1;
    stack.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const index = stack.pop();
    const x = index % width;
    const y = (index - x) / width;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  const silhouette = new Uint8Array(width * height);
  for (let index = 0; index < silhouette.length; index += 1) {
    silhouette[index] = outside[index] ? 0 : 1;
  }

  // Drop disconnected specks (bright dust, stray highlights on the backdrop).
  const visited = new Uint8Array(width * height);
  const components = [];
  for (let start = 0; start < silhouette.length; start += 1) {
    if (!silhouette[start] || visited[start]) continue;
    const cells = [];
    const queue = [start];
    visited[start] = 1;
    while (queue.length) {
      const index = queue.pop();
      cells.push(index);
      const x = index % width;
      const y = (index - x) / width;
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour < 0 || !silhouette[neighbour] || visited[neighbour]) continue;
        visited[neighbour] = 1;
        queue.push(neighbour);
      }
    }
    components.push(cells);
  }
  components.sort((a, b) => b.length - a.length);
  if (components.length > 1) {
    for (const component of components.slice(1)) {
      if (component.length > components[0].length * 0.02) continue;
      for (const index of component) silhouette[index] = 0;
    }
  }

  // Close pinholes: fill any background region not reachable from the border.
  const holes = new Uint8Array(width * height);
  const holeStack = [];
  const pushHole = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (holes[index] || silhouette[index]) return;
    holes[index] = 1;
    holeStack.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    pushHole(x, 0);
    pushHole(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushHole(0, y);
    pushHole(width - 1, y);
  }
  while (holeStack.length) {
    const index = holeStack.pop();
    const x = index % width;
    const y = (index - x) / width;
    pushHole(x + 1, y);
    pushHole(x - 1, y);
    pushHole(x, y + 1);
    pushHole(x, y - 1);
  }
  for (let index = 0; index < silhouette.length; index += 1) {
    if (!holes[index]) silhouette[index] = 1;
  }

  return { silhouette, brighter };
}

function boundingBox(mask, width, height) {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/**
 * Builds a feather-edged alpha channel from a binary mask. `radius` is a cheap
 * separable box blur applied twice, which is visually indistinguishable from a
 * gaussian at these edge widths and much faster.
 */
function feather(mask, width, height, radius) {
  if (radius <= 0) return mask.map((value) => (value ? 255 : 0));
  let source = Float32Array.from(mask, (value) => (value ? 255 : 0));
  for (let pass = 0; pass < 2; pass += 1) {
    const horizontal = new Float32Array(width * height);
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      const row = y * width;
      for (let x = -radius; x <= radius; x += 1) sum += source[row + clamp(x, 0, width - 1)];
      const window = radius * 2 + 1;
      for (let x = 0; x < width; x += 1) {
        horizontal[row + x] = sum / window;
        sum -= source[row + clamp(x - radius, 0, width - 1)];
        sum += source[row + clamp(x + radius + 1, 0, width - 1)];
      }
    }
    const vertical = new Float32Array(width * height);
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let y = -radius; y <= radius; y += 1) {
        sum += horizontal[clamp(y, 0, height - 1) * width + x];
      }
      const window = radius * 2 + 1;
      for (let y = 0; y < height; y += 1) {
        vertical[y * width + x] = sum / window;
        sum -= horizontal[clamp(y - radius, 0, height - 1) * width + x];
        sum += horizontal[clamp(y + radius + 1, 0, height - 1) * width + x];
      }
    }
    source = vertical;
  }
  return source.map((value) => Math.round(clamp(value, 0, 255)));
}

/** Per-row left/right extent of a binary mask, used for self-aligning zones. */
function rowExtents(mask, width, height) {
  const left = new Int32Array(height).fill(-1);
  const right = new Int32Array(height).fill(-1);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (mask[row + x]) {
        left[y] = x;
        break;
      }
    }
    for (let x = width - 1; x >= 0; x -= 1) {
      if (mask[row + x]) {
        right[y] = x;
        break;
      }
    }
  }
  return { left, right };
}

/**
 * Splits the garment into construction zones.
 *
 * Zone boundaries are expressed as ratios of the *measured* garment box, so the
 * same code adapts to a slightly different photograph without re-drawing art.
 */
function buildZoneMasks({ silhouette, width, height, box, view }) {
  const { x: bx, y: by, width: bw, height: bh } = box;
  const cx = bx + bw / 2;

  const shoulderY = by + bh * 0.045;
  const armholeY = by + bh * 0.2;
  const cuffY = by + bh * (view === 'front' ? 0.345 : 0.345);

  const sleeve = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    if (y < shoulderY) continue;
    const t = (y - shoulderY) / Math.max(1, armholeY - shoulderY);
    // Armhole line: the torso occupies the middle 63% of the garment width at
    // the chest, tapering into the shoulder seam at the top.
    const halfTorso = bw * (0.305 + 0.017 * smoothstep(0, 1, t));
    const cuffLine = cuffY + ((y - cuffY) / Math.max(1, bh)) * 0;
    if (y > cuffLine) continue;
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (!silhouette[row + x]) continue;
      if (Math.abs(x - cx) > halfTorso) sleeve[row + x] = 1;
    }
  }

  // Cuff bands follow the lower edge of the sleeve mask, so they stay parallel
  // to whatever the photograph's cuff actually does.
  const cuffs = new Uint8Array(width * height);
  const cuffDepth = Math.round(bh * 0.045);
  {
    const { left, right } = rowExtents(sleeve, width, height);
    const sleeveBottom = new Int32Array(width).fill(-1);
    for (let y = 0; y < height; y += 1) {
      if (left[y] < 0) continue;
      for (let x = left[y]; x <= right[y]; x += 1) sleeveBottom[x] = y;
    }
    for (let x = 0; x < width; x += 1) {
      if (sleeveBottom[x] < 0) continue;
      for (let y = Math.max(0, sleeveBottom[x] - cuffDepth); y <= sleeveBottom[x]; y += 1) {
        if (sleeve[y * width + x]) cuffs[y * width + x] = 1;
      }
    }
  }

  const collar = new Uint8Array(width * height);
  {
    // The neckband is the band of garment immediately around the neck opening.
    // On the front the opening is the dark hole; on the back it is the shallow
    // scoop. Both are found as "background surrounded by garment" in the top
    // slice of the silhouette.
    const topLimit = by + Math.round(bh * 0.14);
    const hole = new Uint8Array(width * height);
    for (let y = by; y < topLimit; y += 1) {
      const row = y * width;
      for (let x = bx; x < bx + bw; x += 1) {
        if (!silhouette[row + x] && x > cx - bw * 0.2 && x < cx + bw * 0.2) hole[row + x] = 1;
      }
    }
    let holeBox = hole.some((value) => value) ? boundingBox(hole, width, height) : null;
    if (holeBox && holeBox.width > bw * 0.3) holeBox = null;
    if (holeBox) {
      const padX = Math.max(10, holeBox.width * 0.26);
      const padY = Math.max(9, holeBox.height * 0.6);
      const x0 = holeBox.x - padX;
      const x1 = holeBox.x + holeBox.width + padX;
      const y0 = holeBox.y - padY;
      const y1 = holeBox.y + holeBox.height + padY;
      const rx = (x1 - x0) / 2;
      const ry = (y1 - y0) / 2;
      const ccx = (x0 + x1) / 2;
      const ccy = (y0 + y1) / 2;
      for (let y = Math.max(by, Math.floor(y0)); y < Math.min(by + bh, Math.ceil(y1)); y += 1) {
        for (let x = Math.max(bx, Math.floor(x0)); x < Math.min(bx + bw, Math.ceil(x1)); x += 1) {
          const index = y * width + x;
          if (!silhouette[index]) continue;
          const dx = (x - ccx) / rx;
          const dy = (y - ccy) / ry;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance >= 0.94 && distance <= 1.5) collar[index] = 1;
        }
      }
    } else {
      // Back view: a shallow band across the neck.
      for (let y = by; y < by + bh * 0.055; y += 1) {
        for (let x = Math.round(cx - bw * 0.15); x < Math.round(cx + bw * 0.15); x += 1) {
          const index = y * width + x;
          if (silhouette[index]) collar[index] = 1;
        }
      }
    }
  }

  const body = new Uint8Array(width * height);
  for (let index = 0; index < body.length; index += 1) {
    if (silhouette[index] && !sleeve[index] && !collar[index]) body[index] = 1;
  }

  // Side panels hug the outer edge of each torso row: the seam position is read
  // from the photograph instead of guessed in absolute pixels.
  const sidePanels = new Uint8Array(width * height);
  {
    const { left, right } = rowExtents(body, width, height);
    const startY = by + bh * 0.17;
    for (let y = Math.floor(startY); y < by + bh; y += 1) {
      if (left[y] < 0) continue;
      const span = right[y] - left[y];
      const inset = Math.round(span * 0.2);
      for (let x = left[y]; x <= right[y]; x += 1) {
        const index = y * width + x;
        if (!body[index]) continue;
        if (x <= left[y] + inset || x >= right[y] - inset) sidePanels[index] = 1;
      }
    }
  }

  const printable = new Uint8Array(width * height);
  {
    const { left, right } = rowExtents(body, width, height);
    const startY = by + bh * (view === 'front' ? 0.16 : 0.14);
    const endY = by + bh * 0.965;
    for (let y = Math.floor(startY); y < Math.min(height, Math.ceil(endY)); y += 1) {
      if (left[y] < 0) continue;
      const span = right[y] - left[y];
      const inset = Math.round(span * 0.14);
      for (let x = left[y] + inset; x <= right[y] - inset; x += 1) {
        if (body[y * width + x]) printable[y * width + x] = 1;
      }
    }
  }

  const hemTag = new Uint8Array(width * height);
  {
    const { left, right } = rowExtents(body, width, height);
    const tagY = Math.round(by + bh * 0.9);
    const tagH = Math.max(16, Math.round(bh * 0.036));
    const tagW = Math.max(46, Math.round(bw * 0.13));
    for (let y = tagY; y < Math.min(height, tagY + tagH); y += 1) {
      if (left[y] < 0) continue;
      const x1 = right[y] - Math.round((right[y] - left[y]) * 0.12);
      const x0 = x1 - tagW;
      for (let x = x0; x < x1; x += 1) {
        if (body[y * width + x]) hemTag[y * width + x] = 1;
      }
    }
  }

  return { body, sleeve, cuffs, collar, sidePanels, printable, hemTag };
}

function maskToPng(mask, width, height, radius) {
  const alpha = feather(mask, width, height, radius);
  const buffer = Buffer.alloc(width * height * 4);
  for (let index = 0; index < alpha.length; index += 1) {
    const offset = index * 4;
    buffer[offset] = 255;
    buffer[offset + 1] = 255;
    buffer[offset + 2] = 255;
    buffer[offset + 3] = alpha[index];
  }
  return sharp(buffer, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
}

async function writeMask(mask, width, height, radius, target) {
  const png = await maskToPng(mask, width, height, radius);
  await fs.writeFile(target, png);
  return png.length;
}

/**
 * Neutralises the garment to a bright achromatic base.
 *
 * Multiply compositing is how the zone colours keep the photograph's shadows:
 * `colour × white ≈ colour`, and every fold darkens the result exactly as paint
 * on fabric would. That only reads correctly if the base is close to white, so
 * the garment's luminance is remapped around its own median while preserving
 * local contrast.
 */
function neutraliseGarment(data, alpha, width, height) {
  const samples = [];
  for (let index = 0; index < alpha.length; index += 1) {
    if (alpha[index] < 240) continue;
    const offset = index * 4;
    samples.push(luma(data[offset], data[offset + 1], data[offset + 2]));
  }
  const mid = median(samples);
  const gain = 0.62;
  const target = 246;

  const shade = Buffer.alloc(width * height * 4);
  const highlight = Buffer.alloc(width * height * 4);
  const base = Buffer.alloc(width * height * 4);

  for (let index = 0; index < alpha.length; index += 1) {
    const offset = index * 4;
    const value = luma(data[offset], data[offset + 1], data[offset + 2]);
    const mapped = clamp((target + (value - mid) * gain) / 255, 0, 1) * 255;
    base[offset] = mapped;
    base[offset + 1] = mapped;
    base[offset + 2] = mapped;
    base[offset + 3] = alpha[index];

    const normalised = clamp((value - mid) / Math.max(1, mid), -1, 1);
    const shadowAlpha = clamp(-normalised * 1.05, 0, 0.92);
    const highlightAlpha = clamp(normalised * 0.85, 0, 0.62);

    shade[offset] = 0;
    shade[offset + 1] = 0;
    shade[offset + 2] = 0;
    shade[offset + 3] = Math.round(shadowAlpha * 255 * (alpha[index] / 255));

    highlight[offset] = 255;
    highlight[offset + 1] = 250;
    highlight[offset + 2] = 240;
    highlight[offset + 3] = Math.round(highlightAlpha * 255 * (alpha[index] / 255));
  }

  return { base, shade, highlight };
}

/** Draws the studio backdrop and a soft contact shadow, in raw RGBA. */
function createBackdrop(width, height, garmentRect) {
  const buffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const t = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - garmentRect.y - garmentRect.height * 0.3) / (height * 0.9);
      const glow = clamp(1 - Math.sqrt(dx * dx * 1.05 + dy * dy * 1.35)) ** 2;
      const base = 18 + t * 5;
      buffer[offset] = Math.round(base + glow * 16);
      buffer[offset + 1] = Math.round(base + glow * 16);
      buffer[offset + 2] = Math.round(base + 2 + glow * 19);
      buffer[offset + 3] = 255;
    }
  }

  // Contact shadow: a soft ellipse anchored to the hem.
  const shadowCx = garmentRect.x + garmentRect.width / 2;
  const shadowCy = garmentRect.y + garmentRect.height - 6;
  const rx = garmentRect.width * 0.44;
  const ry = garmentRect.height * 0.035;
  for (let y = Math.max(0, Math.floor(shadowCy - ry * 2.2)); y < Math.min(height, shadowCy + ry * 2.2); y += 1) {
    for (let x = Math.max(0, Math.floor(shadowCx - rx)); x < Math.min(width, shadowCx + rx); x += 1) {
      const dx = (x - shadowCx) / rx;
      const dy = (y - shadowCy) / ry;
      const falloff = clamp(1 - (dx * dx + dy * dy));
      if (falloff <= 0) continue;
      const offset = (y * width + x) * 4;
      const darken = falloff * 0.72 * (y > shadowCy ? 1 : 0.55);
      buffer[offset] = Math.round(buffer[offset] * (1 - darken));
      buffer[offset + 1] = Math.round(buffer[offset + 1] * (1 - darken));
      buffer[offset + 2] = Math.round(buffer[offset + 2] * (1 - darken));
    }
  }

  return buffer;
}

async function processView({ source, view, width, height }) {
  const { data, info } = await loadRgba(source);
  const { silhouette } = segmentGarment(data, info.width, info.height);
  const box = boundingBox(silhouette, info.width, info.height);
  if (box.width < 50 || box.height < 50) {
    throw new Error(`Segmentation failed for ${view}: garment box is ${box.width}x${box.height}.`);
  }

  // Alpha for the cutout: binary mask, eroded by one pixel so the photographic
  // edge fringe of the old backdrop never becomes part of the garment.
  const edgeAlpha = feather(silhouette, info.width, info.height, 1);
  const cutoutWidth = box.width;
  const cutoutHeight = box.height;
  const { base, shade, highlight } = neutraliseGarment(data, edgeAlpha, info.width, info.height);

  // Crop all three buffers to the garment box for a tight, consistent resize.
  const crop = (buffer) => {
    const out = Buffer.alloc(cutoutWidth * cutoutHeight * 4);
    for (let y = 0; y < cutoutHeight; y += 1) {
      const sourceRow = ((y + box.y) * info.width + box.x) * 4;
      buffer.copy(out, y * cutoutWidth * 4, sourceRow, sourceRow + cutoutWidth * 4);
    }
    return out;
  };

  const scale = GARMENT.height / cutoutHeight;
  const targetWidth = Math.round(cutoutWidth * scale);
  const targetHeight = GARMENT.height;

  const resize = (buffer) =>
    sharp(buffer, { raw: { width: cutoutWidth, height: cutoutHeight, channels: 4 } })
      .resize({ width: targetWidth, height: targetHeight, kernel: 'lanczos3' })
      .raw()
      .toBuffer();

  const [basePng, shadePng, highlightPng] = await Promise.all([
    resize(crop(base)),
    resize(crop(shade)),
    resize(crop(highlight)),
  ]);

  const garmentRect = {
    x: Math.round((width - targetWidth) / 2),
    y: GARMENT.top,
    width: targetWidth,
    height: targetHeight,
  };

  // Shading and highlight layers must be full-canvas (transparent outside the
  // garment) — the renderer draws them over the whole SVG with no offset.
  const placeOnCanvas = (garmentLocal) => {
    const out = Buffer.alloc(width * height * 4);
    for (let y = 0; y < targetHeight; y += 1) {
      const src = y * targetWidth * 4;
      const dst = ((y + garmentRect.y) * width + garmentRect.x) * 4;
      garmentLocal.copy(out, dst, src, src + targetWidth * 4);
    }
    return out;
  };
  const fullShade = placeOnCanvas(shadePng);
  const fullHighlight = placeOnCanvas(highlightPng);

  const backdrop = createBackdrop(width, height, garmentRect);
  const composite = await sharp(backdrop, { raw: { width, height, channels: 4 } })
    .composite([
      { input: basePng, raw: { width: targetWidth, height: targetHeight, channels: 4 }, left: garmentRect.x, top: garmentRect.y },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Masks are generated at final canvas size so they can be dropped straight
  // into the SVG with no transform maths.
  const resizedAlpha = await sharp(basePng, { raw: { width: targetWidth, height: targetHeight, channels: 4 } })
    .extractChannel(3)
    .raw()
    .toBuffer();

  const fullMask = new Uint8Array(width * height);
  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      if (resizedAlpha[y * targetWidth + x] > 127) {
        fullMask[(y + garmentRect.y) * width + (x + garmentRect.x)] = 1;
      }
    }
  }

  const garmentBox = {
    x: garmentRect.x,
    y: garmentRect.y,
    width: garmentRect.width,
    height: garmentRect.height,
  };
  const zones = buildZoneMasks({ silhouette: fullMask, width, height, box: garmentBox, view });

  return {
    composite,
    shadePng: fullShade,
    highlightPng: fullHighlight,
    fullMask,
    zones,
    garmentBox,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = {
    front: await resolveSource(args.front, 'front'),
    back: await resolveSource(args.back, 'back'),
  };

  const { width, height } = CANVAS;
  const manifest = {
    model: 'groove-boxy-tee-v2',
    renderer: 'photo-ingest-v1',
    note: 'Photography-derived mockup. Supports the same manifest contract as scripts/build-apparel-render.mjs (rendered studio mockup).',
    generatedAt: new Date().toISOString(),
    canvas: { width, height },
    viewBox: { width, height },
    views: {},
  };

  for (const view of ['front', 'back']) {
    process.stdout.write(`\n→ ${view}: ${path.relative(ROOT, sources[view])}\n`);
    const result = await processView({ source: sources[view], view, width, height });
    const dir = path.join(OUT_ROOT, view);
    await fs.mkdir(path.join(dir, 'masks'), { recursive: true });

    await fs.writeFile(path.join(dir, 'mockup.png'), result.composite);

    await sharp(result.shadePng, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, 'shading.png'));
    await sharp(result.highlightPng, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, 'highlight.png'));

    const maskFiles = {
      silhouette: ['silhouette-mask.png', result.fullMask, 0],
      body: ['body-mask.png', result.zones.body, 1],
      'left-sleeve': ['left-sleeve-mask.png', null, 1],
      'right-sleeve': ['right-sleeve-mask.png', null, 1],
      cuffs: ['cuffs-mask.png', result.zones.cuffs, 1],
      collar: ['collar-mask.png', result.zones.collar, 1],
      'side-panels': ['side-panels-mask.png', result.zones.sidePanels, 1],
      'hem-tag': ['hem-tag-mask.png', result.zones.hemTag, 3],
      printable: ['printable-mask.png', result.zones.printable, 1],
    };

    // Split the sleeve mask down the middle so the two sleeves can be coloured
    // independently while staying perfectly symmetrical with the photo.
    const leftSleeve = new Uint8Array(width * height);
    const rightSleeve = new Uint8Array(width * height);
    const centreX = result.garmentBox.x + result.garmentBox.width / 2;
    for (let index = 0; index < result.zones.sleeve.length; index += 1) {
      if (!result.zones.sleeve[index]) continue;
      const x = index % width;
      if (x < centreX) leftSleeve[index] = 1;
      else rightSleeve[index] = 1;
    }
    maskFiles['left-sleeve'][1] = leftSleeve;
    maskFiles['right-sleeve'][1] = rightSleeve;

    const boxes = {};
    for (const [key, [file, mask, radius]] of Object.entries(maskFiles)) {
      await writeMask(mask, width, height, radius, path.join(dir, 'masks', file));
      boxes[key] = boundingBox(mask, width, height);
    }

    const m = createMatrixCheck(result.fullMask, result.zones);
    manifest.views[view] = {
      mockup: `/assets/apparel/boxy-tee/${view}/mockup.png`,
      mockupFallback: `/assets/apparel/boxy-tee/${view}/mockup.png`,
      shading: `/assets/apparel/boxy-tee/${view}/shading.png`,
      highlight: `/assets/apparel/boxy-tee/${view}/highlight.png`,
      garment: result.garmentBox,
      masks: Object.fromEntries(
        Object.entries(maskFiles).map(([key, [file]]) => [key, `/assets/apparel/boxy-tee/${view}/masks/${file}`])
      ),
      boxes,
      coverage: m,
    };

    process.stdout.write(
      `  garment ${result.garmentBox.width}×${result.garmentBox.height} @ ${result.garmentBox.x},${result.garmentBox.y}\n` +
        `  coverage  body ${m.body.toFixed(1)}% · sleeves ${m.sleeves.toFixed(1)}% · collar ${m.collar.toFixed(
          1
        )}% · panels ${m.panels.toFixed(1)}% · printable ${m.printable.toFixed(1)}%\n` +
        `  leaks     outside-silhouette ${m.outside.toFixed(2)}% of garment\n`
    );
  }

  await fs.writeFile(path.join(OUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const report = {
    generatedAt: manifest.generatedAt,
    canvas: manifest.canvas,
    views: Object.fromEntries(
      Object.entries(manifest.views).map(([view, data]) => [view, { garment: data.garment, coverage: data.coverage }])
    ),
  };
  await fs.writeFile(path.join(OUT_ROOT, 'validation.json'), `${JSON.stringify(report, null, 2)}\n`);

  process.stdout.write(`\n✓ assets written to ${path.relative(ROOT, OUT_ROOT)}\n`);
}

function createMatrixCheck(silhouette, zones) {
  const total = silhouette.reduce((sum, value) => sum + value, 0) || 1;
  const count = (mask) => mask.reduce((sum, value) => sum + value, 0);
  const union = new Uint8Array(silhouette.length);
  for (const mask of [zones.body, zones.sleeve, zones.collar]) {
    for (let index = 0; index < mask.length; index += 1) if (mask[index]) union[index] = 1;
  }
  let outside = 0;
  for (let index = 0; index < union.length; index += 1) {
    if (union[index] && !silhouette[index]) outside += 1;
  }
  return {
    body: (count(zones.body) / total) * 100,
    sleeves: (count(zones.sleeve) / total) * 100,
    collar: (count(zones.collar) / total) * 100,
    panels: (count(zones.sidePanels) / total) * 100,
    printable: (count(zones.printable) / total) * 100,
    union: (count(union) / total) * 100,
    outside: (outside / total) * 100,
  };
}

main().catch((error) => {
  process.stderr.write(`\n✗ ${error.stack ?? error.message}\n`);
  process.exit(1);
});
