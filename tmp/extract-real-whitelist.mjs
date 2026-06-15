import fs from 'fs';
const text = fs.readFileSync('docs/records-indexed-urls.csv', 'utf8');
const rows = text.trim().split(/\r?\n/);
const header = rows.shift().split(',');
const urlIndex = header.indexOf('url');
const typeIndex = header.indexOf('tipo');
const titleIndex = header.indexOf('titolo_seo');
const outRows = [['url','title']];
for (const row of rows) {
  const cols = row.split(',');
  if (cols[typeIndex] === 'whitelist') {
    const url = cols[urlIndex];
    const title = cols[titleIndex];
    outRows.push([url, title]);
  }
}
fs.writeFileSync('tmp/records-whitelist-real.csv', outRows.map(r => r.map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n'), 'utf8');
console.log(`Wrote ${outRows.length-1} whitelist rows to tmp/records-whitelist-real.csv`);
