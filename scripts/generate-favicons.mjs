/**
 * generate-favicons.mjs
 * Generates favicon assets from the GroovePH logo using sharp.
 * Run: node scripts/generate-favicons.mjs
 *
 * NOTE: No ICO-packing library (png-to-ico / ico) was found in node_modules.
 * favicon.ico is therefore a copy of the 32×32 PNG. Browsers accept single-
 * resolution ICO files without issue; multi-size embedding would require
 * installing png-to-ico or a similar package.
 */

import sharp from 'sharp';
import { copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../public/image/Logo/GroovePH-Logo.png');
const OUT = resolve(__dirname, '../public');

const sizes = [
  { name: 'favicon-16x16.png',  size: 16  },
  { name: 'favicon-32x32.png',  size: 32  },
  { name: 'favicon-48x48.png',  size: 48  },
  { name: 'icon-192.png',        size: 192 },
  { name: 'icon-512.png',        size: 512 },
  { name: 'apple-touch-icon.png',size: 180 },
];

console.log(`Source: ${SRC}`);

for (const { name, size } of sizes) {
  const dest = resolve(OUT, name);
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(dest);
  console.log(`  ✓ ${name} (${size}×${size})`);
}

// favicon.ico — copy of 32×32 PNG (no ICO packer available)
const ico32 = resolve(OUT, 'favicon-32x32.png');
const icoOut = resolve(OUT, 'favicon.ico');
copyFileSync(ico32, icoOut);
console.log('  ✓ favicon.ico (32×32 PNG copy — no multi-size ICO packer found)');

console.log('\nAll favicon assets written to public/');
