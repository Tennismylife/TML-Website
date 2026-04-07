const fs = require('fs');
const path = require('path');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name === 'page.tsx') {
      let c = fs.readFileSync(full, 'utf8');
      const c2 = c
        .replace(/'dateModified': '2026-04-07T00:00:00\.000Z'/g, "'dateModified': new Date().toISOString()")
        .replace(/"dateModified": "2026-04-07T00:00:00\.000Z"/g, '"dateModified": new Date().toISOString()');
      if (c2 !== c) {
        fs.writeFileSync(full, c2, 'utf8');
        console.log('Reverted:', full);
      }
    }
  }
}
walk('app/recordsranking');
console.log('Done');
