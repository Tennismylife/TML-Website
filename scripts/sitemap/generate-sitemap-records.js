#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const jiti = require('jiti')(__filename);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function main() {
  try {
    const { getWhitelistedSitemapPaths } = jiti(path.join(process.cwd(), 'lib', 'seo', 'records-policy'));
    if (typeof getWhitelistedSitemapPaths !== 'function') {
      throw new Error('getWhitelistedSitemapPaths not found');
    }

    const siteRoot = (process.env.SITE_ROOT || process.env.SITE_URL || 'https://stats.tennismylife.org').replace(/\/$/, '');
    const outDir = path.join(process.cwd(), 'public', 'sitemaps');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const today = new Date().toISOString().split('T')[0];
    const paths = Array.from(new Set(getWhitelistedSitemapPaths(siteRoot)));

    const xmlUrls = paths
      .sort()
      .map((u) => {
        const url = u.startsWith('http://') || u.startsWith('https://') ? u : `${siteRoot}${u}`;
        return `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.00</priority>\n  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls}\n</urlset>`;
    const outPath = path.join(outDir, 'sitemap-records.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    fs.writeFileSync(outPath + '.gz', zlib.gzipSync(Buffer.from(xml, 'utf8')));
    console.log('WROTE', outPath, 'entries=', paths.length, 'lastmod=', today);

    const genIndex = require('./generate_sitemap_index');
    if (typeof genIndex === 'function') genIndex();
    else {
      require('child_process').execFileSync('node', [path.join(__dirname, 'generate_sitemap_index.js')], { stdio: 'inherit' });
    }
  } catch (err) {
    console.error('Error generating sitemap-records:', err);
    process.exit(1);
  }
}

main();
