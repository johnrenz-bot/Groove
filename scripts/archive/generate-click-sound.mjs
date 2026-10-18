/**
 * Generates public/sounds/click.wav — the one click sound the whole app plays.
 *
 * WHY IT IS SYNTHESISED RATHER THAN DOWNLOADED
 *   Shipping a binary means shipping a licence whose provenance nobody in the
 *   repo can check later. Synthesising it means the asset is derived from code
 *   that is in version control: reproducible, auditable, and unambiguously ours
 *   to license. It also lets the sound be tuned to the brief (a specific timbre,
 *   a specific length) instead of accepting whatever a sample library happened
 *   to have.
 *
 * THE TIMBRE — a heavy mechanical switch struck from below, not a tick
 *   Everything here is deliberately LOW. A mechanical clack reads as "thin" when
 *   its energy sits above ~2 kHz: that is where pitch lives, so energy up there
 *   reads as a bright tick or a squeak. Weight lives between roughly 80–400 Hz,
 *   and that is where this sound is built.
 *
 *   Layers, all inside one 140 ms transient:
 *
 *     1. BODY      the weight. A low fundamental plus a partial an octave-ish up,
 *        decaying slowest of anything here, so it is what you feel at the end.
 *        This layer IS the sound.
 *     2. LOW METAL inharmonic partials in the ~700–1900 Hz band. Still metallic,
 *        still inharmonic — a struck solid is not harmonic, and a harmonic ratio
 *        is what makes an additive tone sound like an instrument note — but
 *        capped low enough never to pierce. The 1.9 kHz ceiling is deliberate:
 *        this layer is exactly what turned the previous, brighter version into a
 *        tick.
 *     3. GRIT      band-passed noise around 1.1 kHz, the rock rasp. It sits in
 *        the low mids so it adds texture rather than sparkle, which is what
 *        keeps the result from sounding like a clean UI blip.
 *     4. TRANSIENT a short contact spike, restrained on purpose: a big bright
 *        spike is exactly the "tsk" that makes a clack sound cheap.
 *
 *   The sum is soft-clipped rather than limited. Saturation raises the low
 *   harmonics fastest, which is what gives the attack its driven, loud-through-
 *   the-desk quality; a hard limiter would flatten the top and leave it thin.
 *
 * RUN:  node scripts/generate-click-sound.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const DURATION = 0.14; // 140 ms — long enough for the body to be felt
const N = Math.round(SR * DURATION);

/** Deterministic PRNG, so regenerating the file never produces a different sound. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0x5eed1a);

/**
 * One-pole band-pass, run twice for a steeper 12 dB/octave slope.
 *
 * Cascading a high-pass and a low-pass is cheaper than a biquad and is more than
 * adequate here: this layer only has to sit in a band, not reject one. What it
 * must NOT do is leak treble, because that is the whole failure mode here.
 */
function makeBandpass(hpCutoff, lpCutoff) {
  let hpIn = 0;
  let hpOut = 0;
  let lpOut = 0;
  return (x) => {
    // high-pass
    const rcHp = 1 / (2 * Math.PI * hpCutoff);
    const aHp = rcHp / (rcHp + 1 / SR);
    const yHp = aHp * (hpOut + x - hpIn);
    hpIn = x;
    hpOut = yHp;
    // low-pass
    const rcLp = 1 / (2 * Math.PI * lpCutoff);
    const aLp = 1 / (1 + rcLp * SR);
    lpOut += aLp * (yHp - lpOut);
    return lpOut;
  };
}

const grit = makeBandpass(700, 1900);

const samples = new Float64Array(N);

for (let i = 0; i < N; i++) {
  const t = i / SR;

  /* 1. BODY — the weight. Fundamental at 108 Hz with a 214 Hz partial above it
        for definition, and the slowest decay in the mix (tau ~ 46 ms) so it is
        still moving when everything else has gone. */
  const bodyEnv = Math.exp(-t * 46);
  const body =
    bodyEnv *
    (Math.sin(2 * Math.PI * 108 * t) * 0.85 +
      Math.sin(2 * Math.PI * 214 * t) * 0.34 +
      Math.sin(2 * Math.PI * 162 * t) * 0.16);

  /* 2. LOW METAL — the click character. Three inharmonic partials, all under
        1.9 kHz. Ratio to the fundamental is deliberately irrational-ish
        (1.61x, 2.94x, 4.9x) so no two line up and the result shimmers without
        sounding pitched. */
  const metalEnv = Math.exp(-t * 78);
  const metal =
    metalEnv *
    (Math.sin(2 * Math.PI * 742 * t) * 0.30 +
      Math.sin(2 * Math.PI * 1057 * t) * 0.19 +
      Math.sin(2 * Math.PI * 1889 * t) * 0.10);

  /* 3. GRIT — band-passed noise, the rock rasp. 8 ms only; any longer and it
        turns into hiss, which is a different, cheaper sound. */
  const white = rand() * 2 - 1;
  const rockGrit = grit(white) * Math.exp(-t * 260) * 0.42;

  /* 4. TRANSIENT — contact. Short and modest. The previous version used a 1 ms
        spike at 0.9, which put a bright "tsk" on the front of every click; this
        is softer and slower so the punch comes from the body underneath. */
  const transient = Math.exp(-t * 420) * 0.34;

  samples[i] = body + metal + rockGrit + transient;
}

/* ── Soft clip ──────────────────────────────────────────────────────────────
   tanh saturation. Above ~0.7 the curve rounds over, so peaks compress smoothly
   instead of clipping flat. Because saturation is roughly odd-symmetric, the
   low harmonics are lifted most — which is what thickens the attack. */
const DRIVE = 2.4;
const CEIL = 0.84; // ≈ -1.5 dBFS: punchy, with headroom against a loud video
let peak = 0;
for (let i = 0; i < N; i++) {
  const v = Math.tanh(samples[i] * DRIVE);
  samples[i] = v;
  peak = Math.max(peak, Math.abs(v));
}
const norm = peak > 0 ? CEIL / peak : 1;

/* ── Short fade-out ────────────────────────────────────────────────────────
   Without it the sample ends on a non-zero sample, which is an audible tick of
   its own — a second, unintended "click" right after the real one. */
const FADE = Math.round(SR * 0.008);
for (let i = 0; i < FADE; i++) {
  samples[N - 1 - i] *= i / FADE;
}

/* ── 16-bit mono PCM WAV ─────────────────────────────────────────────────── */
const dataBytes = N * 2;
const buf = Buffer.alloc(44 + dataBytes);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataBytes, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); // PCM chunk size
buf.writeUInt16LE(1, 20); // format = PCM
buf.writeUInt16LE(1, 22); // channels = mono
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28); // byte rate
buf.writeUInt16LE(2, 32); // block align
buf.writeUInt16LE(16, 34); // bits per sample
buf.write('data', 36);
buf.writeUInt32LE(dataBytes, 40);
for (let i = 0; i < N; i++) {
  const v = Math.max(-1, Math.min(1, samples[i] * norm));
  buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'sounds',
  'click.wav'
);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buf);

console.log(`wrote ${out}`);
console.log(`  ${buf.length} bytes, ${DURATION * 1000} ms, ${SR} Hz mono 16-bit`);
console.log(`  body 108 Hz, metal partials 742/1057/1889 Hz (all < 2 kHz)`);
console.log(`  peak ${CEIL.toFixed(3)} (${(20 * Math.log10(CEIL)).toFixed(1)} dBFS), drive ${DRIVE}x soft-clipped`);
