const fs = require('fs');
const f = process.argv[2];
const lines = fs.readFileSync(f, 'utf8').split('\n');
for (const [i, l] of lines.entries()) {
  if (l.includes('Searching')) {
    console.log('L' + (i + 1) + ':', JSON.stringify(l));
    for (const ch of l) {
      const cp = ch.codePointAt(0);
      if (cp >= 0x80) console.log('   U+' + cp.toString(16).padStart(4, '0'), JSON.stringify(ch));
    }
  }
}
