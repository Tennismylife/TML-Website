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

const LASTMOD = '2026-04-07';

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

// ── URL list (indexed pages only, matching robots logic in [...slug]/page.tsx) ─

// Rank-based routes: only ranks 1–10 are linked from landing (LANDING_RANK)
const RANK_VALUES = Array.from({ length: 10 }, (_, i) => i + 1);
// Top-based routes: 2,3,4,5,6,7,8,9,10,20,30,50,100 (LANDING_TOP)
const TOP_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 50, 100];

function rankUrls(prefix) { return RANK_VALUES.map((n) => `${prefix}/${n}`); }
function topUrls(prefix)  { return TOP_VALUES.map((n) => `${prefix}/${n}`); }

const ALL_LOCS = [
  // Weeks at Rank (10)
  ...rankUrls('/recordsranking/weeksatno'),
  // Weeks in Top N (13)
  ...topUrls('/recordsranking/weeksattop'),
  // Consecutive Weeks at Rank (10)
  ...rankUrls('/recordsranking/streak/consecutiveweeksatno'),
  // Consecutive Weeks in Top N (13)
  ...topUrls('/recordsranking/streak/consecutiveweeksattop'),
  // Year-End Finishes at Rank (10)
  ...rankUrls('/recordsranking/endoftheseason/no'),
  // Year-End Finishes in Top N (13)
  ...topUrls('/recordsranking/endoftheseason/attop'),
  // Consecutive Year-End Finishes at Rank (10)
  ...rankUrls('/recordsranking/endoftheseason/consecutivesatno'),
  // Consecutive Year-End Finishes in Top N (13)
  ...topUrls('/recordsranking/endoftheseason/consecutivesattop'),
  // Ages — Overall (10+10+13+13 = 46)
  ...rankUrls('/recordsranking/ages/youngestsatno'),
  ...rankUrls('/recordsranking/ages/oldestsatno'),
  ...topUrls('/recordsranking/ages/youngestattop'),
  ...topUrls('/recordsranking/ages/oldestattop'),
  // Ages — Year-End (10+10+13+13 = 46)
  ...rankUrls('/recordsranking/agesendoftheseason/youngestsatno'),
  ...rankUrls('/recordsranking/agesendoftheseason/oldestsatno'),
  ...topUrls('/recordsranking/agesendoftheseason/youngestattop'),
  ...topUrls('/recordsranking/agesendoftheseason/oldestattop'),
  // Career Timespan — Overall (10+13 = 23)
  ...rankUrls('/recordsranking/timespan/atno'),
  ...topUrls('/recordsranking/timespan/attop'),
  // Career Timespan — Year-End (10+13 = 23)
  ...rankUrls('/recordsranking/timespanendoftheseason/atno'),
  ...topUrls('/recordsranking/timespanendoftheseason/attop'),
  // Points Records (4) — always indexed
  '/recordsranking/mostpoints/overall',
  '/recordsranking/mostpoints/endoftheseason',
  '/recordsranking/diffpoints/overall',
  '/recordsranking/diffpoints/endoftheseason',
];
// Total: 12×10 + 10×13 + 4 = 120 + 130 + 4 = 254

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
