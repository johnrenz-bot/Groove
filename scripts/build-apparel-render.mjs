#!/usr/bin/env node
/**
 * Groove PH — apparel mockup renderer.
 *
 * Renders the boxy tee base garment, its zone masks and its shading layers as
 * raster assets. Everything comes from ONE parametric garment geometry, so the
 * body / sleeve / collar / panel masks are pixel-aligned with the mockup by
 * construction — no hand-drawn mask can drift.
 *
 * Honest scope note: this is a rendered studio garment, not a photograph. It is
 * built to read like a lit product shot (continuous silhouette, form shading,
 * creases, seams, ribbing, fabric grain, contact shadow), but it is computer
 * graphics. To use real photography instead, run
 * scripts/build-apparel-assets.mjs --front <p> --back <p>; it emits the same
 * manifest contract.
 *
 * Output (public/assets/apparel/boxy-tee/<view>/):
 *   mockup.webp            neutral base garment on the studio backdrop
 *   mockup-photo.png       same image as PNG for export/compat
 *   shading.png            multiply shadow map for printed artwork
 *   highlight.png          soft-light highlight map for printed artwork
 *   masks/*.png            white = editable, transparent = excluded
 *   ../manifest.json       dimensions, rects and coverage validation
 *
 * Usage:
 *   node scripts/build-apparel-render.mjs
 *   node scripts/build-apparel-render.mjs --debug   # stage contact sheet
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_ROOT = path.join(ROOT, 'public/assets/apparel/boxy-tee');
const DEBUG = process.argv.includes('--debug');
const W = 1200;
const H = 1440;

/**
 * Parametric garment geometry, in output pixels.
 *
 * Proportions follow a flat-lay boxy tee: body length ≈ 1.17 × body width,
 * shoulder slope ≈ 14° off horizontal, sleeve axis ≈ 25° below horizontal, and
 * the cuff opening perpendicular to that axis.
 */
const GEO = {
  cx: 600,
  neckY: 262,
  neckHalf: 104,
  // Neckline depth is per-view (see VIEWS).
  shoulderX: 906,
  shoulderY: 336,
  // Sleeve end: `cuffOuter` is the outer corner of the cuff opening, and
  // `cuffInner` is derived perpendicular to the sleeve axis.
  cuffOuterX: 1086,
  cuffOuterY: 410,
  sleeveLength: 150,
  // Torso.
  armpitX: 930,
  armpitY: 486,
  hemX: 952,
  hemY: 1160,
  panelX: 848,
  bandDepth: 34,
  cuffBandDepth: 44,
  holeDepth: 64,
};

/** Cuff opening corner derived from the sleeve axis, so it stays perpendicular. */
const axis = (() => {
  const dx = GEO.cuffOuterX - GEO.shoulderX;
  const dy = GEO.cuffOuterY - GEO.shoulderY;
  const length = Math.hypot(dx, dy);
  return { x: dx / length, y: dy / length, length };
})();
/** Perpendicular pointing down-inward: the direction of the cuff opening. */
const perp = { x: -axis.y, y: axis.x };

const CUFF_INNER = {
  x: GEO.cuffOuterX + perp.x * GEO.sleeveLength,
  y: GEO.cuffOuterY + perp.y * GEO.sleeveLength,
};

const VIEWS = {
  front: { neckDrop: 140, yoke: false },
  back: { neckDrop: 88, yoke: true },
};

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

const mirrorX = (value) => GEO.cx * 2 - value;

function pathFromPoints(points, close = false) {
  const p = new Path2D();
  p.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) p.lineTo(point.x, point.y);
  if (close) p.closePath();
  return p;
}

/**
 * Neckline sampled from the same cubic the silhouette uses.
 *
 * `depth` shifts the control points, which is how the neckband, the hole and
 * the back band are all derived from one curve — they cannot drift apart.
 */
function neckCurve(neckDrop, depth = 0, count = 96) {
  const { cx, neckY, neckHalf } = GEO;
  const control = (neckDrop + depth) * 0.92;
  const points = [];
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const u = 1 - t;
    const x = u * u * u * (cx - neckHalf) + 3 * u * u * t * (cx - 50) + 3 * u * t * t * (cx + 50) + t * t * t * (cx + neckHalf);
    const y = u * u * u * neckY + 3 * u * u * t * (neckY + control) + 3 * u * t * t * (neckY + control) + t * t * t * neckY;
    points.push({ x, y });
  }
  return points;
}

/** Continuous outer silhouette: neckline, shoulders, sleeves, body, hem. */
function outlinePath(neckDrop) {
  const g = GEO;
  const p = new Path2D();
  p.moveTo(g.cx - g.neckHalf, g.neckY);
  p.bezierCurveTo(g.cx - 50, g.neckY + neckDrop * 0.92, g.cx + 50, g.neckY + neckDrop * 0.92, g.cx + g.neckHalf, g.neckY);
  // Shoulder into the sleeve cap: one smooth run from the neckline to the
  // sleeve's outer corner, so no corner appears at the shoulder point.
  p.bezierCurveTo(g.cx + 232, g.neckY + 12, g.cx + 272, g.neckY + 40, g.shoulderX, g.shoulderY);
  // Sleeve top edge.
  p.bezierCurveTo(
    g.cuffOuterX - 106,
    g.cuffOuterY - 42,
    g.cuffOuterX - 40,
    g.cuffOuterY - 16,
    g.cuffOuterX,
    g.cuffOuterY
  );
  // Cuff opening: perpendicular to the sleeve axis, slightly bowed.
  p.bezierCurveTo(
    g.cuffOuterX + perp.x * 52 + axis.x * 10,
    g.cuffOuterY + perp.y * 52 + axis.y * 10,
    CUFF_INNER.x - perp.x * 50 + axis.x * 8,
    CUFF_INNER.y - perp.y * 50 + axis.y * 8,
    CUFF_INNER.x,
    CUFF_INNER.y
  );
  // Underarm seam back to the armpit.
  p.bezierCurveTo(CUFF_INNER.x - axis.x * 44, CUFF_INNER.y - axis.y * 44, g.armpitX + 24, g.armpitY + 46, g.armpitX, g.armpitY);
  // Side seam to the hem.
  p.bezierCurveTo(g.armpitX + 6, 720, g.hemX, 1010, g.hemX, g.hemY);
  p.lineTo(mirrorX(g.hemX), g.hemY);
  p.bezierCurveTo(mirrorX(g.hemX), 1010, mirrorX(g.armpitX) - 6, 720, mirrorX(g.armpitX), g.armpitY);
  p.bezierCurveTo(
    mirrorX(g.armpitX) - 24,
    g.armpitY + 46,
    mirrorX(CUFF_INNER.x) + axis.x * 44,
    CUFF_INNER.y - axis.y * 44,
    mirrorX(CUFF_INNER.x),
    CUFF_INNER.y
  );
  p.bezierCurveTo(
    mirrorX(CUFF_INNER.x - perp.x * 50 + axis.x * 8),
    CUFF_INNER.y - perp.y * 50 + axis.y * 8,
    mirrorX(g.cuffOuterX + perp.x * 52 + axis.x * 10),
    g.cuffOuterY + perp.y * 52 + axis.y * 10,
    mirrorX(g.cuffOuterX),
    g.cuffOuterY
  );
  p.bezierCurveTo(
    mirrorX(g.cuffOuterX - 40),
    g.cuffOuterY - 16,
    mirrorX(g.cuffOuterX - 106),
    g.cuffOuterY - 42,
    mirrorX(g.shoulderX),
    g.shoulderY
  );
  p.bezierCurveTo(mirrorX(g.cx + 272), g.neckY + 40, mirrorX(g.cx + 232), g.neckY + 12, g.cx - g.neckHalf, g.neckY);
  p.closePath();
  return p;
}

