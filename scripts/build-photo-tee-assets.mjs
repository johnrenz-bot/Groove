#!/usr/bin/env node
/**
 * Photo-derived apparel asset pipeline for the Groove PH tee customizer.
 *
 * Sources the ACTUAL garment photographs under public/image/Shirts/
 * (Front/image.png, Back/image.png — 1536 x 1024 RGBA, garment on true
 * transparency) and derives everything the editor needs, pixel-aligned with
 * the source art:
 *
 *   mockup.png           neutralised near-white base on transparency
 *   shading.png          multiply shadow map derived from the photo
 *   highlight.png        screen highlight map derived from the photo
 *   masks/*-mask.png     white-on-transparent zone masks
 *   manifest.json        canvas + paths + bounding boxes + coverage
 *   validation.json      machine-checked coverage report
 *
 * Originals are never modified; derived assets land in a separate folder.
 *
 * Mask derivation (no arbitrary rectangles):
 *   silhouette   the source alpha channel, feathered 1px
 *   sleeves      silhouette outside the tapered torso width, split L/R at the
 *                garment's centre line, limited vertically to the sleeve span
 *   cuffs        band hugging the diagonal lower edge of each sleeve
 *   collar       per-view ellipse ring fitted around the visible neckband,
 *                intersected with the silhouette
 *   body         silhouette minus sleeves/collar
 *   printable    torso inset (13% per side), clipped to the body mask
 *
 * Side panels and hem tag do not exist on this garment and are deliberately
 * NOT faked. See validation.json for coverage + leakage checks.
 *
 * Usage:
 *   node scripts/build-photo-tee-assets.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = {
  front: path.join(ROOT, 'public/image/Shirts/Front/image.png'),
  back: path.join(ROOT, 'public/image/Shirts/Back/image.png'),
};
const OUT_ROOT = path.join(ROOT, 'public/assets/apparel/groove-photo-tee');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
};
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

function boundingBox(mask, width, height) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (!mask[row + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Feather-edged alpha channel from a binary mask (double box blur). */
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
      for (let y = -radius; y <= radius; y += 1) sum += horizontal[clamp(y, 0, height - 1) * width + x];
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

/**
 * Neutralises the garment to a bright achromatic base so multiply compositing
 * (zone colours × base) stays accurate. Deviations around the median are
 * compressed but preserved — folds survive. Alpha is the feathered silhouette;
 * the background stays fully transparent.
 */
function neutraliseGarment(data, edgeAlpha, width, height) {
  const samples = [];
  for (let index = 0; index < edgeAlpha.length; index += 1) {
    if (edgeAlpha[index] < 240) continue;
    const offset = index * 4;
    samples.push(luma(data[offset], data[offset + 1], data[offset + 2]));
  }
  const mid = median(samples);
  const gain = 0.62;
  const target = 246;

  const shade = Buffer.alloc(width * height * 4);
  const highlight = Buffer.alloc(width * height * 4);
  const base = Buffer.alloc(width * height * 4);

  for (let index = 0; index < edgeAlpha.length; index += 1) {
    const offset = index * 4;
    const value = luma(data[offset], data[offset + 1], data[offset + 2]);
    const mapped = clamp((target + (value - mid) * gain) / 255, 0, 1) * 255;
    base[offset] = mapped;
    base[offset + 1] = mapped;
    base[offset + 2] = mapped;
    base[offset + 3] = edgeAlpha[index];

    const normalised = clamp((value - mid) / Math.max(1, mid), -1, 1);
    const shadowAlpha = clamp(-normalised * 1.05, 0, 0.92);
    const highlightAlpha = clamp(normalised * 0.85, 0, 0.62);

    shade[offset + 3] = Math.round(shadowAlpha * 255 * (edgeAlpha[index] / 255));
    highlight[offset] = 255;
    highlight[offset + 1] = 250;
    highlight[offset + 2] = 240;
    highlight[offset + 3] = Math.round(highlightAlpha * 255 * (edgeAlpha[index] / 255));
  }

  return { base, shade, highlight, mid };
}

