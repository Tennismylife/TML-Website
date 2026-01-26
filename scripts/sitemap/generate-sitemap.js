#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    const jiti = require('jiti')(__filename);
    const sitemapMod = jiti(path.join(process.cwd(), 'lib', 'sitemap.ts'));
    if (!sitemapMod || typeof sitemapMod.generateSitemapXml !== 'function') {
      throw new Error('generateSitemapXml not found in lib/sitemap.ts');
    }

    const xml = await sitemapMod.generateSitemapXml();
    // Avoid writing to public/sitemap.xml to prevent conflict with the dynamic route
    // Write to a generated filename instead, which won't conflict with /sitemap.xml served by Next
    const outPath = path.join(__dirname, '..', 'public', 'sitemap.generated.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    console.log('Sitemap written to', outPath);
    console.log(xml.slice(0, 1000));
  } catch (e) {
    console.error('Failed to generate sitemap:', e);
    process.exit(1);
  }
}

main();