/** Torso only: body / panel / printable masks. */
function torsoPath(neckDrop) {
  const g = GEO;
  const p = new Path2D();
  p.moveTo(g.cx - g.neckHalf, g.neckY);
  p.bezierCurveTo(g.cx - 50, g.neckY + neckDrop * 0.92, g.cx + 50, g.neckY + neckDrop * 0.92, g.cx + g.neckHalf, g.neckY);
  p.bezierCurveTo(g.cx + 232, g.neckY + 12, g.cx + 272, g.neckY + 40, g.shoulderX, g.shoulderY);
  p.bezierCurveTo(g.armpitX - 26, g.shoulderY + 40, g.armpitX - 8, g.armpitY - 44, g.armpitX, g.armpitY);
  p.bezierCurveTo(g.armpitX + 6, 720, g.hemX, 1010, g.hemX, g.hemY);
  p.lineTo(mirrorX(g.hemX), g.hemY);
  p.bezierCurveTo(mirrorX(g.hemX), 1010, mirrorX(g.armpitX) - 6, 720, mirrorX(g.armpitX), g.armpitY);
  p.bezierCurveTo(
    mirrorX(g.armpitX) + 8,
    g.armpitY - 44,
    mirrorX(g.armpitX) + 26,
    g.shoulderY + 40,
    mirrorX(g.shoulderX),
    g.shoulderY
  );
  p.bezierCurveTo(mirrorX(g.cx + 272), g.neckY + 40, mirrorX(g.cx + 232), g.neckY + 12, g.cx - g.neckHalf, g.neckY);
  p.closePath();
  return p;
}

function sleevePath(side) {
  const g = GEO;
  const x = (value) => (side === 'left' ? mirrorX(value) : value);
  const p = new Path2D();
  p.moveTo(x(g.shoulderX), g.shoulderY);
  p.bezierCurveTo(
    x(g.cuffOuterX - 106),
    g.cuffOuterY - 42,
    x(g.cuffOuterX - 40),
    g.cuffOuterY - 16,
    x(g.cuffOuterX),
    g.cuffOuterY
  );
  p.bezierCurveTo(
    x(g.cuffOuterX + perp.x * 52 + axis.x * 10),
    g.cuffOuterY + perp.y * 52 + axis.y * 10,
    x(CUFF_INNER.x - perp.x * 50 + axis.x * 8),
    CUFF_INNER.y - perp.y * 50 + axis.y * 8,
    x(CUFF_INNER.x),
    CUFF_INNER.y
  );
  p.bezierCurveTo(
    x(CUFF_INNER.x - axis.x * 44),
    CUFF_INNER.y - axis.y * 44,
    x(g.armpitX + 24),
    g.armpitY + 46,
    x(g.armpitX),
    g.armpitY
  );
  p.bezierCurveTo(
    x(g.armpitX - 8),
    g.armpitY - 44,
    x(g.armpitX - 26),
    g.shoulderY + 40,
    x(g.shoulderX),
    g.shoulderY
  );
  p.closePath();
  return p;
}

/**
 * Ribbed band at the cuff end of the sleeve: the quad between the cuff opening
 * and that same line pushed back along the sleeve axis.
 */
function cuffPath(side) {
  const g = GEO;
  const x = (value) => (side === 'left' ? mirrorX(value) : value);
  const back = (point, distance) => ({
    x: point.x - axis.x * distance,
    y: point.y - axis.y * distance,
  });
  const outer = { x: g.cuffOuterX, y: g.cuffOuterY };
  const inner = CUFF_INNER;
  const outerBack = back(outer, g.cuffBandDepth);
  const innerBack = back(inner, g.cuffBandDepth);
  const p = new Path2D();
  p.moveTo(x(outer.x), outer.y);
  p.lineTo(x(inner.x), inner.y);
  p.lineTo(x(innerBack.x), innerBack.y);
  p.lineTo(x(outerBack.x), outerBack.y);
  p.closePath();
  return p;
}

/** Ribbed band sewn to the neckline, lying on the chest. */
function collarPath(neckDrop) {
  const outer = neckCurve(neckDrop, 0, 96);
  const inner = neckCurve(neckDrop, GEO.bandDepth, 96);
  const p = new Path2D();
  p.moveTo(outer[0].x, outer[0].y);
  for (const point of outer.slice(1)) p.lineTo(point.x, point.y);
  for (let index = inner.length - 1; index >= 0; index -= 1) p.lineTo(inner[index].x, inner[index].y);
  p.closePath();
  return p;
}

