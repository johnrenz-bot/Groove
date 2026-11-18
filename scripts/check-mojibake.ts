/**
 * Mojibake guard: fails if any source file contains text that looks like
 * UTF-8 round-tripped through Latin-1/Windows-1252 more than once.
 *
 * WHY THIS EXISTS
 *   A whole generation of files in this repo was corrupted by editors and
 *   PowerShell saving as Latin-1/cp1252. The corruption renders as "Ã—",
 *   "...", "â€¦" — unreadable garbage that used to ship to production
 *   unchallenged. This script is the tripwire: it runs before lint in the
 *   prebuild step and fails the build if a NEW mojibake literal ever appears.
 *
 * WHAT COUNTS AS MOJIBAKE
 *   A marker character that ONLY exists because of encoding corruption in
 *   English-language source (never used by hand):
 *     U+00C3 (Ã), U+00C2 (Â), U+00C5 (Å), U+00E2 (â), U+00C6 (Æ),
 *     U+0192 (ƒ), U+0161 (š), U+20AC-followed-by-another-corruption, etc.
 *
 *   LEGAL non-ASCII the repo intentionally uses (excluded from the scan):
 *     U+00A0 (nbsp) — old files, harmless
 *     U+00B7 (·), U+2013 (–), U+2014 (—), U+2022 (•), U+2019 (’),
 *     box drawing (U+2500) in ASCII-art banner comments, U+2264 (≤),
 *     U+2192 (→), U+FEFF-adjacent encodings handled separately below.
 *     → these are VALID UTF-8 and are NOT flagged.
 *
 *   Still flagged even alone: U+00C3, U+00C2, U+00E2, U+0192, U+FFFD.
 *
 * Run:
 *   node --experimental-strip-types --no-warnings scripts/check-mojibake.ts
 * or:
 *   npm run check:encoding
 */

export {};

import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const SOURCE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.css', '.json', '.md', '.sql', '.html', '.svg', '.mts',
]);
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'out']);

// Characters that cannot appear in correctly-encoded English source unless
// it was corrupted by an encoding round trip.
// NOTE: U+00C6 only flags 'Æ', harmless as a marker — the list of lead bytes
// is what actually catches both single- and double-layer corruption.
// Every combination starting with these lead bytes is mojibake in this repo.
const ALWAYS_MARKERS = new Set([0x00c3, 0x00c2, 0x00e2, 0x0192, 0xfffd]);
// â€ is the signature sequence for corrupted em dash / ellipsis etc.
const MARKER_PAIR = /â€|Ã¢/;

// Allowlist: files where patterns are part of the guard itself, or fixtures.
const ALLOWLIST = new Set<string>([
  'scripts/check-mojibake.ts', // the guard's own pattern list
]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
      continue;
    }
    const ext = extname(entry.name).toLowerCase();
    if (SOURCE_EXTS.has(ext)) yield full;
  }
}

interface Finding {
  file: string;
  line: number;
  col: number;
  snippet: string;
}

const findings: Finding[] = [];
let scanned = 0;

for (const file of walk('.')) {
  const rel = file.replace(/\\/g, '/').replace(/^\.\//, '');
  if (ALLOWLIST.has(rel)) continue;
  const buf = readFileSync(file);
  const text = buf.toString('utf8');
  scanned += 1;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const cp = line.codePointAt(j);
      if (cp !== undefined && ALWAYS_MARKERS.has(cp)) {
        findings.push({
          file: rel,
          line: i + 1,
          col: j + 1,
          snippet: line.trim().slice(0, 140),
        });
        j += 2;
        break; // one finding per line is enough signal
      }
    }
    // Pair markers spanning two code units (â€, Ã¢)
    const pair = MARKER_PAIR.exec(line);
    if (pair) {
      findings.push({
        file: rel,
        line: i + 1,
        col: (pair.index + 1) || 1,
        snippet: line.trim().slice(0, 140),
      });
    }
  }
}

if (findings.length > 0) {
  console.error(`Mojibake guard: ${findings.length} suspect line(s) found in ${scanned} scanned file(s):`);
  for (const f of findings.slice(0, 50)) {
    console.error(`  ${f.file}:${f.line}:${f.col}  ${f.snippet}`);
  }
  if (findings.length > 50) console.error(`  … and ${findings.length - 50} more`);
  console.error('\nThese are almost certainly UTF-8 corrupted by Latin-1/cp1252 round trips.');
  console.error('Fix the characters (or escape them as \\uXXXX) — do not disable this check.');
  process.exit(1);
}

console.log(`Mojibake guard: clean. ${scanned} files scanned.`);
