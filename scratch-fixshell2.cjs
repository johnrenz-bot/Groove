const fs = require('fs');
const f = 'features/hub/components/HubViewShell.tsx';
let t = fs.readFileSync(f, 'utf8');
t = t.replace(/\/\*[^*]*\*\//g, (m) => /[^\x00-\x7F]/.test(m) ? '/* */' : m);
t = t.replace(/[\x80-\uFFFF]+/g, (m) => /[\x80-\uFFFF]/.test(m) && !/[a-z0-9]/i.test(m) ? '-' : m);
fs.writeFileSync(f, t, 'utf8');
const lines = t.split('\n');
lines.forEach((l, i) => { if (/[\x80-\uffff]/.test(l)) console.log('L' + (i + 1) + ': ' + JSON.stringify(l)); });
console.log('done');
