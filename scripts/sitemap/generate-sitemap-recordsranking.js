#!/usr/bin/env node
/**
 * Generates public/sitemaps/sitemap-recordsranking.xml
 * with all 314 leaderboard pages at /recordsranking/...
 * and updates public/sitemaps/sitemap_index.xml.
 *
 * URL list is static (derived from the actual dropdown controls in each page).
 * No DB or API dependency.
 *
 * Rank values:
 *   - weeksatno, streak/consecutiveweeksatno: 1-50 (RecordsCountControls, length 50)
 *   - all other rank-based routes: 1-10 (length 10 inline or EndSeasonCountControls)
 * Top values (all): 2,3,4,5,6,7,8,9,10,20,30,50,100 (RecordsTopControls)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── helpers ──────────────────────────────────────────────────────────────────

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const LASTMOD = new Date().toISOString().slice(0, 10);

function buildUrlXml(baseUrl, loc) {
  return [
    '  <url>',
    `    <loc>${escapeXml(baseUrl + loc)}</loc>`,
    `    <lastmod>${LASTMOD}</lastmod>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>0.80</priority>',
    '  </url>',
  ].join('\n');
}

function writeSitemapIndex(outDir, siteRoot) {
  const sitemapBase = `${siteRoot.replace(/\/$/, '')}/sitemaps`;
  const files = fs
    .readdirSync(outDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => n.endsWith('.xml') && n !== 'sitemap_index.xml')
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...files.map((f) => `  <sitemap>\n    <loc>${escapeXml(`${sitemapBase}/${f}`)}</loc>\n  </sitemap>`),
    '</sitemapindex>',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 'sitemap_index.xml'), xml, 'utf8');
  return files.length;
}

// ── URL list (indexed pages only, matching INDEX_FOLLOW_URLS in app/recordsranking/indexability.ts) ─

function parseIndexableUrls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/export const INDEX_FOLLOW_URLS = \[([\s\S]*?)\] as const/);
  if (!match) throw new Error(`INDEX_FOLLOW_URLS block not found in ${filePath}`);

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/,$/, '').replace(/^['"]|['"]$/g, ''))
    .filter((line) => line.startsWith('/recordsranking'));
}

const INDEXABILITY_FILE = path.join(process.cwd(), 'app', 'recordsranking', 'indexability.ts');
const ALL_LOCS = parseIndexableUrls(INDEXABILITY_FILE);

// ── main ──────────────────────────────────────────────────────────────────────

function main() {
  try {
    // eslint-disable-next-line no-unused-vars
    const baseDir = path.join(process.cwd(), 'app', 'recordsranking');
    if (!fs.existsSync(baseDir)) throw new Error('app/recordsranking directory not found');

    const repoRoot = path.resolve(__dirname, '..', '..');
    const outDir   = path.join(repoRoot, 'public', 'sitemaps');
    const outFile  = path.join(outDir, 'sitemap-recordsranking.xml');
    const siteRoot = (process.env.SITE_URL || process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '');

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const urlBlocks = ALL_LOCS.map((loc) => buildUrlXml(siteRoot, loc));
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urlBlocks,
      '</urlset>',
      '',
    ].join('\n');

    fs.writeFileSync(outFile, xml, 'utf8');
    fs.writeFileSync(outFile + '.gz', zlib.gzipSync(Buffer.from(xml, 'utf8')));

    const count = ALL_LOCS.length;
    const sitemaps = writeSitemapIndex(outDir, siteRoot);
    console.log(`WROTE ${outFile}  entries=${count}  source=static`);
    console.log(`UPDATED ${path.join(outDir, 'sitemap_index.xml')}  sitemaps=${sitemaps}`);
  } catch (err) {
    console.error('Error generating sitemap-recordsranking:', err);
    process.exit(1);
  }
}

main();