function ellipse(cx, cy, rx, ry) {
  return (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
}

function buildZoneMasks({ silhouette, width, height, box, view }) {
  const { x: bx, y: by, width: bw, height: bh } = box;
  const cx = bx + bw / 2;

  const shoulderY = by + bh * 0.05;
  const cuffBottomY = by + bh * 0.635;

  // Sleeves: silhouette outside the tapered torso, within the sleeve span.
  const sleeve = new Uint8Array(width * height);
  for (let y = Math.floor(shoulderY); y < Math.min(height, Math.ceil(cuffBottomY)); y += 1) {
    const t = smoothstep(0, 1, (y - shoulderY) / Math.max(1, cuffBottomY - shoulderY));
    const halfTorso = bw * (0.27 + 0.055 * t);
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (!silhouette[row + x]) continue;
      if (Math.abs(x - cx) > halfTorso) sleeve[row + x] = 1;
    }
  }

  const leftSleeve = new Uint8Array(width * height);
  const rightSleeve = new Uint8Array(width * height);
  for (let index = 0; index < sleeve.length; index += 1) {
    if (!sleeve[index]) continue;
    if (index % width < cx) leftSleeve[index] = 1;
    else rightSleeve[index] = 1;
  }

  // Cuff bands follow the diagonal lower edge of each sleeve (column-based).
  const cuffs = new Uint8Array(width * height);
  const cuffDepth = Math.round(bh * 0.055);
  {
    const columnBottom = new Int32Array(width).fill(-1);
    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        if (sleeve[row + x]) columnBottom[x] = y;
      }
    }
    for (let x = 0; x < width; x += 1) {
      if (columnBottom[x] < 0) continue;
      for (let y = Math.max(0, columnBottom[x] - cuffDepth); y <= columnBottom[x]; y += 1) {
        if (sleeve[y * width + x]) cuffs[y * width + x] = 1;
      }
    }
  }

  // Collar: ellipse ring fitted to the visible neckband, clipped to silhouette.
  const collar = new Uint8Array(width * height);
  {
    const params =
      view === 'front'
        ? { outer: [cx, by + 71, bw * 0.136, bh * 0.080], inner: [cx, by + 55, bw * 0.106, bh * 0.053], limit: by + bh * 0.175 }
        : { outer: [cx, by + 24, bw * 0.13, bh * 0.046], inner: [cx, by + 12, bw * 0.098, bh * 0.019], limit: by + bh * 0.115 };
    const outer = ellipse(...params.outer);
    const inner = ellipse(...params.inner);
    for (let y = by; y < Math.min(height, Math.ceil(params.limit)); y += 1) {
      const row = y * width;
      for (let x = bx; x < bx + bw; x += 1) {
        const index = row + x;
        if (!silhouette[index]) continue;
        const o = outer(x, y);
        const i = inner(x, y);
        if (o <= 1 && i >= 1) collar[index] = 1;
      }
    }
  }

  const body = new Uint8Array(width * height);
  for (let index = 0; index < body.length; index += 1) {
    if (silhouette[index] && !sleeve[index] && !collar[index]) body[index] = 1;
  }

  // Printable: torso inset (13% per side), clipped to the body mask.
  const printable = new Uint8Array(width * height);
  {
    const left = new Int32Array(height).fill(-1);
    const right = new Int32Array(height).fill(-1);
    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        if (body[row + x]) {
          if (left[y] < 0) left[y] = x;
          right[y] = x;
        }
      }
    }
    const startY = by + bh * (view === 'front' ? 0.165 : 0.145);
    const endY = by + bh * 0.93;
    for (let y = Math.floor(startY); y < Math.min(height, endY); y += 1) {
      if (left[y] < 0) continue;
      const span = right[y] - left[y];
      const inset = Math.round(span * 0.13);
      for (let x = left[y] + inset; x <= right[y] - inset; x += 1) {
        if (body[y * width + x]) printable[y * width + x] = 1;
      }
    }
  }

  return { body, sleeve, leftSleeve, rightSleeve, cuffs, collar, printable };
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

const count = (mask) => mask.reduce((sum, value) => sum + value, 0);

