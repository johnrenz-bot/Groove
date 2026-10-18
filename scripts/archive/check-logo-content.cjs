const fs = require('fs');
const zlib = require('zlib');
function analyze(p) {
  const b = fs.readFileSync(p);
  if (b[0] !== 0x89) { console.log(p, 'not-png'); return; }
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  const bitDepth = b[24], colorType = b[25];
  let pos = 8; const parts = [];
  while (pos < b.length) {
    const len = b.readUInt32BE(pos); const type = b.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') parts.push(b.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const bpp = ch * bitDepth / 8;
  const stride = Math.ceil(w * bpp);
  const colors = new Set();
  let prev = Buffer.alloc(stride);
  let transparent = 0, total = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const cur = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0;
      const bb = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + bb) & 255;
      else if (f === 3) v = (v + ((a + bb) >> 1)) & 255;
      else if (f === 4) {
        const pp = a + bb - c; const pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c)) & 255;
      }
      out[i] = v;
    }
    prev = out;
    for (let x = 0; x < w; x++) {
      total++;
      if (ch === 4 && out[x * 4 + 3] < 128) { transparent++; continue; }
      colors.add(out[x * bpp] + ',' + out[x * bpp + 1] + ',' + out[x * bpp + 2]);
      if (colors.size > 5000) break;
    }
    if (colors.size > 5000) break;
  }
  console.log(
    p, w + 'x' + h, 'depth=' + bitDepth, 'type=' + colorType,
    'opaqueColors~' + colors.size, 'transparent=' + ((100 * transparent / total).toFixed(1)) + '%'
  );
}
for (const f of ['red-bull-dance-your-style.png', 'udo.png', 'steezy.png', 'hhi.png', 'summer-dance-forever.png', 'world-of-dance.png', 'idl.png']) {
  analyze('public/logos/' + f);
}
