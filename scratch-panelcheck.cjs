const fs = require('fs');
for (const f of ['features/hub/components/HubCasePanel.tsx', 'features/hub/components/HubSignoffs.tsx']) {
  const t = fs.readFileSync(f, 'utf8');
  const bad = [...t].filter((c) => c.codePointAt(0) >= 0xA0 && '——…–·’“”≤→✓Ø'.indexOf(c) === -1);
  console.log(f, 'high chars:', bad.length, JSON.stringify([...new Set(bad)].slice(0, 10)));
}
