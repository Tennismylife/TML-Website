const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'public', 'sitemaps');
if (!fs.existsSync(dir)) {
  console.error('sitemaps directory not found:', dir);
  process.exit(2);
}
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xml') && f !== 'sitemap_index.xml').sort();
let total = 0;
for (const f of files) {
  const txt = fs.readFileSync(path.join(dir, f), 'utf8');
  const c = (txt.match(/<url>/g) || []).length;
  console.log(`${f}: ${c}`);
  total += c;
}
console.log(`TOTAL: ${total}`);
process.exit(0);
