#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

(async function main(){
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const apiStatsDir = path.join(repoRoot, 'app', 'api', 'statistics');
    const outDir = path.join(repoRoot, 'public', 'sitemaps');
    const outFile = path.join(outDir, 'statistics-sitemap.xml');
    const baseUrl = 'https://stats.tennismylife.org';

    if (!fs.existsSync(apiStatsDir)) {
      console.error('Could not find directory:', apiStatsDir);
      process.exit(2);
    }

    const dirents = fs.readdirSync(apiStatsDir, { withFileTypes: true });
    // collect directories (each stat is a subdirectory) and also individual files matching stat names
    const stats = [];

    for (const d of dirents) {
      if (d.isDirectory()) {
        stats.push(d.name);
      } else if (d.isFile()) {
        // skip main route.ts, but include any .ts files that are stat-named (unlikely)
        const name = d.name.replace(/\.tsx?$|\.ts$/, '');
        if (name !== 'route' && name !== 'index') stats.push(name);
      }
    }

    // ensure unique
    const uniqStats = Array.from(new Set(stats)).sort();

    // build xml
    const lastmod = new Date().toISOString();
    const urls = [];

    // include /statistics root
    urls.push({ loc: `${baseUrl}/statistics`, lastmod });

    for (const s of uniqStats) {
      // skip non-stat files (sanity)
      if (!s || s === 'route' || s.startsWith('.')) continue;
      urls.push({ loc: `${baseUrl}/statistics/${encodeURIComponent(s)}`, lastmod });
    }

    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    const urlsetClose = '</urlset>\n';

    const body = urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`).join('\n');

    const xml = xmlHeader + urlsetOpen + body + '\n' + urlsetClose;

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, xml, 'utf8');

    console.log(`Wrote sitemap with ${urls.length} entries to ${outFile}`);
    process.exit(0);
  } catch (err) {
    console.error('Error generating statistics sitemap:', err);
    process.exit(1);
  }
})();
