const fs = require('fs');
const path = require('path');

const OLD = `'item': { '@type': 'SportsStatistic', 'name': r.name, 'additionalProperty':`;
const NEW = `'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': \`https://stats.tennismylife.org/players/\${r.slug}/ranking\` } : {}), 'additionalProperty':`;

const SKIP = ['DiffPoints', 'Streak\\Count', 'Streak\\Top', 'Streak/Count', 'Streak/Top'];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else if (e.name === 'page.tsx') {
      const skip = SKIP.some(s => full.includes(s));
      if (skip) continue;
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes(OLD)) {
        fs.writeFileSync(full, c.split(OLD).join(NEW), 'utf8');
        console.log('Updated:', full);
      }
    }
  }
}

walk('app/recordsranking');
console.log('Done');
