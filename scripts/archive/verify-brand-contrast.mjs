/**
 * WCAG contrast audit for the GroovePH token system.
 *
 * Reads the token values straight out of app/globals.css so it can never drift
 * from what the app actually paints. Run:  node scripts/verify-brand-contrast.mjs
 *
 * Exits non-zero if any declared pair drops below its required ratio, so it can
 * be wired into CI without arguments.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, '..', 'app', 'globals.css'), 'utf8');

/* --- colour maths ---------------------------------------------------------- */
function parse(color) {
  const hex = color.trim().toLowerCase();
  const m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = hex.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    return parts.map((p) => Math.round(parseFloat(p)));
  }
  throw new Error(`Unparseable colour: ${color}`);
}

function channel(v) {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  const [r, g, b] = parse(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Flattens `rgba(hue, a)` over an opaque backdrop — how a soft badge really reads. */
function over(color, backdrop) {
  const m = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return color;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
  const alpha = parts.length > 3 ? parts[3] : 1;
  const f = parts.slice(0, 3);
  const b = parse(backdrop);
  return (
    '#' +
    f
      .map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0'))
      .join('')
  );
}

/* --- pull the token blocks out of the stylesheet --------------------------- */
function block(selector) {
  const re = new RegExp(
    `(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:,[^{]*)?\\{([^}]*)\\}`
  );
  const m = css.match(re);
  if (!m) throw new Error(`Could not find token block for ${selector}`);
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*(.+?);/i);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

const dark = block(':root');
const light = block(".light,\n:root[data-theme='light']");
const classic = block(".classic,\n:root[data-theme='classic']");
const halloween = block(".halloween,\n:root[data-theme='halloween']");
const christmas = block(".christmas,\n:root[data-theme='christmas']");

/* --- the pairs that must clear AA ------------------------------------------ */
const THEMES = [
  ['dark', dark],
  ['light', light],
  ['classic', classic],
  ['halloween', halloween],
  ['christmas', christmas],
];

// [foreground token, background token, minimum ratio, what it is]
const PAIRS = [
  ['--foreground', '--background', 4.5, 'body text on the page'],
  ['--foreground', '--card', 4.5, 'body text on a card'],
  ['--foreground', '--surface', 4.5, 'body text on the nav rail'],
  ['--muted-foreground', '--background', 4.5, 'secondary text on the page'],
  ['--muted-foreground', '--card', 4.5, 'secondary text on a card'],
  ['--subtle-foreground', '--background', 4.5, 'hint / meta text on the page'],
  ['--subtle-foreground', '--card', 4.5, 'hint / meta text on a card'],
  ['--accent-text', '--card', 4.5, 'accent link text on a card'],
  ['--accent-text', '--background', 4.5, 'accent link text on the page'],
  ['--danger', '--card', 4.5, 'error text on a card'],
  ['--danger', '--background', 4.5, 'error text on the page'],
  ['--success', '--card', 4.5, 'success text on a card'],
  ['--warning', '--card', 4.5, 'warning text on a card'],
  ['--info', '--card', 4.5, 'info text on a card'],
  // Non-text. WCAG 1.4.11 asks 3:1 for the visual information needed to
  // identify a control. `--input` is that line — a field on a card of almost the
  // same value has nothing else to announce it — so it is held to 3:1.
  // `--border-strong` is the hover/focus edge of a card or a control, which is
  // also load-bearing, so it is held to the same bar.
  ['--input', '--card', 3, 'input border against its own surface'],
  ['--input', '--background', 3, 'input border against the page'],
  ['--border-strong', '--card', 3, 'strong border against a card'],
];

/* Deliberately NOT checked: `--accent` as a fill against `--card`.
   WCAG 1.4.11 governs the visual information *required to identify* a control.
   A solid-accent element in this app is always either a labelled button
   (identified by its `--accent-foreground` label at 5.3:1) or a decorative
   mark. Selection state is carried by `--accent-soft` + `--accent-text` +
   `--accent-border`, all three of which are checked here. Holding a brand
   colour to 3:1 against its own surface would force the button fill to be a
   different colour from the brand colour, which is not a trade worth making. */

// Buttons and badges: a foreground token painted on a background token.
const FILLS = [
  ['--accent-foreground', '--accent', 4.5, 'primary button'],
  ['--danger-foreground', '--danger-solid', 4.5, 'destructive button'],
  ['--brand-sunburst-fg', '--brand-sunburst', 4.5, 'sunburst highlight'],
];

let failed = 0;
const rows = [];

for (const [name, tokens] of THEMES) {
  const card = tokens['--card'];
  const page = tokens['--background'];

  for (const [fg, bg, min, label] of PAIRS) {
    if (!tokens[fg] || !tokens[bg]) continue;
    const r = ratio(tokens[fg], tokens[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    rows.push({ theme: name, what: label, pair: `${fg} on ${bg}`, ratio: r, min, ok });
  }

  for (const [fg, bg, min, label] of FILLS) {
    if (!tokens[fg] || !tokens[bg]) continue;
    const r = ratio(tokens[fg], tokens[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    rows.push({ theme: name, what: label, pair: `${fg} on ${bg}`, ratio: r, min, ok });
  }

  // Soft badges: the `-soft` tint is composited over the card the way a browser
  // composites it, then the TEXT token is measured against the real result.
  // Measuring the text against a guessed background is how these get missed.
  for (const base of ['--accent', '--danger', '--success', '--warning', '--info']) {
    const textTok = base === '--accent' ? '--accent-text' : base;
    const soft = tokens[`${base}-soft`];
    if (!soft || !tokens[textTok]) continue;
    const flat = over(soft, card);
    const r = ratio(tokens[textTok], flat);
    const ok = r >= 4.5;
    if (!ok) failed++;
    rows.push({
      theme: name,
      what: `soft badge: ${textTok} on ${base}-soft`,
      pair: `${textTok} over ${base}-soft`,
      ratio: r,
      min: 4.5,
      ok,
    });
  }

  void page;
}

/* --- the accent pairs ------------------------------------------------------
   These are separate blocks layered over `:root` / `.light`, so they can and do
   drift independently — the dark pair once left `--accent-foreground` at black,
   which silently turned every light-mode primary button into black-on-blue.
   Every accent x every base theme is checked, not just the defaults. */
const ACCENTS = ['unity', 'relief', 'sunburst'];
const BASES = [
  ['dark', ':root'],
  ['light', ".light,\n:root[data-theme='light']"],
];

const accentRows = [];
for (const [baseName, baseSel] of BASES) {
  const base = block(baseSel);
  for (const accent of ACCENTS) {
    const override = block(
      baseName === 'dark'
        ? `:root[data-accent='${accent}']`
        : `.light[data-accent='${accent}']`
    );
    // A token the override does not declare is inherited from the base, which is
    // exactly how the missing `--accent-foreground` slipped through.
    const t = { ...base, ...override };

    const checks = [
      ['--accent-foreground', '--accent', 4.5, `primary button (accent=${accent})`],
      ['--accent-text', '--card', 4.5, `accent link text (accent=${accent})`],
      ['--accent-foreground', '--accent', 4.5, null],
    ];
    for (const [fg, bg, min, label] of checks) {
      if (!label || !t[fg] || !t[bg]) continue;
      const r = ratio(t[fg], t[bg]);
      if (r < min) failed++;
      accentRows.push({ theme: `${baseName}/${accent}`, what: label, ratio: r, min, ok: r >= min });
    }

    // Soft chip, composited the way a browser would.
    if (t['--accent-soft'] && t['--accent-text']) {
      const flat = over(t['--accent-soft'], t['--card']);
      const r = ratio(t['--accent-text'], flat);
      if (r < 4.5) failed++;
      accentRows.push({
        theme: `${baseName}/${accent}`,
        what: 'accent soft chip',
        ratio: r,
        min: 4.5,
        ok: r >= 4.5,
      });
    }
  }
}

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log('');
console.log('  GroovePH — WCAG contrast audit (read live from app/globals.css)');
console.log('  ' + '-'.repeat(78));
for (const [name] of THEMES) {
  console.log('');
  console.log(`  ${name.toUpperCase()}`);
  console.log(
    '  ' +
      pad('surface', 46) +
      padL('ratio', 7) +
      padL('min', 6) +
      '   result'
  );
  for (const r of rows.filter((x) => x.theme === name)) {
    console.log(
      '  ' +
        pad(r.what, 46) +
        padL(r.ratio.toFixed(2) + ':1', 7) +
        padL(r.min + ':1', 6) +
        (r.ok ? '   pass' : '   FAIL')
    );
  }
}

console.log('');
console.log('  ACCENT PAIRS — every admin-selectable accent, on both base themes');
console.log('  ' + '-'.repeat(78));
for (const r of accentRows) {
  console.log(
    '  ' +
      pad(r.theme, 20) +
      pad(r.what, 34) +
      padL(r.ratio.toFixed(2) + ':1', 7) +
      padL(r.min + ':1', 6) +
      (r.ok ? '   pass' : '   FAIL')
  );
}

console.log('');
console.log('  ' + '-'.repeat(78));
const total = rows.length + accentRows.length;
if (failed === 0) {
  console.log(`  All ${total} declared pairs meet their WCAG AA target.`);
  console.log('');
  process.exit(0);
} else {
  console.log(`  ${failed} of ${total} pairs FAIL.`);
  console.log('');
  process.exit(1);
}