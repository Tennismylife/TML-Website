const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'public', 'sitemaps');
// include only XML files (exclude sitemap_index.xml and any .gz files)
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xml') && f !== 'sitemap_index.xml').sort();
const base = (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '') + '/sitemaps';
const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
for (const f of files) {
  xml.push('  <sitemap>\n    <loc>' + base + '/' + f + '</loc>\n  </sitemap>');
}
xml.push('</sitemapindex>');
fs.writeFileSync(path.join(dir, 'sitemap_index.xml'), xml.join('\n'), 'utf8');
console.log('WROTE sitemap_index.xml with', files.length, 'entries');
