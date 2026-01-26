#!/usr/bin/env node
/* Generate sitemap-sections.xml using lib/sitemap.ts via jiti (handles TypeScript)
   Usage: node scripts/generate-sitemap-sections.js
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const jiti = require('jiti')(__filename);

async function main() {
  try {
    const { generateSitemapXml } = jiti(require('path').join(process.cwd(), 'lib', 'sitemap'));
    if (typeof generateSitemapXml !== 'function') throw new Error('generateSitemapXml not found in lib/sitemap');
    const xml = await generateSitemapXml({ excludePlayers: true, excludeTournaments: true, excludeRecords: true, excludeRecordsranking: true });
    const outDir = path.join(process.cwd(), 'public', 'sitemaps');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'sitemap-sections.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    const gz = zlib.gzipSync(Buffer.from(xml, 'utf8'));
    fs.writeFileSync(outPath + '.gz', gz);
    console.log('WROTE', outPath, 'len', xml.length, 'gz', gz.length);
  } catch (err) {
    console.error('Error generating sitemap-sections:', err);
    process.exit(1);
  }
}

main();
