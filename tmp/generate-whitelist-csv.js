const fs = require('fs');
const path = require('path');

const jsonPath = path.join(process.cwd(), 'public', 'players-surface-whitelist.json');
const csvPath = path.join(process.cwd(), 'public', 'players-surface-whitelist.csv');

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const manual = new Set((data.manualAllowlist || []).map((s) => String(s).toLowerCase()));
const rows = [['slug', 'manualAllowlist']];
for (const slug of data.slugs) {
  rows.push([slug, manual.has(slug) ? 'yes' : 'no']);
}
const csv = rows
  .map((r) => r.map((v) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  }).join(','))
  .join('\n');
fs.writeFileSync(csvPath, csv, 'utf8');
console.log('Wrote', csvPath, 'with', rows.length - 1, 'players.');
