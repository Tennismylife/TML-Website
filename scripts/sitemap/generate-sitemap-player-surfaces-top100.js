#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const INDEX_SNAPSHOT_DATE = '2026-04-20';
const SURFACES = ['clay', 'hard', 'grass'];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrlXml(baseUrl, url) {
  return [
    '  <url>',
    `    <loc>${escapeXml(baseUrl + url.loc)}</loc>`,
    `    <lastmod>${url.lastmod}</lastmod>`,
    '    <changefreq>daily</changefreq>',
    '    <priority>0.70</priority>',
    '  </url>',
  ].join('\n');
}

function writeSitemapIndex(outDir, siteRoot) {
  const sitemapBase = `${siteRoot.replace(/\/$/, '')}/sitemaps`;
  const files = fs
    .readdirSync(outDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.xml') && name !== 'sitemap_index.xml')
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...files.map((file) => `  <sitemap>\n    <loc>${escapeXml(`${sitemapBase}/${file}`)}</loc>\n  </sitemap>`),
    '</sitemapindex>',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 'sitemap_index.xml'), xml, 'utf8');
  return files.length;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const outDir = path.join(repoRoot, 'public', 'sitemaps');
  const outFile = path.join(outDir, 'sitemap-player-surfaces-top100.xml');
  const siteRoot = (process.env.SITE_URL || process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '');
  const rankingApiUrl = `${siteRoot}/api/ranking?date=${INDEX_SNAPSHOT_DATE}`;

  try {
    const rankingResponse = await fetch(rankingApiUrl, {
      headers: {
        accept: 'application/json',
      },
    });
    if (!rankingResponse.ok) {
      throw new Error(`Ranking API request failed with status ${rankingResponse.status}`);
    }

    const rankingPayload = await rankingResponse.json();
    const rankings = Array.isArray(rankingPayload?.rankings) ? rankingPayload.rankings : [];

    const slugs = Array.from(
      new Set(
        rankings
          .filter((row) => Number(row?.rank) <= 100)
          .map((row) => row?.slug)
          .filter((slug) => typeof slug === 'string' && slug.trim().length > 0)
          .map((slug) => String(slug).toLowerCase())
      )
    ).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

    if (!slugs.length) {
      throw new Error(`No top-100 player slugs returned by ${rankingApiUrl}`);
    }

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const lastmod = new Date(`${INDEX_SNAPSHOT_DATE}T00:00:00.000Z`).toISOString();

    const urls = slugs.flatMap((slug) =>
      SURFACES.map((surface) => ({ loc: `/players/${encodeURIComponent(slug)}/${surface}`, lastmod }))
    );

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((url) => buildUrlXml(siteRoot, url)),
      '</urlset>',
      '',
    ].join('\n');

    fs.writeFileSync(outFile, xml, 'utf8');
    fs.writeFileSync(`${outFile}.gz`, zlib.gzipSync(Buffer.from(xml, 'utf8')));

    const sitemapCount = writeSitemapIndex(outDir, siteRoot);

    console.log(`WROTE ${outFile} entries=${urls.length} players=${slugs.length} source=${rankingApiUrl}`);
    console.log(`UPDATED ${path.join(outDir, 'sitemap_index.xml')} sitemaps=${sitemapCount}`);
  } catch (error) {
    console.error('Error generating player surface top100 sitemap:', error);
    process.exitCode = 1;
  }
}

main();