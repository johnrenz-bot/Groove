const fs = require('fs');
const t = fs.readFileSync(process.argv[2], 'utf8');
let line = 1;
for (const ch of t) {
  const cp = ch.codePointAt(0);
  if (cp >= 0xA0) console.log('line', line, 'U+' + cp.toString(16).toUpperCase(), JSON.stringify(ch));
  if (ch === '\n') line++;
}
