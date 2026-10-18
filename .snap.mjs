import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const walk = (d, out=[]) => { for (const e of readdirSync(d,{withFileTypes:true})) { const p=path.join(d,e.name); e.isDirectory()?walk(p,out):(p.endsWith('.css')&&out.push(p)); } return out; };
const css = walk('.next/static/chunks').map(f=>readFileSync(f,'utf8')).join('\n');
const re = /@font-face\{([^}]*)\}/g; let m;
const rows = [];
while ((m = re.exec(css)) !== null) {
  const b = m[1];
  const family = /font-family:\s*([^;]+)/.exec(b)?.[1];
  const style  = /font-style:\s*([^;]+)/.exec(b)?.[1];
  const weight = /font-weight:\s*([^;]+)/.exec(b)?.[1];
  const src    = /url\(([^)]+)\)/.exec(b)?.[1];
  const ur     = /unicode-range:\s*([^;]+)/.exec(b)?.[1];
  if (!family || !ur) continue;
  if (!ur.includes('0000-00FF')) continue; // latin only
  const file = src.replace(/^\.\.\//, '.next/static/');
  const hash = crypto.createHash('sha256').update(readFileSync(file)).digest('hex').slice(0,16);
  rows.push({ family, style, weight, file: path.basename(file), hash, bytes: readFileSync(file).length });
}
mkdirSync('.font-baseline',{recursive:true});
for (const r of rows) { const dst = path.join('.font-baseline', r.file); if(!require('node:fs').existsSync(dst)) copyFileSync(path.join('.next/static', r.file), dst); }
rows.sort((a,b)=> (a.family+a.style+a.weight).localeCompare(b.family+b.style+b.weight));
writeFileSync('.font-baseline/manifest.json', JSON.stringify(rows,null,2));
for (const r of rows) console.log(`${r.family.padEnd(18)} ${String(r.style).padEnd(7)} ${String(r.weight).padEnd(8)} ${r.hash}  ${r.bytes}`);
console.log('\nbaseline latin faces:', rows.length);