/** Inside of the neck opening: the crescent above the neckline. */
function neckHolePath(neckDrop) {
  const bottom = neckCurve(neckDrop, 0, 72);
  const top = neckCurve(neckDrop, -GEO.holeDepth, 72);
  const p = new Path2D();
  p.moveTo(bottom[0].x, bottom[0].y);
  for (const point of bottom.slice(1)) p.lineTo(point.x, point.y);
  for (let index = top.length - 1; index >= 0; index -= 1) p.lineTo(top[index].x, top[index].y);
  p.closePath();
  return p;
}

/** Back neckband seen through the opening. */
function backBandPath(neckDrop) {
  const bottom = neckCurve(neckDrop, -GEO.holeDepth + 18, 72);
  const top = neckCurve(neckDrop, -GEO.holeDepth, 72);
  const p = new Path2D();
  p.moveTo(top[0].x, top[0].y);
  for (const point of top.slice(1)) p.lineTo(point.x, point.y);
  for (let index = bottom.length - 1; index >= 0; index -= 1) p.lineTo(bottom[index].x, bottom[index].y);
  p.closePath();
  return p;
}

function panelPath(side) {
  const g = GEO;
  const x = (value) => (side === 'left' ? mirrorX(value) : value);
  const p = new Path2D();
  p.moveTo(x(g.panelX + 5), 556);
  p.bezierCurveTo(x(g.panelX + 7), 760, x(g.panelX), 980, x(g.panelX - 12), g.hemY + 8);
  p.lineTo(x(g.hemX + 46), g.hemY + 8);
  p.lineTo(x(g.hemX + 46), 572);
  p.closePath();
  return p;
}

function printablePath() {
  const g = GEO;
  const p = new Path2D();
  p.moveTo(g.cx - 250, 516);
  p.lineTo(g.cx + 250, 516);
  p.lineTo(g.cx + 254, 1096);
  p.lineTo(g.cx - 254, 1096);
  p.closePath();
  return p;
}

function hemTagPath() {
  const p = new Path2D();
  const x = 716;
  const y = 1106;
  const w = 88;
  const h = 32;
  const r = 5;
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  p.closePath();
  return p;
}

/* ------------------------------------------------------------------ */
/* Painting helpers                                                    */
/* ------------------------------------------------------------------ */

function makeCanvas(width = W, height = H) {
  const canvas = createCanvas(width, height);
  return { canvas, ctx: canvas.getContext('2d') };
}

/** Solid, blurred bezier stroke: gaussian falloff with no gradient banding. */
function softLine(ctx, points, { color, blur, width, alpha }) {
  const p = new Path2D();
  p.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 3) {
    p.bezierCurveTo(
      points[index][0],
      points[index][1],
      points[index + 1][0],
      points[index + 1][1],
      points[index + 2][0],
      points[index + 2][1]
    );
  }
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke(p);
  ctx.restore();
}

function strokePath(ctx, path, color, width, alpha = 1, dash = null) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.stroke(path);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Noise                                                               */
/* ------------------------------------------------------------------ */

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695040) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbm(x, y, seed, octaves = 4) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let index = 0; index < octaves; index += 1) {
    sum += valueNoise(x * frequency, y * frequency, seed + index * 31) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum / norm;
}

