const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.error('Usage: node scripts/sitemap/compare-desktop-sitemap.js <path-to-desktop-sitemap.xml>');
  process.exit(2);
}

const desktopPath = process.argv[2];
if (!fs.existsSync(desktopPath)) {
  console.error('Desktop sitemap not found at', desktopPath);
  process.exit(2);
}

const outDir = path.join(process.cwd(), 'public', 'sitemaps');
if (!fs.existsSync(outDir)) {
  console.error('Project sitemaps directory not found:', outDir);
  process.exit(2);
}

function extractLocs(xml) {
  const re = /<loc>([^<]+)<\/loc>/g;
  const arr = [];
  let m;
  while ((m = re.exec(xml))) arr.push(m[1].trim());
  return arr;
}

const desktopXml = fs.readFileSync(desktopPath, 'utf8');
const desktopLocs = new Set(extractLocs(desktopXml));

const files = fs.readdirSync(outDir).filter(f => f.endsWith('.xml') && f !== 'sitemap_index.xml');
const projectLocs = new Set();
for (const f of files) {
  const txt = fs.readFileSync(path.join(outDir, f), 'utf8');
  for (const loc of extractLocs(txt)) projectLocs.add(loc);
}

const missing = [...desktopLocs].filter(u => !projectLocs.has(u));
const extra = [...projectLocs].filter(u => !desktopLocs.has(u));

console.log('Desktop sitemap:', desktopPath);
console.log('Project sitemap dir:', outDir);
console.log('Count desktop locs:', desktopLocs.size);
console.log('Count project locs (all files):', projectLocs.size);
console.log('Missing (in desktop but NOT in project sitemaps):', missing.length);
if (missing.length) {
  console.log('--- Missing URLs ---');
  missing.forEach(u => console.log(u));
}
console.log('Extra (in project sitemaps but NOT in desktop):', extra.length);
if (extra.length) {
  console.log('--- Extra URLs ---');
  extra.slice(0, 200).forEach(u => console.log(u));
  if (extra.length > 200) console.log('... (truncated, show all by running with --dump-extra)');
}

// Optional: write report files
const reportsDir = path.join(process.cwd(), 'scripts', 'sitemap', 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'desktop-only.txt'), missing.join('\n'));
fs.writeFileSync(path.join(reportsDir, 'project-only.txt'), extra.join('\n'));
console.log('Reports written to', reportsDir);

// Extra flag to dump all
if (process.argv.includes('--dump-extra')) {
  console.log('\n--- ALL EXTRA URLs ---\n');
  extra.forEach(u => console.log(u));
}

process.exit(0);
