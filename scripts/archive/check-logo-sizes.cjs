const fs = require('fs');
const path = require('path');
const d = 'public/logos';
for (const f of fs.readdirSync(d)) {
  const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) continue;
  const b = fs.readFileSync(p);
  let info = '?';
  try {
    if (b[0] === 0x89) {
      info = b.readUInt32BE(16) + 'x' + b.readUInt32BE(20) + ' png';
    } else if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length - 8) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xc3 && m !== 0xc4 && m !== 0xcc) {
          info = b.readUInt16BE(i + 7) + 'x' + b.readUInt16BE(i + 5) + ' jpeg';
          break;
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    } else {
      const t = b.toString('utf8');
      const vb = t.match(/viewBox="([^"]+)"/);
      const w = t.match(/width="(\d+)"/);
      info = 'svg viewBox=' + (vb ? vb[1] : 'none') + (w ? ' width=' + w[1] : '');
    }
  } catch (e) { info = 'err ' + e.message; }
  console.log(f, b.length + 'b', info);
}