function grainCanvas(strength) {
  const { canvas, ctx } = makeCanvas();
  const image = ctx.createImageData(W, H);
  let seed = 20240517;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let index = 0; index < image.data.length; index += 4) {
    const value = 128 + (random() - 0.5) * 255 * strength;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/* ------------------------------------------------------------------ */
/* Backdrop                                                            */
/* ------------------------------------------------------------------ */

function drawBackdrop(ctx) {
  const vertical = ctx.createLinearGradient(0, 0, 0, H);
  vertical.addColorStop(0, '#1f2024');
  vertical.addColorStop(0.46, '#16171a');
  vertical.addColorStop(1, '#090909');
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(530, 420, 40, 600, 560, 860);
  glow.addColorStop(0, 'rgba(146,154,172,0.26)');
  glow.addColorStop(0.42, 'rgba(104,110,126,0.10)');
  glow.addColorStop(1, 'rgba(60,64,74,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(590, 640, 430, 600, 700, 1010);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.76)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(grainCanvas(0.045), 0, 0);
  ctx.restore();
}

function drawContactShadow(ctx) {
  const { canvas } = makeCanvas(820, 260);
  const sctx = canvas.getContext('2d');
  const gradient = sctx.createRadialGradient(410, 130, 8, 410, 130, 410);
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(0.42, 'rgba(0,0,0,0.26)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = gradient;
  sctx.fillRect(0, 0, 820, 260);
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(canvas, GEO.cx - 410, GEO.hemY + 12 - 130);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Garment                                                             */
/* ------------------------------------------------------------------ */

function drawBaseGarment(ctx, neckDrop) {
  const fill = ctx.createLinearGradient(0, GEO.neckY, 0, GEO.hemY);
  fill.addColorStop(0, '#fdfcfa');
  fill.addColorStop(0.42, '#fbfaf7');
  fill.addColorStop(0.8, '#f8f6f2');
  fill.addColorStop(1, '#f4f1eb');
  ctx.fillStyle = fill;
  ctx.fill(outlinePath(neckDrop));
}

function drawNeckOpening(ctx, neckDrop) {
  const g = GEO;
  const hole = neckHolePath(neckDrop);

  const depth = ctx.createLinearGradient(0, g.neckY - g.holeDepth - 6, 0, g.neckY + 14);
  depth.addColorStop(0, '#4b453e');
  depth.addColorStop(0.55, '#5b544b');
  depth.addColorStop(1, '#6d655a');
  ctx.fillStyle = depth;
  ctx.fill(hole);

  // Back panel catches light near its top edge.
  ctx.save();
  ctx.clip(hole);
  const hit = ctx.createLinearGradient(0, g.neckY - g.holeDepth, 0, g.neckY - 6);
  hit.addColorStop(0, 'rgba(216,206,192,0.55)');
  hit.addColorStop(1, 'rgba(216,206,192,0)');
  ctx.fillStyle = hit;
  ctx.fillRect(370, g.neckY - g.holeDepth - 10, 460, g.holeDepth + 20);
  ctx.restore();

  // Back neckband.
  const band = backBandPath(neckDrop);
  ctx.save();
  const bandFill = ctx.createLinearGradient(0, g.neckY - g.holeDepth, 0, g.neckY - g.holeDepth + 22);
  bandFill.addColorStop(0, '#d8cfc3');
  bandFill.addColorStop(0.5, '#ece5da');
  bandFill.addColorStop(1, '#bdb3a6');
  ctx.fillStyle = bandFill;
  ctx.fill(band);
  ctx.clip(band);
  for (let px = 430; px < 780; px += 7) {
    ctx.fillStyle = px % 14 === 0 ? 'rgba(80,70,60,0.16)' : 'rgba(255,255,255,0.14)';
    ctx.fillRect(px, g.neckY - g.holeDepth - 4, 3, 30);
  }
  ctx.restore();

  // Cut edge of the band against the front panel.
  strokePath(ctx, pathFromPoints(neckCurve(neckDrop, -g.holeDepth + 18, 72)), 'rgba(58,50,42,0.4)', 1.4, 0.7);
}

function drawCollar(ctx, neckDrop) {
  const g = GEO;
  const ring = collarPath();

  ctx.save();
  const fill = ctx.createLinearGradient(0, g.neckY, 0, g.neckY + neckDrop * 0.92 + g.bandDepth);
  fill.addColorStop(0, '#f4f0e9');
  fill.addColorStop(0.5, '#ede8e0');
  fill.addColorStop(1, '#ddd6cb');
  ctx.fillStyle = fill;
  ctx.fill(ring);
  ctx.clip(ring);

  // Rib striations follow the neckline, leaning with the band.
  const outer = neckCurve(neckDrop, 1, 130);
  for (let index = 0; index < outer.length; index += 2) {
    const point = outer[index];
    const lean = (point.x - g.cx) * 0.07;
    ctx.strokeStyle = 'rgba(114,102,88,0.22)';
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - 4);
    ctx.lineTo(point.x + lean, point.y + g.bandDepth + 5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(point.x + 2.5, point.y - 4);
    ctx.lineTo(point.x + 2.5 + lean, point.y + g.bandDepth + 5);
    ctx.stroke();
  }

  // The band bulges: brighter across its middle, darker at both seams.
  const bulge = ctx.createLinearGradient(0, g.neckY, 0, g.neckY + neckDrop * 0.92 + g.bandDepth);
  bulge.addColorStop(0, 'rgba(92,82,70,0.2)');
  bulge.addColorStop(0.3, 'rgba(255,255,255,0.3)');
  bulge.addColorStop(1, 'rgba(84,74,62,0.26)');
  ctx.fillStyle = bulge;
  ctx.fillRect(360, g.neckY - 30, 480, neckDrop + 110);
  ctx.restore();

  // Seam where the band meets the neckline.
  strokePath(ctx, pathFromPoints(neckCurve(neckDrop, -1, 72)), 'rgba(74,64,54,0.42)', 1.4, 0.65);

  // Topstitch along the band's lower edge.
  strokePath(ctx, pathFromPoints(neckCurve(neckDrop, g.bandDepth - 5, 80)), 'rgba(108,96,82,0.4)', 1.3, 0.5, [5, 5]);
  strokePath(ctx, pathFromPoints(neckCurve(neckDrop, g.bandDepth - 2, 80)), 'rgba(52,44,36,0.24)', 1.1, 0.4);

  // Contact shadow the band casts on the chest.
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.filter = 'blur(9px)';
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = 'rgb(152,142,130)';
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';
  ctx.stroke(pathFromPoints(neckCurve(neckDrop, g.bandDepth + 16, 56)));
  ctx.restore();
}

function drawHemTag(ctx) {
  const tag = hemTagPath();
  // Woven hem label: matte, muted, and lower than the topstitch lines so it
  // reads as a sewn tag rather than a white sticker.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = 'rgb(74,66,56)';
  ctx.fill(tag);
  ctx.globalAlpha = 0.28;
  strokePath(ctx, tag, 'rgba(32,28,22,0.5)', 1, 1);
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = 'rgba(240,235,225,0.28)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  const inner = new Path2D();
  inner.moveTo(726, 1121);
  inner.lineTo(794, 1121);
  ctx.stroke(inner);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Lighting                                                            */
/* ------------------------------------------------------------------ */

function alphaBuffer(width, height, path2d, { blur = 0, scale = 1 } = {}) {
  const { ctx } = makeCanvas(width, height);
  ctx.fillStyle = '#ffffff';
  ctx.save();
  if (blur) ctx.filter = `blur(${blur}px)`;
  ctx.scale(scale, scale);
  ctx.fill(path2d);
  ctx.restore();
  return ctx.getImageData(0, 0, width, height).data;
}

const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * One multiply layer carrying all garment lighting.
 *
 * Straight maths instead of stacked canvas gradients: gradient + multiply +
 * clip combinations band badly at this size, while per-pixel work gives smooth
 * falloff that matches the silhouette exactly. Inputs are real measurements of
 * the garment:
 *   - blurred silhouettes (distance from each edge → ambient occlusion),
 *   - per-row spans (a cylinder normal → rounded sleeves and torso),
 *   - a value-noise height field lit by one key light (cloth micro-structure).
 *
 * Everything is ≤ 1.0, so the layer can be multiplied over the printed design
 * without shifting its colour.
 */
function buildShadeLayer(neckDrop) {
  const divisor = 2;
  const fw = W / divisor;
  const fh = H / divisor;
  const outline = outlinePath(neckDrop);
  const scale = 1 / divisor;

  const crisp = alphaBuffer(fw, fh, outline, { scale });
  const contact = alphaBuffer(fw, fh, outline, { scale, blur: 2.5 });
  const soft = alphaBuffer(fw, fh, outline, { scale, blur: 9 });
  const broad = alphaBuffer(fw, fh, outline, { scale, blur: 26 });

  // Per-row span of the garment.
  const spans = new Int32Array(fh * 2).fill(-1);
  for (let y = 0; y < fh; y += 1) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < fw; x += 1) {
      if (crisp[(y * fw + x) * 4 + 3] > 128) {
        if (left < 0) left = x;
        right = x;
      }
    }
    spans[y * 2] = left;
    spans[y * 2 + 1] = right;
  }

  // Smooth the spans: at the armpit the measured span jumps from sleeve-to-
  // sleeve down to torso-only, and an unsmoothed jump prints a horizontal
  // shading line straight across the chest.
  const rows = new Float32Array(fh * 2);
  const radius = 20;
  for (let y = 0; y < fh; y += 1) {
    let leftSum = 0;
    let rightSum = 0;
    let weight = 0;
    for (let k = -radius; k <= radius; k += 1) {
      const row = y + k;
      if (row < 0 || row >= fh) continue;
      const layer = spans[row * 2];
      if (layer < 0) continue;
      const w = radius + 1 - Math.abs(k);
      leftSum += layer * w;
      rightSum += spans[row * 2 + 1] * w;
      weight += w;
    }
    rows[y * 2] = weight ? leftSum / weight : -1;
    rows[y * 2 + 1] = weight ? rightSum / weight : -1;
  }

  const field = createCanvas(fw, fh);
  const fctx = field.getContext('2d');
  const image = fctx.createImageData(fw, fh);

  const light = { x: -0.44, y: -0.48, z: 0.76 };
  const lightLength = Math.hypot(light.x, light.y, light.z);
  // Two scales: fine weave break-up, plus a very low-amplitude drape.
  const weave = (x, y) => fbm((x / fw) * 34, (y / fh) * 42, 17, 2);
  const drape = (x, y) => fbm((x / fw) * 5.5, (y / fh) * 3.2, 91, 2);
  const height = (x, y) => weave(x, y) * 0.8 + drape(x, y) * 0.2;

  for (let y = 0; y < fh; y += 1) {
    const left = rows[y * 2];
    const right = rows[y * 2 + 1];
    const halfSpan = right > left ? (right - left) / 2 : 1;
    const rowCenter = (left + right) / 2;

    for (let x = 0; x < fw; x += 1) {
      const offset = (y * fw + x) * 4;
      const alpha = crisp[offset + 3] / 255;
      if (alpha < 0.01) {
        image.data[offset] = 255;
        image.data[offset + 1] = 255;
        image.data[offset + 2] = 255;
        image.data[offset + 3] = 255;
        continue;
      }

      let tone = 1;

      // Cloth micro-structure.
      const eps = 1.2;
      const dx = (height(x + eps, y) - height(x - eps, y)) * 4.5;
      const dy = (height(x, y + eps) - height(x, y - eps)) * 4.5;
      const nx = -dx / Math.hypot(dx, dy, 1);
      const ny = -dy / Math.hypot(dx, dy, 1);
      const nz = 1 / Math.hypot(dx, dy, 1);
      const lambert = (nx * light.x + ny * light.y + nz * light.z) / lightLength;
      tone *= 1 + (lambert - 0.72) * 0.11;

      // Volume: a cylinder across each row.
      const lateral = halfSpan > 4 ? (x - rowCenter) / halfSpan : 0;
      tone *= 0.83 + 0.17 * Math.sqrt(Math.max(0, 1 - lateral * lateral));

      // Edge ambient occlusion.
      tone *= 0.78 + 0.22 * smoothstep(0, 0.55, contact[offset + 3] / 255);
      tone *= 0.94 + 0.06 * smoothstep(0, 1, soft[offset + 3] / 255);

      // Weight gathers toward the hem; shoulders sit in the key light.
      tone *= 1.02 - 0.09 * smoothstep(0.1, 0.95, y / fh);

      // Chest catch light.
      const cdx = (x - fw * 0.42) / (fw * 0.3);
      const cdy = (y - fh * 0.3) / (fh * 0.26);
      tone *= 1 + 0.05 * Math.exp(-(cdx * cdx + cdy * cdy));

      // Bounce so the shadow side never goes flat.
      tone *= 0.96 + 0.04 * Math.min(1, (broad[offset + 3] / 255) * 1.2);

      const value = Math.round(Math.min(1, Math.max(0.5, tone)) * 255);
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }

  fctx.putImageData(image, 0, 0);

  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(field, 0, 0, W, H);

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.clip(outline);

  // Armhole occlusion: fabric doubles over here, so it is the deepest crease.
  for (const side of [-1, 1]) {
    const shape = [
      [600 + side * 300, 348],
      [600 + side * 322, 396],
      [600 + side * 330, 440],
      [600 + side * 334, 486],
    ];
    softLine(ctx, shape, { color: 'rgb(158,148,136)', blur: 15, width: 32, alpha: 0.55 });
    softLine(ctx, shape, { color: 'rgb(136,126,114)', blur: 4, width: 8, alpha: 0.4 });
  }

  // Sleeve underside rolls away from the light.
  for (const side of ['left', 'right']) {
    const x = (value) => (side === 'left' ? mirrorX(value) : value);
    softLine(
      ctx,
      [
        [x(GEO.shoulderX + 96), 372],
        [x(GEO.cuffOuterX - 70), 398],
        [x(GEO.cuffOuterX + 4), 442],
        [x(CUFF_INNER.x + 26), 508],
      ],
      { color: 'rgb(166,156,144)', blur: 18, width: 44, alpha: 0.3 }
    );
  }

  ctx.restore();
  return canvas;
}

/** Sparse creases: the places a real tee actually gathers. */
function drawCreases(ctx, neckDrop) {
  ctx.save();
  ctx.clip(outlinePath(neckDrop));
  ctx.globalCompositeOperation = 'multiply';

  const creases = [
    [[392, 566], [424, 616], [430, 664], [410, 716], 15, 0.09, 7],
    [[808, 566], [776, 616], [770, 664], [790, 716], 15, 0.09, 7],
    [[410, 900], [490, 880], [570, 886], [634, 906], 20, 0.06, 11],
    [[648, 1000], [720, 984], [788, 990], [838, 1010], 18, 0.055, 11],
    [[330, 1072], [470, 1056], [740, 1054], [918, 1070], 26, 0.07, 14],
    [[1010, 452], [1020, 490], [1018, 526], [1004, 558], 13, 0.08, 6],
    [[190, 452], [180, 490], [182, 526], [196, 558], 13, 0.08, 6],
    [[456, 402], [446, 640], [442, 880], [452, 1060], 11, 0.035, 13],
    [[744, 402], [754, 640], [758, 880], [748, 1060], 11, 0.035, 13],
  ];
  for (const [start, c1, c2, end, width, alpha, blur] of creases) {
    softLine(ctx, [start, c1, c2, end], { color: 'rgb(116,104,92)', blur, width, alpha });
  }

  // Crease ridges catch the key light on their upper side.
  ctx.globalCompositeOperation = 'soft-light';
  const ridges = [
    [[380, 552], [412, 602], [418, 650], [398, 702], 8, 0.45, 6],
    [[820, 552], [788, 602], [782, 650], [802, 702], 8, 0.45, 6],
    [[508, 360], [494, 480], [488, 620], [500, 740], 10, 0.3, 12],
  ];
  for (const [start, c1, c2, end, width, alpha, blur] of ridges) {
    softLine(ctx, [start, c1, c2, end], { color: 'rgb(255,255,255)', blur, width, alpha });
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Seams                                                               */
/* ------------------------------------------------------------------ */

function drawSeams(ctx, view, neckDrop) {
  const g = GEO;
  ctx.save();
  ctx.clip(outlinePath(neckDrop));

  // Shoulder seams, sitting a couple of pixels below the silhouette edge.
  for (const side of [-1, 1]) {
    const seam = new Path2D();
    seam.moveTo(g.cx + side * (g.neckHalf - 4), g.neckY + 22);
    seam.bezierCurveTo(g.cx + side * 230, g.neckY + 30, g.cx + side * 270, g.neckY + 52, g.cx + side * g.shoulderX, g.shoulderY + 8);
    strokePath(ctx, seam, 'rgba(124,112,98,0.3)', 2, 1);
    strokePath(ctx, seam, 'rgba(255,255,255,0.4)', 1, 0.28, [6, 7]);
  }

  // Armhole seams.
  for (const side of [-1, 1]) {
    const armhole = new Path2D();
    armhole.moveTo(g.cx + side * g.shoulderX, g.shoulderY);
    armhole.bezierCurveTo(
      g.cx + side * (g.armpitX - 26),
      g.shoulderY + 40,
      g.cx + side * (g.armpitX - 8),
      g.armpitY - 44,
      g.cx + side * g.armpitX,
      g.armpitY
    );
    strokePath(ctx, armhole, 'rgba(106,94,80,0.4)', 2.6, 1);
    strokePath(ctx, armhole, 'rgba(255,255,255,0.45)', 1.2, 0.3, [7, 6]);
  }

  // Side seams.
  for (const side of [-1, 1]) {
    const seam = new Path2D();
    seam.moveTo(g.cx + side * g.armpitX, g.armpitY + 10);
    seam.bezierCurveTo(g.cx + side * (g.armpitX + 6), 720, g.cx + side * g.hemX, 1010, g.cx + side * g.hemX, g.hemY - 10);
    strokePath(ctx, seam, 'rgba(112,100,86,0.26)', 2, 1);
    strokePath(ctx, seam, 'rgba(255,255,255,0.4)', 1, 0.18, [5, 8]);
  }

  // Side-panel seams — the colour-zone boundary.
  for (const side of [-1, 1]) {
    const seam = new Path2D();
    seam.moveTo(g.cx + side * (g.panelX + 5), 556);
    seam.bezierCurveTo(g.cx + side * (g.panelX + 7), 760, g.cx + side * g.panelX, 980, g.cx + side * (g.panelX - 12), g.hemY);
    strokePath(ctx, seam, 'rgba(114,102,88,0.2)', 1.8, 1);
    strokePath(ctx, seam, 'rgba(255,255,255,0.3)', 1, 0.16, [4, 9]);
  }

  // Hem: folded edge and double topstitch, following the side seams.
  const hemEdge = new Path2D();
  hemEdge.moveTo(mirrorX(g.hemX) + 1, g.hemY - 5);
  hemEdge.lineTo(g.hemX - 1, g.hemY - 5);
  strokePath(ctx, hemEdge, 'rgba(84,72,58,0.3)', 2.6, 0.65);
  for (const y of [1112, 1126]) {
    const stitch = new Path2D();
    stitch.moveTo(330, y + 5);
    stitch.bezierCurveTo(470, y, 730, y, 870, y + 5);
    strokePath(ctx, stitch, 'rgba(118,106,92,0.3)', 1.4, 0.45, [9, 9]);
  }

  // Cuff bands and their topstitch.
  for (const side of ['left', 'right']) {
    const band = cuffPath(side);
    const x = (value) => (side === 'left' ? mirrorX(value) : value);
    const outer = { x: g.cuffOuterX, y: g.cuffOuterY };
    const back = (point, distance) => ({ x: point.x - axis.x * distance, y: point.y - axis.y * distance });
    const outerBack = back(outer, g.cuffBandDepth);
    const innerBack = back(CUFF_INNER, g.cuffBandDepth);

    ctx.save();
    ctx.fillStyle = 'rgba(212,204,194,0.3)';
    ctx.fill(band);
    ctx.clip(band);
    // Ribs run parallel to the sleeve axis.
    for (let step = 0; step <= 10; step += 1) {
      const t = step / 10;
      const px = outer.x + (CUFF_INNER.x - outer.x) * t;
      const py = outer.y + (CUFF_INNER.y - outer.y) * t;
      ctx.strokeStyle = 'rgba(128,116,102,0.12)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x(px), py);
      ctx.lineTo(x(px - axis.x * g.cuffBandDepth), py - axis.y * g.cuffBandDepth);
      ctx.stroke();
    }
    ctx.restore();

    const edge = new Path2D();
    edge.moveTo(x(outerBack.x), outerBack.y);
    edge.lineTo(x(innerBack.x), innerBack.y);
    strokePath(ctx, edge, 'rgba(110,98,84,0.32)', 1.6, 0.75, [7, 8]);
    strokePath(ctx, edge, 'rgba(255,255,255,0.4)', 1, 0.22);

    const opening = new Path2D();
    opening.moveTo(x(outer.x), outer.y);
    opening.bezierCurveTo(
      x(outer.x + perp.x * 52 + axis.x * 10),
      outer.y + perp.y * 52 + axis.y * 10,
      x(CUFF_INNER.x - perp.x * 50 + axis.x * 8),
      CUFF_INNER.y - perp.y * 50 + axis.y * 8,
      x(CUFF_INNER.x),
      CUFF_INNER.y
    );
    strokePath(ctx, opening, 'rgba(96,84,70,0.34)', 2, 0.6);
  }

  if (view === 'back') {
    const yoke = new Path2D();
    yoke.moveTo(348, 452);
    yoke.bezierCurveTo(470, 424, 730, 424, 852, 452);
    strokePath(ctx, yoke, 'rgba(114,102,88,0.18)', 1.9, 1);
    strokePath(ctx, yoke, 'rgba(255,255,255,0.34)', 1, 0.18, [5, 9]);
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Surface                                                             */
/* ------------------------------------------------------------------ */

function drawSurface(ctx, neckDrop) {
  const outline = outlinePath(neckDrop);
  ctx.save();
  ctx.clip(outline);
  ctx.globalAlpha = 0.3;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(grainCanvas(0.07), 0, 0);
  ctx.restore();

  // Heather flecks: fine, low-contrast weave.
  ctx.save();
  ctx.clip(outline);
  let seed = 424242;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let index = 0; index < 26000; index += 1) {
    const x = 180 + random() * 840;
    const y = 300 + random() * 900;
    ctx.fillStyle = `rgba(118,106,92,${0.012 + random() * 0.028})`;
    ctx.fillRect(x, y, 1.2, 1.6);
  }
  ctx.restore();
}

function drawGlobalLight(ctx) {
  const light = ctx.createLinearGradient(200, 120, 1000, 1320);
  light.addColorStop(0, 'rgba(255,248,236,0.09)');
  light.addColorStop(0.5, 'rgba(255,255,255,0)');
  light.addColorStop(1, 'rgba(18,22,32,0.13)');
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Compose                                                             */
/* ------------------------------------------------------------------ */

function renderMockup(view) {
  const { neckDrop } = VIEWS[view];
  const { canvas, ctx } = makeCanvas();
  drawBackdrop(ctx);
  drawContactShadow(ctx);
  drawBaseGarment(ctx, neckDrop);

  ctx.save();
  ctx.clip(outlinePath(neckDrop));
  ctx.drawImage(buildShadeLayer(neckDrop), 0, 0);
  ctx.restore();

  drawCreases(ctx, neckDrop);
  drawNeckOpening(ctx, neckDrop);
  drawCollar(ctx, neckDrop);
  drawSeams(ctx, view, neckDrop);
  drawHemTag(ctx);
  drawSurface(ctx, neckDrop);
  drawGlobalLight(ctx);
  return canvas;
}

/* ------------------------------------------------------------------ */
/* Masks                                                               */
/* ------------------------------------------------------------------ */

function maskFromPaths(paths) {
  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = '#ffffff';
  for (const entry of paths) {
    if (entry.exclude) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill(entry.path);
      ctx.restore();
    } else {
      ctx.fill(entry.path);
    }
  }
  return canvas;
}

function boxOf(canvas) {
  const data = canvas.getContext('2d').getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (data[(y * W + x) * 4 + 3] < 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

function coverageOf(canvas) {
  const data = canvas.getContext('2d').getImageData(0, 0, W, H).data;
  let count = 0;
  for (let index = 3; index < data.length; index += 4) if (data[index] > 127) count += 1;
  return (count / (W * H)) * 100;
}

/** Print shading derived from the mockup's own luminance, inside the garment. */
async function deriveShading(mockupPng, maskPath) {
  const { data } = await sharp(mockupPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: mask } = await sharp(maskPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const shade = Buffer.alloc(W * H * 4);
  const highlight = Buffer.alloc(W * H * 4);

  for (let index = 0; index < W * H; index += 1) {
    const offset = index * 4;
    const alpha = mask[offset + 3] / 255;
    const value = (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
    const shadowAlpha = Math.min(0.7, Math.max(0, (0.972 - value) * 2.1)) * alpha;
    const highlightAlpha = Math.min(0.38, Math.max(0, (value - 0.978) * 3.6)) * alpha;

    shade[offset] = 0;
    shade[offset + 1] = 0;
    shade[offset + 2] = 0;
    shade[offset + 3] = Math.round(shadowAlpha * 255);

    highlight[offset] = 255;
    highlight[offset + 1] = 251;
    highlight[offset + 2] = 242;
    highlight[offset + 3] = Math.round(highlightAlpha * 255);
  }

  const [shadePng, highlightPng] = await Promise.all([
    sharp(shade, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer(),
    sharp(highlight, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer(),
  ]);
  return { shadePng, highlightPng };
}

async function buildView(view) {
  const dir = path.join(OUT_ROOT, view);
  await fs.mkdir(path.join(dir, 'masks'), { recursive: true });

  const mockup = renderMockup(view);
  const mockupPng = await sharp(mockup.toBuffer('image/png')).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  await fs.writeFile(path.join(dir, 'mockup-photo.png'), mockupPng);
  await sharp(mockupPng).webp({ quality: 92, effort: 6 }).toFile(path.join(dir, 'mockup.webp'));

  const { neckDrop } = VIEWS[view];
  const hole = neckHolePath(neckDrop);
  const silhouette = maskFromPaths([{ path: outlinePath(neckDrop) }]);

  const masks = {
    silhouette,
    // Torso minus sleeves and the neck opening: the printable body zone.
    body: maskFromPaths([
      { path: torsoPath(neckDrop) },
      { path: sleevePath('left'), exclude: true },
      { path: sleevePath('right'), exclude: true },
      { path: hole, exclude: true },
    ]),
    'left-sleeve': maskFromPaths([{ path: sleevePath('left') }]),
    'right-sleeve': maskFromPaths([{ path: sleevePath('right') }]),
    cuffs: maskFromPaths([{ path: cuffPath('left') }, { path: cuffPath('right') }]),
    collar: maskFromPaths([{ path: collarPath(neckDrop) }]),
    'side-panels': maskFromPaths([{ path: panelPath('left') }, { path: panelPath('right') }]),
    'hem-tag': maskFromPaths([{ path: hemTagPath() }]),
  };

  // printable = (torso print rect ∪ both sleeves) ∩ silhouette − neck opening
  const printable = createCanvas(W, H);
  {
    const pctx = printable.getContext('2d');
    pctx.fillStyle = '#ffffff';
    pctx.fill(printablePath());
    pctx.fill(sleevePath('left'));
    pctx.fill(sleevePath('right'));
    pctx.save();
    pctx.globalCompositeOperation = 'destination-in';
    pctx.drawImage(silhouette, 0, 0);
    pctx.restore();
    pctx.save();
    pctx.globalCompositeOperation = 'destination-out';
    pctx.fill(hole);
    pctx.restore();
  }
  masks.printable = printable;

  const boxes = {};
  const coverage = {};
  for (const [key, canvas] of Object.entries(masks)) {
    const png = await sharp(canvas.toBuffer('image/png')).png({ compressionLevel: 9, effort: 10 }).toBuffer();
    await fs.writeFile(path.join(dir, 'masks', `${key}-mask.png`), png);
    boxes[key] = boxOf(canvas);
    coverage[key] = coverageOf(canvas);
  }

  const { shadePng, highlightPng } = await deriveShading(mockupPng, path.join(dir, 'masks', 'silhouette-mask.png'));
  await fs.writeFile(path.join(dir, 'shading.png'), shadePng);
  await fs.writeFile(path.join(dir, 'highlight.png'), highlightPng);

  return { boxes, coverage, mockupBytes: mockupPng.length };
}

/* ------------------------------------------------------------------ */
/* Debug                                                               */
/* ------------------------------------------------------------------ */

async function debugSheet() {
  const neckDrop = VIEWS.front.neckDrop;
  const stages = [
    ['silhouette', (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fill(outlinePath(neckDrop));
    }],
    ['base', (ctx) => {
      drawBackdrop(ctx);
      drawContactShadow(ctx);
      drawBaseGarment(ctx, neckDrop);
    }],
    ['shade', (ctx) => {
      drawBackdrop(ctx);
      drawContactShadow(ctx);
      drawBaseGarment(ctx, neckDrop);
      ctx.save();
      ctx.clip(outlinePath(neckDrop));
      ctx.drawImage(buildShadeLayer(neckDrop), 0, 0);
      ctx.restore();
    }],
    ['creases', (ctx) => {
      drawBackdrop(ctx);
      drawContactShadow(ctx);
      drawBaseGarment(ctx, neckDrop);
      ctx.save();
      ctx.clip(outlinePath(neckDrop));
      ctx.drawImage(buildShadeLayer(neckDrop), 0, 0);
      ctx.restore();
      drawCreases(ctx, neckDrop);
    }],
    ['neck+seams', (ctx) => {
      drawBackdrop(ctx);
      drawContactShadow(ctx);
      drawBaseGarment(ctx, neckDrop);
      ctx.save();
      ctx.clip(outlinePath(neckDrop));
      ctx.drawImage(buildShadeLayer(neckDrop), 0, 0);
      ctx.restore();
      drawCreases(ctx, neckDrop);
      drawNeckOpening(ctx, neckDrop);
      drawCollar(ctx, neckDrop);
      drawSeams(ctx, 'front', neckDrop);
    }],
    ['final', (ctx) => {
      ctx.drawImage(renderMockup('front'), 0, 0);
    }],
  ];

  const cellW = 400;
  const cellH = 480;
  const sheet = createCanvas(cellW * 3, cellH * 2);
  const sheetCtx = sheet.getContext('2d');
  sheetCtx.fillStyle = '#1a1a1a';
  sheetCtx.fillRect(0, 0, sheet.width, sheet.height);

  for (let index = 0; index < stages.length; index += 1) {
    const [name, draw] = stages[index];
    const { canvas, ctx } = makeCanvas();
    draw(ctx);
    const x = (index % 3) * cellW;
    const y = Math.floor(index / 3) * cellH;
    sheetCtx.drawImage(canvas, x, y, cellW, cellH);
    sheetCtx.fillStyle = 'rgba(0,0,0,0.65)';
    sheetCtx.fillRect(x, y, 130, 26);
    sheetCtx.fillStyle = '#fff';
    sheetCtx.font = 'bold 16px sans-serif';
    sheetCtx.fillText(name, x + 8, y + 18);
  }

  const target = path.join(OUT_ROOT, 'debug-stages.png');
  await fs.writeFile(target, sheet.toBuffer('image/png'));
  process.stdout.write(`debug sheet → ${path.relative(ROOT, target)}\n`);
}

/* ------------------------------------------------------------------ */

async function main() {
  await fs.mkdir(OUT_ROOT, { recursive: true });
  if (DEBUG) {
    await debugSheet();
    return;
  }

  const manifest = {
    model: 'groove-boxy-tee-v2',
    renderer: 'procedural-studio-v1',
    note: 'Rendered studio mockup (computer graphics), not a photograph. Swap in photography with scripts/build-apparel-assets.mjs --front/--back.',
    generatedAt: new Date().toISOString(),
    canvas: { width: W, height: H },
    viewBox: { width: W, height: H },
    views: {},
  };

  for (const view of ['front', 'back']) {
    process.stdout.write(`→ rendering ${view}\n`);
    const result = await buildView(view);
    manifest.views[view] = {
      mockup: `/assets/apparel/boxy-tee/${view}/mockup.webp`,
      mockupFallback: `/assets/apparel/boxy-tee/${view}/mockup-photo.png`,
      shading: `/assets/apparel/boxy-tee/${view}/shading.png`,
      highlight: `/assets/apparel/boxy-tee/${view}/highlight.png`,
      masks: Object.fromEntries(
        Object.keys(result.boxes).map((key) => [key, `/assets/apparel/boxy-tee/${view}/masks/${key}-mask.png`])
      ),
      boxes: result.boxes,
      coverage: result.coverage,
    };
    process.stdout.write(
      `  ✓ mockup ${(result.mockupBytes / 1024).toFixed(0)} KB png\n` +
        `  body ${result.coverage.body.toFixed(1)}% · sleeves ${(
          result.coverage['left-sleeve'] + result.coverage['right-sleeve']
        ).toFixed(1)}% · collar ${result.coverage.collar.toFixed(1)}% · panels ${result.coverage[
          'side-panels'
        ].toFixed(1)}% · printable ${result.coverage.printable.toFixed(1)}%\n`
    );
  }

  await fs.writeFile(path.join(OUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`✓ assets written to ${path.relative(ROOT, OUT_ROOT)}\n`);
}

main().catch((error) => {
  process.stderr.write(`\n✗ ${error.stack ?? error.message}\n`);
  process.exit(1);
});
