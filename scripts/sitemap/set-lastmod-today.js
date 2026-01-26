const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'public', 'sitemaps');
if (!fs.existsSync(dir)) {
  console.error('sitemaps dir not found:', dir);
  process.exit(2);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.xml') && f !== 'sitemap_index.xml');
const today = new Date().toISOString().split('T')[0];
for (const f of files) {
  const p = path.join(dir, f);
  let xml = fs.readFileSync(p, 'utf8');

  // Split into parts between <url>...</url>
  const parts = xml.split(/(<url[\s\S]*?<\/url>)/g);
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].startsWith('<url')) continue;
    let urlBlock = parts[i];
    // If lastmod exists anywhere in the url block, replace it
    if (/\<lastmod\>.*?<\/lastmod\>/s.test(urlBlock)) {
      urlBlock = urlBlock.replace(/\<lastmod\>.*?<\/lastmod\>/s, `<lastmod>${today}</lastmod>`);
    } else {
      // insert lastmod after </loc>
      urlBlock = urlBlock.replace(/(\<\/loc\>)(\s*)/, `$1\n    <lastmod>${today}</lastmod>$2`);
    }
    parts[i] = urlBlock;
  }

  const newXml = parts.join('');
  fs.writeFileSync(p, newXml, 'utf8');
  // update gz as well
  try {
    const zlib = require('zlib');
    const gz = zlib.gzipSync(Buffer.from(newXml, 'utf8'));
    fs.writeFileSync(p + '.gz', gz);
  } catch (e) {
    console.warn('Could not update gz for', p, e.message || e);
  }
  console.log('Updated lastmod for', f);
}
console.log('All done.');
