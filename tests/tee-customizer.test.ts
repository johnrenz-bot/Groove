/**
 * tests/tee-customizer.test.ts
 *
 * Pure unit tests for the T-shirt customizer: design serialization,
 * normalization of untrusted imports, file validation and SVG sanitization.
 * No DOM, network or Supabase access.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DESIGN_SCHEMA_VERSION,
  designFileName,
  isUuid,
  normalizeColor,
  normalizeDesign,
  parseDesignJson,
  sanitizeNumberText,
  sanitizeText,
  serializeDesign,
} from '../features/tee-customizer/serialization.ts';
import {
  createDefaultDesign,
  createDesignId,
} from '../features/tee-customizer/defaults.ts';
import {
  MAX_TEE_IMAGE_BYTES,
  MAX_TEE_IMAGES,
  MAX_DESIGN_TEXT_LENGTH,
} from '../features/tee-customizer/constants.ts';
import {
  detectImageMime,
  formatBytes,
  sanitizeSvgText,
  validateTeeImageFile,
} from '../features/tee-customizer/fileValidation.ts';

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function pngHeader() {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
}

describe('tee design serialization', () => {
  it('creates a fresh default design with a valid id', () => {
    const design = createDefaultDesign();
    assert.equal(design.schemaVersion, DESIGN_SCHEMA_VERSION);
    assert.equal(design.baseModel, 'groove-tee-v1');
    assert.equal(design.fit, 'boxy');
    assert.equal(design.images.length, 0);
    assert.ok(isUuid(design.id));
    assert.ok(Date.parse(design.createdAt) > 0);
  });

  it('gives every design a distinct id and independent nested objects', () => {
    const a = createDefaultDesign();
    const b = createDefaultDesign();
    assert.notEqual(a.id, b.id);
    a.zones.body = '#000000';
    assert.notEqual(b.zones.body, '#000000');
    a.texts[0].text = 'CHANGED';
    assert.equal(b.texts[0].text, 'GROOVE PH');
  });

  it('round-trips through serializeDesign and normalizeDesign', () => {
    const original = createDefaultDesign({
      pattern: 'racing',
      size: '3XL',
      fit: 'oversized',
      view: 'back',
    });
    original.images.push({
      id: 'img-1',
      name: 'crest.png',
      src: PNG_DATA_URL,
      mimeType: 'image/png',
      bytes: 1200,
      view: 'back',
      x: 0.4,
      y: 0.5,
      width: 0.25,
      height: 0.25,
      rotation: 12,
      opacity: 0.8,
      flipX: true,
      z: 0,
      locked: true,
      hidden: true,
    });

    const parsed = parseDesignJson(serializeDesign(original));
    assert.ok(parsed.ok);
    assert.equal(parsed.design.pattern, 'racing');
    assert.equal(parsed.design.size, '3XL');
    assert.equal(parsed.design.fit, 'oversized');
    assert.equal(parsed.design.view, 'back');
    assert.equal(parsed.design.images.length, 1);
    assert.equal(parsed.design.images[0].src, PNG_DATA_URL);
    assert.equal(parsed.design.images[0].flipX, true);
    assert.equal(parsed.design.images[0].locked, true);
    assert.equal(parsed.design.images[0].hidden, true);
  });

  it('round-trips branding and presentation through serializeDesign', () => {
    const original = createDefaultDesign();
    original.branding.emblem = false;
    original.branding.hangTag = true;
    original.presentation.background = 'white';
    original.presentation.effects.glow = true;
    original.patternVisible = false;
    original.patternOffset = { x: 0.1, y: -0.08 };

    const parsed = parseDesignJson(serializeDesign(original));
    assert.ok(parsed.ok);
    assert.equal(parsed.design.branding.emblem, false);
    assert.equal(parsed.design.branding.hangTag, true);
    assert.equal(parsed.design.presentation.background, 'white');
    assert.equal(parsed.design.presentation.effects.glow, true);
    assert.equal(parsed.design.patternVisible, false);
    assert.deepEqual(parsed.design.patternOffset, { x: 0.1, y: -0.08 });
  });

  it('applies branding defaults to older designs without those fields', () => {
    const design = normalizeDesign({ schemaVersion: 1, baseModel: 'groove-tee-v1' });
    assert.equal(design.branding.emblem, true);
    assert.equal(design.branding.patch, true);
    assert.equal(design.branding.neckLabel, true);
    assert.equal(design.branding.hangTag, false);
    assert.equal(design.branding.wordmark, false);
    assert.equal(design.presentation.background, 'charcoal');
    assert.equal(design.presentation.effects.spotlight, true);
    assert.equal(design.patternVisible, true);
    assert.deepEqual(design.patternOffset, { x: 0, y: 0 });
  });

  it('clamps pattern offsets and falls back on unknown backgrounds', () => {
    const design = normalizeDesign({
      patternOffset: { x: 99, y: -99 },
      presentation: { background: 'neon-rave', customBackground: 'not-a-color' },
    });
    assert.deepEqual(design.patternOffset, { x: 0.18, y: -0.18 });
    assert.equal(design.presentation.background, 'charcoal');
    assert.equal(design.presentation.customBackground, '#1a1a1f');
  });

  it('defaults layer lock and visibility flags for older designs', () => {
    const original = createDefaultDesign({ view: 'front' });
    original.images.push({
      id: 'img-legacy',
      name: 'legacy.png',
      src: PNG_DATA_URL,
      mimeType: 'image/png',
      bytes: 1200,
      view: 'front',
      x: 0.5,
      y: 0.5,
      width: 0.3,
      height: 0.3,
      rotation: 0,
      opacity: 1,
      flipX: false,
      z: 0,
      // Simulate a pre-lock/visibility design document.
      locked: undefined as unknown as boolean,
      hidden: undefined as unknown as boolean,
    });

    const parsed = parseDesignJson(serializeDesign(original));
    assert.ok(parsed.ok);
    assert.equal(parsed.design.images[0].locked, false);
    assert.equal(parsed.design.images[0].hidden, false);
  });

  it('rejects invalid JSON, newer schemas and unknown bases', () => {
    assert.equal(parseDesignJson('').ok, false);
    assert.equal(parseDesignJson('{ not json').ok, false);
    assert.equal(parseDesignJson('[]').ok, false);

    const newer = parseDesignJson(JSON.stringify({ schemaVersion: 2 }));
    assert.equal(newer.ok, false);

    const wrongBase = parseDesignJson(
      JSON.stringify({ schemaVersion: 1, baseModel: 'other-tee' })
    );
    assert.equal(wrongBase.ok, false);
  });

  it('clamps numeric fields and keeps enum values valid', () => {
    const design = normalizeDesign({
      fit: 'gigantic',
      size: '9XL',
      view: 'side',
      pattern: 'zigzag',
      texts: [{ text: 'HI', size: 9999, x: -50, y: 500 }],
      back: { size: 5000 },
      gradients: { body: { angle: 900 } },
    });

    assert.equal(design.fit, 'boxy');
    assert.equal(design.size, 'L');
    assert.equal(design.view, 'front');
    assert.equal(design.pattern, 'none');
    assert.equal(design.texts[0].size, 110);
    // X/Y are percentages of the printable garment area and span the full 0–100% range.
    assert.equal(design.texts[0].x, 0);
    assert.equal(design.texts[0].y, 100);
    assert.equal(design.back.size, 220);
    assert.equal(design.gradients.body.angle, 360);
  });

  it('drops remote or script image sources and sanitizes embedded SVGs', () => {
    const dirtySvg =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><circle cx="4" cy="4" r="3" fill="#fff"/></svg>'
      );

    const design = normalizeDesign({
      images: [
        { id: 'remote', src: 'https://example.com/a.png', width: 0.2, height: 0.2 },
        { id: 'script', src: 'javascript:alert(1)', width: 0.2, height: 0.2 },
        { id: 'inline', src: PNG_DATA_URL, width: 0.2, height: 0.2 },
        { id: 'svg', src: dirtySvg, width: 0.2, height: 0.2 },
      ],
    });

    assert.equal(design.images.length, 2);
    assert.equal(design.images[0].src, PNG_DATA_URL);
    assert.equal(design.images[0].z, 0);

    const embeddedSvg = design.images.find((image) => image.id === 'svg');
    assert.ok(embeddedSvg);
    const decoded = decodeURIComponent(embeddedSvg.src.slice(embeddedSvg.src.indexOf(',') + 1));
    assert.doesNotMatch(decoded, /<script|onload/i);
    assert.match(decoded, /<circle/i);
  });

  it('caps the number of imported images and reindexes z-order', () => {
    const images = Array.from({ length: MAX_TEE_IMAGES + 5 }, (_, index) => ({
      id: `image-${index}`,
      src: PNG_DATA_URL,
      z: 100 - index,
    }));
    const design = normalizeDesign({ images });

    assert.equal(design.images.length, MAX_TEE_IMAGES);
    design.images.forEach((image, index) => assert.equal(image.z, index));
  });

  it('sanitizes text and numeric jersey fields', () => {
    assert.equal(sanitizeText('<b>hi</b>', 80), 'bhi/b');
    assert.equal(sanitizeText('  GROOVE\u0000  PH  ', 80), 'GROOVE PH');
    assert.equal(sanitizeText('x'.repeat(200), MAX_DESIGN_TEXT_LENGTH).length, MAX_DESIGN_TEXT_LENGTH);
    assert.equal(sanitizeNumberText('0a1b2c3', 2), '01');
    assert.equal(sanitizeNumberText('abc', 2), '');
  });

  it('normalizes only hex colors', () => {
    assert.equal(normalizeColor('#ABC', '#000000'), '#abc');
    assert.equal(normalizeColor('red', '#111111'), '#111111');
    assert.equal(normalizeColor('url(javascript:1)', '#222222'), '#222222');
  });

  it('builds a safe exported file name', () => {
    assert.equal(designFileName({ ...createDefaultDesign(), name: 'Groove PH — Tee 01' }, 'png'), 'groove-ph-tee-01.png');
    assert.equal(designFileName({ ...createDefaultDesign(), name: '   ' }, 'json'), 'groove-tee.json');
  });

  it('createDesignId always returns a valid UUID', () => {
    const id = createDesignId();
    assert.equal(typeof id, 'string');
    assert.ok(isUuid(id), `Expected a UUID, received ${id}`);
  });
});

describe('tee image validation', () => {
  it('accepts supported image extensions and MIME types', () => {
    assert.equal(
      validateTeeImageFile({ name: 'logo.png', size: 1024, type: 'image/png' }),
      null
    );
    assert.equal(
      validateTeeImageFile({ name: 'logo.SVG', size: 1024, type: 'image/svg+xml' }),
      null
    );
    assert.equal(validateTeeImageFile({ name: 'photo.jpeg', size: 1024, type: '' }), null);
  });

  it('rejects unsupported extensions, MIME types, empty and oversized files', () => {
    assert.match(
      validateTeeImageFile({ name: 'notes.pdf', size: 1024, type: 'application/pdf' }) ?? '',
      /PNG, JPG, WEBP, SVG or GIF/
    );
    assert.match(
      validateTeeImageFile({ name: 'fake.png', size: 1024, type: 'text/html' }) ?? '',
      /not an image type/
    );
    assert.match(
      validateTeeImageFile({ name: 'empty.png', size: 0, type: 'image/png' }) ?? '',
      /empty/
    );
    assert.match(
      validateTeeImageFile({
        name: 'huge.png',
        size: MAX_TEE_IMAGE_BYTES + 1,
        type: 'image/png',
      }) ?? '',
      /under 5\.0 MB/
    );
  });

  it('detects supported formats from magic bytes', () => {
    assert.equal(detectImageMime(pngHeader()), 'image/png');
    assert.equal(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'image/jpeg');
    assert.equal(
      detectImageMime(new TextEncoder().encode('GIF89a' + '....')),
      'image/gif'
    );
    assert.equal(
      detectImageMime(new TextEncoder().encode('RIFF0000WEBP')),
      'image/webp'
    );
    assert.equal(
      detectImageMime(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
      'image/svg+xml'
    );
    assert.equal(detectImageMime(new TextEncoder().encode('plain text')), null);
  });

  it('formats byte sizes for inline errors', () => {
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(2048), '2 KB');
    assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  });
});

describe('SVG upload sanitization', () => {
  it('strips scripts, event handlers and external references', () => {
    const dirty = `<?xml version="1.0"?>
      <svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
        <script>alert('xss')</script>
        <rect width="10" height="10" fill="url(https://evil.test/a.svg#g)" />
        <image href="https://evil.test/pixel.png" />
        <style>rect { fill: red }</style>
        <circle cx="5" cy="5" r="4" fill="#fff" onclick="alert(2)" />
      </svg>`;

    const clean = sanitizeSvgText(dirty);
    assert.ok(clean);
    assert.doesNotMatch(clean, /<script/i);
    assert.doesNotMatch(clean, /onload|onclick/i);
    assert.doesNotMatch(clean, /evil\.test/i);
    assert.doesNotMatch(clean, /<style/i);
    assert.match(clean, /<circle/i);
  });

  it('rejects markup that is not an SVG document', () => {
    assert.equal(sanitizeSvgText(''), null);
    assert.equal(sanitizeSvgText('<html><body>hi</body></html>'), null);
    assert.equal(sanitizeSvgText('just text'), null);
  });
});
