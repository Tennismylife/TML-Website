const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'sitemaps');
const files = ['sitemap-recordsranking.xml', 'sitemap-player-surfaces-top100.xml'];

files.forEach(f => {
  const src = path.join(dir, f);
  const dst = src + '.gz';
  fs.writeFileSync(dst, zlib.gzipSync(fs.readFileSync(src)));
  console.log('OK:', f + '.gz', fs.statSync(dst).size, 'bytes');
});