async function processView(view) {
  const file = SOURCE[view];
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const silhouette = new Uint8Array(width * height);
  for (let index = 0; index < silhouette.length; index += 1) {
    silhouette[index] = data[index * 4 + 3] >= 128 ? 1 : 0;
  }
  const box = boundingBox(silhouette, width, height);
  console.log(`→ ${view}: ${path.relative(ROOT, file)} (${width}x${height}) garment box x:[${box.x}..${box.x + box.width - 1}] y:[${box.y}..${box.y + box.height - 1}] (${box.width}x${box.height})`);

  const edgeAlpha = feather(silhouette, width, height, 1);
  const { base, shade, highlight, mid } = neutraliseGarment(data, edgeAlpha, width, height);
  const zones = buildZoneMasks({ silhouette, width, height, box, view });

  const dir = path.join(OUT_ROOT, view);
  await fs.mkdir(path.join(dir, 'masks'), { recursive: true });

  const basePng = await sharp(base, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  await fs.writeFile(path.join(dir, 'mockup.png'), basePng);
  await sharp(shade, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(dir, 'shading.png'));
  await sharp(highlight, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(dir, 'highlight.png'));

  const maskFiles = {
    silhouette: ['silhouette-mask.png', silhouette, 1],
    body: ['body-mask.png', zones.body, 1],
    'left-sleeve': ['left-sleeve-mask.png', zones.leftSleeve, 1],
    'right-sleeve': ['right-sleeve-mask.png', zones.rightSleeve, 1],
    cuffs: ['cuffs-mask.png', zones.cuffs, 1],
    collar: ['collar-mask.png', zones.collar, 1],
    printable: ['printable-mask.png', zones.printable, 1],
  };

  const masksPng = {};
  const boxes = {};
  for (const [key, [fileName, mask, radius]] of Object.entries(maskFiles)) {
    const png = await maskToPng(mask, width, height, radius);
    await fs.writeFile(path.join(dir, 'masks', fileName), png);
    masksPng[key] = png;
    boxes[key] = boundingBox(mask, width, height);
  }

  const total = count(silhouette) || 1;
  const coverage = {
    silhouette: 100,
    body: (count(zones.body) / total) * 100,
    sleeves: (count(zones.sleeve) / total) * 100,
    cuffs: (count(zones.cuffs) / total) * 100,
    collar: (count(zones.collar) / total) * 100,
    printable: (count(zones.printable) / total) * 100,
  };
  // Leak check: no zone pixel may fall outside the silhouette.
  let leaks = 0;
  for (const zone of [zones.body, zones.sleeve, zones.collar, zones.cuffs, zones.printable]) {
    for (let index = 0; index < zone.length; index += 1) {
      if (zone[index] && !silhouette[index]) leaks += 1;
    }
  }
  coverage.leakPixelsOutsideSilhouette = leaks;

  console.log(
    `  coverage  body ${coverage.body.toFixed(1)}% · sleeves ${coverage.sleeves.toFixed(1)}% · cuffs ${coverage.cuffs.toFixed(1)}% · collar ${coverage.collar.toFixed(1)}% · printable ${coverage.printable.toFixed(1)}%`,
  );
  console.log(`  leaks     ${leaks} zone pixels outside silhouette (must be 0)`);
  console.log(`  luma mid  ${mid.toFixed(1)} (neutralised toward 246)`);

  return {
    meta: { width, height },
    box,
    boxes,
    coverage,
    masksPng,
    source: `image/Shirts/${view[0].toUpperCase()}${view.slice(1)}/image.png`,
  };
}

async function main() {
  const started = Date.now();
  const results = {};
  for (const view of ['front', 'back']) {
    results[view] = await processView(view);
  }

  const { width, height } = results.front.meta;
  const manifest = {
    model: 'groove-photo-tee-v1',
    renderer: 'photo-alpha-ingest-v1',
    note: 'Photographic mockup derived from public/image/Shirts/<View>/image.png (garment on native transparency). Originals unmodified; base neutrally white-balanced for multiply zone compositing.',
    generatedAt: new Date().toISOString(),
    canvas: { width, height },
    viewBox: { width, height },
    views: {},
  };

  for (const view of ['front', 'back']) {
    const r = results[view];
    manifest.views[view] = {
      mockup: `/assets/apparel/groove-photo-tee/${view}/mockup.png`,
      mockupFallback: `/assets/apparel/groove-photo-tee/${view}/mockup.png`,
      sourceMockup: `/image/Shirts/${view[0].toUpperCase()}${view.slice(1)}/image.png`,
      shading: `/assets/apparel/groove-photo-tee/${view}/shading.png`,
      highlight: `/assets/apparel/groove-photo-tee/${view}/highlight.png`,
      garment: r.box,
      masks: Object.fromEntries(
        ['silhouette', 'body', 'left-sleeve', 'right-sleeve', 'cuffs', 'collar', 'printable'].map((key) => [
          key,
          `/assets/apparel/groove-photo-tee/${view}/masks/${key}-mask.png`,
        ]),
      ),
      boxes: r.boxes,
      coverage: r.coverage,
    };
  }

  await fs.writeFile(path.join(OUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(
    path.join(OUT_ROOT, 'validation.json'),
    `${JSON.stringify({ generatedAt: manifest.generatedAt, canvas: manifest.canvas, views: Object.fromEntries(Object.entries(manifest.views).map(([v, d]) => [v, { garment: d.garment, coverage: d.coverage, boxes: d.boxes }])) }, null, 2)}\n`,
  );

  console.log(`\n✓ photo assets written to ${path.relative(ROOT, OUT_ROOT)} in ${Date.now() - started}ms`);
}

main().catch((error) => {
  console.error(`\n✗ ${error.stack ?? error.message}`);
  process.exit(1);
});
